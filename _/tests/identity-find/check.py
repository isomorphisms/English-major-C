"""Build the two Task 12 find functions and compare their ARM execution."""

import argparse
import hashlib
import struct
import subprocess
from pathlib import Path

from elftools.elf.elffile import ELFFile
from unicorn import Uc, UC_ARCH_ARM, UC_MODE_THUMB, UC_HOOK_CODE, UC_HOOK_MEM_READ, UC_HOOK_MEM_WRITE
from unicorn.arm_const import UC_ARM_REG_LR, UC_ARM_REG_R0, UC_ARM_REG_R1, UC_ARM_REG_SP, UC_ARM_REG_PC

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROGRAM = ROOT / 'arm/thumb/identity-find'
REFERENCE = ROOT / 'kernel/eudyptula/task-12/identity.c'
STOP = 0x600000
NODES = (0x800100, 0x802200, 0x801040)
STACK = 0x900000
FLAGS = ('--target=armv7a-linux-androideabi21', '-march=armv7-a', '-mthumb',
         '-ffreestanding', '-fno-pic', '-fno-pie', '-O2')
CASE_IDS = (4, 0xffffffff, 4)
CASES = (
    ('empty', 0, 4, None),
    ('first', 3, 4, 0),
    ('middle signed', 3, 0xffffffff, 1),
    ('last', 3, 12, 2),
    ('miss', 3, 42, None),
)


def command(arguments, receipt=None):
    result = subprocess.run(arguments, check=True, capture_output=True)
    if receipt:
        receipt.write_bytes(result.stdout)
    return result.stdout


def compile_english(ndk_bin, source, out, name):
    assembly = out / (name + '.s')
    command(['node', ROOT / '_/tools/compile-english-assembly.mjs', source, assembly])
    if source.is_relative_to(ROOT / 'arm/thumb'):
        if assembly.read_bytes() != (source.parent / 'generated-thumb.s').read_bytes():
            raise ValueError(f'Regenerate {source.parent.name} assembly.')
    obj = out / (name + '.o')
    command([ndk_bin / 'clang', *FLAGS, '-c', assembly, '-o', obj])
    return obj


def build(ndk, out, source, name):
    bin_dir = ndk / 'toolchains/llvm/prebuilt/linux-x86_64/bin'
    clang = bin_dir / 'clang'
    assembly = out / f'{name}.s'
    command(['node', ROOT / '_/tools/compile-english-assembly.mjs', source, assembly])
    if name == 'english' and assembly.read_bytes() != (PROGRAM / 'generated-thumb.s').read_bytes():
        raise ValueError('Regenerate the checked-in Thumb source.')
    command([clang, *FLAGS, '-c', assembly, '-o', out / f'{name}.o'])
    elf = out / f'{name}.elf'
    command([clang, *FLAGS, '-nostdlib', '-static', '-Wl,--build-id=none,-e,english_identity_find',
             out / f'{name}.o', out / 'reference.o', '-o', elf])
    return elf


def load(elf):
    emulator = Uc(UC_ARCH_ARM, UC_MODE_THUMB)
    with elf.open('rb') as binary:
        image = ELFFile(binary)
        symbols = {s.name: s['st_value'] for s in image.get_section_by_name('.symtab').iter_symbols()}
        mapped = set()
        for segment in image.iter_segments():
            if segment['p_type'] != 'PT_LOAD':
                continue
            start = segment['p_vaddr']
            for page in range(start & ~4095, start + segment['p_memsz'], 4096):
                if page not in mapped:
                    emulator.mem_map(page, 4096)
                    mapped.add(page)
            emulator.mem_write(start, segment.data())
    return emulator, symbols


def run_case(elf, function, case):
    label, length, wanted, wanted_node = case
    machine, symbols = load(elf)
    identity_size, id_offset, link_offset, link_size = struct.unpack(
        '<4I', machine.mem_read(symbols['identity_layout'], 16))
    layout = (identity_size, id_offset, link_offset, link_size)
    if layout != (36, 20, 28, 8):
        raise AssertionError(f'Unexpected reference layout: {layout}')
    head = struct.unpack('<I', machine.mem_read(symbols['reference_head'], 4))[0]
    machine.mem_map(0x800000, 0x3000)
    machine.mem_map(STACK, 4096)
    machine.mem_map(STOP, 4096)
    def put(address, value):
        machine.mem_write(address, struct.pack('<I', value))

    ids = list(CASE_IDS[:length])
    if label == 'last':
        ids[-1] = 12
    links = [head] + [base + link_offset for base in NODES[:length]]
    for index, link in enumerate(links):
        put(link, links[(index + 1) % len(links)])
        put(link + 4, links[index - 1])
    for base, number in zip(NODES, ids):
        put(base + id_offset, number)
    expected_reads = [head]
    for index in range(length):
        expected_reads.append(NODES[index] + id_offset)
        if index == wanted_node:
            break
        expected_reads.append(NODES[index] + link_offset)
    expected_result = NODES[wanted_node] if wanted_node is not None else 0
    machine.reg_write(UC_ARM_REG_LR, STOP | 1)
    machine.reg_write(UC_ARM_REG_SP, STACK + 4096)
    if function == 'english_identity_find':
        machine.reg_write(UC_ARM_REG_R0, head)
        machine.reg_write(UC_ARM_REG_R1, wanted)
    else:
        machine.reg_write(UC_ARM_REG_R0, wanted)
    reads, pcs, writes = [], [], []
    def observe_read(cpu, access, address, size, value, user):
        if not STACK <= address < STACK + 4096:
            reads.append((address, size, int.from_bytes(cpu.mem_read(address, size), 'little')))
    def observe_write(cpu, access, address, size, value, user):
        if not STACK <= address < STACK + 4096:
            writes.append(address)
    machine.hook_add(UC_HOOK_CODE, lambda cpu, pc, size, data: pcs.append(pc))
    machine.hook_add(UC_HOOK_MEM_READ, observe_read)
    machine.hook_add(UC_HOOK_MEM_WRITE, observe_write)
    machine.emu_start(symbols[function], STOP, count=200)
    if machine.reg_read(UC_ARM_REG_PC) != STOP:
        raise AssertionError('search did not return within the instruction budget')
    actual = machine.reg_read(UC_ARM_REG_R0)
    if actual != expected_result:
        raise AssertionError(f'{label}: returned {actual:#x}, expected {expected_result:#x}')
    if writes or [(address, size) for address, size, value in reads] != [(a, 4) for a in expected_reads]:
        raise AssertionError(f'{label}: wrong memory access sequence: reads={reads}, writes={writes}')
    trace = ' '.join(f'{address:#x}={value:#x}' for address, size, value in reads)
    return f'{function} {label}: result={actual:#x}\n  pc: ' + ' '.join(hex(pc) for pc in pcs) + f'\n  list reads: {trace}\n'


def pinned_reference_source():
    original = REFERENCE.read_bytes()
    if hashlib.sha256(original).hexdigest() != '4a4b342b95a97f51db2f119a44cc97907378bc2b8f2efd7aea14970859c15019':
        raise ValueError('Imported identity.c differs from the pinned specimen.')
    return original


def check(ndk, out):
    if 'Pkg.Revision = 27.2.12479018' not in (ndk / 'source.properties').read_text():
        raise ValueError('Task 12 uses NDK 27.2.12479018.')
    out.mkdir(parents=True, exist_ok=True)
    original = pinned_reference_source()
    excerpt = original[original.index(b'#define NAME_LEN'):original.index(b'/* CREATE */')]
    reference = out / 'reference.c'
    reference.write_bytes((HERE / 'reference-prefix.h').read_bytes() + excerpt + (HERE / 'reference-suffix.h').read_bytes())
    bin_dir = ndk / 'toolchains/llvm/prebuilt/linux-x86_64/bin'
    command([bin_dir / 'clang', *FLAGS, '-c', reference, '-o', out / 'reference.o'])
    source = PROGRAM / 'identity-find.english'
    elf = build(ndk, out, source, 'english')
    for artifact in [out / 'reference.o', out / 'english.o', elf]:
        command([bin_dir / 'llvm-objdump', '-dr', artifact], out / (artifact.name + '.disassembly'))
    records = [run_case(elf, function, case) for function in ('english_identity_find', 'identity_find') for case in CASES]
    (out / 'trace.txt').write_text(''.join(records))
    for name, old, new in [('offset', '20 bytes beyond', '24 bytes beyond'),
                           ('container', 'Copy "containing identity"', 'Copy "current link"')]:
        bad_source = out / f'{name}.english'
        bad_source.write_text(source.read_text().replace(old, new))
        mutated = build(ndk, out, bad_source, name)
        try:
            run_case(mutated, 'english_identity_find', CASES[1])
        except AssertionError as failure:
            if 'returned' not in str(failure):
                raise
            print(f'{name}: rejected ({failure})')
        else:
            raise AssertionError(f'Incorrect {name} accepted')
    print(f'{len(records)} ARM executions matched return addresses and ordered list reads.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ndk', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    check(args.ndk.resolve(), args.output.resolve())
