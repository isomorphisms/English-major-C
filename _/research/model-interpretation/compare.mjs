// Offline comparator. It NEVER invokes a model, authorizes assembly, or
// fabricates model opinions. Every provided ranking is an external receipt.
import {canonicalCandidate, demonstrationContext} from './operations.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export function fingerprint(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }

export function compareRankings(record) {
  const {source,source_sha256,context,ranking_receipts}=record;
  if (typeof source!=="string" || source_sha256!==fingerprint(source)) {
    throw new Error('Source identity is missing or mismatched.');
  }
  if (!context || context.architecture!=='ARMv7-A T32' ||
      !Array.isArray(context.registers) || !Array.isArray(context.labels)) {
    throw new Error('Missing explicit machine/declaration context.');
  }
  if (!Array.isArray(ranking_receipts) || ranking_receipts.length===0) {
    throw new Error('No external interpreter receipts provided.');
  }
  const interpreters=new Set();
  const rankings=[];
  for (const receipt of ranking_receipts) {
    if (typeof receipt.interpreter!=='string' || !receipt.interpreter || interpreters.has(receipt.interpreter)) {
      throw new Error('Missing or repeated interpreter identity.');
    }
    interpreters.add(receipt.interpreter);
    if (typeof receipt.revision!=='string' || !receipt.revision ||
        typeof receipt.source_sha256!=='string' || receipt.source_sha256!==source_sha256) {
      throw new Error('Interpreter revision or source identity missing.');
    }
    if (!Array.isArray(receipt.candidates) || receipt.candidates.length>5) {
      throw new Error('Ranked candidates must be a list of at most five.');
    }
    const seen=new Set();
    const candidates=receipt.candidates.map((candidate,i)=>{
      if (candidate.rank!==i+1) throw new Error('Ranks must be consecutive, beginning at one.');
      const key=canonicalCandidate(candidate,context);
      if (seen.has(key)) throw new Error('Repeated candidate within one ranking.');
      seen.add(key);
      return {rank:i+1,key,candidate};
    });
    rankings.push({interpreter:receipt.interpreter,revision:receipt.revision,
      abstained:candidates.length===0,candidates});
  }
  const top=rankings.filter(x=>!x.abstained).map(x=>x.candidates[0].key);
  const distinctTop=[...new Set(top)];
  const allPresent=rankings.every(x=>!x.abstained);
  // Consensus is an observation, NEVER a permission to compile or execute.
  const classification=!allPresent?'ABSTENTION':distinctTop.length===1?'TOP_RANK_AGREEMENT':'TOP_RANK_DISAGREEMENT';
  return {source_sha256,classification,allTopIdentical:allPresent && distinctTop.length===1,
    automaticallyAuthorized:false,
    rankings:rankings.map(r=>({interpreter:r.interpreter,revision:r.revision,abstained:r.abstained,
      candidates:r.candidates.map(c=>({rank:c.rank,operation:c.candidate.operation,
        operands:c.candidate.operands,effects:c.candidate.effects}))}))};
}

if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  if (process.argv.length!==3) {
    console.error('Usage: node compare.mjs rankings.json');process.exitCode=2;
  } else {
    try {
      const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));
      console.log(JSON.stringify(compareRankings(fixture),null,2));
    } catch(e) {console.error(e.message);process.exitCode=1;}
  }
}
