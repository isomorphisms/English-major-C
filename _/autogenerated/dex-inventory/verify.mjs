// Bounded inventory/source audit. This does not parse or execute English or DEX.
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

export const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const columns = ['number','opcode','mnemonic','format','code_units','encoding',
  'validity','minimum_version','valid_versions','english','reads','writes',
  'execution_index','restrictions','exceptions','sources','related'];
function check(condition, code) { if (!condition) throw new Error(code); }
function tsv(text) {
  const lines = text.trimEnd().split('\n');
  const header = lines.shift().split('\t');
  check(new Set(header).size === header.length, 'TSV-HEADER');
  return { header, rows: lines.map(line => {
    const cells = line.split('\t');
    check(cells.length === header.length, 'TSV-WIDTH');
    return Object.fromEntries(header.map((name, index) => [name, cells[index]]));
  }) };
}
export function verify(root = defaultRoot) {
  const read = path => readFileSync(join(root, path), 'utf8');
  const input = tsv(read('dex/inventory.tsv'));
  check(JSON.stringify(input.header) === JSON.stringify(columns), 'INVENTORY-SCHEMA');
  check(input.rows.length === 256, 'INVENTORY-COUNT');
  const seen = new Set();
  for (const row of input.rows) {
    check(/^0x[0-9a-f]{2}$/.test(row.opcode), 'INVENTORY-BYTE');
    check(!seen.has(row.opcode), 'INVENTORY-DUPLICATE');
    seen.add(row.opcode);
  }
  input.rows.forEach((row, index) => {
    check(Number(row.opcode) === index && Number(row.number) === index + 1,
      'INVENTORY-ORDER');
    check(columns.every(column => row[column].length > 0), 'INVENTORY-EMPTY');
  });
  const foreign = read('_/fixtures/dex/sources/art-dex-instruction-list.h');
  const art = [...foreign.matchAll(/V\(0x([0-9a-f]{2}),\s*([^,]+),\s*"([^"]+)",\s*k([^,]+),/gi)]
    .map(match => ({ byte: parseInt(match[1],16), symbol: match[2],
      mnemonic: match[3], format: match[4] }));
  check(art.length === 256 && new Set(art.map(row => row.byte)).size === 256,
    'ART-SOURCE-COVERAGE');
  for (const source of art) {
    const row = input.rows[source.byte];
    const unused = source.symbol.startsWith('UNUSED_');
    check(row.validity === (unused ? 'reserved' : 'standard'), 'ART-VALIDITY');
    check(row.mnemonic === (unused ? '(unused)' : source.mnemonic), 'ART-MNEMONIC');
    check(row.format === source.format, 'ART-FORMAT');
    check(row.code_units === (unused ? '-' : source.format[0]), 'ART-LENGTH');
  }
  const decoder = read('_/fixtures/dex/sources/smali-Opcode.java');
  const smali = [...decoder.matchAll(/^\s+([A-Z][A-Z0-9_]*)\((.+)\)[,;]/gm)]
    .filter(match => !match[2].includes('ODEX_ONLY'))
    .map(match => {
      const byte = match[2].match(/0x([0-9a-f]+)/i);
      const mnemonic = match[2].match(/"([^"]+)"/);
      const format = match[2].match(/Format\.Format([0-9a-z]+)/i);
      return byte && mnemonic && format ? {
        byte: parseInt(byte[1],16), mnemonic: mnemonic[1],
        // dexlib2 distinguishes the int/long high-half literal cases; AOSP calls both 21h.
        format: ['21ih','21lh'].includes(format[1]) ? '21h' : format[1]
      } : null;
    }).filter(row => row && row.byte <= 255);
  check(smali.length === 224 && new Set(smali.map(row => row.byte)).size === 224,
    'SMALI-SOURCE-COVERAGE');
  for (const source of smali) {
    const row = input.rows[source.byte];
    check(row.validity === 'standard' && row.mnemonic === source.mnemonic,
      'SMALI-MNEMONIC');
    check(row.format === source.format, 'SMALI-FORMAT');
  }
  const versions = ['035','037','038','039','040','041'];
  for (const row of input.rows) {
    const byte = Number(row.opcode);
    const minimum = row.validity === 'reserved' ? '-' :
      byte >= 0xfe ? '039' : byte >= 0xfa ? '038' : '035';
    check(row.minimum_version === minimum, 'VERSION-MINIMUM');
    check(row.valid_versions === (minimum === '-' ? '-' :
      versions.filter(version => version >= minimum).join(',')), 'VERSION-SET');
    if (minimum === '-') check(row.code_units === '-' &&
      row.execution_index.includes('No portable'), 'RESERVED-EXECUTION');
  }
  const formatRows = tsv(read('dex/formats.tsv')).rows;
  const formatMap = new Map(formatRows.map(row => [row.format, row]));
  check(formatMap.size === 26 && formatRows.length === 26, 'FORMAT-COVERAGE');
  for (const row of input.rows) {
    const format = formatMap.get(row.format);
    check(format && row.encoding === format.encoding, 'FORMAT-ENCODING');
  }
  const prose = read('dex/Every primary opcode.english');
  const sections = [...prose.matchAll(/^ENTRY (\d{3}) — (0x[0-9a-f]{2}) — (.+)\.$/gm)];
  check(sections.length === 256, 'PROSE-COUNT');
  for (let index = 0; index < 256; index++) {
    const row = input.rows[index];
    const section = prose.slice(sections[index].index,
      index === 255 ? undefined : sections[index + 1].index);
    check(Number(sections[index][1]) === index + 1 && sections[index][2] === row.opcode,
      'PROSE-IDENTITY');
    for (const field of ['english','reads','writes','execution_index',
      'restrictions','exceptions','sources','related']) {
      check(section.includes(row[field]), 'PROSE-SYNCHRONIZATION');
    }
  }
  const payloads = read('dex/Instruction formats and data payloads.english');
  for (const id of ['0x0100','0x0200','0x0300']) {
    check(payloads.includes(id), 'PAYLOAD-MISSING');
  }
  const facts = tsv(read('_/fixtures/dex/source-facts.tsv')).rows;
  check(facts.length === 13, 'SOURCE-FACTS-COUNT');
  for (const fact of facts) {
    check(read(fact.path).includes(fact.literal), 'SOURCE-FACT-' + fact.id);
  }
  const manifest = tsv(read('_/fixtures/dex/sources/manifest.tsv')).rows;
  for (const file of manifest.filter(row => row.local_path !== '-')) {
    const bytes = readFileSync(join(root, file.local_path));
    check(createHash('sha256').update(bytes).digest('hex') === file.sha256,
      'SOURCE-HASH-' + file.id);
  }
  const standard = input.rows.filter(row => row.validity === 'standard').length;
  return { primary: 256, standard, reserved: 256 - standard, formats: 26,
    source_facts: facts.length, decoder: 'source enum, not executed decoder',
    semantics: 'source-reviewed prose; not execution or formal equivalence',
    ai_ci: 'NOT_RUN' };
}

export function selfTest(root = defaultRoot) {
  const temporary = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'dex-inventory-'));
  let rejected = 0;
  try {
    for (const path of ['dex', '_/fixtures/dex']) {
      cpSync(join(root, path), join(temporary, path), { recursive: true });
    }
    const target = join(temporary, 'dex/inventory.tsv');
    const original = readFileSync(target, 'utf8');
    const lines = original.trimEnd().split('\n');
    const mutate = (contents, diagnostic) => {
      writeFileSync(target, contents);
      assert.throws(() => verify(temporary), { message: diagnostic });
      writeFileSync(target, original);
      rejected++;
    };
    mutate(lines.slice(0, -1).join('\n')+'\n', 'INVENTORY-COUNT');
    const duplicate = [...lines]; duplicate[2] = duplicate[1];
    mutate(duplicate.join('\n')+'\n', 'INVENTORY-DUPLICATE');
    const outOfRange = [...lines]; outOfRange[256] = outOfRange[256].replace('0xff','0x100');
    mutate(outOfRange.join('\n')+'\n', 'INVENTORY-BYTE');
    mutate(original.replace('\tadd-int\t', '\tinvented-add\t'), 'ART-MNEMONIC');
    mutate(original.replace('\tadd-int\t23x\t', '\tadd-int\t12x\t'), 'ART-FORMAT');
    mutate(original.replace('\t038\t038,039,040,041\t', '\t035\t038,039,040,041\t'),
      'VERSION-MINIMUM');
    mutate(original.replace('Arithmetic overflow does not produce an exception.',
      'Arithmetic overflow always throws.'), 'PROSE-SYNCHRONIZATION');
    const prosePath = join(temporary, 'dex/Every primary opcode.english');
    const prose = readFileSync(prosePath, 'utf8');
    writeFileSync(prosePath, prose.replace(/^ENTRY 256.*$/m, 'REMOVED'));
    assert.throws(() => verify(temporary), { message: 'PROSE-COUNT' });
    writeFileSync(prosePath, prose); rejected++;
    const payloadPath = join(temporary,
      'dex/Instruction formats and data payloads.english');
    const payload = readFileSync(payloadPath, 'utf8');
    writeFileSync(payloadPath, payload.replaceAll('0x0300', 'REMOVED'));
    assert.throws(() => verify(temporary), { message: 'PAYLOAD-MISSING' });
    writeFileSync(payloadPath, payload); rejected++;
    const sourcePath = join(temporary, '_/fixtures/dex/sources/art-dex-instruction-list.h');
    const source = readFileSync(sourcePath, 'utf8');
    writeFileSync(sourcePath, source + '\n// unreviewed source mutation\n');
    assert.throws(() => verify(temporary), { message: 'SOURCE-HASH-ART-LIST' });
    writeFileSync(sourcePath, source); rejected++;
    verify(temporary);
    return { deliberately_bad_fixtures_rejected: rejected, restored_good: 'PASS' };
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
    console.log('PASS\tinventory\t' + JSON.stringify(verify(root)));
    console.log('PASS\trejection-controls\t' + JSON.stringify(selfTest(root)));
  } catch (error) { console.error('FAIL\t' + error.message); process.exitCode = 1; }
}
