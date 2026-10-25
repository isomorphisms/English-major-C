// Public standard-runner CPU experiment. Never starts a paid endpoint or runner.
import {readFile,writeFile,mkdir,readdir,stat,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join,basename,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {selectModel,downloadModel,hashFile} from './model-io.mjs';
import {runModel} from './run-local.mjs';
import {conditions} from './format-control.mjs';
export const runtime={tag:'b11560',source_revision:'b13a93a3d5fa44b57899d86467a4de463e7415a7',bytes:17718608,sha256:'55d446939872f9370bbdad57517fece1aebaca99251f4e12c801e4dc9d807512',url:'https://github.com/ggml-org/llama.cpp/releases/download/b11560/llama-b11560-bin-ubuntu-x64.tar.gz'};
export function requirePublicHost(environment,event) {
  if(environment.GITHUB_ACTIONS!=='true' || environment.RUNNER_ENVIRONMENT!=='github-hosted' || environment.RUNNER_OS!=='Linux' || environment.RUNNER_ARCH!=='X64' || event?.repository?.private!==false)throw new Error('Only the declared standard public Linux x64 job may provision this runtime');
}
export function safeArchiveNames(listing) {
  const names=listing.trim().split('\n');
  if(!names.length || names.some(name=>!name || isAbsolute(name) || name.split('/').includes('..')))throw new Error('Unsafe runtime archive path');
  return names;
}
function command(file,args) {
  const r=spawnSync(file,args,{encoding:'utf8',maxBuffer:4*1024*1024,shell:false});
  if(r.error || r.status!==0)throw new Error(`${file} failed: ${r.error?.message ?? r.stderr}`);
  return r.stdout;
}
async function obtainRuntime(directory) {
  let url=runtime.url, response;
  for(let i=0;i<8;i++) {
    const u=new URL(url);
    if(u.protocol!=='https:' || u.username || u.password || !['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(u.hostname))throw new Error('Unapproved runtime download redirect');
    response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(120000)});
    if([301,302,303,307,308].includes(response.status)) {
      const location=response.headers.get('location');await response.body?.cancel();
      if(!location)throw new Error('Runtime redirect has no location');
      url=new URL(location,url).href;continue;
    }
    break;
  }
  if(!response?.ok || !response.body)throw new Error('Pinned runtime download failed');
  let count=0;const chunks=[];
  for await(const part of response.body) {count+=part.length;if(count>runtime.bytes)throw new Error('Runtime archive exceeds pinned size');chunks.push(part);}
  const data=Buffer.concat(chunks);
  if(count!==runtime.bytes || createHash('sha256').update(data).digest('hex')!==runtime.sha256)throw new Error('Runtime archive size/hash mismatch');
  const archive=join(directory,'runtime.tar.gz');await writeFile(archive,data,{flag:'wx'});
  safeArchiveNames(command('tar',['-tzf',archive]));
  const unpacked=join(directory,'runtime');await mkdir(unpacked);
  command('tar',['--no-same-owner','--no-same-permissions','-xzf',archive,'-C',unpacked]);
  const candidates=[];
  async function visit(path) {for(const entry of await readdir(path,{withFileTypes:true})){const full=join(path,entry.name);if(entry.isDirectory())await visit(full);else if(entry.isFile()&&entry.name==='llama-server')candidates.push(full);}}
  await visit(unpacked);if(candidates.length!==1)throw new Error('Runtime archive must contain exactly one regular llama-server');
  return candidates[0];
}
export async function runPublicSmoke(id) {
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  requirePublicHost(process.env,event);
  if(!process.env.RUNNER_TEMP || !isAbsolute(process.env.RUNNER_TEMP))throw new Error('No runner scratch directory');
  const source=command('git',['rev-parse','HEAD']).trim();
  if(source!==event.pull_request?.head?.sha)throw new Error('Not testing the exact pull-request source');
  const model=selectModel(id), work=await mkdtemp(join(process.env.RUNNER_TEMP,'emc-model-'));
  const executable=await obtainRuntime(work),cache=join(work,'weights'),out=join(work,'results');
  process.env.LD_LIBRARY_PATH=dirname(executable)+(process.env.LD_LIBRARY_PATH?':'+process.env.LD_LIBRARY_PATH:'');
  await downloadModel(model,cache);
  console.log('EMC_MODEL_RUNTIME '+JSON.stringify({source_head:source,archive:runtime,binary_sha256:await hashFile(executable),version:command(executable,['--version'])}));
  const results=[];
  // Match model, source, context, prompt, seed and decoding across both arms.
  // Only JSON-schema generation constraints differ. Restart the server for
  // each arm so a previous answer never becomes another arm's conversation.
  for(const condition of conditions) {
    const conditionOut=join(out,condition);
    const result=await runModel(id,cache,executable,conditionOut,true,condition);
    for(const name of await readdir(conditionOut)) {
      if(name.endsWith('.request.json') || name.endsWith('.response.txt') || name==='server-props.json')console.log('EMC_MODEL_RAW '+JSON.stringify({condition,file:name,text:await readFile(join(conditionOut,name),'utf8')}));
    }
    console.log('EMC_MODEL_RESULTS '+JSON.stringify(result));
    results.push(result);
  }
  // Completion of an experiment is not accuracy acceptance.
  return results;
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  try {if(process.argv.length!==3)throw new Error('Usage: node ci-model-smoke.mjs MODEL_ID');await runPublicSmoke(process.argv[2]);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
