import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { compileEnglishToX86Assembly } from '../tools/compile-english-x86-64.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here,
  '../../x86/addition/An unknown entry is omitted using x86-64 instructions.english'), 'utf8');
const generated = readFileSync(resolve(here,
  '../../x86/addition/generated-x86-64.s'), 'utf8');
const compile = text => compileEnglishToX86Assembly(text);

test('all English instruction sentences compile deterministically to x86-64', () => {
  const asm = compile(source);
  assert.equal(asm, generated, 'Checked-in x86-64 machine source must match generated output byte for byte.');
  assert.equal(asm.split('\n').filter(x => /^    (?:mov|or|cmp|je|lea|jmp|ret) /.
    test(x) || x.trim() === 'ret').length, 14);
  assert.match(asm, /mov r8d, 65535\n.*or r8d, 0xffff0000/s);
  assert.match(asm, /lea edx, \[rdx \+ rcx\]/);
  assert.match(asm, /lea rdi, \[rdi \+ 4\]/);
  assert.match(asm, /lea esi, \[rsi - 1\]/);
  assert.match(asm, /je english_instruction_check_whether_any_entries_remain/);
  assert.match(asm, /mov eax, edx\n.*ret/s);
  assert.equal(compile(source), asm);
});

test('never silently accept ARM as an x86 source', () => {
  assert.throws(() => compile(source.replace('x86-64 instructions', 'ARMv7-A Thumb instructions')),
    /Declare the x86-64 instruction architecture/);
});

test('unknown English operation is rejected', () => {
  assert.throws(() => compile(source.replace('Increase "address of the next entry" by four without changing the condition flags.',
    'Move to the next entry, somehow.')),
  /does not permit this English sentence/);
});

test('a register must be explicitly declared before use', () => {
  assert.throws(() => compile(source.replace('Copy "running total" into "return value"',
    'Copy "an undeclared value" into "return value"')),
  /Undeclared register name/);
});

test('duplicate register allocation is rejected', () => {
  assert.throws(() => compile(source.replace('Name register r8 "unknown marker".',
    'Name register rdx "unknown marker".')),
  /Duplicate or ambiguous register declaration/);
});

test('wrong physical calling convention is rejected', () => {
  assert.throws(() => compile(source.replace('Name register rdi "address of the next entry".',
    'Name register rax "address of the next entry".')),
  /fixed and explicitly checked x86-64 calling convention/);
});

test('a missing instruction label is rejected', () => {
  assert.throws(() => compile(source.replace('instruction named "return the result".',
    'instruction named "unrecorded target".')),
  /No instruction named/);
});

test('duplicate instruction labels are rejected', () => {
  assert.throws(() => compile(source.replace('Name the following instruction "return the result".',
    'Name the following instruction "prepare the total".')),
  /Duplicate machine-instruction label/);
});

test('missing explicit machine return is rejected', () => {
  assert.throws(() => compile(source.replace('Return to the address saved by the machine call operation.', '')),
    /explicit return/);
});

test('flag-setting arithmetic cannot silently replace the chosen flag-preserving instruction', () => {
  assert.throws(() => compile(source.replace('Increase "address of the next entry" by four without changing the condition flags.',
    'Increase "address of the next entry" by four and update the condition flags.')),
  /does not permit this English sentence/);
});

test('extra executable instructions are rejected by the specimen contract', () => {
  assert.throws(() => compile(source.replace('Return to the address saved by the machine call operation.',
    'Copy "running total" into "return value" without changing the condition flags.\nReturn to the address saved by the machine call operation.')),
  /exactly 14 machine instructions/);
});
