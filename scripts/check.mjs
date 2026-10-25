import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const folder of ['src', 'scripts', 'tests']) {
  for (const file of await readdir(folder, { recursive: true })) {
    if (!/\.(m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', `${folder}/${file}`], { encoding: 'utf8' });
    if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
  }
}
console.log('All JavaScript modules pass syntax validation.');
