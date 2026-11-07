// Diagnostic for the observed x86 GDB invalid-cast error. No pass claim.
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {elfFile,diagnosticElf} from './elf-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const dir=mkdtempSync(join(tmpdir(),'qr-register-probe-'));
const object=elfFile(readFileSync(join(root,'_/captures/r-lm-native-x86-64/dqrls.o')));
const image=join(dir,'image.elf');writeFileSync(image,diagnosticElf(62,object.section('.text').bytes),{mode:0o700});
const names=['rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp',...Array.from({length:8},(_,i)=>'r'+(i+8)),'rip','eflags'];
const commands=['set pagination off','set confirm off','set language c','set debuginfod enabled off','set remotetimeout 5','set tcp connect-timeout 5','file '+image,'target remote 127.0.0.1:23456'];
for(const name of names){commands.push('echo REGISTER '+name+'\\n','ptype $'+name,'print/x $'+name,'print/x (unsigned long long)$'+name);}
commands.push('kill','quit');
const script=join(dir,'probe.gdb');writeFileSync(script,commands.join('\n')+'\n');
const child=spawn('qemu-x86_64',['-g','23456',image],{stdio:'ignore'});child.on('error',e=>{throw e;});
await new Promise(r=>setTimeout(r,100));
let result;
try{result=spawnSync('gdb-multiarch',['-q','-nx','-batch','-x',script],{encoding:'utf8',timeout:15000});}
finally{child.kill('SIGKILL');}
console.log(result.stdout);console.error(result.stderr);
if(result.error)throw result.error;
process.exitCode=result.status===0?0:1;
