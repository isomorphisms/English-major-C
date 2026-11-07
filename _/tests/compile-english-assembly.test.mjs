import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { compileEnglishToThumbAssembly } from '../tools/compile-english-assembly.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../arm/thumb/addition/An unknown entry is omitted from an addition.english'), 'utf8');
const compile = (text) => compileEnglishToThumbAssembly(text);

test('the complete unknown-entry program produces the declared Thumb operations', () => {
  const output = compile(source);
  const machineInstructions = output.split('\n').filter((line) => /^    (?:mov\.w|movw|movt|cmp|beq\.n|ldr\.w|add\.w|sub\.w|b\.n|bx)\b/.test(line));
  assert.equal(machineInstructions.length, 14);
  assert.match(output, /movw r12, #65535/);
  assert.match(output, /movt r12, #65535/);
  assert.match(output, /cmp r3, r12\n.*beq\.n english_instruction_check_whether_any_entries_remain/s);
  assert.match(output, /add\.w r2, r2, r3/);
  assert.match(output, /mov\.w r0, r2/);
  assert.match(output, /bx lr/);
  assert.equal(compile(source), output, 'Repeated compilation must produce identical output.');
});

test('an instruction without an explicitly granted English sentence is rejected', () => {
  assert.throws(() => compile(source.replace('Increase "address of the next entry" by four without changing the condition flags.', 'Guess which entry is next.')), /does not recognize or permit/);
});

test('an undeclared register name is rejected', () => {
  assert.throws(() => compile(source.replace('Copy "running total" into "address of the next entry"', 'Copy "unmentioned total" into "address of the next entry"')), /No machine register has been given the name/);
});

test('a branch to an unnamed instruction is rejected', () => {
  assert.throws(() => compile(source.replace('instruction named "return the result".', 'instruction named "nowhere in the program".')), /There is no instruction named/);
});

test('duplicated instruction names are rejected', () => {
  assert.throws(() => compile(source.replace('Name the following instruction "return the result".', 'Name the following instruction "check whether any entries remain".')), /Duplicate or ambiguous instruction name/);
});

test('one physical register cannot be renamed twice', () => {
  assert.throws(() => compile(source.replace('Name register one "number of entries remaining".', 'Name register zero "number of entries remaining".')), /must be unique/);
});

test('the program must have an explicit final return instruction', () => {
  assert.throws(() => compile(source.replace('Replace the execution index with the instruction address in the link register.', '')), /requires an explicit final return/);
});

test('a different architecture cannot silently replace the chosen machine', () => {
  assert.throws(() => compile(source.replace('ARMv7-A Thumb', 'x86-64')), /Declare the physical instruction set first/);
});
