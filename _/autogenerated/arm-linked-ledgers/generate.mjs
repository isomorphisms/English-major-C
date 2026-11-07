#!/usr/bin/env node
// Preliminary descriptions only. Never execute or load the archived ELF files.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {elf,listing} from '../fortran-coverage/audit.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=n=>'0x'+n.toString(16);
const cell=v=>String(v).replaceAll('\\','\\\\').replaceAll('\t','\\t').replaceAll('\n','\\n');
const table=(heads,rs)=>[heads.join('\t'),...rs.map(r=>r.map(cell).join('\t'))].join('\n')+'\n';
const conditions=['EQ: Z is 1','NE: Z is 0','CS: C is 1','CC: C is 0','MI: N is 1','PL: N is 0','VS: V is 1','VC: V is 0','HI: C is 1 and Z is 0','LS: C is 0 or Z is 1','GE: N equals V','LT: N differs from V','GT: Z is 0 and N equals V','LE: Z is 1 or N differs from V','AL: unconditional','UNCONDITIONAL_ENCODING_SPACE'];
const suffixes=['eq','ne','cs','cc','mi','pl','vs','vc','hi','ls','ge','lt','gt','le'];
// These names/effects are an inspectable preliminary catalogue, not an ISA grant.
const descriptions={
 adc:['Add with carry','Add the first source, the shifted second source, and incoming APSR.C; keep the low 32 bits in the destination.'],
 add:['Add integers','Add the source values, including the encoded shift or rotated immediate, and keep the low 32 bits in the destination. A two-operand spelling also reads its destination.'],
 sub:['Subtract integers','Subtract the last source from the first source and keep the low 32 bits in the destination. A two-operand spelling also reads its destination.'],
 rsb:['Subtract in reverse order','Subtract the first source from the shifted or immediate second source and keep the low 32 bits in the destination.'],
 and:['Intersect integer bits','Take the bitwise AND of the source values and write the 32-bit result to the destination.'],
 bic:['Clear selected integer bits','AND the first source with the complement of the shifted second source and write the 32-bit result.'],
 eor:['Toggle selected integer bits','Take the bitwise exclusive OR of the sources and write the 32-bit result.'],
 mov:['Copy a machine value','Copy the encoded immediate or shifted register value to the destination. This is a bit transfer, not a floating-point conversion.'],
 movw:['Replace a register with an unsigned halfword','Put the immediate in bits 15:0 of the destination and clear bits 31:16.'],
 movt:['Replace the upper half of a register','Put the immediate in bits 31:16 of the destination and preserve bits 15:0.'],
 mvn:['Copy complemented bits','Complement the shifted or immediate source and write its low 32 bits to the destination.'],
 lsl:['Shift bits left','Shift the source left by the specified amount and write the low 32 bits; encoding-specific zero and large shifts remain a verification obligation.'],
 lsr:['Shift bits right with zero fill','Shift the source right and fill vacated high positions with zero; exact shift and carry cases remain unverified.'],
 asr:['Shift bits right with sign fill','Shift the source right and copy its sign bit into vacated high positions; exact shift and carry cases remain unverified.'],
 cmp:['Compare integers by subtraction','Compute subtraction for APSR.NZCV without storing the arithmetic result.'],
 cmn:['Compare integers by addition','Compute addition for APSR.NZCV without storing the arithmetic result.'],
 tst:['Test selected bits','Compute bitwise AND for APSR.NZC without storing the result; preserve V.'],
 clz:['Count leading zero bits','Count zero bits before the first one in the 32-bit source and put that count in the destination.'],
 mul:['Multiply integers','Multiply the source values and write the low 32 bits to the destination.'],
 mla:['Multiply and add integers','Multiply two sources, add the accumulator source, and put the low 32 bits in the destination.'],
 mls:['Multiply and subtract integers','Subtract the product of two sources from the accumulator source and put the low 32 bits in the destination.'],
 smull:['Multiply signed integers into a register pair','Multiply the two signed 32-bit sources and write the 64-bit product into the explicitly named low and high destination registers.'],
 umull:['Multiply unsigned integers into a register pair','Multiply the two unsigned 32-bit sources and write the 64-bit product into the explicitly named low and high destination registers.'],
 ldr:['Read one machine word','Read four bytes at the encoded effective address into the destination register. Apply the encoded pre/post indexing and writeback. A PC destination changes control flow.'],
 ldrb:['Read one unsigned byte','Read one byte at the effective address, zero-extend it to 32 bits, and write the destination register.'],
 ldrd:['Read two machine words','Read two four-byte words into the destination register pair. The printed single-register A32 alias also names the following numbered register implicitly.'],
 str:['Write one machine word','Write the low 32 bits of the source to four bytes at the encoded effective address. Apply encoded pre/post indexing and writeback.'],
 strb:['Write one byte','Write the low eight bits of the source to the encoded byte address.'],
 strd:['Write two machine words','Write the source register pair to two four-byte memory words. The printed single-register A32 alias also reads the following numbered register implicitly.'],
 ldm:['Read a sequence of machine words','Read successive words into the register list in architectural register order, using the encoded addressing mode and base writeback. A listed PC changes control flow.'],
 stm:['Write a sequence of machine words','Write the listed registers in architectural register order using the encoded addressing mode and base writeback.'],
 stmia:['Write words at increasing addresses','Store the listed register values at increasing addresses starting at the base, with writeback only when encoded.'],
 push:['Save general registers on the stack','Decrease SP by four times the register count and store the listed 32-bit register values in architectural order.'],
 pop:['Restore general registers from the stack','Read the listed 32-bit registers from the stack and increase SP by four times the register count. A PC entry transfers control and may interwork.'],
 b:['Branch to a stated address','If the applicable predicate holds, transfer to the printed direct target in the same instruction state; otherwise continue sequentially.'],
 bl:['Call a stated address','Save a return address in LR and branch to the direct target in the current instruction state. The callee body and ABI effects require separate evidence.'],
 blx:['Call across instruction states','Save a return address in LR and transfer to the direct target in the other instruction state for this immediate encoding. The callee body is separate evidence.'],
 bx:['Branch through a register','Transfer through the register value and use its low bit to select ARM or Thumb state, subject to architectural target restrictions. LR commonly denotes a return, not proof of caller state.'],
 cbz:['Branch when a register is zero','Compare the named register with zero without changing APSR flags; branch to the direct target on equality, otherwise continue sequentially.'],
 cbnz:['Branch when a register is nonzero','Compare the named register with zero without changing APSR flags; branch to the direct target on inequality, otherwise continue sequentially.'],
 nop:['Perform the encoded no-operation hint','Perform the encoding-specific no-operation or hint behavior; timing and implementation effects are not certified.'],
 vldr:['Read a floating-point register payload','Read the memory payload into the named floating-point register, using its width and the encoded effective address. This is a bit transfer, not arithmetic.'],
 vstr:['Write a floating-point register payload','Write the named floating-point register payload to the encoded memory address, using the register width.'],
 vldmia:['Read floating-point payloads at increasing addresses','Load the specified floating-point register sequence from increasing addresses beginning at the base; apply writeback only when encoded.'],
 vldmdb:['Read floating-point payloads below the base','Load the specified floating-point register sequence from the decrement-before address range; apply writeback only when encoded.'],
 vstmia:['Write floating-point payloads at increasing addresses','Store the specified floating-point register sequence at increasing addresses beginning at the base; apply writeback only when encoded.'],
 vpush:['Save floating-point payloads on the stack','Decrease SP by the register-list payload size and store the listed floating-point register payloads.'],
 vpop:['Restore floating-point payloads from the stack','Read the listed floating-point register payloads from SP and increase SP by their total payload size.'],
 vmov:['Transfer floating-point or general register bits','Transfer the encoded immediate or register payload between the named destinations and sources. Register-pair and scalar spellings have different widths; do not infer a numeric conversion.'],
 vmrs:['Copy floating-point status','For the observed APSR_nzcv,FPSCR operands, copy FPSCR.NZCV to APSR.NZCV; do not replace the rest of APSR or FPSCR.'],
 vcmp:['Compare floating-point values','Compare the double-precision sources and update FPSCR.NZCV, including unordered results; NaN and exception details remain unverified.'],
 vcmpe:['Compare floating-point values with signaling behavior','Compare the double-precision sources and update FPSCR.NZCV; the signaling-NaN/quiet-NaN exception distinction requires independent checking.'],
 vadd:['Add floating-point values','Add the double-precision sources and write the destination under the applicable floating-point control state.'],
 vsub:['Subtract floating-point values','Subtract the last double-precision source from the first and write the destination under the applicable floating-point control state.'],
 vmul:['Multiply floating-point values','Multiply the double-precision sources and write the destination under the applicable floating-point control state.'],
 vdiv:['Divide floating-point values','Divide the first double-precision source by the last and write the destination under the applicable floating-point control state.'],
 vmla:['Multiply and accumulate floating-point values','Multiply the double-precision sources and add to the destination accumulator; this VMLA spelling does not grant fused multiply-add semantics.'],
 vmls:['Multiply and subtract floating-point values','Subtract the double-precision product from the destination accumulator; exact intermediate rounding remains unverified.'],
 vneg:['Negate a floating-point value','Form the double-precision negation of the source in the destination; special-value and exception effects remain unverified.'],
 vabs:['Take a floating-point absolute value','Form the double-precision absolute value in the destination; special-value and exception effects remain unverified.'],
 vsqrt:['Take a floating-point square root','Calculate the double-precision square root under the applicable floating-point control state.'],
 vcvt:['Convert a signed integer to floating point','Convert the observed signed 32-bit integer payload to double precision and write the destination; register alias and exception details remain unverified.'],
};
export function classify(r){
 const m=r.assembly.match(/^(\S+)\s*(.*)$/s);assert(m,'NO_ASSEMBLY');let root=m[1].split('.')[0],cond;
 if(r.mode==='A32'){
  const c=r.bytes.readUInt32LE(0)>>>28;cond=conditions[c];
  if(c<14){const ss=c===2?['cs','hs']:c===3?['cc','lo']:[suffixes[c]];const s=ss.find(s=>root.endsWith(s));assert(s,'CONDITION_SUFFIX_MISMATCH '+m[1]);root=root.slice(0,-s.length);}
 }else{assert.equal(r.mode,'T32');cond='ITSTATE_CONTEXT_UNKNOWN';if(/^b(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)$/.test(root)){const s=root.slice(1);cond=conditions[suffixes.indexOf(s)]+'; incoming ITSTATE unresolved';root='b';}}
 let flags=false;if(!descriptions[root]&&root.endsWith('s')&&descriptions[root.slice(0,-1)]){root=root.slice(0,-1);flags=true;}
 assert(descriptions[root],'MISSING_DESCRIPTION '+r.assembly);
 return {root,cond,flags,operands:m[2],mnemonic:m[1]};
}
export function build(repo){
 const dir=join(repo,'_/coverage/fortran/arm-linked');
 const pins=readFileSync(join(dir,'specimens.tsv'),'utf8').trimEnd().split('\n').slice(1).map(l=>l.split('\t'));
 const outputs=new Map(),cross=[],ranges=[],counts=[],forms=new Map();
 const blob=(commit,path)=>{const r=spawnSync('git',['-C',repo,'show',commit+':'+path],{maxBuffer:8*1024*1024,env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'}});assert.equal(r.status,0,'MISSING_PINNED_SOURCE '+commit+':'+path);return r.stdout;};
 for(const [name,commit,bpath,bhash,lpath,lhash,abi,ni,nd,ng]of pins){
  const binary=blob(commit,bpath),text=blob(commit,lpath);assert.equal(hash(binary),bhash,'BINARY_PIN');assert.equal(hash(text),lhash,'LISTING_PIN');
  const image=elf(binary),parsed=listing(text.toString('utf8'),image);assert.equal(parsed.unparsed.length,0,'UNPARSED_LISTING');assert.equal(parsed.printedRelocs.length,0,'UNEXPECTED_PRINTED_RELOCATIONS');
  assert.equal(parsed.rows.filter(r=>r.kind==='INSTRUCTION').length,Number(ni));assert.equal(parsed.rows.filter(r=>r.kind==='DATA').length,Number(nd));assert.equal(parsed.gaps.length,Number(ng));
  const lines=[`Preliminary English ledger of the archived ${name} linked ARM specimen`,'',`Source commit: ${commit}`,`Binary SHA-256: ${bhash}`,`Listing SHA-256: ${lhash}`,`ABI evidence: ${abi}`,'Meaning status: ANNOTATED_ONLY. Complete effects: UNVERIFIED.','Bytes below use memory order, not the printed A32 word order.','Read ../machine-boundary.english for shared unresolved obligations.','GAP entries preserve captured bytes; they are not invented instructions.',''];
  const all=[...parsed.rows.map((r,i)=>({...r,ordinal:i+1})),...parsed.gaps.map(g=>{const s=image.sections.find(s=>s.name===g.section),offset=s.offset+g.start-s.address;return {kind:'GAP',section:g.section,address:g.start,mode:g.mode,bytes:binary.subarray(offset,offset+g.end-g.start),offset,reason:g.reason};})].sort((a,b)=>a.offset-b.offset);
  let entry=0;
  for(const r of all){
   entry++;const id=r.kind==='GAP'?lhash+':gap:'+r.section+':'+r.address:lhash+':'+r.ordinal;
   const startLine=lines.length+1,assembly=r.assembly||'UNPRINTED_CAPTURED_BYTES';
   lines.push(`${r.kind} ${entry} | ${r.section} | ${hex(r.address)} | ${r.bytes.toString('hex')} | ${r.mode} | ${assembly}`);
   lines.push(`  Evidence record: ${id}`);
   lines.push(`  Original symbol: ${r.symbol||'UNPRINTED_RANGE'}`);
   lines.push(`  Native listing line: ${r.line||'NONE_SUPPRESSED_RANGE'}`);
   if(r.kind==='INSTRUCTION'){
    const c=classify(r),[title,effect]=descriptions[c.root];
    lines.push(`  Preliminary operation: ${title}.`);
    lines.push(`  Exact operands: ${c.operands||'(none)'}`);
    lines.push(`  Preliminary effect: With these operands, ${effect[0].toLowerCase()+effect.slice(1)}`);
    lines.push(`  Predicate evidence: ${c.cond}`);
    lines.push(`  Flag evidence: ${c.flags?'S spelling requests encoding-specific APSR updates; exact effects UNVERIFIED.':['cmp','cmn','tst'].includes(c.root)?'Comparison/test updates APSR; exact effects UNVERIFIED.':c.root==='vmrs'?'Observed status transfer to APSR_nzcv; exact effects UNVERIFIED.':'No complete preservation or implicit-flag claim is certified.'}`);
    lines.push(`  Sequential successor only: ${hex(r.address+r.bytes.length)} (${r.bytes.length} encoded bytes). Actual control and faults remain separate.`);
    lines.push('  Meaning status: ANNOTATED_ONLY; complete effects UNVERIFIED.');
    cross.push([id,name,r.kind,r.section,r.address,r.offset,r.bytes.toString('hex'),r.mode,r.bytes.length,`${name}.instructions.english`,startLine,c.root,'ANNOTATED_ONLY','UNVERIFIED']);
    const k=r.mode+'|'+c.mnemonic;if(!forms.has(k))forms.set(k,[k,c.root,title,effect,0,'UNVERIFIED']);forms.get(k)[4]++;
   }else{
    lines.push(r.kind==='DATA'?'  Data effect: Captured literal payload only; no instruction meaning or successor is granted.':'  Gap effect: Captured bytes suppressed by the archived disassembler; no instruction meaning or successor is granted.');
    lines.push('  Interpretation status: DATA_PAYLOAD_MEANING_UNVERIFIED.');
    cross.push([id,name,r.kind,r.section,r.address,r.offset,r.bytes.toString('hex'),r.mode,r.bytes.length,`${name}.instructions.english`,startLine,'NONE','DATA_ONLY','UNVERIFIED']);
   }
   lines.push('');ranges.push([name,r.section,r.address,r.address+r.bytes.length,r.offset,r.bytes.length,r.kind,r.mode,r.bytes.toString('hex'),id]);
  }
  outputs.set(name+'.instructions.english',lines.join('\n'));
  counts.push([name,ni,parsed.rows.filter(r=>r.mode==='A32').length,parsed.rows.filter(r=>r.mode==='T32').length,nd,ng,parsed.gaps.reduce((n,g)=>n+g.end-g.start,0),image.relocs.length,'ANNOTATED_ONLY','UNVERIFIED','UNKNOWN','UNKNOWN']);
 }
 outputs.set('crosswalk.tsv',table(['native_record','specimen','kind','section','address','file_offset','bytes','isa','width','ledger','line','operation','meaning_status','complete_effects'],cross));
 outputs.set('ranges.tsv',table(['specimen','section','start','end_exclusive','file_offset','length','kind','isa','bytes','record'],ranges));
 outputs.set('operation-catalogue.tsv',table(['observed_mnemonic','operation','preliminary_name','preliminary_effect','occurrences','complete_effects'],[...forms.values()].sort((a,b)=>a[0].localeCompare(b[0]))));
 outputs.set('summary.tsv',table(['specimen','instruction_rows','A32_rows','T32_rows','data_rows','gap_ranges','gap_bytes','elf_relocation_rows_in_frozen_inventory','english_status','complete_effects','library_closure','whole_fortran_coverage'],counts));
 return outputs;
}
function main(){const args=process.argv.slice(2),get=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback,repo=resolve(get('--repository',join(here,'../../..'))),out=resolve(get('--output',join(repo,'_/coverage/fortran/arm-linked/generated'))),outputs=build(repo);if(args.includes('--check')){assert.deepEqual(readdirSync(out).sort(),[...outputs.keys()].sort(),'STALE_OUTPUT');for(const [name,body]of outputs)assert.equal(readFileSync(join(out,name),'utf8'),body,'LEDGER_MISMATCH '+name);console.log('PASS linked ARM deterministic regeneration: '+outputs.size+' files');}else{assert(!existsSync(out),'REFUSE_EXISTING_OUTPUT');mkdirSync(out,{recursive:true});for(const [name,body]of outputs)writeFileSync(join(out,name),body);console.log('WROTE '+outputs.size+' linked ARM ledger files');}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
