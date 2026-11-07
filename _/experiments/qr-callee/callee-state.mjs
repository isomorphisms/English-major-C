// Additional executable English meanings for the first dqrdc2 basic blocks.
// The model never selects semantics from disassembly mnemonics.
import assert from 'node:assert/strict';
import {parseEnglish,readMemory,writeMemory,MEMORY_START,CODE_ADDRESS} from '../qr-entry/english-state.mjs';

const sizeOf = word => ({four:4,eight:8})[word];
const get = (s,r) => {assert(Object.hasOwn(s.registers,r),'Undeclared register '+r);return s.registers[r];};
const put = (s,r,v,size) => {get(s,r);s.registers[r]=BigInt.asUintN(size*8,v);};
const index = s => s.arch==='arm'?'r15':'rip';
export function loadData(s,address,size) {
  if(address>=BigInt(MEMORY_START)) return readMemory(s,address,size);
  const offset=Number(address)-CODE_ADDRESS;
  assert(offset>=0&&offset+size<=s.code.length,'Unmapped read-only data address');
  let value=0n;
  for(let i=size-1;i>=0;i--)value=(value<<8n)|BigInt(s.code[offset+i]);
  return value;
}
export function callIntoFactor(s,nextAddress,target) {
  if(s.arch==='arm') {
    s.registers.r14=BigInt(nextAddress);
    s.registers.r15=BigInt(target);
    s.flags&=~0x20n;
  } else {
    s.registers.rsp-=8n;
    writeMemory(s,s.registers.rsp,8,BigInt(nextAddress));
    s.registers.rip=BigInt(target);
  }
}
export function parseFactorEnglish(source,arch) {
  const operations=[];
  for(const [lineNumber,text] of source.split('\n').entries()) {
    const line=text.trim();
    if(!line||/^\(NOTE: [^\r\n]*\)$/.test(line))continue;
    const entry=/^At byte offset (0x[0-9a-f]+), (.+)\.$/.exec(line);
    assert(entry,'Malformed English sentence on line '+(lineNumber+1));
    const offset=Number(entry[1]),words=entry[2];
    let m,run,changesIndex=false;
    if((m=/^save eight-byte floating register payloads (d\d+(?:, d\d+)*) on a descending stack in ascending register order$/.exec(words))) {
      assert.equal(arch,'arm');const names=m[1].split(', ');
      assert.deepEqual(names,[...new Set(names)].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1))));
      run=s=>{const values=names.map(r=>{assert(Object.hasOwn(s.fp,r));return s.fp[r];});s.registers.r13-=BigInt(8*values.length);values.forEach((v,i)=>writeMemory(s,s.registers.r13+BigInt(i*8),8,v));};
    } else if((m=/^complement the (four|eight)-byte value in register (\w+) into register (\w+) without changing flags$/.exec(words))) {
      const size=sizeOf(m[1]),from=m[2],to=m[3];run=s=>put(s,to,~get(s,from),size);
    } else if((m=/^compare the four-byte value in register (\w+) with zero and update ARM arithmetic flags$/.exec(words))) {
      assert.equal(arch,'arm');const r=m[1];run=s=>{const v=BigInt.asUintN(32,get(s,r));s.flags=(s.flags&~0xf0000000n)|((v&0x80000000n)?0x80000000n:0n)|(v===0n?0x40000000n:0n)|0x20000000n;s.flagsMask=0xf0000020n;};
    } else if((m=/^branch to procedure byte offset (0x[0-9a-f]+) only when the signed comparison is less than or equal to zero$/.exec(words))) {
      const destination=BigInt(m[1]);changesIndex=true;
      run=s=>{const z=Boolean(s.flags&(arch==='arm'?0x40000000n:0x40n)),n=Boolean(s.flags&(arch==='arm'?0x80000000n:0x80n)),v=Boolean(s.flags&(arch==='arm'?0x10000000n:0x800n));s.registers[index(s)]=s.factorAddress+(z||n!==v?destination:BigInt(offset+s.currentLength));};
    } else if((m=/^shift the (four|eight)-byte value in register (\w+) left by ([0-9]+) bits into register (\w+) without changing flags$/.exec(words))) {
      const size=sizeOf(m[1]),from=m[2],amount=BigInt(m[3]),to=m[4];assert(amount>0n&&amount<32n);run=s=>put(s,to,get(s,from)<<amount,size);
    } else if((m=/^add the (four|eight)-byte values in registers (\w+) and (\w+) into register (\w+) without changing flags$/.exec(words))) {
      const size=sizeOf(m[1]),a=m[2],b=m[3],to=m[4];run=s=>put(s,to,get(s,a)+get(s,b),size);
    } else if((m=/^add (0x[0-9a-f]+) to the (four|eight)-byte value in register (\w+) into register (\w+) without changing flags$/.exec(words))) {
      const amount=BigInt(m[1]),size=sizeOf(m[2]),from=m[3],to=m[4];run=s=>put(s,to,get(s,from)+amount,size);
    } else if((m=/^add the (four|eight)-byte value in register (\w+) to register (\w+) multiplied by (0x[0-9a-f]+) into register (\w+) without changing flags$/.exec(words))) {
      const size=sizeOf(m[1]),a=m[2],b=m[3],scale=BigInt(m[4]),to=m[5];run=s=>put(s,to,get(s,a)+get(s,b)*scale,size);
    } else if((m=/^multiply the eight-byte value in register (\w+) by (0x[0-9a-f]+) into register (\w+) without changing flags$/.exec(words))) {
      assert.equal(arch,'x86');const from=m[1],scale=BigInt(m[2]),to=m[3];run=s=>put(s,to,get(s,from)*scale,8);
    } else if((m=/^write (0x[0-9a-f]+) into the (four|eight)-byte view of register (\w+) without changing flags$/.exec(words))) {
      const value=BigInt(m[1]),size=sizeOf(m[2]),to=m[3];run=s=>put(s,to,value,size);
    } else if((m=/^read the four-byte literal at procedure byte offset (0x[0-9a-f]+) into register (\w+)$/.exec(words))) {
      assert.equal(arch,'arm');const where=BigInt(m[1]),to=m[2];run=s=>put(s,to,loadData(s,s.factorAddress+where,4),4);
    } else if((m=/^add the current ARM instruction address plus eight to register (\w+) into register (\w+) without changing flags$/.exec(words))) {
      assert.equal(arch,'arm');const from=m[1],to=m[2];run=s=>put(s,to,get(s,from)+get(s,'r15')+8n,4);
    } else if((m=/^sign-extend the four-byte view of register (\w+) into the eight-byte register (\w+)$/.exec(words))) {
      assert.equal(arch,'x86');const from=m[1],to=m[2];run=s=>put(s,to,BigInt.asIntN(32,get(s,from)),8);
    } else if((m=/^write the relocated read-only section address into the eight-byte register (\w+) without changing flags$/.exec(words))) {
      assert.equal(arch,'x86');const to=m[1];run=s=>put(s,to,s.readOnlyAddress,8);
    } else if((m=/^write the exact binary64 representation of positive one into floating register (d\d+) without changing floating status$/.exec(words))) {
      assert.equal(arch,'arm');const to=m[1];run=s=>{assert(Object.hasOwn(s.fp,to));s.fp[to]=0x3ff0000000000000n;};
    } else if((m=/^store the low eight-byte payload of vector register (xmm\d+) at stack register rsp plus (0x[0-9a-f]+) without changing registers or floating status$/.exec(words))) {
      assert.equal(arch,'x86');const from=m[1],displacement=BigInt(m[2]);run=s=>{assert(Object.hasOwn(s.fp,from));writeMemory(s,get(s,'rsp')+displacement,8,s.fp[from]);};
    } else {
      // Reuse already executed QR entry meanings for loads/stores, stack,
      // signed views, logic flags, and conditional 64-bit moves.
      run=parseEnglish(line,arch)[0].run;
    }
    assert(!operations.length||offset>operations.at(-1).offset,'Repeated or unordered offset');
    operations.push({offset,sentence:line,run,changesIndex});
  }
  assert(operations.length,'No English callee instructions');return operations;
}
