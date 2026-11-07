// This harness supplies genuine objdump input to the Idriç-built executable.
// It does NOT parse ARM instructions on behalf of Idriç or count source patterns
// as language execution. Pinned A32 expected words/operands are independent
// machine-listing acceptance assertions, not an executable instruction model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync, statSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const executable=process.env.A32_BINARY;
if (!executable || !resolve(executable).startsWith(process.cwd()) ||
    !statSync(executable).isFile()) throw new Error('Missing actual Idriç-built A32_BINARY');
const original=readFileSync('arm/a32/r-qr/dqrls.armv7-a32.disasm.txt','utf8');
const sourceHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if (process.env.EXPECTED_SOURCE_SHA && sourceHead!==process.env.EXPECTED_SOURCE_SHA)
  throw new Error('The input checkout is not the exact requested PR head');
console.log('A32_IDRIC_SOURCE_HEAD '+sourceHead);

function actualParse(source, options=[]) {
  const dir=mkdtempSync(join(tmpdir(),'emc-a32-idric-'));
  try {
    const input=join(dir,'listing.txt');writeFileSync(input,source);
    return spawnSync(executable,[...options,input],{encoding:'utf8',timeout:15000,
      maxBuffer:1024*1024,shell:false});
  } finally {rmSync(dir,{recursive:true,force:true});}
}
function accepted(source) {
  const result=actualParse(source);
  assert.equal(result.error,undefined,String(result.error));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  return result.stdout.trim().split('\n');
}
function rejected(source,message) {
  const result=actualParse(source);
  assert.equal(result.error,undefined,String(result.error));
  assert.notEqual(result.status,0,'Invalid instruction unexpectedly accepted: '+source);
  assert.match(result.stdout,new RegExp(message));
}

const expected=[
  '0|e92d4ff0|store_selected_thirty_two_bit_register_values_below_stack_pointer_and_update_stack_pointer_without_changing_condition_flags|register_mask=20464',
  '4|e1a06003|copy_thirty_two_bit_register_contents_without_changing_condition_flags|r6|r3',
  '8|e592c000|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r2|0',
  '12|e24dd04c|subtract_unrotated_eight_bit_immediate_without_changing_condition_flags|r13|r13|76',
  '16|e5914000|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r4|r1|0',
  '20|e1a03002|copy_thirty_two_bit_register_contents_without_changing_condition_flags|r3|r2',
  '24|e1a0a001|copy_thirty_two_bit_register_contents_without_changing_condition_flags|r10|r1',
  '28|e1cc8fcc|clear_bits_selected_by_sign_extending_right_shift_without_changing_condition_flags|r8|r12|r12|sign_extending_right_shift|31',
  '32|e59dc074|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r13|116',
  '36|e1c44fc4|clear_bits_selected_by_sign_extending_right_shift_without_changing_condition_flags|r4|r4|r4|sign_extending_right_shift|31',
  '40|e59d2084|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r2|r13|132',
  '44|e58dc000|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r13|0',
  '48|e59dc088|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r13|136',
  '52|e58d2004|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r2|r13|4',
  '56|e58dc00c|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r13|12',
  '60|e59d208c|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r2|r13|140',
  '64|e59dc090|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r13|144',
  '68|e58d2008|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r2|r13|8',
  '72|e1a02001|copy_thirty_two_bit_register_contents_without_changing_condition_flags|r2|r1',
  '76|e58dc010|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r13|16',
  '80|e58d0028|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r0|r13|40',
  '84|e58d302c|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r3|r13|44',
  '88|e58d8038|store_thirty_two_bits_at_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r8|r13|56'
];
const machineLines=original.split('\n').filter(line=>/^\s*[0-9a-f]+:\s+[0-9a-f]{8}\s+\S+/i.test(line));
const prefix=machineLines.filter(line=>
  parseInt(line.match(/^\s*([0-9a-f]+):/i)[1],16)<=0x58);
assert.equal(prefix.length,23,'The original QR disassembly prefix has changed');

test('all 23 original dqrls A32 words match independently checked typed operands',()=>{
  assert.deepEqual(accepted(prefix.join('\n')+'\n'),[...expected,'A32_CHECKED_INSTRUCTIONS=23']);
});
test('source headers, symbol declarations and relocation rows are not instructions',()=>{
  assert.deepEqual(accepted('/tmp/r-qr-arm-capture/dqrls.armv7-a32.o:     file format elf32-littlearm\n'+
    'Disassembly of section .text:\n00000000 <dqrls_>:\n'+
    '5c: R_ARM_CALL dqrdc2_\n'+
    '60: R_ARM_JUMP24 external_target\n'+
    '64: 00000000 .word 0x00000000\n'),['A32_CHECKED_INSTRUCTIONS=0']);
});
test('physical alias sl identifies register r10 and ip identifies r12',()=>{
  assert.deepEqual(accepted('18: e1a0a001 mov sl, r1\n'+
    '8: e592c000 ldr ip, [r2]\n'),[
      '24|e1a0a001|copy_thirty_two_bit_register_contents_without_changing_condition_flags|r10|r1',
      '8|e592c000|load_thirty_two_bits_from_base_plus_unsigned_immediate_without_base_writeback_or_condition_flag_changes|r12|r2|0',
      'A32_CHECKED_INSTRUCTIONS=2'
  ]);
});
test('an incorrect printed source operand cannot survive a correct machine word',()=>{
  rejected('4: e1a06003 mov r6, r2\n','disagrees');
  rejected('8: e592c000 ldr ip, [r3]\n','disagrees');
});
test('register type restrictions reject PC and SP when disallowed',()=>{
  rejected('4: e1a06003 mov sp, r3\n','Unsupported');
  rejected('4: e1a06003 mov r6, pc\n','Unsupported');
  rejected('8: e592c000 ldr ip, [pc]\n','Unsupported');
});
test('reject incorrect opcode, flag variant, unknown shift and bad immediate',()=>{
  rejected('4: e1b06003 mov r6, r3\n','disagrees');
  rejected('4: e1a06003 mov r6, r3, lsl #2\n','Unsupported');
  rejected('1c: e1cc8fcc bic r8, ip, ip, asr #0\n','Unsupported');
  rejected('c: e24dd04c sub sp, sp, #257\n','Unsupported');
  rejected('8: e592c000 ldr ip, [sp, #4096]\n','Unsupported');
});
test('reject duplicate push registers and malformed machine word',()=>{
  rejected('0: e92d4ff0 push {r4, r4, r6}\n','Unsupported');
  rejected('4: z1a06003 mov r6, r3\n','Malformed');
});
test('unknown branch-and-save-return relocation remains unsupported rather than silently parsed',()=>{
  rejected('5c: ebfffffe bl 0 <dqrdc2_>\n','Unsupported');
  rejected(original,'Unsupported');
});

test('all classified rows preserve exact source text and line numbers on request',()=>{
  const source='/tmp/quoted path/dqrls.o: file format elf32-littlearm\n'+
    '\n00000000 <dqrls_>:\n  4: e1a06003 mov r6, r3  @ original annotation\n'+
    '5c: R_ARM_CALL dqrdc2_\n64: 00000000 .word 0x00000000\n';
  const result=actualParse(source,['--with-source']);
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  for(const [index,line] of source.trimEnd().split('\n').entries())
    assert.ok(result.stdout.split('\n').includes(`SOURCE|${index+1}|${line}`));
  assert.match(result.stdout,/A32_CHECKED_INSTRUCTIONS=1/);
});

test('unknown rows and malformed noninstruction records cannot hide machine bytes',()=>{
  rejected('/tmp/input.o: file format elf64-x86-64\n','Malformed');
  rejected('not-a-listing-record\n','Unsupported listing record');
  rejected('zz: R_ARM_CALL dqrdc2_\n','Malformed');
  rejected('64: z0000000 .word 0x00000000\n','Malformed');
  rejected('4: e1a06003 mov r6, r3\nnot-a-listing-record\n','line: 2');
});

test('each saved prefix word independently decodes to the same typed form without assembly text',()=>{
  for(const line of expected) {
    const fields=line.split('|');
    const result=spawnSync(executable,['--word',fields[1]],{encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
    assert.equal(result.stdout.trim(),fields.slice(2).join('|'));
  }
});

test('word-only decoder rejects changed conditions flags writeback roles and shift fields',()=>{
  const invalid=['e1b06003','01a06003','e5b2c000','e592f000','e59fc000',
    'e1a06023','e1cc804c','e92d2000','e92d8000','e92d0000','e24dd14c','ebfffffe'];
  for(const word of invalid) {
    const result=spawnSync(executable,['--word',word],{encoding:'utf8',timeout:15000});
    assert.equal(result.status,1,'Invalid raw encoding was admitted: '+word);
    assert.match(result.stdout,/Unsupported/);
  }
});


const englishSource=readFileSync(
  'arm/a32/r-qr/ARM entry before its first call.english','utf8');

function actualEnglish(source) {
  const dir=mkdtempSync(join(tmpdir(),'emc-english-qr-'));
  try {
    const input=join(dir,'entry.english'); writeFileSync(input,source);
    return spawnSync(executable,['--english',input],{encoding:'utf8',timeout:15000,
      maxBuffer:1024*1024,shell:false});
  } finally {rmSync(dir,{recursive:true,force:true});}
}

function checkedEnglish(source) {
  const result=actualEnglish(source);
  assert.equal(result.error,undefined,String(result.error));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  return result.stdout.trim().split('\n');
}

test('all 23 original English sentences compile independently to the original A32 words',()=>{
  const lines=checkedEnglish(englishSource);
  const originals=englishSource.split('\n').filter(line=>line.startsWith('At byte offset '));
  const echoed=lines.filter(line=>line.startsWith('ENGLISH|'));
  const emitted=lines.filter(line=>line.startsWith('WORD|'));
  assert.equal(originals.length,23);
  assert.equal(echoed.length,23);
  assert.equal(emitted.length,23);
  assert.equal(lines.at(-1),'A32_ENGLISH_INSTRUCTIONS=23');
  assert.deepEqual(echoed.map(line=>line.split('|').slice(2).join('|')),originals);
  const originalWordPairs=prefix.map(line=>{
    const fields=line.match(/^\s*([0-9a-f]+):\s+([0-9a-f]{8})\s+/i);
    assert.ok(fields);
    return [parseInt(fields[1],16).toString(10),fields[2].toLowerCase()];
  });
  const generatedWordPairs=emitted.map(line=>{
    const fields=line.split('|');
    assert.equal(fields[0],'WORD');
    assert.match(fields[2],/^[0-9a-f]{8}$/);
    return fields.slice(1,3);
  });
  assert.deepEqual(generatedWordPairs,originalWordPairs,
    'English-to-word emission differs from the preserved original QR object');
  // A separately written machine-word decoder must recognize every emission.
  for(const line of emitted) {
    const [_,address,word,...englishOperation]=line.split('|');
    const decoded=spawnSync(executable,['--word',word],{encoding:'utf8',timeout:15000});
    assert.equal(decoded.status,0,decoded.stdout+'\n'+decoded.stderr);
    assert.equal(decoded.stdout.trim(),englishOperation.join('|'),'Mismatched form at '+address);
  }
});

test('valid English operand change produces a different machine word rather than looking up an archived word',()=>{
  const modified=englishSource.replace(
    'At byte offset 0x0004, copy the four-byte value in register r3 into register r6.',
    'At byte offset 0x0004, copy the four-byte value in register r2 into register r6.');
  assert.notEqual(modified,englishSource);
  const emitted=checkedEnglish(modified).filter(line=>line.startsWith('WORD|'));
  assert.equal(emitted.length,23);
  assert.match(emitted[1],/^WORD\|4\|e1a06002\|/);
  assert.notEqual(emitted[1].split('|')[2],originalWordPairsForFirstMove());
});
function originalWordPairsForFirstMove() {
  return 'e1a06003';
}

test('English grammar rejects invalid registers, operand bounds, words and altered semantics',()=>{
  const mutations=[
    englishSource.replace('into register r6.','into register r16.'),
    englishSource.replace('plus 0x90 into register r12.','plus 0x1000 into register r12.'),
    englishSource.replace('subtract 0x4c from','subtract 0x100 from'),
    englishSource.replace('r4, r5, r6, r7','r4, r6, r5, r7'),
    englishSource.replace('its signed four-byte value is nonnegative','its signed four-byte value is negative'),
    englishSource.replace('into register r6.','inside register r6.'),
    englishSource.replace('at register r2 plus 0x0','at register r15 plus 0x0'),
    englishSource+'\nAt byte offset 0x005c, call an unresolved target.\n'
  ];
  for(const altered of mutations) {
    assert.notEqual(altered,englishSource);
    const result=actualEnglish(altered);
    assert.equal(result.error,undefined,String(result.error));
    assert.notEqual(result.status,0,'Invalid English sentence was accepted');
    assert.match(result.stdout,/Unsupported English machine sentence/);
  }
});

// Exact 23-word boundary: grammatical instructions are still disallowed if
// they add, remove, duplicate, reorder or move an original four-byte slot.
test('the English QR entry stops at 0x0058 and preserves exactly 23 offsets',()=>{
  const extraValidInstruction=englishSource+
    'At byte offset 0x005c, copy the four-byte value in register r3 into register r6.\n';
  const missingInstruction=englishSource.replace(
    /^At byte offset 0x0010,.*\n/m,'');
  const duplicateOffset=englishSource.replace(
    'At byte offset 0x0018,','At byte offset 0x0014,');
  const outOfOrder=englishSource.replace(
    'At byte offset 0x0018,','At byte offset 0x0020,');
  for(const altered of [extraValidInstruction,missingInstruction,duplicateOffset,outOfOrder]){
    assert.notEqual(altered,englishSource);
    const result=actualEnglish(altered);
    assert.equal(result.error,undefined,String(result.error));
    assert.notEqual(result.status,0,'Out-of-scope English entry was accepted');
    assert.match(result.stdout,/exactly 23 ascending four-byte offsets/);
  }
});
