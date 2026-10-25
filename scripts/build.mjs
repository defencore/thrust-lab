import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import './check.mjs';

const generatedFolders = new Set(['node_modules', 'dist', 'coverage']);

async function sourceFiles(folder = 'src', prefix = '') {
  const files = [];
  const entries = await readdir(folder, { withFileTypes: true });
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of entries) {
    if (entry.name.startsWith('.') || (entry.isDirectory() && generatedFolders.has(entry.name))) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path, relative));
    else if (entry.isFile()) files.push({ path: relative, contents: await readFile(path) });
    else throw new Error(`Unsupported source entry: ${relative}`);
  }
  return files;
}

// All relative module and stylesheet imports share the same content-versioned directory.
const files = await sourceFiles();
files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const hash = createHash('sha256');
for (const file of files) hash.update(JSON.stringify([file.path, file.contents.length]) + '\n').update(file.contents);
const version = hash.digest('hex');
const assets = `./assets/${version}`;
const sourcePage = await readFile('index.html', 'utf8');
if (!sourcePage.includes('./src/app.js') || !sourcePage.includes('./src/styles.css') || !files.some(file => file.path === 'app.js') || !files.some(file => file.path === 'styles.css')) throw new Error('Missing browser entry point');
const page = sourcePage.replace('./src/app.js', `${assets}/app.js`).replace('./src/styles.css', `${assets}/styles.css`).replace('./favicon.svg', `./favicon.svg?v=${version}`);

await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await cp('public', 'dist', { recursive: true });
for (const file of files) {
  const destination = join('dist', 'assets', version, file.path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, file.contents);
}
await writeFile('dist/index.html', page);
await writeFile('dist/.nojekyll', '');
if (!page.includes(`${assets}/app.js`) || !page.includes(`${assets}/styles.css`) || page.includes('./src/')) throw new Error('Invalid versioned browser entry points');
if ((await readFile('dist/CNAME', 'utf8')).trim() !== 'thrustlab.defencore.com') throw new Error('Invalid custom domain');
console.log(`Static site ready in dist/ for GitHub Pages. Assets: assets/${version}/`);
