// Diagnostic fallback: see attempt.md for the failed canonical Idriç check.
// This accepts the audit's evidence/coverage, not the original prose semantics.
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const archive = join(root, '_/captures/r-lm-native-x86-64');
const listings = join(root, 'x86/r-qr');
const translation = join(listings, 'english');
const hashes = new Map([
  ['dqrls', '968488c7e15ab89373587fa66e65fffc62cdc92bccca2e9d63c40728d69910f2'],
  ['dqrdc2', '1d39427ac5b32ddab7a22a303150cb9c8e29b2fa03df49f81ba88d39be58e0c4'],
  ['dqrsl', 'ce2660259bd9dd68a76f1e00b9082c6a92d2d04071686ff97543e0386fed25fe'],
  ['linked-executable', '97bd72262cbef21da2115c435b41eb50685723541d0bb015ff9b20436240ed25']
]);
const counts = new Map([['dqrls',165],['dqrdc2',465],['dqrsl',662],['linked-executable',1543]]);
const reject = message => {throw new Error(message);};
const requireTrue = (condition, message) => {if (!condition) reject(message);};
const digest = data => createHash('sha256').update(data).digest('hex');
const expected = [];
for (const [routine,count] of counts) {
  requireTrue(digest(readFileSync(join(listings,routine+'.x86-64.disasm.txt'))) === hashes.get(routine),
    'raw source listing changed: '+routine);
  const instructions = readFileSync(join(translation,routine+'.x86-64.instructions.english'),'utf8')
    .split('\n').filter(line=>line.startsWith('INSTRUCTION ')).map(line=>{
      const match=line.match(/^INSTRUCTION (\d{4}) \| 0x([0-9a-f]+) \| ([0-9a-f ]+) \| (.+)$/);
      requireTrue(match,'malformed source row');
      return {routine,number:match[1],offset:match[2],bytes:match[3],assembly:match[4]};
    });
  requireTrue(instructions.length===count,'source count changed');
  // Independently decode original ELF bytes with current GNU objdump.
  const arguments_ = routine==='linked-executable' ? ['-d','-M','intel',join(archive,'call_r_qr')]
    : ['-dr','-M','intel','--disassemble='+routine+'_',join(archive,routine+'.o')];
  const listing=execFileSync('objdump',arguments_,{encoding:'utf8',maxBuffer:4*1024*1024});
  const decoded=[];
  let pending;
  for(const line of listing.split('\n')) {
    const match=line.match(/^\s*([0-9a-f]+):\t([0-9a-f ]+)(?:\t(.+))?$/);
    if(!match) continue;
    const bytes=match[2].trim().split(/\s+/);
    if(match[3]) {if(pending)decoded.push(pending);pending={offset:match[1],bytes,assembly:match[3]};}
    else {
      requireTrue(pending && parseInt(match[1],16)===parseInt(pending.offset,16)+pending.bytes.length,
        'orphan decoder continuation');
      pending.bytes.push(...bytes);
    }
  }
  if(pending)decoded.push(pending);
  requireTrue(decoded.length===count,'decoder count mismatch: '+routine);
  for(let index=0;index<count;index++) {
    requireTrue(parseInt(decoded[index].offset,16)===parseInt(instructions[index].offset,16)
      && decoded[index].bytes.join(' ')===instructions[index].bytes,'independent byte decode mismatch');
    requireTrue(decoded[index].assembly.split('#')[0].replace(/\s+/g,' ').trim()===
      instructions[index].assembly.split('#')[0].replace(/\s+/g,' ').trim(),'operand decode mismatch');
  }
  expected.push(...instructions);
}

function expectedStatus(row) {
  if(/^cmov\S+\s+(?:e\w+|r\d+d),/.test(row.assembly)) return 'FALSE_BRANCH_RULE_WRONG';
  if(/^(call|jmp|ret|hlt|endbr64)\s*/.test(row.assembly)) return 'ENVIRONMENT_BOUNDARY';
  if(/^(shl|sar|shr|imul|ucomisd|comisd|maxsd|sqrtsd|mulsd|divsd|addsd|subsd|cvtsi2sd)\s/.test(row.assembly))
    return 'INCOMPLETE_STATE_RULE';
  return 'NORMAL_EFFECT_REVIEW_ONLY';
}
function verifyInventory(text) {
  const rows=text.trimEnd().split('\n');
  requireTrue(rows.shift()==='listing\trecord\toffset\tbytes\tverdict','audit header changed');
  requireTrue(rows.length===expected.length,'audit inventory missing or extra row');
  for(let index=0;index<rows.length;index++) {
    const source=expected[index];
    requireTrue(rows[index]===[source.routine,source.number,'0x'+source.offset,source.bytes,expectedStatus(source)].join('\t'),
      'audit row/verdict mismatch at '+(index+1));
  }
  requireTrue(expected.filter(row=>expectedStatus(row)==='FALSE_BRANCH_RULE_WRONG').length===8,
    'wrong conditional-move defect inventory');
}
const manifest=readFileSync(join(here,'audit-records.tsv'),'utf8');
verifyInventory(manifest);
function expectRejection(test,label) {
  let rejected=false;
  try{test();}catch{rejected=true;}
  requireTrue(rejected,'accepted bad fixture: '+label);
}
expectRejection(()=>verifyInventory(manifest.replace('FALSE_BRANCH_RULE_WRONG','NORMAL_EFFECT_REVIEW_ONLY')),'erased defect');
expectRejection(()=>verifyInventory(manifest.split('\n').filter((_,index)=>index!==1).join('\n')),'missing record');
const witness=readFileSync(join(here,'raw-byte-witness.s'),'utf8');
const specimens=[...witness.matchAll(/^    \.byte ([^\n]+)$/gm)].map(match=>
  match[1].split(',').map(byte=>Number(byte).toString(16).padStart(2,'0')).join(' '));
requireTrue(specimens.length===22,'specimen case count changed');
for(let index=0;index<specimens.length;index++) {
  // One disclosed MOVSD register-register form contrasts with the archive's memory forms.
  if(index===9){requireTrue(specimens[index]==='f2 0f 10 c8','contrast control changed');continue;}
  requireTrue(expected.some(row=>row.bytes===specimens[index]),'specimen not in archive: '+specimens[index]);
}
requireTrue(process.platform==='linux' && process.arch==='x64','native witness needs Linux x86-64');
const work=mkdtempSync(join(tmpdir(),'emc-3-native-'));
try {
  for(const mutant of [false,true]) {
    const object=join(work,mutant?'old-claim.o':'correct.o');
    const binary=join(work,mutant?'old-claim':'correct');
    execFileSync('as',['--64',...(mutant?['--defsym','OLD_FALSE_BRANCH_CLAIM=1']:[]),'-o',object,join(here,'raw-byte-witness.s')]);
    execFileSync('ld',['-o',binary,object]);
    const result=spawnSync(binary,[],{encoding:'utf8',timeout:10000});
    requireTrue(!result.error && !result.signal,'native execution failed or timed out');
    requireTrue(result.status===(mutant?1:0),'unexpected native/legacy-oracle exit');
    requireTrue(result.stdout===(mutant?'':'PASS: 22 native x86-64 instruction-state cases\n'),'wrong witness output');
    console.log(mutant?'PASS: the old false-branch claim fails at case 1':result.stdout.trim());
    console.log('witness_'+(mutant?'old_claim':'correct')+'_sha256='+digest(readFileSync(binary)));
  }
} finally {rmSync(work,{recursive:true,force:true});}
console.log('PASS: 2835 independently decoded records; 8 defective conditional-move rows preserved');
console.log('PASS: missing-row and erased-defect mutations rejected');
console.log('SEMANTIC_ACCEPTANCE=FAIL; these finite witnesses do not qualify every instruction or external library');
