import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareRankings,fingerprint} from './compare.mjs';
import {demonstrationContext,canonicalCandidate} from './operations.mjs';

const source='Compare "current entry" with "unknown marker" and update the condition flags.';
const expected={operation:'compare_two_registers_and_update_flags',
  operands:{left_register:'current entry',right_register:'unknown marker'},
  effects:{flags:'update',index:'sequential'}};
const swapped={...expected,operands:{left_register:'unknown marker',right_register:'current entry'}};
const receipt=(name, candidates)=>({interpreter:name,revision:`test-revision-${name}`,
  source_sha256:fingerprint(source),candidates:candidates.map((candidate,i)=>({...candidate,rank:i+1}))});
const fixture=(...receipts)=>({source,source_sha256:fingerprint(source),
  context:demonstrationContext,ranking_receipts:receipts});

test('three separately ranked models can agree in the exact typed operation and operands',()=>{
  const result=compareRankings(fixture(receipt('Qwen',[expected]),receipt('Mistral',[expected]),receipt('GPT-OSS',[expected])));
  assert.equal(result.classification,'TOP_RANK_AGREEMENT');
  assert.equal(result.automaticallyAuthorized,false);
});
test('register swaps are substantive disagreement, even for the same opcode',()=>{
  const result=compareRankings(fixture(receipt('A',[expected]),receipt('B',[swapped])));
  assert.equal(result.classification,'TOP_RANK_DISAGREEMENT');
});
test('missing flags or incorrect branch effects fail closed',()=>{
  assert.throws(()=>canonicalCandidate({...expected,effects:{flags:'preserve',index:'sequential'}}),/machine effects/);
  assert.throws(()=>canonicalCandidate({...expected,effects:{flags:'update'}}),/machine effects/);
});
test('undeclared registers or instruction families fail closed',()=>{
  assert.throws(()=>canonicalCandidate({...expected,operands:{...expected.operands,left_register:'unmentioned entry'}}),/Undeclared/);
  assert.throws(()=>canonicalCandidate({...expected,operation:'perform_any_instruction'}),/Ungrantable/);
});
test('source receipt hashes reject analyses of a different sentence',()=>{
  const x=fixture(receipt('A',[expected]));x.source='Compare the wrong register.';
  assert.throws(()=>compareRankings(x),/Source identity/);
});
test('abstention is explicit and does not authorize compilation',()=>{
  const r=compareRankings(fixture(receipt('A',[expected]),receipt('B',[])));
  assert.equal(r.classification,'ABSTENTION');
  assert.equal(r.automaticallyAuthorized,false);
});
test('unanimity still cannot distinguish a common semantic error',()=>{
  const r=compareRankings(fixture(receipt('A',[swapped]),receipt('B',[swapped]),receipt('C',[swapped])));
  assert.equal(r.classification,'TOP_RANK_AGREEMENT');
  assert.equal(r.automaticallyAuthorized,false);
  assert.notEqual(JSON.stringify(r.rankings[0].candidates[0].operands),JSON.stringify(expected.operands));
});
test('malformed rankings and duplicate model identities reject',()=>{
  assert.throws(()=>compareRankings(fixture(receipt('A',[expected]),receipt('A',[expected]))),/repeated interpreter/);
  const x=fixture(receipt('A',[expected])); x.ranking_receipts[0].candidates[0].rank=2;
  assert.throws(()=>compareRankings(x),/Ranks/);
});
