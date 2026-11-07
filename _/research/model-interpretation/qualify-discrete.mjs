// Source-built canonical Idriç qualification, with no stock Idris fallback.
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readdir,stat,readFile} from 'node:fs/promises';
import {resolve,isAbsolute,relative} from 'node:path';
import {hashFile} from './model-io.mjs';
import {runDiscrete} from './run-discrete.mjs';
const compilerRevision='2734ac5a86610eddfab73b1644d72b4ac85a65ee';
const output=resolve('_/build/emc-96-evidence');
function command(file,args,cwd=process.cwd()) {
  const result=spawnSync(file,args,{cwd,env:process.env,encoding:'utf8',maxBuffer:64*1024*1024,shell:false});
  process.stdout.write(result.stdout ?? '');process.stderr.write(result.stderr ?? '');
  if(result.error || result.status!==0) throw new Error(`Required command failed: ${file}: ${result.error?.message ?? result.status}`);
  return result.stdout.trim();
}
async function treeHashes(directory) {
  const result={};
  async function walk(path) {
    for(const entry of await readdir(path,{withFileTypes:true})) {
      const full=resolve(path,entry.name);
      if(entry.isDirectory()) await walk(full);
      else if(entry.isFile())result[relative(directory,full)]=await hashFile(full);
      else throw new Error(`Unexpected nonregular executable payload: ${full}`);
    }
  }
  await walk(directory);return result;
}
try {
  const home=process.env.IDRIC_HOME;
  if(!home || !isAbsolute(home))throw new Error('Idriç compiler checkout is missing: set absolute IDRIC_HOME');
  if(command('git',['rev-parse','HEAD'],home)!==compilerRevision)throw new Error('Idriç source revision does not match the pinned compiler');
  const sourceHead=command('git',['rev-parse','HEAD']);
  if(process.env.EXPECTED_SOURCE_SHA && sourceHead!==process.env.EXPECTED_SOURCE_SHA)throw new Error('Not executing the reviewed English Major C head');
  await mkdir(output,{recursive:true});
  // These are the compiler repository's existing bootstrap entrypoints; this
  // program does not compile the interpreter through ICK, C, or a substitute.
  command(resolve(home,'edric'),['bootstrap'],home);
  command(resolve(home,'edric'),['test','--only','idris2/basic/edric001'],home);
  process.env.PATH=resolve(home,'.tools/bin')+':'+process.env.PATH;
  process.env.IDRIS2_PREFIX=resolve(home,'_/build/env');
  const compiler=resolve(home,'build/exec/idris2');
  const version=command(compiler,['--version']);
  if(!version.includes('0.8.0-2734ac5a8'))throw new Error('Unexpected built compiler version');
  command(compiler,['--build','english-discrete.ipkg'],resolve('_'));
  const executable=resolve('_/build/exec/english-discrete');
  if(!(await stat(executable)).isFile())throw new Error('Idriç did not build the declared executable');
  const result=await runDiscrete(executable,compilerRevision,output);
  const receipt={status:'HOST_IDRIC_EXECUTION_ONLY',source_head:sourceHead,compiler_source:compilerRevision,compiler_version:version,compiler_payload_sha256:await treeHashes(resolve(home,'build/exec')),interpreter_payload_sha256:await treeHashes(resolve('_/build/exec')),source_files:{},covered_cases:result.covered_cases,model_inference:false,arm_execution:false,independent_aici_acceptance:false};
  for(const path of ['_/research/EnglishMajorC/SourceCategories.idric','_/research/EnglishMajorC/DiscreteInterpreter.idric','_/research/model-interpretation/cases.json','_/english-discrete.ipkg'])receipt.source_files[path]=await hashFile(path);
  await writeFile(resolve(output,'idric-build-receipt.json'),JSON.stringify(receipt,null,2));
  // Plain logs preserve the exact evidence without paid artifact/cache storage.
  console.log('EMC_IDRIC_RECEIPT '+JSON.stringify(receipt));
  console.log('EMC_IDRIC_RESULTS '+await readFile(resolve(output,'discrete-results.json'),'utf8'));
} catch(error) {console.error(error.message);process.exitCode=1;}
