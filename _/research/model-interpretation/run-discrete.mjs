// The supplied binary must be built by the pinned canonical Idriç compiler.
// This wrapper supplies input and checks output; it does not parse English.
import {readFile,writeFile,mkdir,mkdtemp,rm,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hashFile} from './model-io.mjs';
import {digest,makeReceipt,verifyReceipt,validatePrediction} from './experiment.mjs';
export async function runDiscrete(executable, compilerRevision, out) {
  if (!isAbsolute(executable) || !(await stat(executable)).isFile()) throw new Error('Supply the actual Idriç-built executable, using an absolute path');
  if (compilerRevision !== '2734ac5a86610eddfab73b1644d72b4ac85a65ee') throw new Error('Wrong canonical Idriç source revision');
  const corpus=JSON.parse(await readFile(new URL('./cases.json',import.meta.url),'utf8'));
  await mkdir(out,{recursive:true});
  const temp=await mkdtemp(join(tmpdir(),'emc-discrete-'));
  const records=[];
  try {
    await writeFile(join(temp,'registers'),corpus.context.registers.join('\n'));
    await writeFile(join(temp,'labels'),corpus.context.labels.join('\n'));
    const executableHash=await hashFile(executable);
    for(const testCase of corpus.cases) {
      const path=join(temp,'source.english');await writeFile(path,testCase.source);
      const result=spawnSync(executable,[join(temp,'registers'),join(temp,'labels'),path],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024,shell:false});
      if(result.error || result.status!==0) throw new Error(`Idriç interpreter failed for ${testCase.id}: ${result.error?.message ?? result.stderr ?? result.stdout}`);
      const prediction=validatePrediction(JSON.parse(result.stdout),corpus.context);
      const receipt=makeReceipt(testCase,corpus.context,prediction,{kind:'idric',identity:'canonical-idric-discrete',compiler_revision:compilerRevision,executable_sha256:executableHash});
      const score=verifyReceipt(testCase,corpus.context,receipt);
      records.push({receipt,score,grammar_covers_case:testCase.discrete_supported});
      if(testCase.discrete_supported && !score.exact_top1) throw new Error(`Supported discrete interpretation is wrong: ${testCase.id}`);
      if(!testCase.discrete_supported && prediction.status==='interpreted') throw new Error(`Unexpectedly interpreted an unadmitted grammar case: ${testCase.id}`);
      console.log(JSON.stringify({id:testCase.id,discrete_status:prediction.status,covered:testCase.discrete_supported,exact_top1:score.exact_top1}));
    }
    const result={status:'DISCRETE_CORPUS_EXECUTED',compiler_revision:compilerRevision,covered_cases:records.filter(r=>r.grammar_covers_case).length,corpus_sha256:digest(corpus),records,automatically_authorized:false};
    await writeFile(resolve(out,'discrete-results.json'),JSON.stringify(result,null,2));
    return result;
  } finally {await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const [binary,revision,out]=process.argv.slice(2);
  if(!binary||!revision||!out){console.error('Usage: node run-discrete.mjs ABSOLUTE_BINARY PINNED_IDRIC_SHA OUTPUT_DIRECTORY');process.exitCode=2;}
  else {try {await runDiscrete(binary,revision,out);}catch(error){console.error(error.message);process.exitCode=1;}}
}
