"""Compare English and freestanding C removal on the same ARMv7-A ABI."""
import argparse
import struct
from pathlib import Path

from unicorn import UC_HOOK_CODE, UC_HOOK_MEM_WRITE, UC_PROT_NONE
from unicorn.arm_const import (UC_ARM_REG_LR, UC_ARM_REG_PC, UC_ARM_REG_R0,
                               UC_ARM_REG_R1, UC_ARM_REG_R4, UC_ARM_REG_SP)
from check import (HERE, ROOT, PROGRAM, FLAGS, STOP, STACK, NODES, command, load,
                   pinned_reference_source, compile_english)

DESTROY = ROOT / 'arm/thumb/identity-destroy'
CASES = (
    ('empty', [], [41]),
    ('singleton then repeated miss', [7], [8, 7, 7]),
    ('middle, first, last', [17, 0xffffffff, 3], [0xffffffff, 17, 3]),
    ('last then first duplicate', [8, 8, 11], [11, 8, 8, 8]),
)


def build_reference(ndk_bin, out):
    original = pinned_reference_source()
    definitions = original[original.index(b'#define NAME_LEN'):original.index(b'/* CREATE */')]
    destroy = original[original.index(b'/* DELETE */'):original.index(b'static __init')]
    reference = out / 'specimen.c'
    reference.write_bytes((HERE / 'reference-prefix.h').read_bytes() + definitions
                          + (HERE / 'destroy-shim.h').read_bytes() + destroy
                          + (HERE / 'reference-suffix.h').read_bytes())
    command([ndk_bin / 'clang', *FLAGS, '-c', reference, '-o', out / 'specimen.o'])
    callback = out / 'callback.s'
    callback.write_text('.syntax unified\n.thumb\n.text\n.global identity_release\n'
                        '.type identity_release,%function\n.thumb_func\nidentity_release:\n'
                        '    movs r0,#0\n    movs r1,#0\n    movs r2,#0\n    movs r3,#0\n    bx lr\n')
    command([ndk_bin / 'clang', *FLAGS, '-c', callback, '-o', out / 'callback.o'])


def link(ndk_bin, out, source, name):
    obj = compile_english(ndk_bin, source, out, name)
    elf = out / (name + '.elf')
    command([ndk_bin / 'clang', *FLAGS, '-nostdlib', '-static',
             '-Wl,--build-id=none,-e,english_identity_destroy', obj, out / 'find.o',
             out / 'callback.o', out / 'specimen.o', '-o', elf])
    return elf


def run_case(elf, function, case):
    name, ids, requests = case
    cpu, symbols = load(elf)
    layout = struct.unpack('<4I', cpu.mem_read(symbols['identity_layout'], 16))
    if layout != (36, 20, 28, 8):
        raise AssertionError(f'Unexpected reference layout: {layout}')
    size, id_offset, link_offset, _ = layout
    head, = struct.unpack('<I', cpu.mem_read(symbols['reference_head'], 4))
    live = list(zip(NODES, ids))
    links = [head] + [base + link_offset for base, _ in live]
    original_fields = {}
    for index, (base, identity) in enumerate(live):
        cpu.mem_map(base & ~4095, 4096)
        fields = bytes([0x40 + index]) * id_offset + struct.pack('<II', identity, index % 2)
        cpu.mem_write(base, fields)
        original_fields[base] = fields
    for index, link in enumerate(links):
        cpu.mem_write(link, struct.pack('<II', links[(index + 1) % len(links)], links[index - 1]))
    cpu.mem_map(STACK, 4096)
    cpu.mem_map(STOP, 4096)
    cpu.reg_write(UC_ARM_REG_SP, STACK + 4096)
    cpu.reg_write(UC_ARM_REG_R4, 0xabcdef98)

    def check_ring():
        ring = [head] + [base + link_offset for base, _ in live]
        for index, address in enumerate(ring):
            pair = struct.unpack('<II', cpu.mem_read(address, 8))
            if pair != (ring[(index + 1) % len(ring)], ring[index - 1]):
                raise AssertionError(f'ring links differ at {address:#x}: {pair}')

    trace = []
    releases = []
    writes = []
    lookups = []
    pcs = []

    def instruction(machine, pc, width, data):
        pcs.append(pc)
        if pc == (symbols['english_identity_find'] & ~1):
            lookups.append(pc)
        if pc != (symbols['identity_release'] & ~1):
            return
        base = machine.reg_read(UC_ARM_REG_R0)
        if base != wanted_base or base in releases:
            raise AssertionError(f'wrong release address or count: {base:#x}')
        if machine.reg_read(UC_ARM_REG_SP) % 8:
            raise AssertionError('callback stack is not eight-byte aligned')
        check_ring()
        if machine.mem_read(base, link_offset) != original_fields[base]:
            raise AssertionError('identity fields changed before release')
        if struct.unpack('<II', machine.mem_read(base + link_offset, 8)) != (0x100, 0x122):
            raise AssertionError('retired link markers differ at release')
        releases.append(base)
        machine.mem_protect(base & ~4095, 4096, UC_PROT_NONE)

    def write(machine, access, address, width, value, data):
        if STACK <= address and address + width <= STACK + 4096:
            return
        if any(byte not in writable for byte in range(address, address + width)):
            raise AssertionError(f'unexpected write at {address:#x} width {width}')
        writes.append((address, width, value))

    cpu.hook_add(UC_HOOK_CODE, instruction)
    cpu.hook_add(UC_HOOK_MEM_WRITE, write)
    for wanted in requests:
        match = next((i for i, (_, number) in enumerate(live) if number == wanted), None)
        wanted_base = None
        writable = set()
        if match is not None:
            ring = [head] + [base + link_offset for base, _ in live]
            index = match + 1
            wanted_base, _ = live.pop(match)
            for start, count in [(ring[index - 1], 4), (ring[(index + 1) % len(ring)] + 4, 4),
                                 (wanted_base + link_offset, size - link_offset)]:
                writable.update(range(start, start + count))
        for collection in [writes, releases, lookups, pcs]:
            collection.clear()
        cpu.reg_write(UC_ARM_REG_LR, STOP | 1)
        cpu.reg_write(UC_ARM_REG_R0, head if function.startswith('english_') else wanted)
        cpu.reg_write(UC_ARM_REG_R1, wanted)
        cpu.emu_start(symbols[function], STOP, count=350)
        if cpu.reg_read(UC_ARM_REG_PC) != STOP or cpu.reg_read(UC_ARM_REG_SP) != STACK + 4096:
            raise AssertionError('caller stack or return address changed')
        if cpu.reg_read(UC_ARM_REG_R4) != 0xabcdef98:
            raise AssertionError('callee-saved r4 changed')
        if function.startswith('english_') and len(lookups) != 1:
            raise AssertionError('expected one call to the checked English lookup')
        if releases != ([] if wanted_base is None else [wanted_base]):
            raise AssertionError(f'wrong release count: {releases}')
        check_ring()
        for base, _ in live:
            if cpu.mem_read(base, link_offset) != original_fields[base]:
                raise AssertionError(f'surviving identity data changed at {base:#x}')
        trace.append(f'{function} {name}: id={wanted:#x} releases={releases} writes={writes}\n'
                     + '  pc: ' + ' '.join(hex(pc) for pc in pcs) + '\n')
    return trace


def check(ndk, out):
    if 'Pkg.Revision = 27.2.12479018' not in (ndk / 'source.properties').read_text():
        raise ValueError('Use the lookup fixture NDK 27.2.12479018.')
    out.mkdir(parents=True, exist_ok=True)
    ndk_bin = ndk / 'toolchains/llvm/prebuilt/linux-x86_64/bin'
    build_reference(ndk_bin, out)
    compile_english(ndk_bin, PROGRAM / 'identity-find.english', out, 'find')
    source = DESTROY / 'identity-destroy.english'
    elf = link(ndk_bin, out, source, 'destroy')
    command([ndk_bin / 'llvm-objdump', '-dr', elf], out / 'disassembly.txt')
    records = [row for function in ['english_identity_destroy', 'identity_destroy']
               for case in CASES for row in run_case(elf, function, case)]
    (out / 'trace.txt').write_text(''.join(records))
    mutations = [
        ('skip-backlink', 'Store exactly four bytes from "predecessor link" at 4 bytes beyond the address in "requested id or successor link".', '', 'ring links differ'),
        ('wrong-release', 'Call the function named "identity_release"', 'Copy "predecessor link" into "sentinel or containing identity" without changing the condition flags.\nCall the function named "identity_release"', 'wrong release address'),
        ('retain-next', 'Put 256 into the low sixteen bits', 'Put 257 into the low sixteen bits', 'retired link markers differ'),
    ]
    for name, old, new, expected in mutations:
        text = source.read_text()
        if text.count(old) != 1:
            raise ValueError(f'{name}: expected exactly one affected instruction')
        variant = out / (name + '.english')
        variant.write_text(text.replace(old, new))
        try:
            run_case(link(ndk_bin, out, variant, name), 'english_identity_destroy', CASES[2])
        except AssertionError as error:
            if expected not in str(error):
                raise
            print(f'{name}: rejected ({error})')
        else:
            raise AssertionError(f'{name}: defective deletion passed')
    print(f'{len(records)} emulated deletions checked against expected list state and callback.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ndk', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    check(args.ndk.resolve(), args.output.resolve())
