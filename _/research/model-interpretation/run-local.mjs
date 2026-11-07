// Runs only an explicitly supplied local llama-server executable with CPU weights.
// Neither source sentences nor model outputs can spawn commands or emit assembly.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectModel,verifyWeight,hashFile} from './model-io.mjs';
import {messagesFor,makeReceipt,verifyReceipt,digest,validatePrediction,namedPromptRevision,baselinePromptRevision} from './experiment.mjs';
import {conditions,controlledRequest,assessReply,summarizeAssessments,observedTopKey} from './format-control.mjs';

export function loopbackEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Only a literal local loopback server is allowed; no paid or remote endpoint');
  return url;
}
export function parseReply(reply, context) {
  const choice=reply?.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error('Model output is incomplete or truncated');
  if (typeof choice.message?.content !== 'string') throw new Error('No model content');
  // Do not repair, complete or silently extract a conveniently valid substring.
  return validatePrediction(JSON.parse(choice.message.content),context);
}
async function unusedPort() {
  const socket=createServer();
  await new Promise((yes,no)=>{socket.once('error',no);socket.listen(0,'127.0.0.1',yes);});
  const port=socket.address().port;
  await new Promise((yes,no)=>socket.close(error=>error?no(error):yes()));
  return port;
}
export async function runModel(id,cache,executable,out,smoke=false,condition=null) {
  if(condition!==null && !conditions.includes(condition)) throw new Error('Unknown format-control condition');
  const model=selectModel(id), weight=resolve(cache,model.file);
  if (!isAbsolute(executable) || !(await stat(executable)).isFile()) throw new Error('Supply the absolute path of an existing local llama-server executable');
  await verifyWeight(weight,model);
  await mkdir(out,{recursive:true});
  const runtimeHash=await hashFile(executable);
  const corpus=JSON.parse(await readFile(new URL('./cases.json',import.meta.url),'utf8'));
  const selected=corpus.cases.filter(c=>!smoke || c.smoke);
  const port=await unusedPort(), base=loopbackEndpoint(`http://127.0.0.1:${port}/`);
  const args=['--model',weight,'--host','127.0.0.1','--port',String(port),'--ctx-size','8192','--threads','4','--n-gpu-layers','0','--jinja'];
  // Prevent inherited llama environment flags from changing the selected file,
  // endpoint, template or backend. No API credentials are passed to the child.
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LLAMA_ARG_') && !/(TOKEN|API_KEY|SECRET)/i.test(k)));
  const log=createWriteStream(resolve(out,'llama-server.log'),{flags:'wx'});
  const child=spawn(executable,args,{env,stdio:['ignore','pipe','pipe'],shell:false});
  child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
  let childError=null, ended=false;
  child.on('error',e=>{childError=e;ended=true;}); child.on('exit',()=>{ended=true;});
  const records=[], failures=[], observations=[];
  try {
    let ready=false;
    for(let attempt=0;attempt<180;attempt++) {
      if (childError) throw childError;
      if (ended) throw new Error('Local model server exited before readiness; inspect its log');
      try {const response=await fetch(new URL('health',base),{redirect:'error',signal:AbortSignal.timeout(1000)});ready=response.ok;await response.body?.cancel();}
      catch(error) { /* readiness only; bounded and never an inference success */ }
      if(ready) break;
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    if(!ready) throw new Error('Local model server did not become ready');
    const propsResponse=await fetch(new URL('props',base),{redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!propsResponse.ok) throw new Error('Cannot record model chat-template identity');
    const props=await propsResponse.json();
    if(typeof props.chat_template !== 'string' || !props.chat_template) throw new Error('Server did not expose its actual chat template');
    await writeFile(resolve(out,'server-props.json'),JSON.stringify(props,null,2));
    for(const testCase of selected) {
      if(ended) throw new Error('Local model server exited during evaluation');
      const request=condition
        ? controlledRequest(testCase,corpus.context,condition)
        : {messages:messagesFor(testCase,corpus.context),temperature:0,seed:7,max_tokens:768,stream:false,response_format:{type:'json_object'},chat_template_kwargs:{enable_thinking:false}};
      const messages=request.messages;
      const requestText=JSON.stringify(request);
      const response=await fetch(new URL('v1/chat/completions',base),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:requestText,signal:AbortSignal.timeout(240000)});
      const raw=await response.text();
      await writeFile(resolve(out,`${testCase.id}.request.json`),requestText);
      await writeFile(resolve(out,`${testCase.id}.response.txt`),raw);
      if(!response.ok) throw new Error(`Inference request failed with HTTP ${response.status}`);
      let decoded;
      try { decoded=JSON.parse(raw); } catch { decoded=null; }
      const assessment=assessReply(testCase,corpus.context,decoded);
      const observation={case_id:testCase.id,condition:condition ?? 'baseline-json',
        source_sha256:digest(testCase.source),context_sha256:digest(corpus.context),
        raw_response_sha256:digest(raw),request_sha256:digest(request),
        observed_top_key:observedTopKey(decoded,corpus.context),assessment};
      observations.push(observation);
      console.log('EMC_MODEL_ASSESSMENT '+JSON.stringify(observation));
      try {
        const prediction=parseReply(decoded,corpus.context);
        const receipt=makeReceipt(testCase,corpus.context,prediction,{kind:'model',identity:model.id,family:model.family,model_revision:model.revision,weight_sha256:model.sha256,runtime_sha256:runtimeHash,prompt_revision:condition ? namedPromptRevision : baselinePromptRevision,condition:condition ?? 'baseline-json',request_sha256:digest(request),prompt_sha256:digest(messages),chat_template_sha256:digest(props.chat_template),raw_response_sha256:digest(raw),finish_reason:'stop',settings:{temperature:0,seed:7,max_tokens:768,enable_thinking:false},runtime_arguments:args});
        const score=verifyReceipt(testCase,corpus.context,receipt);
        records.push({receipt,score});
        console.log(JSON.stringify({case_id:testCase.id,model:id,exact_top1:score.exact_top1}));
      } catch(error) {
        failures.push({case_id:testCase.id,classification:'INVALID_MODEL_OUTPUT',error:error.message,raw_response_sha256:digest(raw)});
        console.log(JSON.stringify(failures.at(-1)));
      }
    }
    const result={status:'EXPERIMENT_COMPLETED_NOT_ACCEPTED',model,actual_model_inference:true,scope:smoke?'10-case-smoke':'48-case-corpus',total_cases:selected.length,valid_outputs:records.length,invalid_outputs:failures.length,exact_top1:records.filter(r=>r.score.exact_top1).length,corpus_sha256:digest(corpus),condition:condition ?? 'baseline-json',assessment_summary:summarizeAssessments(observations),observations,records,failures,automatically_authorized:false};
    await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));
    return result;
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(ended)return resolve();const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});
    log.end();
  }
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const [id,cache,executable,out,mode]=process.argv.slice(2);
  if(!id || !cache || !executable || !out || (mode && mode!=='--smoke')) {console.error('Usage: node run-local.mjs MODEL_ID CACHE_DIRECTORY ABSOLUTE_LLAMA_SERVER OUTPUT_DIRECTORY [--smoke]');process.exitCode=2;}
  else {try {const result=await runModel(id,cache,executable,resolve(out),mode==='--smoke');console.log(JSON.stringify({status:result.status,total:result.total_cases,exact_top1:result.exact_top1,invalid:result.invalid_outputs}));}catch(error){console.error(error.message);process.exitCode=1;}}
}
