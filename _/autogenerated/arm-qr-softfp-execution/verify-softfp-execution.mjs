// Diagnostic Node fallback for the unbootstrapped Idriç attempt; see attempt.md.
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve_repository_path} from '../../tools/resolve-repository-path.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const original='examples/r-lm-native-armv7-a32';
const evidence=join(original,'softfp-execution');
const option=(name,fallback)=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1) ?? fallback;
const qemu=option('--qemu','qemu-arm');
const sysroot=option('--library-prefix','/usr/arm-linux-gnueabi');
const binutilsPrefix=option('--binutils-prefix','arm-linux-gnueabi-');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireTrue=(condition,message)=>{if(!condition)throw new Error(message);};

function verifyChecksums(directory,ledger,read=path=>readFileSync(path)) {
  const records=ledger.trim().split('\n');
  for(const line of records) {
    const match=line.match(/^([a-f0-9]{64})  ([a-zA-Z0-9_.\/-]+)$/);
    requireTrue(match && !match[2].startsWith('/') && !match[2].split('/').includes('..'),'unsafe checksum record');
    requireTrue(digest(read(resolve_repository_path(join(directory,match[2]))))===match[1],'artifact identity mismatch: '+match[2]);
  }
  return records.length;
}
requireTrue(verifyChecksums(original,readFileSync(resolve_repository_path(join(original,'SHA256SUMS')),'utf8'))===7,'original ledger incomplete');
const ledger=readFileSync(resolve_repository_path(join(evidence,'SHA256SUMS')),'utf8');
const artifactCount=verifyChecksums(evidence,ledger);
requireTrue(artifactCount===16,'softfp execution ledger incomplete');
function expectRejection(test,label) {
  let rejected=false;
  try{test();}catch{rejected=true;}
  requireTrue(rejected,'bad fixture accepted: '+label);
}
expectRejection(()=>verifyChecksums(evidence,ledger,path=>Buffer.concat([readFileSync(path),Buffer.from([0])])),'changed artifact');
expectRejection(()=>verifyChecksums(evidence,ledger.replace(/^[a-f0-9]/,letter=>letter==='0'?'1':'0')),'forged digest');

const binary=resolve_repository_path(join(evidence,'call_r_qr.armv7-softfp'));
const header=execFileSync(binutilsPrefix+'readelf',['-h','-A',binary],{encoding:'utf8'});
requireTrue(header.includes('ELF32') && /Machine:\s+ARM/.test(header) && header.includes('soft-float ABI'),
  'not an ELF32 Linux softfp executable');
requireTrue(header.includes('Tag_CPU_arch: v7') && header.includes('Tag_ARM_ISA_use: Yes')
  && !header.includes('Tag_ABI_VFP_args: VFP registers'),'wrong ARM profile or hardfp argument ABI');
const listing=execFileSync(binutilsPrefix+'objdump',['-d',binary],{encoding:'utf8',maxBuffer:4*1024*1024});
const normalize=text=>text.replace(/^.*:     file format /m,':     file format ');
requireTrue(normalize(listing)===normalize(readFileSync(resolve_repository_path(join(evidence,'linked-executable.softfp.disasm.txt')),'utf8')),
  'linked disassembly differs from executable');

// Bounded ELF32 little-endian section reader, only for these identified ELF inputs.
function elfSections(bytes) {
  requireTrue(bytes.subarray(0,7).equals(Buffer.from([0x7f,0x45,0x4c,0x46,1,1,1])),'not ELF32 little-endian');
  const tableOffset=bytes.readUInt32LE(32),entrySize=bytes.readUInt16LE(46),count=bytes.readUInt16LE(48);
  const namesIndex=bytes.readUInt16LE(50);
  requireTrue(entrySize===40 && namesIndex<count && tableOffset+entrySize*count<=bytes.length,'invalid ELF section table');
  const sections=[];
  for(let index=0;index<count;index++) {
    const start=tableOffset+index*entrySize;
    sections.push({nameOffset:bytes.readUInt32LE(start),address:bytes.readUInt32LE(start+12),
      offset:bytes.readUInt32LE(start+16),size:bytes.readUInt32LE(start+20),type:bytes.readUInt32LE(start+4)});
  }
  const strings=sections[namesIndex];
  requireTrue(strings.offset+strings.size<=bytes.length,'invalid section-name table');
  const names=bytes.subarray(strings.offset,strings.offset+strings.size);
  for(const section of sections) {
    requireTrue(section.nameOffset<names.length,'invalid section name');
    const end=names.indexOf(0,section.nameOffset);
    requireTrue(end>=0,'unterminated section name');
    section.name=names.subarray(section.nameOffset,end).toString('ascii');
    if(section.type!==8)requireTrue(section.offset+section.size<=bytes.length,'section outside file');
    section.data=section.type===8?Buffer.alloc(0):bytes.subarray(section.offset,section.offset+section.size);
  }
  return sections;
}
const binaryText=elfSections(readFileSync(binary)).find(section=>section.name==='.text');
requireTrue(binaryText,'missing executable code');
const symbols=execFileSync(binutilsPrefix+'nm',['-n','-S',binary],{encoding:'utf8'});
const bounds=[];
for(const routine of ['dqrdc2','dqrls','dqrsl']) {
  const match=symbols.match(new RegExp('^([a-f0-9]+) ([a-f0-9]+) T '+routine+'_$','m'));
  requireTrue(match,'missing QR symbol: '+routine);
  const address=parseInt(match[1],16),size=parseInt(match[2],16);
  const object=elfSections(readFileSync(resolve_repository_path(join(original,routine+'.armv7-a32.o'))));
  const text=object.find(section=>section.name==='.text');
  const relocations=object.find(section=>section.name==='.rel.text');
  requireTrue(text && text.size===size && address>=binaryText.address && address+size<=binaryText.address+binaryText.size,
    'wrong linked QR extent: '+routine);
  const relocatedBytes=new Set();
  if(relocations) {
    requireTrue(relocations.size%8===0,'malformed ARM relocation section');
    for(let offset=0;offset<relocations.size;offset+=8) {
      const at=relocations.data.readUInt32LE(offset),kind=relocations.data.readUInt32LE(offset+4)&255;
      requireTrue([2,3,28].includes(kind) && at+4<=size,'unexpected relocation type or extent');
      for(let byte=at;byte<at+4;byte++)relocatedBytes.add(byte);
    }
  }
  let matched=0;
  for(let offset=0;offset<size;offset++) {
    if(relocatedBytes.has(offset))continue;
    requireTrue(text.data[offset]===binaryText.data[address-binaryText.address+offset],
      'linked QR byte does not match original object: '+routine+'+'+offset);
    matched++;
  }
  bounds.push({routine,address,size});
  console.log('PASS original QR code in linked softfp executable: '+routine+'; '+matched+' unrelocated bytes');
}

function verifyNumbers(output) {
  const lines=output.trim().split('\n');
  requireTrue(lines.length===5 && lines[0]==='sample: x=(0,1,2,3,4,5); y=(1,2,2,4,4,6)' && lines[1]==='rank=2',
    'wrong or missing numeric output');
  for(const [index,name,expected] of [[2,'intercept',17/21],[3,'slope',33/35],[4,'sum_of_squared_vertical_errors',134/105]]) {
    const match=lines[index].match(new RegExp('^'+name+'=([^ ]+)$'));
    requireTrue(match && match[1].length>0,'missing numeric field');
    const observed=Number(match[1]);
    requireTrue(Number.isFinite(observed) && Math.abs(observed-expected)<=1e-12,'nonfinite or wrong '+name);
  }
}
const capturedOutput=readFileSync(resolve_repository_path(join(evidence,'test-output.txt')),'utf8');
verifyNumbers(capturedOutput);
for(const replacement of ['NaN','Infinity','0']) {
  expectRejection(()=>verifyNumbers(capturedOutput.replace(/intercept=[^\n]+/,'intercept='+replacement)),replacement+' coefficient');
}
expectRejection(()=>verifyNumbers(capturedOutput.replace(/^slope=.*\n/m,'')),'missing coefficient');
function verifyTrace(trace) {
  const states=[...trace.matchAll(/^R12=.*R15=([a-f0-9]{8})$/gm)].map(match=>parseInt(match[1],16));
  requireTrue(states.length===994 && new Set(states).size===734,'absent or changed QR instruction-state trace');
  const counts={};
  for(const address of states) {
    const bound=bounds.find(bound=>address>=bound.address && address<bound.address+bound.size);
    requireTrue(bound && address%4===0,'trace state outside an A32 QR instruction');
    counts[bound.routine]=(counts[bound.routine]??0)+1;
  }
  requireTrue(counts.dqrdc2===475 && counts.dqrls===80 && counts.dqrsl===439 && trace.includes('FPSCR:'),
    'missing routine or FP trace state');
}
verifyTrace(gunzipSync(readFileSync(resolve_repository_path(join(evidence,'qr-instruction-state.trace.txt.gz')))).toString('utf8'));
expectRejection(()=>verifyTrace(''),'absent trace');
const runtimeHashes=[['libc.so.6','46474d6c2d5a465011670150d737a89bdb4bb253ea6301a5e4c042a0058d8b12'],
  ['ld-linux.so.3','8ba201dd31c40757060fcb87ec7e61e22f6064c549a8bba7a1c31272a0fd32da']];
for(const [name,expected] of runtimeHashes)requireTrue(digest(readFileSync(join(sysroot,'lib',name)))===expected,
  'Linux runtime identity differs: '+name);
const version=execFileSync(qemu,['--version'],{encoding:'utf8'}).split('\n')[0];
requireTrue(version.startsWith('qemu-arm version 8.2.2'),'QEMU version differs');
const work=mkdtempSync(join(tmpdir(),'emc-2-softfp-'));
try {
  const trace=join(work,'trace.txt');
  const start=Math.min(...bounds.map(bound=>bound.address)),end=Math.max(...bounds.map(bound=>bound.address+bound.size))-1;
  const output=execFileSync(qemu,['-cpu','cortex-a7','-one-insn-per-tb','-d','in_asm,cpu,fpu,nochain',
    '-dfilter','0x'+start.toString(16)+'..0x'+end.toString(16),'-D',trace,'-L',sysroot,binary],
    {encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  verifyNumbers(output);
  verifyTrace(readFileSync(trace,'utf8'));
  console.log(output.trim());
} finally {rmSync(work,{recursive:true,force:true});}
console.log('PASS: exact archived softfp QR objects; 994 pre-instruction register states at 734 addresses');
console.log('PASS: altered artifacts, forged digest, NaN/Infinity/wrong or missing coefficient and absent trace rejected');
console.log('EVIDENCE_CLASS=QEMU_LINUX_ARM_SOFTFP; Android/physical/EMC execution not established');
