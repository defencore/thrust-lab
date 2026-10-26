import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFERENCE_DEFAULTS, createPreferences, resolveImportPreferences } from '../src/preferences.js';

const key = 'thrust-lab-preferences-v1';
function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem(name) { return values.get(name) ?? null; },
    setItem(name, value) { values.set(name, value); },
    removeItem(name) { values.delete(name); },
  };
}

test('preferences persist separate import settings and deeply merge selected controls', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage);
  assert.equal(preferences.available, true);
  preferences.update({ imports: { working: { timeUnit: 'ms', thrustUnit: 'kgf', header: 'yes', timeColumn: { name: 'Clock', index: 2 } } }, controls: { 'smooth-window': '25', 'noise-amount': '6.5' }, inspectorTab: 'signal' });
  preferences.update({ imports: { theory: { thrustUnit: 'kN' }, working: { thrustColumn: { name: 'Force', index: 0 } } }, controls: { 'edit-anchor': 'center' } });
  const saved = createPreferences(storage).get();
  assert.equal(saved.imports.working.timeUnit, 'ms');
  assert.equal(saved.imports.working.thrustUnit, 'kgf');
  assert.equal(saved.imports.theory.timeUnit, 'auto');
  assert.equal(saved.imports.theory.thrustUnit, 'kN');
  assert.deepEqual(saved.imports.working.timeColumn, { name: 'Clock', index: 2 });
  assert.equal(saved.controls['smooth-window'], '25');
  assert.equal(saved.controls['noise-amount'], '6.5');
  assert.equal(saved.controls['edit-anchor'], 'center');
  assert.equal(saved.inspectorTab, 'signal');
});

test('settings reset removes only the preferences key and preserves project and language', () => {
  const storage = memoryStorage({ 'thrust-lab-project-v1': '{"name":"Keep my measured profile"}', 'thrust-lab-language': 'uk', unrelated: 'retained' });
  const preferences = createPreferences(storage);
  preferences.update({ controls: { 'export-thrust': 'kgf' }, focus: true });
  assert.ok(storage.values.has(key));
  assert.deepEqual(preferences.reset(), PREFERENCE_DEFAULTS);
  assert.equal(storage.values.has(key), false);
  assert.equal(storage.getItem('thrust-lab-project-v1'), '{"name":"Keep my measured profile"}');
  assert.equal(storage.getItem('thrust-lab-language'), 'uk');
  assert.equal(storage.getItem('unrelated'), 'retained');
});

test('custom exports retain one or two decimal places and validate the complete precision range', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage);
  preferences.update({ controls: { 'export-precision': '1' } });
  assert.equal(createPreferences(storage).get().controls['export-precision'], '1');
  preferences.update({ controls: { 'export-precision': '2' } });
  assert.equal(createPreferences(storage).get().controls['export-precision'], '2');
  for (let digits = 0; digits <= 15; digits++) assert.equal(preferences.update({ controls: { 'export-precision': digits } }).controls['export-precision'], String(digits));
  for (const value of ['', -1, 16, 1.5, Infinity, 'one']) assert.equal(preferences.update({ controls: { 'export-precision': value } }).controls['export-precision'], '15');
  assert.equal(preferences.reset().controls['export-precision'], PREFERENCE_DEFAULTS.controls['export-precision']);
});

test('display units persist independently while cached control and generator values stay in SI', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage);
  assert.deepEqual(preferences.get().displayUnits, { thrust: 'N', time: 's', impulse: 'N·s' });
  preferences.update({ controls: { 'edit-offset': '9.80665', 'target-peak': '980.665', 'target-impulse': '1000', 'theory-offset': '-1.5' }, generator: { peak: 500, duration: 4, impulse: 1200 } });
  preferences.update({ displayUnits: { thrust: 'kgf', time: 'ms' } });
  const saved = preferences.update({ displayUnits: { impulse: 'kN·s' } });
  assert.deepEqual(saved.displayUnits, { thrust: 'kgf', time: 'ms', impulse: 'kN·s' });
  const restored = createPreferences(storage).get();
  assert.deepEqual(restored.displayUnits, saved.displayUnits);
  assert.equal(restored.controls['edit-offset'], '9.80665');
  assert.equal(restored.controls['target-peak'], '980.665');
  assert.equal(restored.controls['target-impulse'], '1000');
  assert.equal(restored.controls['theory-offset'], '-1.5');
  assert.equal(restored.generator.peak, 500);
  assert.equal(restored.generator.duration, 4);
  assert.equal(restored.generator.impulse, 1200);
});

test('display unit updates reject invalid dimensions and reset without touching profile or language', () => {
  const storage = memoryStorage({ 'thrust-lab-project-v1': 'preserve profile', 'thrust-lab-language': 'uk' });
  const preferences = createPreferences(storage);
  preferences.update({ displayUnits: { thrust: 'lbf', time: 'min', impulse: 'lbf·s' } });
  const invalid = preferences.update({ displayUnits: { thrust: 'kg', time: 'minutes', impulse: null, pressure: 'bar' } });
  assert.deepEqual(invalid.displayUnits, { thrust: 'lbf', time: 'min', impulse: 'lbf·s' });
  assert.deepEqual(preferences.update({ displayUnits: [] }).displayUnits, invalid.displayUnits);
  assert.deepEqual(preferences.update({ displayUnits: { time: 'us' } }).displayUnits, { thrust: 'lbf', time: 'us', impulse: 'lbf·s' });
  const reset = preferences.reset();
  assert.deepEqual(reset.displayUnits, { thrust: 'N', time: 's', impulse: 'N·s' });
  assert.equal(storage.getItem('thrust-lab-project-v1'), 'preserve profile');
  assert.equal(storage.getItem('thrust-lab-language'), 'uk');
});

test('invalid, unknown, and nonfinite values never become cached settings', () => {
  const preferences = createPreferences(memoryStorage());
  preferences.update({ controls: { 'edit-width': '75', 'noise-seed': '100', 'theory-opacity': '40' }, focus: true });
  const saved = preferences.update({ version: 500, controls: { 'edit-width': '', 'noise-seed': '2.5', 'theory-opacity': '0', 'edit-gain': Infinity, 'smooth-window': '11', bogus: 'intruder' }, imports: { working: { timeUnit: 'minutes', timeColumn: { name: 'Clock', index: -1 } } }, focus: 'false', points: [{ time: 0, thrust: 1 }] });
  assert.equal(saved.version, 1);
  assert.equal(saved.controls['edit-width'], '75');
  assert.equal(saved.controls['noise-seed'], '100');
  assert.equal(saved.controls['theory-opacity'], '40');
  assert.equal(saved.controls['edit-gain'], '100');
  assert.equal(saved.controls['smooth-window'], '9');
  assert.equal(saved.focus, true);
  assert.equal(saved.imports.working.timeUnit, 'auto');
  assert.equal(saved.imports.working.timeColumn, null);
  assert.equal(Object.hasOwn(saved.controls, 'bogus'), false);
  assert.equal(Object.hasOwn(saved, 'points'), false);
  assert.equal(preferences.update({ controls: { 'edit-gain': 0 } }).controls['edit-gain'], '0');
});

test('generator settings are validated, copied, and partially updated without aliases', () => {
  const preferences = createPreferences(memoryStorage());
  const generator = { peak: 500, duration: 4, impulse: 1200, interval: .01, sampling: 'jitter', jitter: .4, noise: .02, seed: 123, shape: 'regressive', presetId: 'aerotech-g80t' };
  preferences.update({ generator });
  generator.peak = 1;
  const cached = preferences.update({ generator: { noise: 0, seed: NaN, interval: 0, peak: Infinity, presetId: '../unrecognized' } });
  assert.equal(cached.generator.peak, 500);
  assert.equal(cached.generator.noise, 0);
  assert.equal(cached.generator.seed, 123);
  assert.equal(cached.generator.interval, .01);
  assert.equal(cached.generator.presetId, 'aerotech-g80t');
  cached.generator.duration = 99;
  assert.equal(preferences.get().generator.duration, 4);
  assert.equal(preferences.update({ generator: null }).generator, null);
});

test('corrupt and unsupported saved data recover without clearing any other storage', () => {
  for (const content of ['{', 'null', '[]', '{"version":2}', '{"version":1,"controls":{"edit-width":"bad","export-time":"ms"}}']) {
    const storage = memoryStorage({ [key]: content, 'thrust-lab-project-v1': 'preserve' });
    const preferences = createPreferences(storage);
    assert.equal(preferences.available, true);
    assert.equal(preferences.get().controls['edit-width'], '100');
    assert.equal(storage.getItem('thrust-lab-project-v1'), 'preserve');
    if (content.includes('"export-time"')) assert.equal(preferences.get().controls['export-time'], 'ms');
  }
});

test('storage failures keep preferences usable in memory and report availability', () => {
  const storage = { getItem() { throw new Error('Disabled'); }, setItem() { throw new Error('Full'); }, removeItem() { throw new Error('Disabled'); } };
  const preferences = createPreferences(storage);
  assert.equal(preferences.available, false);
  assert.equal(preferences.update({ controls: { 'noise-amount': '15' } }).controls['noise-amount'], '15');
  assert.equal(preferences.available, false);
  assert.deepEqual(preferences.reset(), PREFERENCE_DEFAULTS);
  const temporary = createPreferences(null);
  temporary.update({ inspectorTab: 'theory' });
  assert.equal(temporary.get().inspectorTab, 'theory');
  assert.equal(temporary.available, false);
});

test('returned snapshots cannot mutate cached settings or frozen defaults', () => {
  const preferences = createPreferences(memoryStorage());
  const result = preferences.get();
  result.imports.working.timeColumn = { name: 'Other', index: 4 };
  result.controls['edit-width'] = '1';
  assert.equal(preferences.get().imports.working.timeColumn, null);
  assert.equal(preferences.get().controls['edit-width'], '100');
  assert.equal(Object.isFrozen(PREFERENCE_DEFAULTS.controls), true);
});

test('control-curve and noise-match options persist with bounded values and reset safely', () => {
  const storage = memoryStorage({ 'thrust-lab-project-v1': 'preserve curve', 'thrust-lab-language': 'uk' });
  const preferences = createPreferences(storage);
  assert.equal(preferences.get().controls['curve-interpolation'], 'smooth');
  assert.equal(preferences.get().controls['curve-node-count'], '5');
  assert.equal(preferences.get().controls['match-noise-gain'], '100');
  preferences.update({ controls: { 'curve-interpolation': 'linear', 'curve-node-count': '9', 'match-noise-gain': '72.5' }, inspectorTab: 'curve' });
  const restored = createPreferences(storage);
  assert.equal(restored.get().controls['curve-interpolation'], 'linear');
  assert.equal(restored.get().controls['curve-node-count'], '9');
  assert.equal(restored.get().controls['match-noise-gain'], '72.5');
  assert.equal(restored.get().inspectorTab, 'curve');
  for (const value of [2, 13, 4.5, '', Infinity]) assert.equal(restored.update({ controls: { 'curve-node-count': value } }).controls['curve-node-count'], '9');
  for (const value of [-1, 1001, '', NaN]) assert.equal(restored.update({ controls: { 'match-noise-gain': value } }).controls['match-noise-gain'], '72.5');
  assert.equal(restored.update({ controls: { 'curve-interpolation': 'bezier' } }).controls['curve-interpolation'], 'linear');
  assert.equal(restored.update({ controls: { 'curve-node-count': 3, 'match-noise-gain': 0 } }).controls['curve-node-count'], '3');
  assert.equal(restored.update({ controls: { 'curve-node-count': 12, 'match-noise-gain': 1000 } }).controls['match-noise-gain'], '1000');
  restored.reset();
  assert.equal(restored.get().controls['curve-interpolation'], 'smooth');
  assert.equal(restored.get().controls['curve-node-count'], '5');
  assert.equal(restored.get().controls['match-noise-gain'], '100');
  assert.equal(restored.get().inspectorTab, 'transform');
  assert.equal(storage.getItem('thrust-lab-project-v1'), 'preserve curve');
  assert.equal(storage.getItem('thrust-lab-language'), 'uk');
});

test('theory alignment preferences persist validated modes and signed offsets, and reset cleanly', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage);
  preferences.update({ controls: { 'theory-alignment': 'ignition', 'theory-offset': '-2.125' } });
  const restored = createPreferences(storage);
  assert.equal(restored.get().controls['theory-alignment'], 'ignition');
  assert.equal(restored.get().controls['theory-offset'], '-2.125');
  const saved = restored.update({ controls: { 'theory-alignment': 'burnout', 'theory-offset': 1e9 + 1 } });
  assert.equal(saved.controls['theory-alignment'], 'ignition');
  assert.equal(saved.controls['theory-offset'], '-2.125');
  assert.equal(restored.update({ controls: { 'theory-offset': -1e9 } }).controls['theory-offset'], '-1000000000');
  restored.reset();
  assert.equal(restored.get().controls['theory-alignment'], 'source');
  assert.equal(restored.get().controls['theory-offset'], '0');
});

test('selection feather caches percentages from zero through fifty and resets to fifteen', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage);
  assert.equal(preferences.get().controls['edit-feather'], '15');
  preferences.update({ controls: { 'edit-feather': '27.5' } });
  const restored = createPreferences(storage);
  assert.equal(restored.get().controls['edit-feather'], '27.5');
  for (const value of [-1, 51, '', Infinity]) assert.equal(restored.update({ controls: { 'edit-feather': value } }).controls['edit-feather'], '27.5');
  assert.equal(restored.update({ controls: { 'edit-feather': '0' } }).controls['edit-feather'], '0');
  assert.equal(restored.update({ controls: { 'edit-feather': 50 } }).controls['edit-feather'], '50');
  assert.equal(restored.reset().controls['edit-feather'], '15');
});

test('shift background choices persist valid fill and gain settings and reset independently of recording data', () => {
  const storage = memoryStorage({ 'thrust-lab-project-v1': 'preserve recording', 'thrust-lab-language': 'uk' });
  const preferences = createPreferences(storage);
  assert.equal(preferences.get().controls['edit-shift-fill'], 'zero');
  assert.equal(preferences.get().controls['edit-shift-noise-gain'], '100');
  preferences.update({ controls: { 'edit-shift-fill': 'background', 'edit-shift-noise-gain': '72.5' } });
  const restored = createPreferences(storage);
  assert.equal(restored.get().controls['edit-shift-fill'], 'background');
  assert.equal(restored.get().controls['edit-shift-noise-gain'], '72.5');
  for (const value of ['random', '', null]) assert.equal(restored.update({ controls: { 'edit-shift-fill': value } }).controls['edit-shift-fill'], 'background');
  for (const value of [-1, 1001, '', NaN, Infinity]) assert.equal(restored.update({ controls: { 'edit-shift-noise-gain': value } }).controls['edit-shift-noise-gain'], '72.5');
  assert.equal(restored.update({ controls: { 'edit-shift-noise-gain': 0 } }).controls['edit-shift-noise-gain'], '0');
  assert.equal(restored.update({ controls: { 'edit-shift-noise-gain': 1000 } }).controls['edit-shift-noise-gain'], '1000');
  const reset = restored.reset();
  assert.equal(reset.controls['edit-shift-fill'], 'zero');
  assert.equal(reset.controls['edit-shift-noise-gain'], '100');
  assert.equal(storage.getItem('thrust-lab-project-v1'), 'preserve recording');
  assert.equal(storage.getItem('thrust-lab-language'), 'uk');
});

test('CSV mappings follow remembered names when columns are reordered', () => {
  const result = resolveImportPreferences(['Force', 'Notes', 'Clock'], { header: 'yes', timeUnit: 'ms', thrustUnit: 'kgf', timeColumn: { name: 'Clock', index: 0 }, thrustColumn: { name: 'Force', index: 1 } });
  assert.deepEqual(result, { timeColumn: 2, thrustColumn: 0, timeUnit: 'ms', thrustUnit: 'kgf', header: 'yes' });
});

test('new named headers use detection instead of stale column indices', () => {
  const saved = { timeColumn: { name: 'Clock', index: 2 }, thrustColumn: { name: 'Weight', index: 0 } };
  const detected = resolveImportPreferences(['Comments', 'Thrust (N)', 'Time (s)'], saved);
  assert.equal(detected.timeColumn, 2);
  assert.equal(detected.thrustColumn, 1);
  const noMatch = resolveImportPreferences(['Alpha', 'Beta', 'Gamma'], saved);
  assert.equal(noMatch.timeColumn, 0);
  assert.equal(noMatch.thrustColumn, 1);
  const headerless = resolveImportPreferences(['Column 1', 'Column 2', 'Column 3'], saved);
  assert.equal(headerless.timeColumn, 2);
  assert.equal(headerless.thrustColumn, 0);
});

test('CSV mapping resolves duplicate names and conflicting mappings to distinct columns', () => {
  const duplicate = resolveImportPreferences(['Time', 'Thrust', 'Thrust'], { thrustColumn: { name: 'Thrust', index: 2 } });
  assert.equal(duplicate.thrustColumn, 2);
  const conflict = resolveImportPreferences(['Time', 'Thrust'], { timeColumn: { name: 'Time', index: 0 }, thrustColumn: { name: 'Time', index: 0 } });
  assert.equal(conflict.timeColumn, 0);
  assert.equal(conflict.thrustColumn, 1);
  const manualThrust = resolveImportPreferences(['Sensor', 'Clock'], { thrustColumn: { name: 'Sensor', index: 0 } });
  assert.equal(manualThrust.timeColumn, 1);
  assert.equal(manualThrust.thrustColumn, 0);
  assert.throws(() => resolveImportPreferences(['Only one']), /at least two/);
});
