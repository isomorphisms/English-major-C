import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalogue,canonical,digest,messagesFor,namedPromptRevision,baselinePromptRevision,
        scorePrediction} from './experiment.mjs';
import {interpretationSchema,controlledRequest,inspectCandidate,assessReply,observedTopKey,
        summarizeAssessments,controlIdentity} from './format-control.mjs';
const corpus=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
const {context,cases}=corpus;
const example=id=>cases.find(c=>c.id===id);
const clone=x=>structuredClone(x);
const reply=(prediction,finish='stop')=>({choices:[{finish_reason:finish,message:{content:JSON.stringify(prediction)}}]});

test('baseline corpus bytes remain frozen while the prompt representation changes',()=>{
  const bytes=readFileSync(new URL('./cases.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'69f2525e093e41784f0cf1d1b1888aaa48316c5afa72e45881b0c43c2618135d');
});
test('named catalogue shows objects rather than arrays for every operation',()=>{
  const source=messagesFor(example('zero-canonical'),context,namedPromptRevision)[0].content;
  const display=JSON.parse(source.split('CATALOGUE\n')[1].split('\nCONTEXT\n')[0]);
  for(const [name,def] of Object.entries(catalogue)) {
    assert.ok(!Array.isArray(display[name].operands));
    assert.deepEqual(Object.keys(display[name].operands).sort(),[...def.operands].sort());
    assert.deepEqual(display[name].effects,def.effects);
    assert.equal(display[name].definition,def.definition);
  }
});
test('the old prompt remains opt-in reproducible and unknown revisions fail',()=>{
  const c=example('compare-forward');
  assert.deepEqual(messagesFor(c,context),messagesFor(c,context,baselinePromptRevision));
  assert.notDeepEqual(messagesFor(c,context),messagesFor(c,context,namedPromptRevision));
  assert.throws(()=>messagesFor(c,context,'made-up-revision'),/Unknown prompt/);
});
test('matched conditions differ only in output constraints, not prompts or decoding',()=>{
  for(const c of cases) {
    const plain=controlledRequest(c,context,'named-json'), shaped=controlledRequest(c,context,'named-schema');
    const {response_format:a,...first}=plain,{response_format:b,...second}=shaped;
    assert.deepEqual(first,second);assert.equal(a.type,'json_object');assert.equal(b.type,'json_schema');
    assert.equal(first.temperature,0);assert.equal(first.seed,7);assert.equal(first.max_tokens,768);
    assert.equal(first.chat_template_kwargs.enable_thinking,false);
  }
});
test('expected labels, family names and other model answers are absent from both requests',()=>{
  const c={source:'Read this sentence.',id:'SECRET_ID',family:'SECRET_FAMILY',expected:'SECRET_GOLD',other_model:'SECRET_ANSWER'};
  for(const mode of ['named-json','named-schema']) {
    const value=JSON.stringify(controlledRequest(c,context,mode));
    assert.ok(!value.includes('SECRET_'));
    assert.equal(value,JSON.stringify(controlledRequest({source:c.source},context,mode)));
  }
});
test('schema includes the entire operation catalogue rather than choosing an answer',()=>{
  const schema=interpretationSchema(context);
  const alternatives=schema.oneOf[0].properties.candidates.items.oneOf;
  assert.deepEqual(alternatives.map(x=>x.properties.operation.const),Object.keys(catalogue));
  for(const choice of alternatives) {
    const operation=choice.properties.operation.const;
    assert.deepEqual(choice.properties.operands.required,catalogue[operation].operands);
    for(const [role,field] of Object.entries(choice.properties.operands.properties))assert.deepEqual(field.enum,role.endsWith('_label')?context.labels:context.registers);
  }
  for(const c of cases) assert.deepEqual(controlledRequest(c,context,'named-schema').response_format.json_schema.schema,schema);
});
test('schema avoids known unsupported converter features; ordinary checks still reject duplicates',()=>{
  const schema=interpretationSchema(context);
  const walk=x=>{
    if(!x||typeof x!=='object')return;
    for(const key of ['uniqueItems','prefixItems','$ref','if','then','else'])assert.ok(!Object.hasOwn(x,key));
    if(x.oneOf)assert.ok(!x.properties);
    for(const value of Object.values(x))walk(value);
  };
  walk(schema);
});
test('a correct first candidate survives diagnostically when a lower candidate is duplicated',()=>{
  const c=example('compare-forward'),p=clone(c.expected);
  p.candidates.push({...clone(p.candidates[0]),rank:2});
  assert.throws(()=>scorePrediction(c,p,context),/Duplicate/);
  const observed=assessReply(c,context,reply(p));
  assert.equal(observed.whole_contract_valid,false);
  assert.equal(observed.strict_exact_top1,false);
  assert.equal(observed.diagnostic_exact_top1,true);
  assert.deepEqual(observed.duplicate_positions,[2]);
  assert.equal(observed.automatically_authorized,false);
});
test('an invalid lower candidate does not erase the exact written first candidate',()=>{
  const c=example('compare-forward'),p=clone(c.expected);
  p.candidates.push({...clone(p.candidates[0]),rank:2,effects:{flags:'preserve',index:'sequential'}});
  const observed=assessReply(c,context,reply(p));
  assert.equal(observed.whole_contract_valid,false);assert.equal(observed.diagnostic_exact_top1,true);
  assert.equal(observed.candidate_observations[1].valid,false);
});
test('the correct second candidate never becomes a top-one success',()=>{
  const c=example('compare-forward'),p=clone(example('compare-reversed').expected);
  p.candidates.push({...clone(c.expected.candidates[0]),rank:2});
  const observed=assessReply(c,context,reply(p));
  assert.equal(observed.whole_contract_valid,true);assert.equal(observed.strict_exact_top1,false);
  assert.equal(observed.diagnostic_exact_top1,false);assert.equal(observed.expected_candidate_rank,2);
});
test('arrays are never silently converted into named operand objects',()=>{
  const c=example('compare-forward'),p=clone(c.expected);
  p.candidates[0].operands=['current entry','unknown marker'];
  const before=JSON.stringify(p),observed=assessReply(c,context,reply(p));
  assert.equal(observed.diagnostic_exact_top1,false);assert.equal(observed.candidate_observations[0].valid,false);
  assert.equal(JSON.stringify(p),before);assert.equal(observedTopKey(reply(p),context),null);
});
test('a malformed or wrongly ranked first candidate is not rescued by field stripping',()=>{
  const c=example('zero-canonical');
  for(const change of [{assembly:'mov r2,0'},{rank:2},{effects:{flags:'preserve',index:'unconditional_branch'}}]) {
    const p=clone(c.expected);Object.assign(p.candidates[0],change);
    assert.equal(assessReply(c,context,reply(p)).top_candidate_exact,false);
    assert.equal(observedTopKey(reply(p),context),null);
  }
});
test('wrong operands and branch meaning remain wrong despite structurally valid output',()=>{
  const c=example('compare-forward'),p=example('compare-reversed').expected;
  const observed=assessReply(c,context,reply(p));
  assert.equal(observed.whole_contract_valid,true);assert.equal(observed.diagnostic_exact_top1,false);
  const badBranch=assessReply(example('branch-not-zero'),context,reply(example('branch-unconditional').expected));
  assert.equal(badBranch.whole_contract_valid,true);assert.equal(badBranch.diagnostic_exact_top1,false);
});
test('truncated or fenced replies are not completed or extracted',()=>{
  const c=example('zero-canonical'),truncated=assessReply(c,context,reply(c.expected,'length'));
  assert.equal(truncated.complete,false);assert.equal(truncated.diagnostic_exact_top1,false);
  const fenced=reply(c.expected);fenced.choices[0].message.content='```json\n'+fenced.choices[0].message.content+'\n```';
  assert.equal(assessReply(c,context,fenced).json_valid,false);
});
test('nonoperation status and candidate envelope are distinct checks',()=>{
  const c=example('comment-opcode');
  assert.equal(assessReply(c,context,reply(c.expected)).diagnostic_exact_top1,true);
  const p=clone(c.expected);p.candidates=clone(example('zero-canonical').expected.candidates);
  assert.equal(assessReply(c,context,reply(p)).envelope_valid,false);
  assert.equal(observedTopKey(reply(p),context),null);
});
test('diagnostic summaries preserve both strict and first-candidate counts',()=>{
  const c=example('compare-forward'),p=clone(c.expected);
  p.candidates.push({...clone(p.candidates[0]),rank:2});
  const summary=summarizeAssessments([{assessment:assessReply(c,context,reply(p))}]);
  assert.equal(summary.total_cases,1);assert.equal(summary.strict_exact_top1,0);
  assert.equal(summary.diagnostic_exact_top1,1);assert.equal(summary.whole_contract_valid,0);
  assert.equal(summary.automatically_authorized,false);
});
test('conditions share prompt identity but carry distinct request and schema identities',()=>{
  const c=example('zero-canonical'),a=controlIdentity(c,context,'named-json'),b=controlIdentity(c,context,'named-schema');
  assert.equal(a.prompt_sha256,b.prompt_sha256);assert.notEqual(a.request_sha256,b.request_sha256);
  assert.equal(a.output_schema_sha256,null);assert.match(b.output_schema_sha256,/^[0-9a-f]{64}$/);
  assert.throws(()=>controlledRequest(c,context,'remote-paid-service'),/Unknown/);
});
test('retained ambiguous English does not become correct merely through the available schema',()=>{
  const c=example('zero-underspecified'),wrong=example('zero-canonical').expected;
  const observed=assessReply(c,context,reply(wrong));
  assert.equal(observed.whole_contract_valid,true);assert.equal(observed.strict_exact_top1,false);
  assert.equal(observed.diagnostic_exact_top1,false);
});
