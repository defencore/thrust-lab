import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferences } from '../src/preferences.js';

test('fit preferences cache independent targets and noise choices in SI without enabling an edit', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const preferences = createPreferences(storage);
  const settings = { start: .12, duration: 1.6, peak: 125, impulse: 140, average: 87.5, areaMode: 'average', shapeBlend: .85, noiseSource: 'original', noiseLevel: 1.2, window: 25, enabled: true };
  preferences.update({ theoryFit: settings, displayUnits: { thrust: 'kgf', time: 'ms' } });
  const restored = createPreferences(storage).get();
  assert.equal(restored.theoryFit.duration, 1.6);
  assert.equal(restored.theoryFit.peak, 125);
  assert.equal(restored.theoryFit.areaMode, 'average');
  assert.equal(restored.theoryFit.noiseLevel, 1.2);
  assert.equal(Object.hasOwn(restored.theoryFit, 'enabled'), false);
  assert.equal(restored.controls['theory-blend'], undefined);
  settings.peak = 999;
  assert.equal(preferences.get().theoryFit.peak, 125);
});

test('invalid fit settings do not replace valid cached choices', () => {
  const preferences = createPreferences(null);
  preferences.update({ theoryFit: { duration: 2, peak: 120, impulse: 140, average: 70, window: 15 } });
  preferences.update({ theoryFit: { start: Infinity, duration: -1, peak: NaN, impulse: 0, average: '90', shapeBlend: 2, noiseLevel: -1, areaMode: 'both', window: 16, noiseSource: 'random' } });
  assert.deepEqual(preferences.get().theoryFit, { start: 0, duration: 2, tailStart: null, peak: 120, impulse: 140, average: 70, areaMode: 'impulse', shapeBlend: 1, noiseSource: 'original', noiseLevel: 1, window: 15 });
});

test('reset clears fit settings while leaving project data and language keys alone', () => {
  const values = new Map([['thrust-lab-project-v1', 'profile'], ['thrust-lab-language-v1', 'uk']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const preferences = createPreferences(storage);
  preferences.update({ theoryFit: { duration: 3 } });
  preferences.reset();
  assert.equal(preferences.get().theoryFit, null);
  assert.equal(values.get('thrust-lab-project-v1'), 'profile');
  assert.equal(values.get('thrust-lab-language-v1'), 'uk');
});
