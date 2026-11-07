#!/usr/bin/env node
// Verifies source coverage, not x86-64 instruction semantics.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve_repository_path } from '../../../tools/resolve-repository-path.mjs';
const sources = [
  { filename: 'dqrls.x86-64.disasm.txt', count: 165,
    sha256: '968488c7e15ab89373587fa66e65fffc62cdc92bccca2e9d63c40728d69910f2' },
  { filename: 'dqrdc2.x86-64.disasm.txt', count: 465,
    sha256: '1d39427ac5b32ddab7a22a303150cb9c8e29b2fa03df49f81ba88d39be58e0c4' },
  { filename: 'dqrsl.x86-64.disasm.txt', count: 662,
    sha256: 'ce2660259bd9dd68a76f1e00b9082c6a92d2d04071686ff97543e0386fed25fe' },
  { filename: 'linked-executable.x86-64.disasm.txt', count: 1543,
    sha256: '97bd72262cbef21da2115c435b41eb50685723541d0bb015ff9b20436240ed25' },
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function parseOriginalListing(source, filename) {
  const records = [];
  let pending = null;
  let section = 'unlabeled';
  for (const line of source.split('\n')) {
    const byteLine = line.match(/^\s*([0-9a-f]+):\t([0-9a-f ]+)(?:\t(.+))?$/i);
    if (byteLine) {
      const offset = Number.parseInt(byteLine[1], 16);
      const bytes = byteLine[2].trim().split(/\s+/);
      if (byteLine[3]) {
        if (pending) records.push(pending);
        pending = { offset, bytes, assembly: byteLine[3].trim(),
                    section, relocations: [] };
      } else {
        requireCondition(pending && pending.offset + pending.bytes.length === offset,
          filename + ': orphan or misplaced continuation bytes at 0x' + offset.toString(16));
        pending.bytes.push(...bytes);
      }
      continue;
    }
    const relocation = line.match(/^\s*([0-9a-f]+):\s+(R_X86_64_\S+)\s+(.+?)\s*$/);
    if (relocation) {
      const offset = Number.parseInt(relocation[1], 16);
      requireCondition(pending &&
        offset >= pending.offset &&
        offset < pending.offset + pending.bytes.length,
        filename + ': relocation not inside printed instruction');
      pending.relocations.push(relocation[1] + ': ' + relocation[2] + ' ' + relocation[3]);
      continue;
    }
    const symbol = line.match(/^[0-9a-f]{8,16} <([^>]+)>:$/i);
    if (symbol) { section = symbol[1]; continue; }
    if (/^\s*$|^Disassembly of section|^\S+:     file format|^\S+:$/.test(line))
      continue;
    throw new Error(filename + ': unrecognized raw disassembly line: ' + line);
  }
  if (pending) records.push(pending);
  for (let index = 0; index < records.length; index++) {
    const row = records[index];
    requireCondition(row.bytes.length > 0 && row.bytes.length <= 15,
      filename + ': invalid instruction byte count at 0x' + row.offset.toString(16));
    if (index > 0)
      requireCondition(records[index - 1].offset +
        records[index - 1].bytes.length <= row.offset,
        filename + ': overlapping disassembly records');
  }
  return records;
}

function verifyLedger(filename, original, annotated, expectedCount, expectedHash) {
  const actualHash = createHash('sha256').update(original).digest('hex');
  requireCondition(actualHash === expectedHash,
    filename + ': original bytes do not match pinned SHA-256');

  const sourceRows = parseOriginalListing(original.toString('utf8'), filename);
  requireCondition(sourceRows.length === expectedCount,
    filename + ': original instruction count changed');

  const translatedRows = annotated.split('\n').filter(line => line.startsWith('INSTRUCTION '));
  requireCondition(translatedRows.length === expectedCount,
    filename + ': a machine instruction was omitted, added or duplicated');

  const allLines = annotated.split('\n');
  let translatedIndex = 0;
  for (let lineIndex = 0; lineIndex < allLines.length; lineIndex++) {
    const line = allLines[lineIndex];
    if (!line.startsWith('INSTRUCTION ')) continue;
    const parsed = line.match(/^INSTRUCTION (\d{4}) \| 0x([0-9a-f]+) \| ((?:[0-9a-f]{2})(?: [0-9a-f]{2})*) \| (.+)$/);
    requireCondition(parsed, filename + ': malformed annotated instruction record');
    const originalRow = sourceRows[translatedIndex];
    const expectedNumber = String(translatedIndex + 1).padStart(4, '0');
    requireCondition(parsed[1] === expectedNumber &&
      Number.parseInt(parsed[2], 16) === originalRow.offset &&
      parsed[3] === originalRow.bytes.join(' ') &&
      parsed[4] === originalRow.assembly,
      filename + ': machine bytes/address/instruction mismatch at record ' + (translatedIndex + 1));

    const nextLines = allLines.slice(lineIndex + 1, lineIndex + 6);
    requireCondition(nextLines.length === 5, filename + ': incomplete explanatory block');
    requireCondition(nextLines[0] === '  Section or entry point: ' + originalRow.section + '.',
      filename + ': wrong source routine at record ' + (translatedIndex + 1));
    requireCondition(nextLines[1].startsWith('  Long operation: ') &&
      nextLines[1].length > 21,
      filename + ': missing English operation name');
    requireCondition(nextLines[2].startsWith('  Detailed first-pass effect: ') &&
      nextLines[2].length > 42,
      filename + ': missing operand-specific effect');
    const nextOffset = originalRow.offset + originalRow.bytes.length;
    const nextLabel = '  Sequential successor if not otherwise redirected or faulting: 0x' +
      nextOffset.toString(16) + ' (' + originalRow.bytes.length +
      ' byte' + (originalRow.bytes.length === 1 ? '' : 's') + ').';
    requireCondition(nextLines[3] === nextLabel,
      filename + ': wrong length / execution-index successor');
    const relocated = originalRow.relocations.length ?
      originalRow.relocations.join(' ; ') : 'none';
    requireCondition(nextLines[4] === '  Link-time relocation: ' + relocated + '.',
      filename + ': missing or changed relocation');
    translatedIndex++;
  }
  requireCondition(translatedIndex === expectedCount,
    filename + ': not every machine instruction was checked');
  return { count: translatedIndex, relocations: sourceRows.reduce(
    (sum, row) => sum + row.relocations.length, 0) };
}

function expectRejection(test, label) {
  try { test(); } catch { return; }
  throw new Error('FAIL: mutated English crosswalk was accepted (' + label + ')');
}

let total = 0;
for (const source of sources) {
  const original = readFileSync(resolve_repository_path('examples/r-lm-native-x86-64/' + source.filename));
  const annotated = readFileSync(resolve_repository_path('examples/r-lm-native-x86-64/english-translation/' +
    source.filename.replace('.disasm.txt', '.instructions.english')), 'utf8');

  const run = value => verifyLedger(
    source.filename, original, value, source.count, source.sha256);
  const result = run(annotated);
  total += result.count;

  if (process.argv.includes('--self-test')) {
    expectRejection(() => run(annotated.replace(/^INSTRUCTION 0001\b/m,
      'INSTRUCTION 9999')), source.filename + ': record number');
    expectRejection(() => run(annotated.replace(
      /^(INSTRUCTION 0001 \| 0x[0-9a-f]+ \| )([0-9a-f]{2})/m,
      (_all, prefix, byte) => prefix + (byte === '00' ? '01' : '00'))),
      source.filename + ': machine byte');
    expectRejection(() => run(annotated.replace(
      /^  Detailed first-pass effect: [^\n]*\n/m, '')),
      source.filename + ': missing explanation');
    expectRejection(() => run(annotated.replace(
      /^INSTRUCTION 0001[^\n]*\n(?:[^\n]*\n){6}/m, '')),
      source.filename + ': missing instruction');
  }

  process.stdout.write('PASS coverage: ' + source.filename + ': ' +
    result.count + ' records, ' + result.relocations + ' relocations\n');
}
process.stdout.write('PASS: ' + total +
  ' source-aligned instruction records; NOT proof of machine semantic accuracy\n');
if (process.argv.includes('--self-test'))
  process.stdout.write('PASS: mutated number/bytes, missing effect and dropped row rejected\n');
