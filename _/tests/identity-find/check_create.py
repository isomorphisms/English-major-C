"""Run the imported creation body and the English translation against one list contract."""
import argparse
import struct
from pathlib import Path

from unicorn import UC_HOOK_CODE, UC_HOOK_MEM_WRITE
from unicorn.arm_const import (UC_ARM_REG_R0, UC_ARM_REG_R1, UC_ARM_REG_R2,
                               UC_ARM_REG_R4, UC_ARM_REG_R5, UC_ARM_REG_R6,
                               UC_ARM_REG_LR, UC_ARM_REG_PC, UC_ARM_REG_SP)
from check import (HERE, ROOT, PROGRAM, FLAGS, STOP, STACK, command, load,
                   compile_english, pinned_reference_source)

CREATE = ROOT / 'arm/thumb/identity-create'
# ID, input bytes (None is null), allocator availability, expected result.
CASES = (
    (37, None, False, 2),
    (0xffffffff, b'\0', True, 0),
    (0, b'AB\0unused\0', True, 0),
    (0xffffffff, None, False, 1),
    (37, None, False, 2),
    (37, b'12345678901234567890XYZ\0', True, 0),
    (11, b'K' * 19 + b'\0', True, 0),
    (23, b'\xfe\x81\0', True, 0),
    (11, None, True, 1),
)


def reference_objects(ndk_bin, out):
    original = pinned_reference_source()
    excerpt = original[original.index(b'#define NAME_LEN'):original.index(b'/* DELETE */')]
    reference = out / 'reference.c'
    reference.write_bytes((HERE / 'reference-prefix.h').read_bytes()
                          + (HERE / 'create-shim.h').read_bytes() + excerpt
                          + (HERE / 'reference-suffix.h').read_bytes())
    command([ndk_bin / 'clang', *FLAGS, '-mfloat-abi=soft', '-c', reference, '-o', out / 'specimen.o'])
    # The hook supplies r0 at allocator entry; both callbacks may destroy r1-r3.
    callbacks = out / 'callbacks.s'
    callbacks.write_text('.syntax unified\n.thumb\n.text\n.global identity_created, identity_allocate_kernel\n'
                         '.type identity_created,%function\n.thumb_func\nidentity_created:\n'
                         '  movw r0,#3855\n  bx lr\n.type identity_allocate_kernel,%function\n'
                         '.thumb_func\nidentity_allocate_kernel:\n'
                         '  movs r1,#255\n  movs r2,#255\n  movs r3,#255\n  bx lr\n')
    command([ndk_bin / 'clang', *FLAGS, '-c', callbacks, '-o', out / 'callbacks.o'])


def link(ndk_bin, out, source, label):
    obj = compile_english(ndk_bin, source, out, label)
    image = out / (label + '.elf')
    command([ndk_bin / 'clang', *FLAGS, '-nostdlib', '-static', '-Wl,--build-id=none,-e,english_identity_create',
             obj, out / 'find.o', out / 'callbacks.o', out / 'specimen.o', '-o', image])
    return image


def exercise(elf, function):
    cpu, symbols = load(elf)
    layout = struct.unpack('<4I', cpu.mem_read(symbols['identity_layout'], 16))
    if layout != (36, 20, 28, 8):
        raise AssertionError(f'unexpected ABI layout {layout}')
    size, id_offset, link_offset, _ = layout
    head, = struct.unpack('<I', cpu.mem_read(symbols['reference_head'], 4))
    cpu.mem_map(STACK, 4096)
    cpu.mem_map(STOP, 4096)
    cpu.reg_write(UC_ARM_REG_SP, STACK + 4096)
    preserved = (UC_ARM_REG_R4, UC_ARM_REG_R5, UC_ARM_REG_R6)
    for i, register in enumerate(preserved):
        cpu.reg_write(register, 0x31415000 + i)
    live = []
    trace = []

    def inspect_ring(items):
        links = [head] + [base + link_offset for base, _, _ in items]
        for i, current in enumerate(links):
            actual = struct.unpack('<II', cpu.mem_read(current, 8))
            if actual != (links[(i + 1) % len(links)], links[i - 1]):
                raise AssertionError(f'incorrect ring edge at {current:#x}: {actual}')
        for base, key, stored in items:
            if cpu.mem_read(base, 20) != stored:
                raise AssertionError(f'wrong stored name on id {key}')
            if struct.unpack('<I', cpu.mem_read(base + id_offset, 4))[0] != key:
                raise AssertionError(f'wrong stored id at {base:#x}')
            if cpu.mem_read(base + 24, 1) != b'\0':
                raise AssertionError(f'busy flag was not cleared at {base:#x}')

    def instruction(machine, pc, width, data):
        pcs.append(pc)
        if pc == symbols['english_identity_find'] & ~1:
            events.append('lookup')
        elif pc == symbols['identity_allocate_kernel'] & ~1:
            if events.count('allocate') or result == 1:
                raise AssertionError('unexpected allocation')
            if cpu.reg_read(UC_ARM_REG_R0) != size:
                raise AssertionError('wrong allocation size')
            events.append('allocate')
            cpu.reg_write(UC_ARM_REG_R0, base if available else 0)
        elif pc == symbols['identity_created'] & ~1:
            if result or 'allocate' not in events or 'created' in events:
                raise AssertionError('unexpected creation notification')
            if (cpu.reg_read(UC_ARM_REG_R0), cpu.reg_read(UC_ARM_REG_R1)) != (key, name_pointer):
                raise AssertionError('notification arguments changed')
            inspect_ring(expected)
            events.append('created')
        else:
            return
        if cpu.reg_read(UC_ARM_REG_SP) % 8:
            raise AssertionError('unaligned public call')

    def observe_write(machine, access, address, width, value, data):
        if STACK <= address and address + width <= STACK + 4096:
            return
        if 'allocate' not in events or any(byte not in permitted for byte in range(address, address + width)):
            raise AssertionError(f'unexpected write at {address:#x} during creation')

    cpu.hook_add(UC_HOOK_CODE, instruction)
    cpu.hook_add(UC_HOOK_MEM_WRITE, observe_write)
    for index, (key, text, available, result) in enumerate(CASES):
        base = 0x804000 + index * 0x2000 + 0x180
        name_pointer = 0
        if text is not None:
            name_page = 0xa00000 + index * 0x2000
            cpu.mem_map(name_page, 4096)
            name_pointer = name_page + 4096 - len(text)
            cpu.mem_write(name_pointer, text)
        expected = live
        permitted = set()
        if result == 0:
            cpu.mem_map(base & ~4095, 4096)
            cpu.mem_write(base, b'\xa5' * size)
            first = live[0][0] + link_offset if live else head
            permitted.update(range(head, head + 4))
            permitted.update(range(first + 4, first + 8))
            permitted.update(range(base, base + size))
            fields = text.split(b'\0', 1)[0][:19].ljust(20, b'\0')
            expected = [(base, key, fields)] + live
        events, pcs = [], []
        cpu.reg_write(UC_ARM_REG_LR, STOP | 1)
        english = function == 'english_identity_create'
        cpu.reg_write(UC_ARM_REG_R0, head if english else name_pointer)
        cpu.reg_write(UC_ARM_REG_R1, key)
        cpu.reg_write(UC_ARM_REG_R2, name_pointer)
        cpu.emu_start(symbols[function], STOP, count=1500)
        if cpu.reg_read(UC_ARM_REG_PC) != STOP or cpu.reg_read(UC_ARM_REG_SP) != STACK + 4096:
            raise AssertionError('return or stack mismatch')
        if any(cpu.reg_read(reg) != 0x31415000 + i for i, reg in enumerate(preserved)):
            raise AssertionError('callee-saved register changed')
        if cpu.reg_read(UC_ARM_REG_R0) != result:
            raise AssertionError('wrong return status')
        calls = ['lookup'] if english else []
        if result != 1:
            calls.append('allocate')
        if result == 0:
            calls.append('created')
        if calls != events:
            raise AssertionError(f'callback order: expected {calls}, saw {events}')
        inspect_ring(expected)
        live = expected
        trace.append(f'{function} id={key:#x} result={result} calls={events} '
                     + 'live=' + ','.join(hex(number) for _, number, _ in live)
                     + '\n  pc: ' + ' '.join(hex(pc) for pc in pcs))
    return trace


def check(ndk, out):
    if 'Pkg.Revision = 27.2.12479018' not in (ndk / 'source.properties').read_text():
        raise ValueError('Use NDK 27.2.12479018')
    out.mkdir(parents=True, exist_ok=True)
    ndk_bin = ndk / 'toolchains/llvm/prebuilt/linux-x86_64/bin'
    reference_objects(ndk_bin, out)
    compile_english(ndk_bin, PROGRAM / 'identity-find.english', out, 'find')
    source = CREATE / 'identity-create.english'
    image = link(ndk_bin, out, source, 'create')
    command([ndk_bin / 'llvm-objdump', '-dr', image], out / 'disassembly.txt')
    observations = exercise(image, 'english_identity_create') + exercise(image, 'identity_create')
    (out / 'calls.txt').write_text('\n'.join(observations) + '\n')
    mutations = [
        ('short-allocation', 'Put 36 into the low', 'Put 32 into the low', 'wrong allocation size'),
        ('copy-too-much', 'Put 19 into the low', 'Put 20 into the low', 'wrong stored name'),
        ('busy-bit', 'Store the low byte of "byte value or old first link" at 24', 'Store the low byte of "byte value or old first link" at 25', 'busy flag was not cleared'),
        ('lose-backlink', 'Store exactly four bytes from "remaining capacity or new link" at 4 bytes beyond the address in "byte value or old first link".', '', 'incorrect ring edge'),
        ('failure-status', 'Put 2 into the low', 'Put 1 into the low', 'wrong return status'),
    ]
    for label, old, new, diagnostic in mutations:
        body = source.read_text()
        if body.count(old) != 1:
            raise ValueError(f'{label}: expected a single source change')
        mutant = out / (label + '.english')
        mutant.write_text(body.replace(old, new))
        try:
            exercise(link(ndk_bin, out, mutant, label), 'english_identity_create')
        except AssertionError as error:
            if diagnostic not in str(error):
                raise
            print(f'{label}: rejected ({error})')
        else:
            raise AssertionError(f'{label}: broken program passed')
    print(f'{len(observations)} ARM create calls passed with checked callbacks, list state and stored fields.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ndk', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    check(args.ndk.resolve(), args.output.resolve())
