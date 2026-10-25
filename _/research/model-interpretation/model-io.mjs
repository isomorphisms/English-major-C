// No network activity on import. Only pinned public downloads; no inference APIs.
import {createReadStream, createWriteStream} from 'node:fs';
import {access, mkdir, readFile, link, rm, stat, statfs} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Transform, Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const manifest = JSON.parse(await readFile(new URL('./model-files.json', import.meta.url),'utf8'));
export function selectModel(id) {
  const model = manifest.models.find(m => m.id === id);
  if (!model) throw new Error(`Unknown model ${id}`);
  if (manifest.incremental_spend_limit_usd !== 0 || !/^[a-f0-9]{40}$/.test(model.revision) || !/^[a-f0-9]{64}$/.test(model.sha256) || model.bytes >= 2**31 || model.bytes < 1 || basename(model.file) !== model.file || model.license !== 'Apache-2.0') throw new Error('Invalid zero-cost model manifest');
  return model;
}
export async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function verifyWeight(path, model) {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size !== model.bytes) throw new Error('Model weight size mismatch');
  if (await hashFile(path) !== model.sha256) throw new Error('Model weight SHA-256 mismatch');
}
export function sufficientDisk(freeBytes, requiredBytes) {
  return Number.isSafeInteger(requiredBytes) && requiredBytes > 0 && freeBytes >= requiredBytes + 2**30;
}
function permittedDownload(url) {
  const x = new URL(url);
  // HF uses signed public CDN redirects; do not forward credentials or accept
  // arbitrary protocol/host changes. A new CDN requires an explicit review.
  return x.protocol === 'https:' && !x.username && !x.password && (!x.port || x.port === '443') &&
    (x.hostname === 'huggingface.co' || x.hostname.endsWith('.huggingface.co') || x.hostname.endsWith('.hf.co') || x.hostname.endsWith('.xethub.hf.co'));
}
export async function publicResponse(url) {
  for (let redirects=0; redirects<8; redirects++) {
    if (!permittedDownload(url)) throw new Error('Refusing an unapproved model download destination');
    const response = await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(120000)});
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect has no destination');
      await response.body?.cancel();
      url = new URL(location,url).href;
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`Public model download failed with HTTP ${response.status}`);
    return response;
  }
  throw new Error('Too many public-download redirects');
}
export async function downloadModel(model, directory) {
  await mkdir(directory,{recursive:true});
  const destination = resolve(directory,model.file);
  try { await access(destination); await verifyWeight(destination,model); return destination; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const space = await statfs(directory);
  if (!sufficientDisk(space.bavail*space.bsize,model.bytes)) throw new Error('Not enough free space for weights plus the one-GiB reserve');
  const url = `https://huggingface.co/${model.repository}/resolve/${model.revision}/${encodeURIComponent(model.file)}`;
  const temporary = destination + `.partial-${process.pid}`;
  try {
    const response = await publicResponse(url);
    let seen=0;
    const limit = new Transform({transform(chunk,encoding,done) { seen+=chunk.length; done(seen>model.bytes ? new Error('Download exceeds pinned size') : null,chunk); }});
    await pipeline(Readable.fromWeb(response.body),limit,createWriteStream(temporary,{flags:'wx'}));
    await verifyWeight(temporary,model);
    await link(temporary,destination);
    await rm(temporary);
    return destination;
  } catch (error) {
    await rm(temporary,{force:true});
    throw error;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const [command,id,directory] = process.argv.slice(2);
    if (command === 'plan' && !id) console.log(JSON.stringify(manifest,null,2));
    else if (command === 'download' && id && directory) console.log(await downloadModel(selectModel(id),resolve(directory)));
    else throw new Error('Usage: node model-io.mjs plan | download MODEL_ID CACHE_DIRECTORY');
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
