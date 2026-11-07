// Resolve original capture names without changing their recorded bytes or hashes.
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repository_root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rows = readFileSync(join(repository_root, '_/path-map.tsv'), 'utf8')
  .trimEnd().split('\n');
if (rows.shift() !== 'old_path\tnew_path') throw new Error('Invalid repository path-map header');
const path_rules = rows.map(line => {
  const cells = line.split('\t');
  if (cells.length !== 2 || cells.some(path => !path || isAbsolute(path) || path.split('/').includes('..')))
    throw new Error('Invalid repository path-map row');
  return cells;
}).sort(([first], [second]) => second.length - first.length);
if (new Set(path_rules.map(([original]) => original)).size !== path_rules.length)
  throw new Error('Duplicate original repository path');

export function resolve_repository_path(original_path) {
  const local_path = isAbsolute(original_path) ? relative(repository_root, original_path) : original_path;
  if (local_path === '..' || local_path.startsWith('../'))
    throw new Error('Capture path is outside the repository: ' + original_path);
  const rule = path_rules.find(([original]) => local_path === original || local_path.startsWith(original + '/'));
  return join(repository_root, rule ? rule[1] + local_path.slice(rule[0].length) : local_path);
}

export function copy_capture_directory(original_directory, destination) {
  if (!original_directory.startsWith('examples/r-lm-native-') ||
      original_directory.split('/').includes('..'))
    throw new Error('Expected one original native capture directory');
  const target = resolve(destination);
  if (existsSync(target)) throw new Error('Capture destination already exists: ' + target);
  cpSync(resolve_repository_path(original_directory), target, { recursive: true });
  for (const [original, current] of path_rules) {
    if (!original.startsWith(original_directory + '/')) continue;
    const target_file = join(target, original.slice(original_directory.length + 1));
    mkdirSync(dirname(target_file), { recursive: true });
    cpSync(join(repository_root, current), target_file, { recursive: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [operation, original_directory, destination, extra] = process.argv.slice(2);
  if (operation !== '--copy-capture' || !original_directory || !destination || extra)
    throw new Error('Usage: resolve-repository-path.mjs --copy-capture original-directory destination');
  copy_capture_directory(original_directory, destination);
}
