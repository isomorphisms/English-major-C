import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

export const digest = data => createHash('sha256').update(data).digest('hex');
export function pinnedFile(path, hash) {
  const data=readFileSync(path); assert.equal(digest(data),hash,'Original evidence changed: '+path); return data;
}
export function elfFile(data) {
  assert.equal(data.subarray(0,4).toString('hex'),'7f454c46','Not ELF');
  assert.equal(data[5],1,'Only little-endian captures are supported');
  const wide=data[4]===2; assert(wide||data[4]===1,'Unknown ELF class');
  const u16=o=>data.readUInt16LE(o), u32=o=>data.readUInt32LE(o);
  const u64=o=>{const n=data.readBigUInt64LE(o); assert(n<=BigInt(Number.MAX_SAFE_INTEGER)); return Number(n);};
  const bounded=(offset,size)=>{assert(Number.isSafeInteger(offset)&&Number.isSafeInteger(size)&&offset>=0&&size>=0&&offset+size<=data.length,'ELF range outside file'); return data.subarray(offset,offset+size);};
  const sectionOffset=wide?u64(40):u32(32), sectionSize=u16(wide?58:46), sectionCount=u16(wide?60:48), namesIndex=u16(wide?62:50);
  assert(sectionCount>0&&sectionCount<10000,'Missing or unsupported extended section table');
  assert(sectionSize===(wide?64:40)); bounded(sectionOffset,sectionCount*sectionSize);
  const sections=[];
  for(let index=0;index<sectionCount;index++) {
    const p=sectionOffset+index*sectionSize;
    const section={index,nameIndex:u32(p),type:u32(p+4),flags:wide?u64(p+8):u32(p+8),address:wide?u64(p+16):u32(p+12),offset:wide?u64(p+24):u32(p+16),size:wide?u64(p+32):u32(p+20),link:u32(p+(wide?40:24)),entrySize:wide?u64(p+56):u32(p+36)};
    section.bytes=section.type===8?Buffer.alloc(0):bounded(section.offset,section.size); sections.push(section);
  }
  assert(namesIndex<sections.length); const names=sections[namesIndex].bytes;
  function string(table,offset) {assert(offset<table.length||offset===0&&table.length===0,'Bad string offset'); const end=table.indexOf(0,offset); assert(end>=offset,'Unterminated ELF name'); return table.subarray(offset,end).toString('utf8');}
  for(const section of sections) section.name=string(names,section.nameIndex);
  const symbols=[];
  for(const section of sections.filter(s=>s.type===2)) {
    assert(section.entrySize===(wide?24:16)); assert.equal(section.size%section.entrySize,0);
    assert(section.link<sections.length); const strings=sections[section.link].bytes;
    for(let p=section.offset;p<section.offset+section.size;p+=section.entrySize) {
      symbols.push({name:string(strings,u32(p)),value:wide?u64(p+8):u32(p+4),size:wide?u64(p+16):u32(p+8),section:u16(p+(wide?6:14)),info:data[p+(wide?4:12)]});
    }
  }
  return {data,wide,machine:u16(18),sections,symbols,section(name){const s=sections.find(s=>s.name===name); assert(s,'Missing ELF section '+name); return s;}};
}

// A diagnostic loader envelope, not assembled code. Only the archived .text
// bytes execute. A writable scratch mapping supplies explicit test memory.
export function diagnosticElf(machine, text) {
  const wide=machine===62; assert(wide||machine===40);
  const image=Buffer.alloc(0x13000); image.set([0x7f,0x45,0x4c,0x46,wide?2:1,1,1]);
  image.writeUInt16LE(2,16); image.writeUInt16LE(machine,18); image.writeUInt32LE(1,20);
  if(wide) {
    image.writeBigUInt64LE(0x11000n,24); image.writeBigUInt64LE(64n,32);
    image.writeUInt16LE(64,52); image.writeUInt16LE(56,54); image.writeUInt16LE(1,56);
    image.writeUInt32LE(1,64); image.writeUInt32LE(7,68);
    image.writeBigUInt64LE(0n,72); image.writeBigUInt64LE(0x10000n,80); image.writeBigUInt64LE(0x10000n,88);
    image.writeBigUInt64LE(BigInt(image.length),96); image.writeBigUInt64LE(BigInt(image.length),104); image.writeBigUInt64LE(0x1000n,112);
  } else {
    image.writeUInt32LE(0x11000,24); image.writeUInt32LE(52,28); image.writeUInt32LE(0x05000200,36);
    image.writeUInt16LE(52,40); image.writeUInt16LE(32,42); image.writeUInt16LE(1,44);
    image.writeUInt32LE(1,52); image.writeUInt32LE(0,56); image.writeUInt32LE(0x10000,60); image.writeUInt32LE(0x10000,64);
    image.writeUInt32LE(image.length,68); image.writeUInt32LE(image.length,72); image.writeUInt32LE(7,76); image.writeUInt32LE(0x1000,80);
  }
  assert(text.length<0xf000); text.copy(image,0x1000); return image;
}

export function originalPrefixRows(arch,listing,text,stop) {
  const rows=[]; let current;
  for(const line of listing.split('\n')) {
    if(arch==='arm') {
      const m=/^\s*([0-9a-f]+):\s+([0-9a-f]{8})\s+([a-z][a-z0-9.]*)\s*(.*)$/.exec(line);
      if(!m||Number.parseInt(m[1],16)>=stop) continue;
      const bytes=Buffer.alloc(4); bytes.writeUInt32LE(Number.parseInt(m[2],16));
      rows.push({offset:Number.parseInt(m[1],16),bytes});
    } else {
      const m=/^\s*([0-9a-f]+):\t([0-9a-f ]+)(?:\t(.+))?$/.exec(line);
      if(!m) continue; const offset=Number.parseInt(m[1],16);
      if(offset>=stop) break;
      const bytes=Buffer.from(m[2].replaceAll(' ',''),'hex');
      if(m[3]) {current={offset,bytes}; rows.push(current);}
      else {assert(current&&current.offset+current.bytes.length===offset,'Orphan x86 continuation'); current.bytes=Buffer.concat([current.bytes,bytes]);}
    }
  }
  let next=0;
  for(const row of rows) {assert.equal(row.offset,next,'Unaccounted entry instruction bytes'); assert.deepEqual(row.bytes,text.subarray(row.offset,row.offset+row.bytes.length),'Listing differs from original object'); next+=row.bytes.length;}
  assert.equal(next,stop,'Prefix does not end at first call'); return rows;
}

export function mixedArmInventory(elf,listing) {
  assert.equal(elf.machine,40); const records=[]; let section;
  const maps=elf.symbols.filter(s=>/^\$[atd](?:\.|$)/.test(s.name));
  assert(maps.length>0,'No ARM mapping-symbol evidence');
  function modeAt(s,address) {
    const candidates=maps.filter(m=>m.section===s.index&&m.value<=address).sort((a,b)=>b.value-a.value);
    assert(candidates.length,'No mapping symbol for '+s.name+' '+address.toString(16));
    const latest=candidates[0].value, types=new Set(candidates.filter(c=>c.value===latest).map(c=>c.name[1]));
    assert.equal(types.size,1,'Conflicting mapping symbols'); return [...types][0];
  }
  for(const line of listing.split('\n')) {
    const h=/^Disassembly of section (.+):$/.exec(line); if(h){section=elf.section(h[1]); continue;}
    const m=/^\s*([0-9a-f]+):\s+([0-9a-f]{8}|[0-9a-f]{4}(?: [0-9a-f]{4})?)\s+(\S+)\s*(.*)$/.exec(line);
    if(!m) {assert(/^\s*$|^\s*\.\.\.\s*$|^\S+:\s+file format|^[0-9a-f]+ <[^>]+>:$/.test(line),'Unparsed linked listing: '+line); continue;}
    assert(section&&(section.flags&4),'Record outside executable section');
    const address=Number.parseInt(m[1],16), tokens=m[2].split(' ');
    const bytes=Buffer.concat(tokens.map(t=>{const b=Buffer.alloc(t.length/2); b.writeUIntLE(Number.parseInt(t,16),0,b.length); return b;}));
    const offset=address-section.address; assert(offset>=0&&offset+bytes.length<=section.size);
    assert.deepEqual(bytes,section.bytes.subarray(offset,offset+bytes.length),'Encoded listing word differs from ELF bytes');
    const mode=modeAt(section,address); assert.equal(modeAt(section,address+bytes.length-1),mode,'Instruction spans mapping boundary');
    const data=m[3].startsWith('.'); assert.equal(data,mode==='d','Code versus literal data disagreement');
    if(mode==='a') assert.equal(bytes.length,4);
    if(mode==='t') assert.equal(bytes.length,(bytes.readUInt16LE(0)&0xf800)>=0xe800?4:2,'Wrong Thumb instruction length');
    records.push({section:section.name,address,mode,length:bytes.length,bytes:bytes.toString('hex'),assembly:m[3]+' '+m[4],sequential:data?null:address+bytes.length});
  }
  const gaps=[];
  for(const s of elf.sections.filter(s=>(s.flags&4)&&s.size)) {
    const rows=records.filter(r=>r.section===s.name); assert(rows.length,'Unlisted executable section '+s.name);
    let cursor=s.address;
    for(const r of rows) {
      assert(r.address>=cursor,'Overlapping linked records');
      if(r.address>cursor) gaps.push({section:s.name,address:cursor,length:r.address-cursor,mode:modeAt(s,cursor),bytes:s.bytes.subarray(cursor-s.address,r.address-s.address).toString('hex')});
      cursor=r.address+r.length;
    }
    if(cursor<s.address+s.size) gaps.push({section:s.name,address:cursor,length:s.address+s.size-cursor,mode:modeAt(s,cursor),bytes:s.bytes.subarray(cursor-s.address).toString('hex')});
  }
  const classified=records.reduce((n,r)=>n+r.length,0)+gaps.reduce((n,r)=>n+r.length,0);
  assert.equal(classified,elf.sections.filter(s=>s.flags&4).reduce((n,s)=>n+s.size,0));
  return {records,gaps,counts:{arm:records.filter(r=>r.mode==='a').length,thumb:records.filter(r=>r.mode==='t').length,data:records.filter(r=>r.mode==='d').length,bytes:classified}};
}
