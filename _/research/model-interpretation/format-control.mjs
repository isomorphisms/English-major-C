// Format-only controls and per-candidate diagnostics. Never repair model output.
// The legacy whole-prediction validator and score remain authoritative as before.
import {canonical, digest, validateContext, validatePrediction, scorePrediction,
        catalogue, messagesFor, namedPromptRevision, statuses} from './experiment.mjs';
import {canonicalCandidate} from './operations.mjs';

export const conditions = Object.freeze(['named-json','named-schema']);
const fields = (properties) => ({type:'object', properties, required:Object.keys(properties), additionalProperties:false});
const fixed = value => ({const:value});

export function interpretationSchema(context) {
  validateContext(context);
  const candidates = Object.entries(catalogue).map(([operation,definition]) => fields({
    rank:{type:'integer',minimum:1,maximum:3},
    operation:fixed(operation),
    operands:fields(Object.fromEntries(definition.operands.map(role=>[
      role,{type:'string',enum:role.endsWith('_label') ? context.labels : context.registers}
    ]))),
    effects:fields({flags:fixed(definition.effects.flags),index:fixed(definition.effects.index)})
  }));
  // No per-input narrowing. All operations/statuses/names are available to every
  // sentence. uniqueItems and prefixItems are not supported by this runtime.
  return {oneOf:[
    fields({status:fixed('interpreted'),candidates:{type:'array',minItems:1,maxItems:3,items:{oneOf:candidates}}}),
    fields({status:{type:'string',enum:statuses.filter(s=>s!=='interpreted')},candidates:{type:'array',maxItems:0,items:{type:'object'}}})
  ]};
}

export function controlledRequest(testCase, context, condition) {
  if (!conditions.includes(condition)) throw new Error('Unknown format-control condition');
  const request = {
    messages:messagesFor(testCase,context,namedPromptRevision),
    temperature:0,seed:7,max_tokens:768,stream:false,
    response_format:condition==='named-schema'
      ? {type:'json_schema',json_schema:{name:'english_machine_interpretation',strict:true,schema:interpretationSchema(context)}}
      : {type:'json_object'},
    chat_template_kwargs:{enable_thinking:false}
  };
  return request;
}

export function inspectCandidate(candidate, position, context) {
  const failure = message => ({position,valid:false,error:message});
  if (!candidate || typeof candidate!=='object' || Array.isArray(candidate)) return failure('Not a candidate object');
  if (canonical(Object.keys(candidate).sort()) !== canonical(['effects','operands','operation','rank'])) return failure('Invalid candidate fields');
  if (candidate.rank!==position) return failure('Rank does not match written position');
  try { return {position,valid:true,key:canonicalCandidate(candidate,context)}; }
  catch(error) { return failure(error.message); }
}

export function assessReply(testCase, context, reply) {
  // Labels are used only after inference. Observe every failure separately.
  validatePrediction(testCase.expected,context);
  const report = {
    complete:reply?.choices?.[0]?.finish_reason==='stop',
    json_valid:false,whole_contract_valid:false,strict_exact_top1:false,
    envelope_valid:false,status_correct:false,top_candidate_exact:false,
    diagnostic_exact_top1:false,expected_candidate_rank:null,
    candidate_observations:[],duplicate_positions:[],
    automatically_authorized:false
  };
  const content=reply?.choices?.[0]?.message?.content;
  if (!report.complete) return {...report,error:'Incomplete or truncated response'};
  if (typeof content!=='string') return {...report,error:'Missing content'};
  let prediction;
  try {prediction=JSON.parse(content);report.json_valid=true;}
  catch(error){return {...report,error:'Invalid JSON: '+error.message};}
  try {
    validatePrediction(prediction,context);
    report.whole_contract_valid=true;
    report.strict_exact_top1=scorePrediction(testCase,prediction,context).exact_top1;
  } catch(error) { report.whole_contract_error=error.message; }
  if (!prediction || Array.isArray(prediction) || typeof prediction!=='object') return report;
  report.envelope_valid =
    canonical(Object.keys(prediction).sort())===canonical(['candidates','status']) &&
    statuses.includes(prediction.status) && Array.isArray(prediction.candidates) &&
    prediction.candidates.length<=5 &&
    ((prediction.status==='interpreted') === (prediction.candidates.length>0));
  report.observed_status=prediction.status;
  report.status_correct=report.envelope_valid && prediction.status===testCase.expected.status;
  if (!report.envelope_valid) return report;
  const wanted = testCase.expected.status==='interpreted'
    ? canonicalCandidate(testCase.expected.candidates[0],context) : null;
  const seen = new Set();
  report.candidate_observations=prediction.candidates.map((candidate,index)=>{
    const observation=inspectCandidate(candidate,index+1,context);
    if (observation.valid) {
      if (seen.has(observation.key)) report.duplicate_positions.push(index+1);
      seen.add(observation.key);
      observation.matches_expected=wanted!==null && observation.key===wanted;
      if(observation.matches_expected && report.expected_candidate_rank===null) report.expected_candidate_rank=index+1;
      if(index===0 && observation.matches_expected) report.top_candidate_exact=true;
    }
    return observation;
  });
  report.diagnostic_exact_top1=report.status_correct &&
    (wanted===null || report.top_candidate_exact);
  return report;
}

// Unanimity is meaningful only for interpreters with comparable valid meanings.
// This diagnoses observed model agreement; it never transforms invalid output.
export function observedTopKey(reply, context) {
  if(reply?.choices?.[0]?.finish_reason!=='stop') return null;
  let p;
  try {p=JSON.parse(reply.choices[0].message.content);} catch {return null;}
  if(!p || typeof p!=='object' || Array.isArray(p) ||
     canonical(Object.keys(p).sort())!==canonical(['candidates','status']) ||
     !statuses.includes(p.status) || !Array.isArray(p.candidates)) return null;
  if(p.status!=='interpreted') return p.candidates.length===0 ? canonical({status:p.status}) : null;
  if(p.candidates.length===0 || p.candidates.length>5) return null;
  const first=inspectCandidate(p.candidates[0],1,context);
  return first.valid ? first.key : null;
}

export function summarizeAssessments(observations) {
  return {
    total_cases:observations.length,
    complete:observations.filter(x=>x.assessment.complete).length,
    json_valid:observations.filter(x=>x.assessment.json_valid).length,
    whole_contract_valid:observations.filter(x=>x.assessment.whole_contract_valid).length,
    strict_exact_top1:observations.filter(x=>x.assessment.strict_exact_top1).length,
    diagnostic_exact_top1:observations.filter(x=>x.assessment.diagnostic_exact_top1).length,
    expected_present_in_ranking:observations.filter(x=>x.assessment.expected_candidate_rank!==null).length,
    automatically_authorized:false
  };
}

export function controlIdentity(testCase, context, condition) {
  const request=controlledRequest(testCase,context,condition);
  return {condition,prompt_revision:namedPromptRevision,prompt_sha256:digest(request.messages),
    request_sha256:digest(request),output_schema_sha256:
      condition==='named-schema' ? digest(request.response_format.json_schema.schema) : null};
}
