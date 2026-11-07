#!/usr/bin/env node
// Source-only regression checks for the independent x86 QR semantics audit.
// Machine equivalence, exceptional FP behavior and external calls are not certified.
import {readFileSync} from 'node:fs';
import { resolve_repository_path } from '../../../tools/resolve-repository-path.mjs';
const names=['dqrls','dqrdc2','dqrsl','linked-executable'];
const sizes={dqrls:165,dqrdc2:465,dqrsl:662,'linked-executable':1543};
const familyCounts={shl:14,sar:12,shr:1,imul:26,ucomisd:18,comisd:6,mulsd:8,divsd:18,addsd:3,subsd:6,sqrtsd:2,maxsd:2,cvtsi2sd:1};
const originalFailures=[
 ['dqrdc2','0079','41 0f 4e f0','esi','rsi'],
 ['dqrdc2','0348','41 0f 4e c0','eax','rax'],
 ['dqrdc2','0464','44 0f 4f da','r11d','r11'],
 ['dqrsl','0056','0f 4f d8','ebx','rbx'],
 ['linked-executable','0491','41 0f 4e f0','esi','rsi'],
 ['linked-executable','0760','41 0f 4e c0','eax','rax'],
 ['linked-executable','0876','44 0f 4f da','r11d','r11'],
 ['linked-executable','0934','0f 4f d8','ebx','rbx']
];
const failedRows=new Map(originalFailures.map(r=>[r[0]+'/'+r[1],r]));
const requireTrue=(yes,message)=>{if(!yes)throw Error(message)};
const sources=Object.fromEntries(names.map(n=>[n,readFileSync(resolve_repository_path('examples/r-lm-native-x86-64/english-translation/'+n+'.x86-64.instructions.english'),'utf8')]));
function check(corpus){
 const observed={},fixed=new Set();let total=0;
 for(const n of names){
  const lines=corpus[n].split('\n');let rows=0;
  for(let i=0;i<lines.length;i++){
   const r=lines[i].match(/^INSTRUCTION (\d{4}) \| 0x([0-9a-f]+) \| ([0-9a-f ]+) \| (.+)$/);
   if(!r)continue;
   rows++;const key=n+'/'+r[1],effect=lines[i+3]||'',op=r[4].trim().split(/\s+/)[0];
   requireTrue((lines[i+2]||'').startsWith('  Long operation: ')&&effect.startsWith('  Detailed first-pass effect: '),'missing English effect at '+key);
   if(failedRows.has(key)){
     const w=failedRows.get(key);
     requireTrue(r[3]===w[2]&&r[4].includes(w[3]+','),'unexpected machine encoding at '+key);
     for(const phrase of ['In BOTH cases','clearing bits 63 through 32','including when the condition is false','No condition flag changes',w[4]]){
       requireTrue(effect.includes(phrase),'old false-condition defect or missing rule at '+key+': '+phrase);
     }
     requireTrue(!effect.includes('otherwise leave that destination unchanged'),'original incorrect statement at '+key);
     fixed.add(key);
   }
   if(!Object.hasOwn(familyCounts,op))continue;
   observed[op]=(observed[op]||0)+1;
   let required=[];
   if(['shl','shr','sar'].includes(op)){
     // Shift-by-one overflow is defined; counts greater than one leave it undefined.
     const parts=r[4].match(/^(shl|shr|sar)\s+([^,]+),(\S+)/);
     requireTrue(Boolean(parts),'unparsed captured shift '+key);
     const w=/^(?:e(?:ax|bx|cx|dx|si|di|bp|sp)|r(?:8|9|1[0-5])d)$/.test(parts[2])?32:64;
     const effectiveCount=Number(parts[3]) & (w===64?63:31);
     requireTrue(effectiveCount>0 && effectiveCount<w,'unsupported shift count '+key);
     const of=effectiveCount===1?(op==='sar'?'OF=0':op==='shr'?'OF equals the original most-significant bit':'OF equals the result most-significant bit XOR CF'):'OF is undefined';
     required=['effective count','CF becomes','SF is','ZF indicates','PF is','AF is undefined',of];
   }else if(op==='imul'){
     required=['full signed product','low ','Set CF and OF','SF, ZF, AF, and PF are undefined'];
   }else if(op==='comisd'||op==='ucomisd'){
     required=['ordered greater: ZF=0, PF=0, CF=0','ordered less: ZF=0, PF=0, CF=1','ordered equal: ZF=1, PF=0, CF=0','unordered: ZF=1, PF=1, CF=1','Clear OF, SF, and AF','unmasked floating exception','MXCSR'];
   }else if(op==='maxsd'){
     required=['either input is a NaN','both are zero','select the second operand','preserving bits 127 through 64','MXCSR'];
   }else if(op==='cvtsi2sd'){
     required=['signed 32-bit','exactly','preserving bits 127 through 64','RFLAGS are unchanged'];
   }else{
     required=['low lane','preserving original bits 127 through 64','RFLAGS are unchanged','MXCSR','unmasked exception'];
   }
   for(const phrase of required)requireTrue(effect.includes(phrase),'missing '+op+' semantic effect at '+key+': '+phrase);
  }
  requireTrue(rows===sizes[n],'record count changed for '+n);
  total+=rows;
 }
 requireTrue(fixed.size===8,'missing corrected conditional-move instances');
 for(const [op,count] of Object.entries(familyCounts))requireTrue(observed[op]===count,'changed audited operation count '+op);
 return {total,corrected:fixed.size,expanded:Object.values(observed).reduce((a,b)=>a+b,0)};
}
const result=check(sources);
requireTrue(result.total===2835 && result.expanded===117,'audit coverage changed');
if(process.argv.includes('--self-test')){
 const mustReject=(change,description)=>{
   let refused=false;try{check(change)}catch{refused=true}
   requireTrue(refused,'accepted deliberately wrong '+description);
 };
 mustReject({...sources,dqrdc2:sources.dqrdc2.replace('including when the condition is false','only when the condition is true')},'CMOV upper-half rule');
 mustReject({...sources,dqrsl:sources.dqrsl.replace('SF, ZF, AF, and PF are undefined','SF, ZF, AF, and PF are defined')},'IMUL undefined flags');
 mustReject({...sources,'linked-executable':sources['linked-executable'].replace('ordered less: ZF=0, PF=0, CF=1','ordered less: ZF=0, PF=0, CF=0')},'floating comparison CF');
 mustReject({...sources,dqrls:sources.dqrls.replace('AF is undefined','AF is defined')},'shift auxiliary carry');
 mustReject({...sources,'linked-executable':sources['linked-executable'].replace('OF=0. An effective count','OF=1. An effective count')},'defined shift-by-one overflow');
}
console.log('PASS source regression: '+result.total+' records, '+result.corrected+' corrected false CMOV, '+result.expanded+' expanded incomplete descriptions');
console.log('SEMANTIC_ACCEPTANCE=UNVERIFIED: source guard is not independent whole-state machine evidence.');
