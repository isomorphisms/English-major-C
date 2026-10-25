import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requirePublicHost,safeArchiveNames,runtime} from './ci-model-smoke.mjs';
const host={GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',RUNNER_ARCH:'X64'};
test('runtime provision refuses private, self-hosted and unknown hosts',()=>{
  requirePublicHost(host,{repository:{private:false}});
  assert.throws(()=>requirePublicHost(host,{repository:{private:true}}));
  assert.throws(()=>requirePublicHost({...host,RUNNER_ENVIRONMENT:'self-hosted'},{repository:{private:false}}));
  assert.throws(()=>requirePublicHost({},{}));
});
test('pinned runtime archive names cannot escape their extraction directory',()=>{
  assert.deepEqual(safeArchiveNames('build/bin/llama-server\nbuild/bin/libllama.so\n'),['build/bin/llama-server','build/bin/libllama.so']);
  for(const listing of ['/tmp/bad','../bad','build/../../bad',''])assert.throws(()=>safeArchiveNames(listing));
});
test('foreign prebuilt CPU runtime has an exact source, archive byte count and digest',()=>{
  assert.match(runtime.source_revision,/^[0-9a-f]{40}$/);assert.match(runtime.sha256,/^[0-9a-f]{64}$/);
  assert.equal(runtime.bytes,17718608);assert.ok(runtime.url.endsWith('bin-ubuntu-x64.tar.gz'));
});
