// Initial English Major C x86-64 compiler: a deliberately closed grammar.
// Independent of ICK and of the separately maintained first Thumb compiler.
// Each accepted executable English sentence emits exactly one x86-64 instruction.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const physicalRegisters = new Map([
  ['rdi', { word: 'edi', wide: 'rdi' }],
  ['rsi', { word: 'esi', wide: 'rsi' }],
  ['rdx', { word: 'edx', wide: 'rdx' }],
  ['rcx', { word: 'ecx', wide: 'rcx' }],
  ['r8',  { word: 'r8d', wide: 'r8' }],
  ['rax', { word: 'eax', wide: 'rax' }],
]);
const requiredRoles = new Map([
  ['address of the next entry', 'rdi'],
  ['number of entries remaining', 'rsi'],
  ['running total', 'rdx'],
  ['current entry', 'rcx'],
  ['unknown marker', 'r8'],
  ['return value', 'rax'],
]);
function labelFor(name) {
  return 'english_instruction_' +
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function compileEnglishToX86Assembly(source) {
  if (typeof source !== 'string') throw new Error('The source must be text.');
  const declared = new Map();
  const occupied = new Set();
  const definedLabels = new Map();
  const referencedLabels = [];
  const emitted = [];
  let architectureSeen = false;
  let declarationsClosed = false;

  function fail(line, message) {
    throw new Error('English line ' + line + ': ' + message);
  }
  function registerFor(name, line, width) {
    const physical = declared.get(name);
    if (!physical) fail(line, 'Undeclared register name "' + name + '".');
    return physicalRegisters.get(physical)[width];
  }
  function instruction(line, native, sourceSentence) {
    emitted.push({ kind: 'instruction', line, native, sourceSentence });
  }
  function branch(line, native, labelName, sourceSentence) {
    referencedLabels.push({ line, labelName });
    instruction(line, native + ' ' + labelFor(labelName), sourceSentence);
  }

  const lines = source.replaceAll('\r\n', '\n').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const sourceSentence = lines[index].trim();
    if (!sourceSentence) continue;
    const line = index + 1;
    if (sourceSentence === 'This program uses x86-64 instructions.') {
      if (architectureSeen || declared.size || emitted.length)
        fail(line, 'Architecture must be declared once at the beginning.');
      architectureSeen = true;
      continue;
    }
    if (!architectureSeen) fail(line, 'Declare the x86-64 instruction architecture first.');

    let match;
    if ((match = /^Name register (rdi|rsi|rdx|rcx|r8|rax) "([^"]+)"\.$/.exec(sourceSentence))) {
      if (declarationsClosed) fail(line, 'Declare registers before instructions.');
      const physical = match[1];
      const englishName = match[2];
      if (occupied.has(physical) || declared.has(englishName))
        fail(line, 'Duplicate or ambiguous register declaration.');
      if (!requiredRoles.has(englishName) || requiredRoles.get(englishName) !== physical)
        fail(line, 'This first program has a fixed and explicitly checked x86-64 calling convention.');
      occupied.add(physical);
      declared.set(englishName, physical);
      continue;
    }
    if (declared.size !== requiredRoles.size)
      fail(line, 'All six declared registers are required before the first instruction.');
    declarationsClosed = true;

    if ((match = /^Name the following instruction "([^"]+)"\.$/.exec(sourceSentence))) {
      const label = labelFor(match[1]);
      if (definedLabels.has(label)) fail(line, 'Duplicate machine-instruction label.');
      definedLabels.set(label, line);
      emitted.push({ kind: 'label', line, name: label, sourceSentence });
    } else if ((match = /^Put zero into "([^"]+)" without changing the condition flags\.$/.exec(sourceSentence))) {
      instruction(line, 'mov ' + registerFor(match[1], line, 'word') + ', 0', sourceSentence);
    } else if ((match = /^Put 65535 into the low sixteen bits of "([^"]+)" and zero into its high sixteen bits\.$/.exec(sourceSentence))) {
      instruction(line, 'mov ' + registerFor(match[1], line, 'word') + ', 65535', sourceSentence);
    } else if ((match = /^Set the high sixteen bits of "([^"]+)" to one by a bitwise inclusive OR and update the condition flags\.$/.exec(sourceSentence))) {
      instruction(line, 'or ' + registerFor(match[1], line, 'word') + ', 0xffff0000', sourceSentence);
    } else if ((match = /^Compare "([^"]+)" with zero and update the condition flags\.$/.exec(sourceSentence))) {
      instruction(line, 'cmp ' + registerFor(match[1], line, 'word') + ', 0', sourceSentence);
    } else if ((match = /^If the zero flag is one, replace the execution index with the instruction named "([^"]+)"\.$/.exec(sourceSentence))) {
      branch(line, 'je', match[1], sourceSentence);
    } else if ((match = /^Load exactly four bytes from the address in "([^"]+)" into "([^"]+)"\.$/.exec(sourceSentence))) {
      instruction(line, 'mov ' + registerFor(match[2], line, 'word') +
        ', DWORD PTR [' + registerFor(match[1], line, 'wide') + ']', sourceSentence);
    } else if ((match = /^Increase "([^"]+)" by four without changing the condition flags\.$/.exec(sourceSentence))) {
      const register = registerFor(match[1], line, 'wide');
      instruction(line, 'lea ' + register + ', [' + register + ' + 4]', sourceSentence);
    } else if ((match = /^Decrease "([^"]+)" by one without changing the condition flags\.$/.exec(sourceSentence))) {
      instruction(line, 'lea ' + registerFor(match[1], line, 'word') +
        ', [' + registerFor(match[1], line, 'wide') + ' - 1]', sourceSentence);
    } else if ((match = /^Compare "([^"]+)" with "([^"]+)" and update the condition flags\.$/.exec(sourceSentence))) {
      instruction(line, 'cmp ' + registerFor(match[1], line, 'word') +
        ', ' + registerFor(match[2], line, 'word'), sourceSentence);
    } else if ((match = /^Add "([^"]+)" to "([^"]+)" and keep only the lowest thirty-two result bits without changing the condition flags\.$/.exec(sourceSentence))) {
      const target = registerFor(match[2], line, 'word');
      const targetWide = registerFor(match[2], line, 'wide');
      const sourceWide = registerFor(match[1], line, 'wide');
      instruction(line, 'lea ' + target + ', [' + targetWide + ' + ' + sourceWide + ']',
        sourceSentence);
    } else if ((match = /^Replace the execution index with the instruction named "([^"]+)"\.$/.exec(sourceSentence))) {
      branch(line, 'jmp', match[1], sourceSentence);
    } else if ((match = /^Copy "([^"]+)" into "([^"]+)" without changing the condition flags\.$/.exec(sourceSentence))) {
      instruction(line, 'mov ' + registerFor(match[2], line, 'word') + ', ' +
        registerFor(match[1], line, 'word'), sourceSentence);
    } else if (sourceSentence === 'Return to the address saved by the machine call operation.') {
      instruction(line, 'ret', sourceSentence);
    } else {
      fail(line, 'The x86-64 compiler does not permit this English sentence: ' + sourceSentence);
    }
  }

  if (!architectureSeen || !emitted.length)
    throw new Error('An architecture and executable instructions are required.');
  if (declared.size !== requiredRoles.size)
    throw new Error('The x86-64 input and output register declarations are incomplete.');
  for (const { line, labelName } of referencedLabels)
    if (!definedLabels.has(labelFor(labelName)))
      fail(line, 'No instruction named "' + labelName + '".');
  if (emitted[emitted.length - 1]?.native !== 'ret')
    throw new Error('The x86-64 machine program must finish with an explicit return.');

  // Check ABI-independent local dataflow expectations for this deliberately
  // restricted specimen, not a general language-wide type system.
  if (emitted.filter(step => step.kind === 'instruction').length !== 14)
    throw new Error('The first x86-64 specimen must contain exactly 14 machine instructions.');

  const output = [
    '# First x86-64 implementation of the same bounded unknown-entry-sum contract.',
    '# System V AMD64 arguments: RDI=word pointer, ESI=count, EAX=result.',
    '# 32-bit words; all-ones sentinel means unknown; result wraps modulo 2^32.',
    '.intel_syntax noprefix',
    '.text',
    '.globl add_all_known_entries_x86_64',
    '.type add_all_known_entries_x86_64, @function',
    'add_all_known_entries_x86_64:',
  ];
  for (const step of emitted) {
    output.push(step.kind === 'label' ? step.name + ':' : '    ' + step.native);
    output.push('    # English line ' + step.line + ': ' + step.sourceSentence);
  }
  output.push('.size add_all_known_entries_x86_64, .-add_all_known_entries_x86_64', '');
  return output.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 4) {
    process.stderr.write('Usage: node _/tools/compile-english-x86-64.mjs SOURCE.english OUTPUT.s\n');
    process.exitCode = 2;
  } else {
    try {
      writeFileSync(process.argv[3],
        compileEnglishToX86Assembly(readFileSync(process.argv[2], 'utf8')), 'utf8');
    } catch (error) {
      process.stderr.write(error.message + '\n');
      process.exitCode = 1;
    }
  }
}
