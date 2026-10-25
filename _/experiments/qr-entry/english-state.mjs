// A deliberately narrow English interpreter, not a mnemonic interpreter.
// The original machine bytes are executed separately by QEMU.
import assert from 'node:assert/strict';

export const MEMORY_START = 0x20000;
export const MEMORY_SIZE = 0x3000;
export const CODE_ADDRESS = 0x11000;
export const arithmeticFlags = 0x8d5n;
const bytes = word => ({four: 4, eight: 8})[word];
const integer = x => BigInt(x);
const truncate = (x, size) => BigInt.asUintN(size * 8, x);

export function readMemory(state, address, size) {
  const offset = Number(address) - MEMORY_START;
  assert(offset >= 0 && offset + size <= state.memory.length, 'Model memory read outside declared workspace');
  let value = 0n;
  for (let i = size - 1; i >= 0; i--) value = (value << 8n) | BigInt(state.memory[offset + i]);
  return value;
}
export function writeMemory(state, address, size, value) {
  const offset = Number(address) - MEMORY_START;
  assert(offset >= 0 && offset + size <= state.memory.length, 'Model memory write outside declared workspace');
  let remaining = truncate(value, size);
  for (let i = 0; i < size; i++) { state.memory[offset + i] = Number(remaining & 255n); remaining >>= 8n; }
}
function get(state, register) {
  assert(Object.hasOwn(state.registers, register), 'Undeclared register: ' + register);
  return state.registers[register];
}
function put(state, register, value, size) {
  get(state, register);
  // All supported writes replace a whole ARM register, a whole x86 register,
  // or a 32-bit x86 subregister whose upper 32 bits are architecturally zero.
  state.registers[register] = truncate(value, size);
}
function parity(value) {
  let x = Number(value & 255n), count = 0;
  while (x) { count += x & 1; x >>= 1; }
  return count % 2 === 0;
}
function logic(state, value, size) {
  const v = truncate(value, size);
  const sign = 1n << BigInt(size * 8 - 1);
  state.flags = (state.flags & ~arithmeticFlags) |
    (parity(v) ? 4n : 0n) | (v === 0n ? 0x40n : 0n) | ((v & sign) ? 0x80n : 0n);
  // AF is undefined after TEST and XOR; never claim to compare its value.
  state.flagsMask = arithmeticFlags & ~0x10n;
}
function subtractFlags(state, before, amount, size) {
  const result = truncate(before - amount, size);
  const sign = 1n << BigInt(size * 8 - 1);
  state.flags = (state.flags & ~arithmeticFlags) |
    (before < amount ? 1n : 0n) | (parity(result) ? 4n : 0n) |
    (((before ^ amount ^ result) & 0x10n) ? 0x10n : 0n) |
    (result === 0n ? 0x40n : 0n) | ((result & sign) ? 0x80n : 0n) |
    (((before ^ amount) & (before ^ result) & sign) ? 0x800n : 0n);
  state.flagsMask = arithmeticFlags;
}
function push(state, value, size) {
  const stack = state.arch === 'arm' ? 'r13' : 'rsp';
  const next = get(state, stack) - BigInt(size);
  put(state, stack, next, state.arch === 'arm' ? 4 : 8);
  writeMemory(state, next, size, value);
}

export function parseEnglish(source, arch) {
  assert(arch === 'arm' || arch === 'x86', 'Unknown target');
  const result = [];
  for (const [lineIndex, original] of source.split('\n').entries()) {
    const line = original.trim();
    if (!line || /^\(NOTE: [^\r\n]*\)$/.test(line)) continue;
    const prefix = /^At byte offset (0x[0-9a-f]+), (.+)\.$/.exec(line);
    assert(prefix, `Not a permitted English instruction on line ${lineIndex + 1}`);
    const offset = Number(prefix[1]), words = prefix[2];
    let match, run;
    if ((match = /^save (four|eight)-byte values from registers (r\d+(?:, r\d+)*) on a descending stack in ascending register order$/.exec(words))) {
      assert.equal(arch, 'arm');
      const size = bytes(match[1]), list = match[2].split(', ');
      assert.equal(new Set(list).size, list.length);
      assert.deepEqual(list, [...list].sort((a,b) => Number(a.slice(1))-Number(b.slice(1))));
      run = s => {
        const values = list.map(r => get(s, r));
        const next = get(s, 'r13') - BigInt(size * list.length);
        put(s, 'r13', next, 4);
        values.forEach((v,i) => writeMemory(s, next + BigInt(i*size), size, v));
      };
    } else if ((match = /^save the (four|eight)-byte value in register (\w+) on the stack$/.exec(words))) {
      const size = bytes(match[1]), register = match[2];
      run = s => push(s, get(s, register), size);
    } else if ((match = /^copy the (four|eight)-byte value in register (\w+) into register (\w+)(?: only when the sign flag is (set|clear))?$/.exec(words))) {
      const size = bytes(match[1]), from = match[2], to = match[3], condition = match[4];
      run = s => { if (!condition || Boolean(s.flags & 0x80n) === (condition === 'set')) put(s,to,get(s,from),size); };
    } else if ((match = /^read (?:a|an) (four|eight)-byte word at register (\w+) plus (0x[0-9a-f]+) into register (\w+)$/.exec(words))) {
      const size = bytes(match[1]), base = match[2], displacement = integer(match[3]), to = match[4];
      run = s => put(s,to,readMemory(s,get(s,base)+displacement,size),size);
    } else if ((match = /^store the (four|eight)-byte value in register (\w+) at register (\w+) plus (0x[0-9a-f]+)$/.exec(words))) {
      const size = bytes(match[1]), from = match[2], base = match[3], displacement = integer(match[4]);
      run = s => writeMemory(s,get(s,base)+displacement,size,get(s,from));
    } else if ((match = /^subtract (0x[0-9a-f]+) from stack register (\w+) (without changing flags|and update arithmetic flags)$/.exec(words))) {
      const amount = integer(match[1]), register = match[2], update = match[3] === 'and update arithmetic flags';
      run = s => { const old=get(s,register), size=arch==='arm'?4:8; put(s,register,old-amount,size); if(update) subtractFlags(s,old,amount,size); };
    } else if ((match = /^retain register (\w+) in register (\w+) when its signed four-byte value is nonnegative; otherwise write zero$/.exec(words))) {
      const from=match[1], to=match[2];
      run = s => { const signed=BigInt.asIntN(32,get(s,from)); put(s,to,signed<0n?0n:signed,4); };
    } else if ((match = /^write zero into the four-byte view of register (\w+) and update logic flags$/.exec(words))) {
      const register=match[1];
      run = s => { put(s,register,0n,4); logic(s,0n,4); };
    } else if ((match = /^sign-extend the four-byte integer at register (\w+) plus (0x[0-9a-f]+) into the eight-byte register (\w+)$/.exec(words))) {
      const base=match[1], displacement=integer(match[2]), to=match[3];
      run = s => put(s,to,BigInt.asIntN(32,readMemory(s,get(s,base)+displacement,4)),8);
    } else if ((match = /^test the (four|eight)-byte value in register (\w+) against itself and update logic flags$/.exec(words))) {
      const size=bytes(match[1]), register=match[2]; run = s => logic(s,get(s,register),size);
    } else if ((match = /^read the eight-byte value at stack register rsp plus (0x[0-9a-f]+) before decrementing the stack pointer, then save that value on the stack$/.exec(words))) {
      const displacement=integer(match[1]);
      run = s => { const value=readMemory(s,get(s,'rsp')+displacement,8); push(s,value,8); };
    } else throw new Error(`Unimplemented English sentence on line ${lineIndex+1}: ${words}`);
    if (result.length) assert(offset > result.at(-1).offset, 'Offsets must increase without duplicates');
    result.push({offset, sentence: line, run});
  }
  assert(result.length > 0, 'No executable sentences');
  return result;
}
