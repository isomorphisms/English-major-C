import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {messagesFor,canonical,digest,validateContext,validatePrediction,scorePrediction,makeReceipt,verifyReceipt,compareCase} from './experiment.mjs';
import {loopbackEndpoint,parseReply} from './run-local.mjs';
import {manifest,selectModel,verifyWeight,sufficientDisk} from './model-io.mjs';
const corpus=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
const {context,cases}=corpus;
const example=id=>cases.find(c=>c.id===id);
const clone=x=>structuredClone(x);
const synthetic=(c,p,identity)=>makeReceipt(c,context,p,{kind:'synthetic',identity});

test('48 explicit corpus labels obey the closed result contract; all 13 operation families are covered',()=>{
  assert.equal(cases.length,48);assert.equal(new Set(cases.map(c=>c.id)).size,48);
  const operations=new Set();
  for(const c of cases){assert.ok(c.source.trim());validatePrediction(c.expected,context);for(const op of c.expected.candidates)operations.add(op.operation);}
  assert.equal(operations.size,13);assert.equal(cases.filter(c=>c.smoke).length,10);
});
test('full interpretation changes when comparison operands are reversed',()=>{
  const c=example('compare-forward');const wrong=example('compare-reversed').expected;
  assert.equal(scorePrediction(c,wrong,context).exact_top1,false);
});
test('three unanimous wrong answers are detected against expected meaning, not accepted',()=>{
  const c=example('compare-forward'),wrong=example('compare-reversed').expected;
  const result=compareCase(c,context,['A','B','C'].map(id=>synthetic(c,wrong,id)));
  assert.equal(result.all_agree,true);assert.equal(result.all_agree_but_wrong,true);
  assert.equal(result.actual_model_count,0);assert.equal(result.automatically_authorized,false);
});
test('unanimous correct answers still do not authorize execution',()=>{
  const c=example('compare-forward');const result=compareCase(c,context,['A','B'].map(id=>synthetic(c,c.expected,id)));
  assert.equal(result.all_agree_but_wrong,false);assert.equal(result.automatically_authorized,false);
});
test('top-k recovery is measured separately from a wrong top rank',()=>{
  const c=example('compare-forward');const p=clone(example('compare-reversed').expected);
  p.candidates.push({...clone(c.expected.candidates[0]),rank:2});
  const score=scorePrediction(c,p,context);assert.equal(score.exact_top1,false);assert.equal(score.correct_candidate_rank,2);
});
test('mixed answers preserve disagreement',()=>{
  const c=example('compare-forward');const result=compareCase(c,context,[synthetic(c,c.expected,'A'),synthetic(c,example('compare-reversed').expected,'B')]);
  assert.equal(result.all_agree,false);
});
test('source bytes and physical-register context are independently bound',()=>{
  const c=example('compare-forward'),r=synthetic(c,c.expected,'A');
  assert.throws(()=>verifyReceipt({...c,source:c.source+' '},context,r),/not bound/);
  const changed=clone(context);[changed.bindings['current entry'],changed.bindings['unknown marker']]=[changed.bindings['unknown marker'],changed.bindings['current entry']];
  assert.throws(()=>verifyReceipt(c,changed,r),/not bound/);
});
test('no expected answer, case-family label or neighboring interpretation enters the prompt',()=>{
  const c={...example('compare-forward'),expected:{secret_gold_marker:'MUST_NOT_LEAK'},family:'SECRET_FAMILY',id:'SECRET_CASE'};
  const text=JSON.stringify(messagesFor(c,context));
  for(const marker of ['MUST_NOT_LEAK','SECRET_FAMILY','SECRET_CASE','secret_gold_marker'])assert.ok(!text.includes(marker));
  assert.equal(text,JSON.stringify(messagesFor(c,context)));
  assert.equal(text,JSON.stringify(messagesFor({source:c.source},context)));
});
test('unprovided flag effects remain ambiguous instead of choosing the nearest legal opcode',()=>{
  const c=example('zero-underspecified');assert.equal(c.expected.status,'ambiguous');
  assert.equal(scorePrediction(c,example('zero-canonical').expected,context).exact_top1,false);
});
test('opposite branch polarity cannot be collapsed to the available zero-flag-one branch',()=>{
  const c=example('branch-not-zero');assert.equal(c.expected.status,'unsupported');
  assert.equal(scorePrediction(c,example('branch-zero').expected,context).exact_top1,false);
});
test('executable-looking comments cannot count as interpreted operations',()=>{
  for(const id of ['comment-opcode','comment-injection'])assert.equal(scorePrediction(example(id),example('zero-canonical').expected,context).exact_top1,false);
});
test('negative controls distinguish unsupported, ambiguous and contradictory source',()=>{
  for(const id of ['zero-flag-change','zero-underspecified','zero-contradiction']){
    const c=example(id);const wrong={status:c.expected.status==='unsupported'?'ambiguous':'unsupported',candidates:[]};
    assert.equal(scorePrediction(c,wrong,context).exact_top1,false);
  }
});
test('candidate flags cannot be changed without changing the granted operation',()=>{
  const p=clone(example('zero-canonical').expected);p.candidates[0].effects.flags='update';
  assert.throws(()=>validatePrediction(p,context),/machine effects/);
});
test('extra confidence, assembly or hallucinated fields are rejected',()=>{
  for(const field of ['confidence','assembly','explanation']){const p=clone(example('zero-canonical').expected);p.candidates[0][field]='not trusted';assert.throws(()=>validatePrediction(p,context),/candidate fields/);}
});
test('empty interpretation, candidates attached to abstention and repeated rank fail',()=>{
  assert.throws(()=>validatePrediction({status:'interpreted',candidates:[]},context));
  const p=clone(example('zero-canonical').expected);p.status='ambiguous';assert.throws(()=>validatePrediction(p,context));
  p.status='interpreted';p.candidates.push(clone(p.candidates[0]));assert.throws(()=>validatePrediction(p,context),/Ranks/);
});
test('duplicate model identity is not additional independent evidence',()=>{
  const c=example('zero-canonical'),r=synthetic(c,c.expected,'A');assert.throws(()=>compareCase(c,context,[r,r]),/Repeated interpreter/);
});
test('synthetic receipts cannot become model receipts by relabeling alone',()=>{
  const c=example('zero-canonical'),r=synthetic(c,c.expected,'A');r.provenance.kind='model';assert.throws(()=>verifyReceipt(c,context,r),/pinned publisher/);
});
test('renaming physical registers changes context identity even when source is unchanged',()=>{
  const c=clone(context);c.bindings['running total']='r7';validateContext(c);assert.notEqual(digest(c),digest(context));
  c.bindings['running total']='r3';assert.throws(()=>validateContext(c),/duplicated/);
});
test('canonical identity is independent of JSON object property order',()=>{
  assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2}));assert.notEqual(canonical(['a','b']),canonical(['b','a']));
});
test('counterexample arithmetic: swapping compare operands reverses N and C for 5 and 9',()=>{
  // Integer subtraction witness only; not execution by an ARM CPU/emulator.
  const flags=(a,b)=>({N:((a-b)&0xffffffffn)>=0x80000000n,C:a>=b,Z:a===b});
  assert.deepEqual(flags(5n,9n),{N:true,C:false,Z:false});
  assert.deepEqual(flags(9n,5n),{N:false,C:true,Z:false});
});
test('all three publisher files are immutable, distinct-family, Apache licensed and below two GiB',()=>{
  assert.equal(new Set(manifest.models.map(m=>m.family)).size,3);
  for(const m of manifest.models)assert.equal(selectModel(m.id),m);
  assert.equal(manifest.models.reduce((a,m)=>a+m.bytes,0),5692295840);
});
test('download preflight retains a one-GiB reserve',()=>{
  assert.equal(sufficientDisk(3*2**30,2*2**30),true);assert.equal(sufficientDisk(3*2**30-1,2*2**30),false);
});
test('weight verifier checks actual byte count and digest, using an explicitly synthetic file',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'emc-synthetic-weight-'));
  try{const path=join(directory,'synthetic.gguf'),bytes='NOT REAL MODEL WEIGHTS';await writeFile(path,bytes);
    await verifyWeight(path,{bytes:Buffer.byteLength(bytes),sha256:digest(bytes)});
    await assert.rejects(verifyWeight(path,{bytes:Buffer.byteLength(bytes),sha256:'0'.repeat(64)}),/SHA-256/);
    await assert.rejects(verifyWeight(path,{bytes:99,sha256:digest(bytes)}),/size/);
  }finally{await rm(directory,{recursive:true});}
});
test('local inference cannot use an external, HTTPS or credential-bearing endpoint',()=>{
  assert.equal(loopbackEndpoint('http://127.0.0.1:8080/').hostname,'127.0.0.1');
  for(const s of ['https://127.0.0.1:8080/','http://example.com:8080/','http://127.0.0.1:8080/?provider=paid','http://key@127.0.0.1:8080/'])assert.throws(()=>loopbackEndpoint(s));
});
test('truncation and malformed JSON are failures, never repaired into apparent model success',()=>{
  const content=JSON.stringify(example('zero-canonical').expected);
  assert.throws(()=>parseReply({choices:[{finish_reason:'length',message:{content}}]},context),/truncated/);
  assert.throws(()=>parseReply({choices:[{finish_reason:'stop',message:{content:'```json\n'+content+'\n```'}}]},context));
  assert.deepEqual(parseReply({choices:[{finish_reason:'stop',message:{content}}]},context),example('zero-canonical').expected);
});
