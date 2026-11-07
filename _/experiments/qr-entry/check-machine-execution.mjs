import {resolve_repository_path} from '../../tools/resolve-repository-path.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {parseEnglish,writeMemory,readMemory,MEMORY_START,MEMORY_SIZE,CODE_ADDRESS,arithmeticFlags} from './english-state.mjs';
import {pinnedFile,elfFile,diagnosticElf,originalPrefixRows,mixedArmInventory,digest} from './elf-evidence.mjs';

const here=dirname(fileURLToPath(import.meta.url)), root=resolve(here,'../../..');
const output=resolve(process.argv[2]||mkdtempSync(join(tmpdir(),'emc-qr-evidence-'))); mkdirSync(output,{recursive:true});
const hex=n=>'0x'+BigInt(n).toString(16);
const json=data=>JSON.stringify(data,(_k,v)=>typeof v==='bigint'?hex(v):v,2)+'\n';
const xregs=['rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp',...Array.from({length:8},(_,i)=>'r'+(i+8)),'rip'];
const aregs=Array.from({length:16},(_,i)=>'r'+i);
const cases=[[6,2],[0,0],[-3,2],[6,-2],[-3,-2],[-2147483648,2147483647],[2147483647,-2147483648]];
const pointers={x:0x20100n,n:0x20200n,p:0x20204n,ny:0x20208n,k:0x2020cn,tol:0x20210n,y:0x20300n,b:0x20400n,rsd:0x20500n,qty:0x20600n,jpvt:0x20700n,qraux:0x20800n,work:0x20900n};
class StateMismatch extends Error {}
const matches=(yes,message)=>{if(!yes) throw new StateMismatch(message);};

function initial(arch,n,p,caseIndex=0) {
  const registers=Object.fromEntries((arch==='arm'?aregs:xregs).map((r,i)=>[r,arch==='arm'?0x51000000n+BigInt(0x10101*i):0xabcdef1200000000n+BigInt(0x10101*i+1)]));
  const state={arch,registers,memory:Buffer.alloc(MEMORY_SIZE),flags:arch==='arm'?BigInt((caseIndex%16)*0x10000000)+0x10n:0x202n,flagsMask:arch==='arm'?0xf0000020n:arithmeticFlags};
  for(let i=0;i<state.memory.length;i++) state.memory[i]=(37*i+11)&255;
  writeMemory(state,pointers.n,4,BigInt(n)); writeMemory(state,pointers.p,4,BigInt(p)); writeMemory(state,pointers.ny,4,1n);
  if(arch==='arm') {
    Object.assign(registers,{r0:pointers.x,r1:pointers.n,r2:pointers.p,r3:pointers.y,r13:0x22000n,r15:BigInt(CODE_ADDRESS)});
    ['ny','tol','b','rsd','qty','k','jpvt','qraux','work'].forEach((key,i)=>writeMemory(state,registers.r13+BigInt(4*i),4,pointers[key]));
  } else {
    Object.assign(registers,{rdi:pointers.x,rsi:pointers.n,rdx:pointers.p,rcx:pointers.y,r8:pointers.ny,r9:pointers.tol,rsp:0x22008n,rip:BigInt(CODE_ADDRESS)});
    writeMemory(state,registers.rsp,8,0x1122334455667788n);
    ['b','rsd','qty','k','jpvt','qraux','work'].forEach((key,i)=>writeMemory(state,registers.rsp+BigInt(8*(i+1)),8,pointers[key]));
  }
  return state;
}
function snapshot(s) { return {registers:{...s.registers},flags:s.flags,flagsMask:s.flagsMask,memory:Buffer.from(s.memory)}; }
function expectedTrace(state,operations,rows) {
  assert.deepEqual(operations.map(o=>o.offset),rows.map(r=>r.offset),'English source does not cover the exact prefix');
  const trace=[snapshot(state)];
  for(let i=0;i<operations.length;i++) {
    operations[i].run(state);
    state.registers[state.arch==='arm'?'r15':'rip']=BigInt(CODE_ADDRESS+rows[i].offset+rows[i].bytes.length);
    trace.push(snapshot(state));
  }
  const stack=state.registers[state.arch==='arm'?'r13':'rsp'];
  const args=state.arch==='arm'?[...['r0','r1','r2','r3'].map(r=>state.registers[r]),...Array.from({length:5},(_,i)=>readMemory(state,stack+BigInt(i*4),4))]:[...['rdi','rsi','rdx','rcx','r8','r9'].map(r=>state.registers[r]),...Array.from({length:3},(_,i)=>readMemory(state,stack+BigInt(i*8),8))];
  assert.deepEqual(args,['x','n','n','p','tol','k','qraux','jpvt','work'].map(k=>pointers[k]),'Wrong nine-argument boundary');
  return trace;
}
async function freePort() {
  const server=createServer(); await new Promise((resolve,reject)=>{server.once('error',reject); server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port; await new Promise(resolve=>server.close(resolve)); return port;
}
// GDB restore/dump retain quote characters as filename data. The generated
// research workspace therefore uses a deliberately restricted plain path.
function quote(path) {assert(/^[A-Za-z0-9_./-]+$/.test(path),'GDB evidence paths cannot contain whitespace or metacharacters'); return path;}
async function machineTrace(arch,elf,initialState,steps,name) {
  const directory=join(output,name); mkdirSync(directory,{recursive:true});
  const image=join(directory,'diagnostic.elf'), memory=join(directory,'initial-memory.bin');
  writeFileSync(image,elf,{mode:0o700}); writeFileSync(memory,initialState.memory);
  const port=await freePort(); const executable=arch==='arm'?'qemu-arm':'qemu-x86_64';
  const child=spawn(executable,['-cpu',arch==='arm'?'cortex-a9':'qemu64','-g',String(port),image],{stdio:['ignore','pipe','pipe']});
  let stderr='',spawnError;
  child.stderr.on('data',b=>stderr+=b); child.once('error',e=>spawnError=e);
  const registers=arch==='arm'?aregs:xregs, status=arch==='arm'?'cpsr':'eflags';
  const commands=['set pagination off','set confirm off','set language c','set debuginfod enabled off','set remotetimeout 10','set tcp connect-timeout 10','file '+quote(image),'target remote 127.0.0.1:'+port,'restore '+quote(memory)+' binary '+hex(MEMORY_START)];
  for(const r of registers) commands.push('set $'+r+' = '+hex(initialState.registers[r]));
  commands.push('set $'+status+' = '+hex(initialState.flags));
  const capture=index=>{
    const format='QRSTATE '+index+' '+registers.map(r=>r+'=%llx').join(' ')+' flags=';
    // Preserve ARM's unsigned 32-bit register bits before widening for display.
    // Do not narrow x86-64 general registers. GDB's x64_eflags is a structured
    // flags type: output/x reads its observed bits without an invalid C cast.
    const cast=arch==='arm'?'(unsigned long long)(unsigned int)':'(unsigned long long)';
    const values=registers.map(r=>cast+'$'+r).join(', ');
    commands.push('printf "'+format+'", '+values);
    commands.push('output/x $'+status,'echo \\n');
    commands.push('dump binary memory '+quote(join(directory,'memory-'+index+'.bin'))+' '+hex(MEMORY_START)+' '+hex(MEMORY_START+MEMORY_SIZE));
  };
  capture(0); for(let i=1;i<=steps;i++){commands.push('stepi');capture(i);}
  commands.push('kill','quit');
  const script=join(directory,'steps.gdb'); writeFileSync(script,commands.join('\n')+'\n');
  await new Promise(resolve=>setTimeout(resolve,100));
  let gdb;
  try {
    if(spawnError) throw spawnError;
    gdb=spawnSync('gdb-multiarch',['-q','-nx','-batch','-x',script],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
  } finally {child.kill('SIGKILL');}
  writeFileSync(join(directory,'gdb.log'),(gdb?.stdout||'')+(gdb?.stderr||'')); writeFileSync(join(directory,'qemu.log'),stderr);
  if(gdb.error) throw gdb.error;
  assert.equal(gdb.status,0,'Debugger failure (not a semantic rejection): '+gdb.stderr+stderr);
  const states=[];
  for(const line of gdb.stdout.split('\n')) {
    const m=/^QRSTATE (\d+) (.+)$/.exec(line); if(!m) continue;
    assert.equal(Number(m[1]),states.length,'Missing/repeated debugger state');
    const fields=m[2].trim().split(' ').map(t=>{const [key,value]=t.split('=');assert(/^(?:0x)?[0-9a-f]+$/.test(value));const n=BigInt('0x'+value.replace(/^0x/,''));assert(n<(1n<<BigInt(arch==='arm'?32:64)),'Debugger register value exceeds architecture width');return [key,n];});
    assert.equal(fields.length,registers.length+1,'Repeated or missing register field');
    const values=Object.fromEntries(fields);
    assert.deepEqual(Object.keys(values),[...registers,'flags'],'Missing, duplicate or unexpected register field');
    const flags=values.flags;delete values.flags;
    states.push({registers:values,flags,memory:readFileSync(join(directory,'memory-'+m[1]+'.bin'))});
  }
  assert.equal(states.length,steps+1,'Debugger did not produce every requested instruction state');
  return states;
}
function compare(expected,observed,name) {
  assert.equal(observed.length,expected.length);
  const records=[];
  for(let i=0;i<expected.length;i++) {
    for(const [r,v] of Object.entries(expected[i].registers)) matches(observed[i].registers[r]===v,`${name} step ${i} ${r}: expected ${hex(v)}, QEMU ${hex(observed[i].registers[r])}`);
    matches(((expected[i].flags^observed[i].flags)&expected[i].flagsMask)===0n,`${name} step ${i}: defined condition flags differ`);
    matches(expected[i].memory.equals(observed[i].memory),`${name} step ${i}: stack/workspace bytes differ`);
    records.push({step:i,registers:observed[i].registers,flags:observed[i].flags,comparedFlagsMask:expected[i].flagsMask,memorySHA256:digest(observed[i].memory)});
  }
  return records;
}
function expectMismatch(operation,label) {
  try {operation();} catch(error) {if(error instanceof StateMismatch)return error.message; throw error;}
  throw new Error('Bad test: '+label+' was not rejected');
}

const report={revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),evidence:'original-machine-bytes versus executable-English bounded normal-completion semantics',versions:{qemuArm:execFileSync('qemu-arm',['--version'],{encoding:'utf8'}).split('\n')[0],qemuX86:execFileSync('qemu-x86_64',['--version'],{encoding:'utf8'}).split('\n')[0],gdb:execFileSync('gdb-multiarch',['--version'],{encoding:'utf8'}).split('\n')[0]},targets:[],negativeTests:[]};

for(const arch of ['arm','x86']) {
  const folder=join(root,'examples',arch==='arm'?'r-lm-native-armv7-a32':'r-lm-native-x86-64');
  const binaryName=arch==='arm'?'dqrls.armv7-a32.o':'dqrls.o';
  const object=pinnedFile(resolve_repository_path(join(folder,binaryName)),arch==='arm'?'4d3afbce9a3e6466c3af06f0fd07e1c556c387e7bf70ad115e7e81e62873299b':'0c215591bb3608af7f946ca50bb8d45ff58daa4fa201fd4bdb3e686705a2d237');
  const elf=elfFile(object), text=elf.section('.text').bytes; assert.equal(elf.machine,arch==='arm'?40:62);
  const listing=pinnedFile(resolve_repository_path(join(folder,arch==='arm'?'dqrls.armv7-a32.disasm.txt':'dqrls.x86-64.disasm.txt')),arch==='arm'?'83020ab3d77340dd3b751118df5b8883cd5375be2571b620a33b607512e58662':'968488c7e15ab89373587fa66e65fffc62cdc92bccca2e9d63c40728d69910f2').toString('utf8');
  const stop=arch==='arm'?0x5c:0x75, rows=originalPrefixRows(arch,listing,text,stop);
  const source=readFileSync(resolve_repository_path(join('experiments/qr-entry',arch==='arm'?'ARM entry before its first call.english':'x86 entry before its first call.english')),'utf8');
  const operations=parseEnglish(source,arch), image=diagnosticElf(elf.machine,text);
  const target={arch,objectSHA256:digest(object),englishSHA256:digest(Buffer.from(source)),instructionCount:rows.length,stopBeforeCall:hex(stop),cases:[]};
  let baseline,baselineExpected;
  for(let index=0;index<cases.length;index++) {
    const [n,p]=cases[index], first=initial(arch,n,p,index);
    const state={...first,registers:{...first.registers},memory:Buffer.from(first.memory)};
    const expected=expectedTrace(state,operations,rows);
    const actual=await machineTrace(arch,image,first,rows.length,arch+'-'+index);
    const trace=compare(expected,actual,arch+' n='+n+' p='+p);
    writeFileSync(join(output,arch+'-'+index,'matched-trace.json'),json(trace));
    target.cases.push({n,p,instructionTransitions:rows.length,matched:true,finalRegisters:actual.at(-1).registers});
    if(index===0){baseline=actual;baselineExpected=expected;}
  }
  const first=initial(arch,6,2), modified=Buffer.from(text);
  if(arch==='arm'){assert.equal(modified.readUInt32LE(4),0xe1a06003);modified.writeUInt32LE(0xe1a06002,4);}
  else {assert.equal(modified.subarray(2,4).toString('hex'),'31c0');modified[2]=0x09;}
  const badActual=await machineTrace(arch,diagnosticElf(elf.machine,modified),first,rows.length,arch+'-wrong-native');
  report.negativeTests.push({arch,kind:'wrong native instruction',rejection:expectMismatch(()=>compare(baselineExpected,badActual,arch+' native mutant'),'changed machine instruction')});
  const wrongEnglish=arch==='arm'?source.replace('copy the four-byte value in register r3 into register r6','copy the four-byte value in register r2 into register r6'):source.replace('write zero into the four-byte view of register rax and update logic flags','copy the eight-byte value in register rbx into register rax');
  assert.notEqual(wrongEnglish,source);
  const badState=initial(arch,6,2), badOps=parseEnglish(wrongEnglish,arch);
  const badExpected=[snapshot(badState)];
  for(let i=0;i<badOps.length;i++){badOps[i].run(badState);badState.registers[arch==='arm'?'r15':'rip']=BigInt(CODE_ADDRESS+rows[i].offset+rows[i].bytes.length);badExpected.push(snapshot(badState));}
  report.negativeTests.push({arch,kind:'wrong English meaning',rejection:expectMismatch(()=>compare(badExpected,baseline,arch+' English mutant'),'changed English meaning')});
  report.targets.push(target);
  console.log(`PASS ${arch}: ${rows.length} original QR entry instructions, ${cases.length} initial states; every general register, defined arithmetic flag and workspace byte matched.`);
}

const linkedFolder=join(root,'examples/r-lm-native-armv7-linux-hardfp-linked');
const linked=pinnedFile(resolve_repository_path(join(linkedFolder,'call_r_qr.armv7-hardfp')),'b9a4219bf33c136a3aa948a2dbe48c2f8daac9237a10bcf53cd89b3ed0eaf2dd');
const linkedElf=elfFile(linked);
const linkedListing=pinnedFile(resolve_repository_path(join(linkedFolder,'linked-executable.armv7-hardfp.disasm.txt')),'fc0778ed8cada3d8751188784d1d4786bab7be6a58c33fab3993d2f2b5bb1ee7').toString('utf8');
const inventory=mixedArmInventory(linkedElf,linkedListing);
writeFileSync(join(output,'linked-mode-map.json'),json(inventory));
writeFileSync(join(output,'linked-mode-map.tsv'),'section\taddress\tmode\tbytes\tsequential-address\tassembly\n'+inventory.records.map(r=>[r.section,hex(r.address),r.mode,r.bytes,r.sequential===null?'data':hex(r.sequential),r.assembly].join('\t')).join('\n')+'\n');
const site=inventory.records.find(r=>r.address===0x940);
assert(site&&site.mode==='t'&&site.length===4&&site.bytes==='fff774ee','Pinned interworking instruction changed');
const bits=Buffer.from(site.bytes,'hex'), firstHalf=bits.readUInt16LE(0),secondHalf=bits.readUInt16LE(2);
assert.equal(firstHalf&0xf800,0xf000);assert.equal(secondHalf&0xd001,0xc000);
const sign=(firstHalf>>>10)&1,j1=(secondHalf>>>13)&1,j2=(secondHalf>>>11)&1;
const raw=(sign<<24)|((1^(j1^sign))<<23)|((1^(j2^sign))<<22)|((firstHalf&0x3ff)<<12)|((secondHalf&0x7fe)<<1);
const displacement=(raw&0x1000000)?raw-0x2000000:raw;
const destination=((site.address+4)&~3)+displacement;assert.equal(destination,0x62c);
assert(inventory.records.some(r=>r.address===destination&&r.mode==='a'),'BLX target is not mapped A32');
const sections=linkedElf.sections.filter(s=>(s.flags&4)&&s.size), flat=Buffer.alloc(Math.max(...sections.map(s=>s.address+s.size)));
for(const section of sections)section.bytes.copy(flat,section.address);
const interwork=initial('arm',6,2);interwork.registers.r15=BigInt(CODE_ADDRESS+site.address);interwork.flags=0x30n;
const after=snapshot(interwork);after.registers.r14=BigInt(CODE_ADDRESS+site.address+4)|1n;after.registers.r15=BigInt(CODE_ADDRESS+destination);after.flags=0x10n;
const transition=await machineTrace('arm',diagnosticElf(40,flat),interwork,1,'arm-real-blx');
compare([snapshot(interwork),after],transition,'actual Thumb BLX to A32');
const wrongAfter={...after,flags:after.flags|0x20n};
report.negativeTests.push({arch:'arm',kind:'BLX falsely remains Thumb',rejection:expectMismatch(()=>compare([snapshot(interwork),wrongAfter],transition,'incorrect BLX mode'),'unchanged Thumb state')});
report.linked={binarySHA256:digest(linked),inventory:inventory.counts,gaps:inventory.gaps,interworking:{instruction:hex(site.address),target:hex(destination),before:'Thumb',after:'A32',matched:true}};
console.log('PASS linked ARM mapping:',JSON.stringify(inventory.counts));
console.log('PASS actual Thumb BLX: execution index, link register and ARM-state transition matched.');
console.log('PASS targeted semantic rejections:',report.negativeTests.length);
writeFileSync(join(output,'receipt.json'),json(report));
console.log('NOT CLAIMED: complete QR execution from English, callee semantics, VFP semantics, external BLAS or physical-device acceptance.');
