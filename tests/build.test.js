import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildScript = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));
const page = '<link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./src/styles.css"><script type="module" src="./src/app.js"></script>';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'thrust-lab-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const folder of ['src/components', 'src/styles', 'public/examples', 'scripts', 'tests']) await mkdir(join(root, folder), { recursive: true });
  for (const [path, content] of Object.entries({
    'index.html': page,
    'src/app.js': "import './components/control.js';\n",
    'src/components/control.js': 'export const value = 1;\n',
    'src/styles.css': '@import "./styles/palette.css";\n',
    'src/styles/palette.css': 'body { color: navy; }\n',
    'public/CNAME': 'thrustlab.defencore.com\n',
    'public/favicon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'public/examples/example.csv': 'Time,Thrust\n0,1\n1,0\n',
  })) await writeFile(join(root, path), content);
  return root;
}

async function build(root) {
  execFileSync(process.execPath, [buildScript], { cwd: root, encoding: 'utf8' });
  const versions = await readdir(join(root, 'dist/assets'));
  assert.equal(versions.length, 1);
  assert.match(versions[0], /^[a-f0-9]{64}$/);
  return versions[0];
}

test('production assets share one stable content version and retain relative module and CSS imports', async t => {
  const root = await fixture(t);
  const version = await build(root);
  assert.equal(await build(root), version);
  const index = await readFile(join(root, 'dist/index.html'), 'utf8');
  assert.ok(index.includes(`./assets/${version}/app.js`));
  assert.ok(index.includes(`./assets/${version}/styles.css`));
  assert.ok(index.includes(`./favicon.svg?v=${version}`));
  assert.ok(!index.includes('./src/'));
  assert.deepEqual((await readdir(join(root, 'dist'))).sort(), ['.nojekyll', 'CNAME', 'assets', 'examples', 'favicon.svg', 'index.html']);
  assert.equal(await readFile(join(root, 'dist/assets', version, 'app.js'), 'utf8'), "import './components/control.js';\n");
  assert.equal(await readFile(join(root, 'dist/assets', version, 'components/control.js'), 'utf8'), 'export const value = 1;\n');
  assert.equal(await readFile(join(root, 'dist/assets', version, 'styles.css'), 'utf8'), '@import "./styles/palette.css";\n');
  assert.equal(await readFile(join(root, 'dist/assets', version, 'styles/palette.css'), 'utf8'), 'body { color: navy; }\n');
  assert.equal(await readFile(join(root, 'index.html'), 'utf8'), page);
  assert.equal(await readFile(join(root, 'dist/CNAME'), 'utf8'), 'thrustlab.defencore.com\n');
});

test('changing either a JavaScript module or a stylesheet creates a fresh complete asset directory', async t => {
  const root = await fixture(t);
  const first = await build(root);
  await writeFile(join(root, 'src/components/control.js'), 'export const value = 2;\n');
  const javascriptVersion = await build(root);
  assert.notEqual(javascriptVersion, first);
  await writeFile(join(root, 'src/styles/palette.css'), 'body { color: teal; }\n');
  const cssVersion = await build(root);
  assert.notEqual(cssVersion, javascriptVersion);
  assert.deepEqual(await readdir(join(root, 'dist/assets')), [cssVersion]);
  assert.equal(await readFile(join(root, 'dist/assets', cssVersion, 'components/control.js'), 'utf8'), 'export const value = 2;\n');
  assert.equal(await readFile(join(root, 'dist/assets', cssVersion, 'styles/palette.css'), 'utf8'), 'body { color: teal; }\n');
});

test('hidden and generated source files are excluded from both the version and deployment', async t => {
  const root = await fixture(t);
  const first = await build(root);
  for (const folder of ['src/.private', 'src/dist', 'src/node_modules', 'src/coverage']) {
    await mkdir(join(root, folder));
    await writeFile(join(root, folder, 'local.txt'), 'not a public application asset');
  }
  await writeFile(join(root, 'src/.local'), 'local only');
  assert.equal(await build(root), first);
  assert.deepEqual((await readdir(join(root, 'dist/assets', first))).sort(), ['app.js', 'components', 'styles', 'styles.css']);
});
