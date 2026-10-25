#!/usr/bin/env node
// Pinned source-coverage audit. NOT a verifier of ARM ISA semantics.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve_repository_path } from '../../../tools/resolve-repository-path.mjs';
const sources = [
  { stem: 'dqrls', sha256: '83020ab3d77340dd3b751118df5b8883cd5375be2571b620a33b607512e58662',
    instructions: 131, data: 1, relocations: 3, ellipses: 0, gaps: 0 },
  { stem: 'dqrdc2', sha256: '334a19d1938e806195939c32e80f463351430516623b338797c23a1a9fe1f762',
    instructions: 442, data: 5, relocations: 11, ellipses: 1, gaps: 1 },
  { stem: 'dqrsl', sha256: 'c20016fb23dc159e8d3ea82bd81d244b82522b4f1c7039e6db81f4cf40bb26cc',
    instructions: 576, data: 10, relocations: 29, ellipses: 0, gaps: 0 },
];

function demand(ok, reason) {
  if (!ok) throw new Error(reason);
}
function parse(raw, name) {
  const records = [], leftovers = [];
  let symbol = 'unlabeled', pending = null, ellipses = 0;
  for (const line of raw.split('\n')) {
    const printed = line.match(/^\s*([0-9a-f]+):\s*([0-9a-f]{8})\s+(\.?[a-z][a-z0-9_.]*)\s*(.*?)\s*$/i);
    if (printed) {
      const address = Number.parseInt(printed[1], 16);
      if (pending) demand(address >= pending.address + 4,
        name + ': overlapping actual 4-byte records');
      pending = { address, word: printed[2].toLowerCase(),
        name: printed[3].toLowerCase(), arguments: printed[4],
        kind: printed[3].startsWith('.') ? 'data' : 'instruction',
        symbol, relocations: [] };
      records.push(pending);
      continue;
    }
    const reloc = line.match(/^\s*([0-9a-f]+):\s+(R_ARM_\S+)\s+(.+?)\s*$/);
    if (reloc) {
      demand(pending && pending.address === Number.parseInt(reloc[1], 16),
        name + ': orphan relocation ' + line);
      pending.relocations.push(reloc[2] + ' ' + reloc[3]);
      continue;
    }
    const header = line.match(/^[0-9a-f]{8} <([^>]+)>:$/);
    if (header) { symbol = header[1]; continue; }
    if (/^\s*\.\.\.\s*$/.test(line)) { ellipses++; continue; }
    if (/^\s*$|^Disassembly of section|^\S+:     file format/.test(line)) continue;
    leftovers.push(line);
  }
  demand(leftovers.length === 0, name + ': unclassified original lines: ' + leftovers.join('\n'));
  const gaps = [];
  for (let i = 1; i < records.length; i++) {
    const expected = records[i - 1].address + 4;
    if (records[i].address > expected)
      gaps.push({ start: expected, end: records[i].address - 1,
        size: records[i].address - expected, after: records[i - 1].address,
        before: records[i].address });
  }
  return { records, gaps, ellipses };
}

function check(stem, originalBytes, annotated, expected) {
  demand(createHash('sha256').update(originalBytes).digest('hex') === expected.sha256,
    stem + ': original archived disassembly bytes differ from SHA256SUMS');
  const raw = parse(originalBytes.toString('utf8'), stem);
  const N = raw.records.filter(x => x.kind === 'instruction').length;
  const D = raw.records.filter(x => x.kind === 'data').length;
  const R = raw.records.reduce((count, row) => count + row.relocations.length, 0);
  demand(N === expected.instructions && D === expected.data &&
    R === expected.relocations && raw.ellipses === expected.ellipses &&
    raw.gaps.length === expected.gaps, stem + ': actual original inventory changed');

  const lines = annotated.split('\n');
  const entries = lines.map((line, index) => ({ line, index }))
    .filter(row => /^(INSTRUCTION|DATA) /.test(row.line));
  demand(entries.length === N + D, stem + ': missing or duplicated record(s)');
  let countI = 0, countD = 0;
  for (let i = 0; i < raw.records.length; i++) {
    const item = raw.records[i], found = entries[i];
    const position = item.address.toString(16);
    const id = item.kind === 'instruction' ?
      'INSTRUCTION ' + String(++countI).padStart(4, '0') :
      'DATA ' + String(++countD).padStart(4, '0');
    const asm = item.name + (item.arguments ? ' ' + item.arguments : '');
    const expectedHeader = id + ' | 0x' + position + ' | ' + item.word + ' | ' + asm;
    demand(found.line === expectedHeader, stem + ': incorrect word/offset/assembler at record ' + (i + 1));
    const following = lines.slice(found.index + 1, found.index + 8);
    demand(following[0] === '  Original section or symbol: ' + item.symbol + '.',
      stem + ': incorrect source symbol at ' + position);
    const relocations = item.relocations.length ? item.relocations.join(' ; ') : 'none';
    if (item.kind === 'instruction') {
      demand(/^  Predicate: (?:AL|EQ|NE|CS|CC|HI|LS|GT|GE|LT|LE|MI|PL|VS|VC|HS|LO) \(.+\)\.$/.test(following[1]),
        stem + ': missing condition predicate at ' + position);
      demand(following[2]?.startsWith('  Long operation: ') && following[2].length > 40,
        stem + ': missing long ordinary-English name at ' + position);
      demand(following[3]?.startsWith('  First-pass state effect: ') &&
        following[3].length > 160 && following[3].includes('"' + item.arguments + '"'),
        stem + ': missing operand-specific English effect at ' + position);
      demand(following[4] === '  Normal sequential execution index only: 0x' +
        (item.address + 4).toString(16) + ' (4 encoded bytes).',
        stem + ': incorrect next execution-index address at ' + position);
      demand(following[5] === '  Link-time relocation: ' + relocations + '.',
        stem + ': altered instruction relocation at ' + position);
    } else {
      demand(following[1] === '  Purpose: literal/data word; not a granted executable ARM instruction.',
        stem + ': data was relabeled as code at ' + position);
      demand(following[2]?.startsWith('  Meaning: ') && following[2].length > 70,
        stem + ': missing literal data explanation at ' + position);
      demand(following[3] === '  Relocation: ' + relocations + '.',
        stem + ': altered data relocation at ' + position);
    }
  }

  const gapLines = lines.filter(line => line.startsWith('GAP '));
  demand(gapLines.length === raw.gaps.length,
    stem + ': an unprinted byte gap was hidden or invented');
  for (let i = 0; i < raw.gaps.length; i++) {
    const g = raw.gaps[i];
    const line = 'GAP 0x' + g.start.toString(16) + '..0x' +
      g.end.toString(16) + ' | ' + g.size + ' unprinted byte(s), after 0x' +
      g.after.toString(16) + ' and before 0x' + g.before.toString(16) +
      '. These bytes require direct original ELF inspection before any decode claim.';
    demand(gapLines[i] === line, stem + ': changed address span for omitted bytes');
  }
  demand(annotated.includes('Original GNU objdump ellipsis markers: ' + raw.ellipses +
    '; no instruction is synthesized for an ellipsis.'),
    stem + ': omitted original disassembly ellipsis');
  return { instructions: N, data: D, relocations: R, ellipses: raw.ellipses };
}

function expectFailure(call, description) {
  let rejected = false;
  try { call(); } catch { rejected = true; }
  demand(rejected, 'BAD TEST: ' + description + ' was accepted');
}

let total = 0;
for (const row of sources) {
  const originalBytes = readFileSync(resolve_repository_path('examples/r-lm-native-armv7-a32/' + row.stem + '.armv7-a32.disasm.txt'));
  const translated = readFileSync(resolve_repository_path('examples/r-lm-native-armv7-a32/english-concordance/' +
    row.stem + '.armv7-a32.instructions.english'), 'utf8');
  const verify = (src, text) => check(row.stem, src, text, row);
  const observed = verify(originalBytes, translated);
  total += observed.instructions;

  if (process.argv.includes('--self-test')) {
    expectFailure(() => verify(originalBytes,
      translated.replace(/^INSTRUCTION 0001\b/m, 'INSTRUCTION 9000')),
      row.stem + ' mutated number');
    expectFailure(() => verify(originalBytes,
      translated.replace(/^(INSTRUCTION 0001 \| 0x[0-9a-f]+ \| )[0-9a-f]{8}/m,
        (_match, header) => header + 'ffffffff')), row.stem + ' mutated A32 word');
    expectFailure(() => verify(originalBytes,
      translated.replace(/^  First-pass state effect: [^\n]*\n/m, '')),
      row.stem + ' missing English effect');
    expectFailure(() => verify(originalBytes,
      translated.replace(/^INSTRUCTION 0001[^\n]*\n(?:[^\n]*\n){7}/m, '')),
      row.stem + ' removed first instruction');
    expectFailure(() => verify(Buffer.concat([originalBytes, Buffer.from(' ')]), translated),
      row.stem + ' original source byte corruption');
    expectFailure(() => verify(originalBytes,
      translated.replace(/^  Relocation: (?!none)[^\n]*/m, '  Relocation: UNKNOWN.')),
      row.stem + ' changed literal-pool relocation');
    if (row.gaps) {
      expectFailure(() => verify(originalBytes, translated.replace(/^GAP [^\n]*$/m, '')),
        row.stem + ' omitted unprinted gap');
    }
  }
  process.stdout.write('PASS ARM coverage ' + row.stem +
    ': instructions=' + observed.instructions + ', data=' +
    observed.data + ', relocation=' + observed.relocations +
    ', ellipses=' + observed.ellipses + '\n');
}
process.stdout.write('PASS: ' + total +
  ' A32 instruction records aligned with native compiler capture; NO semantic proof\n');
if (process.argv.includes('--self-test'))
  process.stdout.write('PASS: bad bytes, missing English, invalid relocation/data, omitted gaps rejected\n');
