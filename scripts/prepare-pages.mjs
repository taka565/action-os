import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const revision = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(revision ?? '')) {
  throw new Error('GITHUB_SHA must contain the full Git commit hash.');
}

const root = new URL('../', import.meta.url);
const source = new URL('dist/', root);
const target = new URL('_site/', root);
await mkdir(target, { recursive: true });
await cp(fileURLToPath(source), fileURLToPath(target), { recursive: true });
const workerFile = new URL('sw.js', target);
const worker = await readFile(workerFile, 'utf8');
const cacheDeclaration = /^const CACHE='[^']+';/m;
if (!cacheDeclaration.test(worker)) {
  throw new Error('Service Worker cache declaration was not found.');
}
await writeFile(workerFile, worker.replace(cacheDeclaration, `const CACHE='action-os-shell-${revision}';`));
await writeFile(new URL('.nojekyll', target), '');
console.log(`Prepared GitHub Pages publication for ${revision}.`);
