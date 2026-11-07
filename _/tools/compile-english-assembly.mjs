// The initial English Major C compiler: deliberately narrow and independent.
// No ICK, R, compiler intermediate representation, or general-purpose type system.
// Each accepted executable English sentence requests exactly one ARMv7-A T32 instruction.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const physicalRegisterNumbers = new Map([
  ['zero', 0], ['one', 1], ['two', 2], ['three', 3], ['twelve', 12],
]);

function labelFor(name) {
  return `english_instruction_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

export function compileEnglishToThumbAssembly(source) {
  if (typeof source !== 'string') throw new Error('The source must be text.');
  const registerNames = new Map();
  const allocatedRegisters = new Set();
  const namedInstructions = new Map();
  const referencedInstructions = [];
  const emittedInstructions = [];
  let sawArchitectureDeclaration = false;
  let sawExecutableInstruction = false;
  let nextExpectedDeclaration = true;

  function fail(line, message) { throw new Error(`English line ${line}: ${message}`); }
  function getRegister(name, line) {
    const register = registerNames.get(name);
    if (register === undefined) fail(line, `No machine register has been given the name "${name}".`);
    return `r${register}`;
  }
  function addInstruction(line, nativeInstruction, text) {
    sawExecutableInstruction = true;
    emittedInstructions.push({ kind: 'instruction', line, nativeInstruction, text });
  }
  function addBranch(line, prefix, destination, text) {
    referencedInstructions.push({ line, destination });
    addInstruction(line, `${prefix} ${labelFor(destination)}`, text);
  }

  const lines = source.replaceAll('\r\n', '\n').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index].trim();
    const line = index + 1;
    if (!text) continue;
    if (text === 'This program uses ARMv7-A Thumb instructions.') {
      if (sawArchitectureDeclaration || registerNames.size || emittedInstructions.length)
        fail(line, 'The architecture must be declared exactly once at the beginning.');
      sawArchitectureDeclaration = true;
      continue;
    }
    if (!sawArchitectureDeclaration) fail(line, 'Declare the physical instruction set first.');

    let match;
    if ((match = /^Name register (zero|one|two|three|twelve) "([^"]+)"\.$/.exec(text))) {
      if (!nextExpectedDeclaration) fail(line, 'Name registers before the first instruction.');
      const register = physicalRegisterNumbers.get(match[1]);
      if (allocatedRegisters.has(register) || registerNames.has(match[2]))
        fail(line, 'Every machine register and every English register name must be unique.');
      registerNames.set(match[2], register);
      allocatedRegisters.add(register);
      continue;
    }
    nextExpectedDeclaration = false;
    if ((match = /^Name the following instruction "([^"]+)"\.$/.exec(text))) {
      const label = labelFor(match[1]);
      if (namedInstructions.has(label)) fail(line, `Duplicate or ambiguous instruction name "${match[1]}".`);
      namedInstructions.set(label, line);
      emittedInstructions.push({ kind: 'label', line, name: label, text });
    } else if ((match = /^Put zero into "([^"]+)" without changing the condition flags\.$/.exec(text))) {
      addInstruction(line, `mov.w ${getRegister(match[1], line)}, #0`, text);
    } else if ((match = /^Put 65535 into the low sixteen bits of "([^"]+)" and zero into its high sixteen bits\.$/.exec(text))) {
      addInstruction(line, `movw ${getRegister(match[1], line)}, #65535`, text);
    } else if ((match = /^Put 65535 into the high sixteen bits of "([^"]+)" without changing its low sixteen bits\.$/.exec(text))) {
      addInstruction(line, `movt ${getRegister(match[1], line)}, #65535`, text);
    } else if ((match = /^Compare "([^"]+)" with zero and update the condition flags\.$/.exec(text))) {
      addInstruction(line, `cmp ${getRegister(match[1], line)}, #0`, text);
    } else if ((match = /^If the zero flag is one, replace the execution index with the instruction named "([^"]+)"\.$/.exec(text))) {
      addBranch(line, 'beq.n', match[1], text);
    } else if ((match = /^Load exactly four bytes from the address in "([^"]+)" into "([^"]+)"\.$/.exec(text))) {
      addInstruction(line, `ldr.w ${getRegister(match[2], line)}, [${getRegister(match[1], line)}]`, text);
    } else if ((match = /^Increase "([^"]+)" by four without changing the condition flags\.$/.exec(text))) {
      const register = getRegister(match[1], line);
      addInstruction(line, `add.w ${register}, ${register}, #4`, text);
    } else if ((match = /^Decrease "([^"]+)" by one without changing the condition flags\.$/.exec(text))) {
      const register = getRegister(match[1], line);
      addInstruction(line, `sub.w ${register}, ${register}, #1`, text);
    } else if ((match = /^Compare "([^"]+)" with "([^"]+)" and update the condition flags\.$/.exec(text))) {
      addInstruction(line, `cmp ${getRegister(match[1], line)}, ${getRegister(match[2], line)}`, text);
    } else if ((match = /^Add "([^"]+)" to "([^"]+)" and keep only the lowest thirty-two result bits without changing the condition flags\.$/.exec(text))) {
      const sourceRegister = getRegister(match[1], line);
      const destinationRegister = getRegister(match[2], line);
      addInstruction(line, `add.w ${destinationRegister}, ${destinationRegister}, ${sourceRegister}`, text);
    } else if ((match = /^Replace the execution index with the instruction named "([^"]+)"\.$/.exec(text))) {
      addBranch(line, 'b.n', match[1], text);
    } else if ((match = /^Copy "([^"]+)" into "([^"]+)" without changing the condition flags\.$/.exec(text))) {
      addInstruction(line, `mov.w ${getRegister(match[2], line)}, ${getRegister(match[1], line)}`, text);
    } else if (text === 'Replace the execution index with the instruction address in the link register.') {
      addInstruction(line, 'bx lr', text);
    } else {
      fail(line, `This compiler does not recognize or permit the sentence: ${text}`);
    }
  }
  if (!sawArchitectureDeclaration || !sawExecutableInstruction)
    throw new Error('An architecture declaration and at least one executable instruction are required.');
  for (const { line, destination } of referencedInstructions) {
    if (!namedInstructions.has(labelFor(destination))) fail(line, `There is no instruction named "${destination}".`);
  }
  if (emittedInstructions[emittedInstructions.length - 1]?.nativeInstruction !== 'bx lr')
    throw new Error('The initial compiler requires an explicit final return through the link register.');

  const output = [
    '@ Compiled from the English Major C source; source line numbers are retained.',
    '@ The input is an ARMv7-A Thumb program, not R code and not ICK output.',
    '.syntax unified',
    '.arch armv7-a',
    '.thumb',
    '.text',
    '.global add_all_known_entries_in_a_sequence',
    '.type add_all_known_entries_in_a_sequence, %function',
    '.thumb_func',
    'add_all_known_entries_in_a_sequence:',
  ];
  for (const step of emittedInstructions) {
    if (step.kind === 'label') output.push(`${step.name}:`);
    else output.push(`    ${step.nativeInstruction}`);
    output.push(`    @ English line ${step.line}: ${step.text}`);
  }
  output.push('.size add_all_known_entries_in_a_sequence, .-add_all_known_entries_in_a_sequence', '');
  return output.join('\n');
}

// The executable is only a text-to-assembly compiler; an independent ARM
// assembler still has to validate instruction encodings and branch ranges.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 4) {
    process.stderr.write('Usage: node _/tools/compile-english-assembly.mjs SOURCE.english OUTPUT.s\n');
    process.exitCode = 2;
  } else {
    try {
      const assembly = compileEnglishToThumbAssembly(readFileSync(process.argv[2], 'utf8'));
      writeFileSync(process.argv[3], assembly, 'utf8');
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
