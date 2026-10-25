import test from 'node:test';
import assert from 'node:assert/strict';
import { textureFromOriginal, applyRecordingTexture } from '../src/profile-texture.js';
import { metrics } from '../src/profile.js';

function recording() {
  return fitted().map((point, index) => ({ time: point.time, thrust: point.thrust / 2 * (1 + .04 * Math.sin(index * 2.3) + .02 * Math.cos(index * .9)) }));
}

function fitted() {
  return Array.from({ length: 201 }, (_, index) => {
    const time = index * .05 - 1;
    const thrust = time <= 0 || time >= 5 ? 0 : time < .5 ? time * 200 : time < 1 ? 100 - (time - .5) * 40 : time < 4.5 ? 80 : (5 - time) * 160;
    return { time, thrust };
  });
}

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} should equal ${expected}`);

test('automatic extraction uses the original active interior and stays reusable after every working sample changes', () => {
  const original = recording();
  const before = structuredClone(original);
  const reference = textureFromOriginal(original);
  assert.ok(reference.range[0] > .5 && reference.range[1] < 4.5);
  assert.ok(reference.samples >= 7 && reference.rms > .1);
  const completelyEdited = fitted().map(point => ({ ...point, thrust: point.thrust * 1.3 }));
  const result = applyRecordingTexture(completelyEdited, original, { reference });
  assert.ok(result.report.appliedRms > .1);
  assert.deepEqual(original, before);
});

test('texture preserves calibrated peak, impulse, exact five-percent burn crossings and zero support', () => {
  const clean = fitted(), original = recording();
  const cleanBefore = structuredClone(clean), originalBefore = structuredClone(original);
  const result = applyRecordingTexture(clean, original, { gain: 2 });
  assert.deepEqual(result.points.map(point => point.time), clean.map(point => point.time));
  assert.equal(result.report.after.peak, result.report.before.peak);
  close(result.report.after.impulse, result.report.before.impulse, 1e-12);
  assert.equal(result.report.after.burnStart, result.report.before.burnStart);
  assert.equal(result.report.after.burnEnd, result.report.before.burnEnd);
  assert.equal(result.report.after.burnDuration, result.report.before.burnDuration);
  close(result.report.after.burnAverage, result.report.after.impulse / result.report.after.burnDuration);
  for (let index = 0; index < clean.length; index++) {
    assert.ok(result.points[index].thrust >= 0 && result.points[index].thrust <= 100);
    if (!clean[index].thrust) assert.equal(result.points[index].thrust, 0);
  }
  assert.ok(result.report.appliedRms > 0);
  assert.deepEqual(clean, cleanBefore);
  assert.deepEqual(original, originalBefore);
});

test('recording texture scales relative to the fitted peak and repeated gain changes do not accumulate', () => {
  const clean = fitted(), original = recording();
  const reference = textureFromOriginal(original);
  const first = applyRecordingTexture(clean, original, { reference, gain: 1 });
  const doubledFit = clean.map(point => ({ ...point, thrust: point.thrust * 2 }));
  const doubled = applyRecordingTexture(doubledFit, original, { reference, gain: 1 });
  close(doubled.report.sourceRms, first.report.sourceRms * 2);
  close(doubled.report.appliedRms, first.report.appliedRms * 2);
  for (let index = 0; index < clean.length; index++) close(doubled.points[index].thrust, first.points[index].thrust * 2);
  const louder = applyRecordingTexture(clean, original, { reference, gain: 3 });
  assert.notDeepEqual(louder.points, first.points);
  assert.deepEqual(applyRecordingTexture(clean, original, { reference, gain: 1 }).points, first.points);
  assert.deepEqual(applyRecordingTexture(clean, original, { reference, gain: 0 }).points, clean);
});

test('an irregular target range retains exterior data and whole-profile impulse', () => {
  const clean = fitted().map((point, index) => ({ time: point.time + index * index * 1e-6, thrust: point.thrust }));
  const original = recording();
  const result = applyRecordingTexture(clean, original, { range: [1.23, 3.78], gain: 3, mode: 'stretch' });
  for (let index = 0; index < clean.length; index++) if (clean[index].time < 1.23 || clean[index].time > 3.78) assert.deepEqual(result.points[index], clean[index]);
  close(metrics(result.points).impulse, metrics(clean).impulse, 1e-12);
  assert.equal(result.report.after.burnStart, result.report.before.burnStart);
  assert.equal(result.report.after.burnEnd, result.report.before.burnEnd);
  assert.ok(result.report.appliedRms > 0);
});

test('large texture stays below the five-percent threshold outside the original burn crossings', () => {
  const clean = fitted();
  clean[10].thrust = 4.9;
  clean[150].thrust = 4.9;
  const result = applyRecordingTexture(clean, recording(), { gain: 100 });
  const { burnStart, burnEnd } = result.report.before;
  const threshold = result.report.before.peak * .05;
  for (const point of result.points) if (point.time < burnStart || point.time > burnEnd) assert.ok(point.thrust < threshold);
  assert.equal(result.report.after.burnStart, burnStart);
  assert.equal(result.report.after.burnEnd, burnEnd);
  close(result.report.after.impulse, result.report.before.impulse, 1e-12);
  assert.equal(result.report.limited, true);
  assert.ok(result.report.notes.length > 0);
});

test('a saturated plateau honestly reports that no texture fits its locked peak and impulse', () => {
  const clean = fitted().map(point => ({ ...point, thrust: 50 }));
  const result = applyRecordingTexture(clean, recording(), { gain: 4 });
  assert.ok(result.report.sourceRms > .1);
  assert.ok(result.report.appliedRms < 1e-10);
  assert.equal(result.report.limited, true);
  close(result.report.after.impulse, result.report.before.impulse, 1e-12);
  assert.equal(result.report.after.peak, 50);
});

test('turning metric preservation off allows the requested texture to change the fitted peak', () => {
  const clean = fitted().map(point => ({ ...point, thrust: 50 }));
  const result = applyRecordingTexture(clean, recording(), { gain: 4, preserveMetrics: false });
  assert.ok(result.report.appliedRms > 0);
  assert.ok(result.report.after.peak > 50);
  assert.deepEqual(result.points.map(point => point.time), clean.map(point => point.time));
});

test('short and quiet recordings have explicit, safe extraction behavior', () => {
  assert.throws(() => textureFromOriginal(recording().slice(0, 6)), /At least 7/);
  const sparse = Array.from({ length: 7 }, (_, index) => ({ time: index, thrust: index === 3 ? 10 : 0 }));
  assert.deepEqual(textureFromOriginal(sparse).range, [0, 6]);
  for (const original of [sparse, recording().slice(30, 36)]) {
    const result = applyRecordingTexture(fitted(), original);
    assert.deepEqual(result.points, fitted());
    assert.equal(result.report.limited, true);
    assert.ok(result.report.notes.length > 0);
  }
  const quiet = fitted().map(point => ({ ...point, thrust: 0 }));
  const result = applyRecordingTexture(fitted(), quiet);
  assert.deepEqual(result.points, fitted());
  assert.equal(result.report.appliedRms, 0);
  assert.equal(result.report.sourceRms, 0);
});

test('invalid texture parameters fail without modifying the recording or fitted profile', () => {
  const clean = fitted(), original = recording();
  const before = JSON.stringify({ clean, original });
  for (const options of [{ gain: -1 }, { gain: Infinity }, { mode: 'other' }, { window: 4 }, { transition: .6 }, { preserveMetrics: 'yes' }, { range: [2, 1] }, { sourceRange: [-10, 2] }]) assert.throws(() => applyRecordingTexture(clean, original, options));
  assert.equal(JSON.stringify({ clean, original }), before);
});
