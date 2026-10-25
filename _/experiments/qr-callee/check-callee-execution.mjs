import {resolve_repository_path} from '../../tools/resolve-repository-path.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnglish,readMemory,writeMemory,MEMORY_START,MEMORY_SIZE,CODE_ADDRESS,arithmeticFlags} from '../qr-entry/english-state.mjs';
import {pinnedFile,elfFile,diagnosticElf,originalPrefixRows,digest} from '../qr-entry/elf-evidence.mjs';
import {parseFactorEnglish,callIntoFactor,loadData} from './callee-state.mjs';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
assert(process.argv[2],'Provide an evidence output directory');
const output=resolve(process.argv[2]);mkdirSync(output,{recursive:true});
const FACTOR=0x12000,READONLY=0x14000;
const hex=v=>'0x'+BigInt(v).toString(16);
const json=v=>JSON.stringify(v,(_k,x)=>typeof x==='bigint'?hex(x):x,2)+'\n';
const names=arch=>arch==='arm'?Array.from({length:16},(_,i)=>'r'+i):['rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp',...Array.from({length:8},(_,i)=>'r'+(i+8)),'rip'];
const floatingNames=arch=>Array.from({length:arch==='arm'?32:16},(_,i)=>(arch==='arm'?'d':'xmm')+i);
const pc=arch=>arch==='arm'?'r15':'rip';
const pointers={x:0x20100n,n:0x20200n,p:0x20204n,ny:0x20208n,k:0x2020cn,tol:0x20210n,y:0x20300n,b:0x20400n,rsd:0x20500n,qty:0x20600n,jpvt:0x20700n,qraux:0x20800n,work:0x20900n};
const cases=[[6,2],[1,1],[4,3],[0,0],[-3,2],[6,-2],[-3,-2],[-2147483648,2147483647],[2147483647,-2147483648]];
const sourceHash={
 arm:{caller:'4d3afbce9a3e6466c3af06f0fd07e1c556c387e7bf70ad115e7e81e62873299b',factor:'73bd4d571441e67b25c0e7c863b95c89ded9e23bef68f1bacc614bfc95474785',callerListing:'83020ab3d77340dd3b751118df5b8883cd5375be2571b620a33b607512e58662',factorListing:'334a19d1938e806195939c32e80f463351430516623b338797c23a1a9fe1f762'},
 x86:{caller:'0c215591bb3608af7f946ca50bb8d45ff58daa4fa201fd4bdb3e686705a2d237',factor:'1fb57e080594848d8206f1d9ad688002a38deee70b01d9d2169e8df80c11e951',callerListing:'968488c7e15ab89373587fa66e65fffc62cdc92bccca2e9d63c40728d69910f2',factorListing:'1d39427ac5b32ddab7a22a303150cb9c8e29b2fa03df49f81ba88d39be58e0c4'}
};
class StateMismatch extends Error {}
function match(ok,message){if(!ok)throw new StateMismatch(message);}
function mismatch(operation,label){try{operation();}catch(e){if(e instanceof StateMismatch)return e.message;throw e;}throw Error('Semantic mutant was not rejected: '+label);}
function clone(s){return {...s,registers:{...s.registers},fp:{...s.fp},memory:Buffer.from(s.memory)};}
function bits(buffer){let n=0n;for(let i=buffer.length-1;i>=0;i--)n=(n<<8n)|BigInt(buffer[i]);return n;}

// These are ELF relocations, not replacement assembly. Retain and verify the
// original objects and declare every byte changed in the diagnostic copy.
function relocation(object,at,expectedType,expectedName) {
  const wide=object.wide,section=object.section(wide?'.rela.text':'.rel.text');
  const stride=wide?24:8;assert.equal(section.bytes.length%stride,0);
  const found=[];
  for(let i=0;i<section.bytes.length;i+=stride){
    const offset=wide?Number(section.bytes.readBigUInt64LE(i)):section.bytes.readUInt32LE(i);
    if(offset!==at)continue;
    const info=wide?section.bytes.readBigUInt64LE(i+8):BigInt(section.bytes.readUInt32LE(i+4));
    const type=Number(info&(wide?0xffffffffn:255n)),symIndex=Number(info>>(wide?32n:8n));
    const sym=object.symbols[symIndex];assert(sym,'Relocation symbol missing');
    const name=sym.name||object.sections[sym.section]?.name;
    assert.equal(type,expectedType,'Unexpected relocation kind');assert.equal(name,expectedName,'Unexpected relocation symbol');
    found.push({offset,type,symbol:name,symbolValue:sym.value,addend:wide?section.bytes.readBigInt64LE(i+16):null});
  }
  assert.equal(found.length,1,'Missing or duplicate relocation');return found[0];
}
function loadProgram(arch){
  const a=arch==='arm',folder=join(root,'examples',a?'r-lm-native-armv7-a32':'r-lm-native-x86-64');
  const suffix=a?'.armv7-a32.o':'.o',lsuffix=a?'.armv7-a32.disasm.txt':'.x86-64.disasm.txt';
  const objects=['dqrls','dqrdc2'].map((name,i)=>elfFile(pinnedFile(resolve_repository_path(join(folder,name+suffix)),sourceHash[arch][i?'factor':'caller'])));
  const [caller,factor]=objects;assert.equal(caller.machine,a?40:62);assert.equal(factor.machine,caller.machine);
  const callerText=caller.section('.text').bytes,factorText=factor.section('.text').bytes;
  const callOffset=a?0x5c:0x75,callLength=a?4:5,stop=a?0xac:0xdb;
  const callerListing=pinnedFile(resolve_repository_path(join(folder,'dqrls'+lsuffix)),sourceHash[arch].callerListing).toString('utf8');
  const factorListing=pinnedFile(resolve_repository_path(join(folder,'dqrdc2'+lsuffix)),sourceHash[arch].factorListing).toString('utf8');
  const callerRows=originalPrefixRows(arch,callerListing,callerText,callOffset+callLength);
  const factorRows=originalPrefixRows(arch,factorListing,factorText,stop);
  const code=Buffer.alloc(0x4000);callerText.copy(code);factorText.copy(code,FACTOR-CODE_ADDRESS);
  const rodata=factor.section('.rodata').bytes;assert(rodata.length>=4&&rodata.readUInt32LE(0)===1,'Norm increment is not the original integer one');
  rodata.copy(code,READONLY-CODE_ADDRESS);
  const before=Buffer.from(code),patches=[];
  function patch(at,value,record){const offset=at-CODE_ADDRESS,old=code.subarray(offset,offset+4).toString('hex');code.writeUInt32LE(Number(BigInt.asUintN(32,value)),offset);patches.push({...record,address:at,before:old,after:code.subarray(offset,offset+4).toString('hex')});}
  if(a){
    const r=relocation(caller,callOffset,28,'dqrdc2_');
    const word=callerText.readUInt32LE(callOffset);assert.equal(word,0xebfffffe);
    const addend=BigInt.asIntN(24,BigInt(word&0xffffff))<<2n;
    const displacement=BigInt(FACTOR)+addend-BigInt(CODE_ADDRESS+callOffset);
    assert.equal(displacement%4n,0n);
    patch(CODE_ADDRESS+callOffset,0xeb000000n|BigInt.asUintN(24,displacement>>2n),{...r,addend,resolvedAddress:FACTOR});
    const literal=relocation(factor,0x6f8,3,'.rodata'),A=BigInt(factorText.readInt32LE(0x6f8));
    patch(FACTOR+0x6f8,BigInt(READONLY+literal.symbolValue)+A-BigInt(FACTOR+0x6f8),{...literal,addend:A,resolvedAddress:READONLY});
    const decoded=CODE_ADDRESS+callOffset+8+Number(BigInt.asIntN(24,BigInt(code.readUInt32LE(callOffset)&0xffffff))<<2n);assert.equal(decoded,FACTOR);
  }else{
    const r=relocation(caller,callOffset+1,4,'dqrdc2_');assert.equal(r.addend,-4n);
    patch(CODE_ADDRESS+callOffset+1,BigInt(FACTOR)+r.addend-BigInt(CODE_ADDRESS+callOffset+1),{...r,resolvedAddress:FACTOR});
    const literal=relocation(factor,0xc4,2,'.rodata');assert.equal(literal.addend,-4n);
    patch(FACTOR+0xc4,BigInt(READONLY+literal.symbolValue)+literal.addend-BigInt(FACTOR+0xc4),{...literal,resolvedAddress:READONLY});
    assert.equal(CODE_ADDRESS+callOffset+5+code.readInt32LE(callOffset+1),FACTOR);
  }
  const permitted=new Set(patches.flatMap(p=>Array.from({length:4},(_,i)=>p.address-CODE_ADDRESS+i)));
  for(let i=0;i<code.length;i++)if(!permitted.has(i))assert.equal(code[i],before[i],'Non-relocation machine byte changed');
  const callerSource=readFileSync(resolve_repository_path(join('experiments/qr-entry',a?'ARM entry before its first call.english':'x86 entry before its first call.english')),'utf8');
  const callerOperations=parseEnglish(callerSource,arch);assert.deepEqual(callerOperations.map(o=>o.offset),callerRows.slice(0,-1).map(r=>r.offset));
  const callSource=readFileSync(join(here,'Call boundaries.english'),'utf8').split('\n').find(line=>line.startsWith('For '+(a?'ARM':'x86')+','));
  assert.equal(callSource,a?'For ARM, at caller byte offset 0x5c, save the following instruction address in register r14 and enter procedure dqrdc2 in ARM state.':'For x86, at caller byte offset 0x75, save the following eight-byte instruction address on the descending stack and enter procedure dqrdc2.');
  const factorSource=readFileSync(resolve_repository_path(join('experiments/qr-callee',a?'ARM factorization before its first norm call.english':'x86 factorization before its first norm call.english')),'utf8');
  const factorOperations=parseFactorEnglish(factorSource,arch);assert.deepEqual(factorOperations.map(o=>o.offset),factorRows.map(r=>r.offset));
  return {arch,machine:caller.machine,code,patches,callerRows,callerOperations,callOffset,callLength,callSource,factorRows,factorOperations,factorSource,stop,terminal:[FACTOR+stop,...(a?[FACTOR+0x6dc,FACTOR+0x518]:[FACTOR+0x91e,FACTOR+0x702])]};
}
function initial(program,n,p,testIndex){
  const arch=program.arch,arm=arch==='arm';
  const registers=Object.fromEntries(names(arch).map((r,i)=>[r,arm?0x51000000n+BigInt(i*0x10101):0xabcde12300000000n+BigInt(i*0x10101+1)]));
  const s={arch,registers,fp:{},code:program.code,factorAddress:BigInt(FACTOR),readOnlyAddress:BigInt(READONLY),memory:Buffer.alloc(MEMORY_SIZE),flags:arm?BigInt((testIndex%16)*0x10000000)+0x10n:0x202n,flagsMask:arm?0xf0000020n:arithmeticFlags,fpStatus:arm?BigInt((testIndex%4)*0x400000):0x1f80n+BigInt((testIndex%4)*0x2000)};
  for(let i=0;i<s.memory.length;i++)s.memory[i]=(37*i+11)&255;
  writeMemory(s,pointers.n,4,BigInt(n));writeMemory(s,pointers.p,4,BigInt(p));writeMemory(s,pointers.ny,4,1n);
  if(arm){Object.assign(registers,{r0:pointers.x,r1:pointers.n,r2:pointers.p,r3:pointers.y,r13:0x22000n,r15:BigInt(CODE_ADDRESS)});['ny','tol','b','rsd','qty','k','jpvt','qraux','work'].forEach((k,i)=>writeMemory(s,registers.r13+BigInt(i*4),4,pointers[k]));}
  else{Object.assign(registers,{rdi:pointers.x,rsi:pointers.n,rdx:pointers.p,rcx:pointers.y,r8:pointers.ny,r9:pointers.tol,rsp:0x22008n,rip:BigInt(CODE_ADDRESS)});writeMemory(s,registers.rsp,8,0x1122334455667788n);['b','rsd','qty','k','jpvt','qraux','work'].forEach((k,i)=>writeMemory(s,registers.rsp+BigInt((i+1)*8),8,pointers[k]));}
  const patterns=[0x8000000000000000n,1n,0x7ff8000012345678n,0x3ff13579abcdef01n,0xbfeabcdef0012345n,0x0010000000000000n];
  floatingNames(arch).forEach((r,i)=>{const lo=patterns[(i+testIndex)%patterns.length];s.fp[r]=arm?lo:lo|(patterns[(i+testIndex+1)%patterns.length]<<64n);const at=0x20a00n+BigInt(i*(arm?8:16));writeMemory(s,at,8,lo);if(!arm)writeMemory(s,at+8n,8,s.fp[r]>>64n);});
  return s;
}
function expected(program,first,operations=program.factorOperations){
  const s=clone(first),trace=[clone(s)];
  for(let i=0;i<program.callerOperations.length;i++){program.callerOperations[i].run(s);s.registers[pc(s.arch)]=BigInt(CODE_ADDRESS+program.callerRows[i].offset+program.callerRows[i].bytes.length);trace.push(clone(s));}
  callIntoFactor(s,CODE_ADDRESS+program.callOffset+program.callLength,FACTOR);trace.push(clone(s));
  const entry=clone(s), stack=entry.registers[s.arch==='arm'?'r13':'rsp'];
  const argumentsObserved=s.arch==='arm'?[...['r0','r1','r2','r3'].map(r=>entry.registers[r]),...Array.from({length:5},(_,i)=>readMemory(entry,stack+BigInt(i*4),4))]:[...['rdi','rsi','rdx','rcx','r8','r9'].map(r=>entry.registers[r]),...Array.from({length:3},(_,i)=>readMemory(entry,stack+8n+BigInt(i*8),8))];
  assert.deepEqual(argumentsObserved,['x','n','n','p','tol','k','qraux','jpvt','work'].map(k=>pointers[k]),'Actual call argument layout mismatch');
  const byOffset=new Map(operations.map((op,i)=>[op.offset,{op,row:program.factorRows[i]}]));
  while(!program.terminal.includes(Number(s.registers[pc(s.arch)]))){
    assert(trace.length<150,'Unexpected loop or escaped prefix');
    const offset=Number(s.registers[pc(s.arch)])-FACTOR,step=byOffset.get(offset);assert(step,'English control reached an unimplemented instruction');
    s.currentLength=step.row.bytes.length;step.op.run(s);
    if(!step.op.changesIndex)s.registers[pc(s.arch)]=BigInt(FACTOR+offset+step.row.bytes.length);
    trace.push(clone(s));
  }
  if(Number(s.registers[pc(s.arch)])===FACTOR+program.stop){
    const actual=s.arch==='arm'?['r0','r1','r2'].map(r=>s.registers[r]):['rdi','rsi','rdx'].map(r=>s.registers[r]);
    assert.deepEqual(actual,[pointers.n,pointers.x,BigInt(READONLY)],'Wrong first norm arguments');assert.equal(loadData(s,actual[2],4),1n);
  }
  return trace;
}
async function freePort(){const server=createServer();await new Promise((res,rej)=>{server.once('error',rej);server.listen(0,'127.0.0.1',res);});const port=server.address().port;await new Promise(res=>server.close(res));return port;}
const pathOK=p=>{assert(/^[A-Za-z0-9_./-]+$/.test(p),'Unsafe diagnostic path');return p;};
async function native(program,first,steps,label,code=program.code){
  const dir=join(output,label);mkdirSync(dir,{recursive:true});pathOK(dir);
  const image=join(dir,'diagnostic.elf'),memory=join(dir,'initial-memory.bin');writeFileSync(image,diagnosticElf(program.machine,code),{mode:0o700});writeFileSync(memory,first.memory);
  const port=await freePort(),arm=program.arch==='arm',gprs=names(program.arch),fprs=floatingNames(program.arch),flags=arm?'cpsr':'eflags',fpstatus=arm?'fpscr':'mxcsr';
  const child=spawn(arm?'qemu-arm':'qemu-x86_64',['-cpu',arm?'cortex-a9':'qemu64','-g',String(port),image],{stdio:['ignore','pipe','pipe']});let childError,stderr='';child.once('error',e=>childError=e);child.stderr.on('data',b=>stderr+=b);
  const commands=['set pagination off','set confirm off','set language c','set debuginfod enabled off','set remotetimeout 10','set tcp connect-timeout 10','file '+image,'target remote 127.0.0.1:'+port,'restore '+memory+' binary '+hex(MEMORY_START)];
  gprs.forEach(r=>commands.push('set $'+r+' = '+hex(first.registers[r])));commands.push('set $'+flags+' = '+hex(first.flags));
  fprs.forEach((r,i)=>{const at=0x20a00+i*(arm?8:16);if(arm)commands.push('set $'+r+' = *(double *)'+hex(at));else{commands.push('set $'+r+'.v2_int64[0] = *(unsigned long long *)'+hex(at));commands.push('set $'+r+'.v2_int64[1] = *(unsigned long long *)'+hex(at+8));}});
  commands.push('set $'+fpstatus+' = '+hex(first.fpStatus));
  const capture=i=>{
    const cast=arm?'(unsigned long long)(unsigned int)':'(unsigned long long)';
    commands.push('printf "STATE '+i+' '+gprs.map(r=>r+'=%llx').join(' ')+' flags=", '+gprs.map(r=>cast+'$'+r).join(', '));
    // GDB echo strips leading whitespace; printf must retain the field separator.
    commands.push('output/x $'+flags,'printf " fpstatus="','output/x $'+fpstatus,'echo \\n');
    commands.push('dump binary memory '+join(dir,'memory-'+i+'.bin')+' '+hex(MEMORY_START)+' '+hex(MEMORY_START+MEMORY_SIZE));
    fprs.forEach((r,k)=>commands.push((k?'append':'dump')+' binary value '+join(dir,'floating-'+i+'.bin')+' $'+r));
  };
  capture(0);for(let i=1;i<=steps;i++){commands.push('stepi');capture(i);}commands.push('kill','quit');
  const script=join(dir,'steps.gdb');writeFileSync(script,commands.join('\n')+'\n');await new Promise(res=>setTimeout(res,100));
  let gdb;try{if(childError)throw childError;gdb=spawnSync('gdb-multiarch',['-q','-nx','-batch','-x',script],{encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});}finally{child.kill('SIGKILL');}
  writeFileSync(join(dir,'gdb.log'),(gdb?.stdout||'')+(gdb?.stderr||''));writeFileSync(join(dir,'qemu.log'),stderr);
  if(gdb.error)throw gdb.error;assert.equal(gdb.status,0,'Debugger failure, not semantic rejection: '+gdb.stderr+stderr);
  const records=[];
  for(const line of gdb.stdout.split('\n')){const m=/^STATE (\d+) (.+)$/.exec(line);if(!m)continue;assert.equal(Number(m[1]),records.length);const fields=m[2].trim().split(/\s+/).map(word=>{const [key,value]=word.split('=');assert(/^(?:0x)?[0-9a-f]+$/.test(value),'Malformed native register record');return [key,BigInt('0x'+value.replace(/^0x/,''))];});assert.deepEqual(fields.map(f=>f[0]),[...gprs,'flags','fpstatus']);const registers=Object.fromEntries(fields),status=registers.flags,fpStatus=registers.fpstatus;delete registers.flags;delete registers.fpstatus;
    const raw=readFileSync(join(dir,'floating-'+m[1]+'.bin'));assert.equal(raw.length,256,'FP register serialization is not raw architectural bits');const fp=Object.fromEntries(fprs.map((r,k)=>[r,bits(raw.subarray(k*(arm?8:16),(k+1)*(arm?8:16)))]));records.push({registers,fp,flags:status,fpStatus,memory:readFileSync(join(dir,'memory-'+m[1]+'.bin'))});}
  assert.equal(records.length,steps+1,'Missing machine states');return records;
}
function compare(wanted,actual,label){assert.equal(actual.length,wanted.length);return wanted.map((s,i)=>{const got=actual[i];for(const [r,v] of Object.entries(s.registers))match(got.registers[r]===v,`${label} step ${i}: ${r} expected ${hex(v)}, actual ${hex(got.registers[r])}`);match(((s.flags^got.flags)&s.flagsMask)===0n,`${label} step ${i}: integer flags differ`);for(const [r,v] of Object.entries(s.fp))match(got.fp[r]===v,`${label} step ${i}: raw ${r} differs`);match(s.fpStatus===got.fpStatus,`${label} step ${i}: FP status differs`);match(s.memory.equals(got.memory),`${label} step ${i}: workspace bytes differ`);return {step:i,executionIndex:got.registers[pc(s.arch)],registers:got.registers,fp:got.fp,fpStatus:got.fpStatus,flags:got.flags,flagsMask:s.flagsMask,memorySHA256:digest(got.memory)};});}

const report={revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'original QR caller, relocated call, dqrdc2 initialization; stops before dnrm2 or at explicit early guard target',targets:[],negativeTests:[],versions:{qemuArm:execFileSync('qemu-arm',['--version'],{encoding:'utf8'}).split('\n')[0],qemuX86:execFileSync('qemu-x86_64',['--version'],{encoding:'utf8'}).split('\n')[0],gdb:execFileSync('gdb-multiarch',['--version'],{encoding:'utf8'}).split('\n')[0]}};
for(const arch of ['arm','x86']){
  const program=loadProgram(arch),target={arch,sourceHash:sourceHash[arch],patches:program.patches,staticCallerInstructions:program.callerRows.length,staticCalleeInstructions:program.factorRows.length,fpRegisters:floatingNames(arch).length,workspaceBytes:MEMORY_SIZE,cases:[]};let baselineWanted,baselineNative;
  for(let i=0;i<cases.length;i++){
    const [n,p]=cases[i],first=initial(program,n,p,i),wanted=expected(program,first),actual=await native(program,first,wanted.length-1,arch+'-'+i),records=compare(wanted,actual,arch+' n='+n+' p='+p);
    writeFileSync(join(output,arch+'-'+i,'matched-trace.json'),json(records));target.cases.push({n,p,transitions:wanted.length-1,finalExecutionIndex:actual.at(-1).registers[pc(arch)],matched:true});if(i===0){baselineWanted=wanted;baselineNative=actual;}
  }
  const modified=Buffer.from(program.code);
  if(arch==='arm'){assert.equal(modified.readUInt32LE(FACTOR-CODE_ADDRESS+0x74),0xe3a05001);modified.writeUInt32LE(0xe3a05002,FACTOR-CODE_ADDRESS+0x74);}else{const at=FACTOR-CODE_ADDRESS+0xd5;assert.equal(modified.subarray(at,at+6).toString('hex'),'f20f11542410');modified[at+3]=0x5c;}
  const bad=await native(program,initial(program,6,2,0),baselineWanted.length-1,arch+'-wrong-native',modified);
  report.negativeTests.push({arch,kind:'valid wrong native instruction',rejectedBy:mismatch(()=>compare(baselineWanted,bad,'native mutant'),'native')});
  const badEnglish=arch==='arm'?program.factorSource.replace('payloads d8, d9, d10, d11','payloads d9, d10, d11, d12'):program.factorSource.replace('payload of vector register xmm2','payload of vector register xmm3');assert.notEqual(badEnglish,program.factorSource);
  const incorrect=expected(program,initial(program,6,2,0),parseFactorEnglish(badEnglish,arch));report.negativeTests.push({arch,kind:'valid wrong English floating storage',rejectedBy:mismatch(()=>compare(incorrect,baselineNative,'English mutant'),'English')});
  const wrongCall=Buffer.from(program.code);
  if(arch==='arm')wrongCall.writeUInt32LE(wrongCall.readUInt32LE(program.callOffset)+1,program.callOffset);else wrongCall.writeInt32LE(wrongCall.readInt32LE(program.callOffset+1)+4,program.callOffset+1);
  const prefix=baselineWanted.slice(0,program.callerRows.length+1),badCall=await native(program,initial(program,6,2,0),program.callerRows.length,arch+'-wrong-call',wrongCall);
  report.negativeTests.push({arch,kind:'wrong relocated call destination',rejectedBy:mismatch(()=>compare(prefix,badCall,'call mutant'),'call')});
  report.targets.push(target);console.log('PASS '+arch+': '+program.callerRows.length+' caller/call instructions + '+program.factorRows.length+' callee instructions; '+cases.length+' cases; all integer/FP registers, flags/status and workspace compared after every step');
}
writeFileSync(join(output,'receipt.json'),json(report));console.log('PASS: six semantic mutants rejected by state mismatches; no BLAS call or QR floating arithmetic result is claimed');
