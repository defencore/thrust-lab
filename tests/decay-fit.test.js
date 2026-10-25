import test from 'node:test';
import assert from 'node:assert/strict';
import { fitDecayStart } from '../src/decay-fit.js';
import { generateProfile, interpolate, metrics } from '../src/profile.js';
import { captureNoise } from '../src/noise.js';

function recording() {
  const generated = generateProfile({ peak: 85, duration: 3, interval: .01, shape: 'neutral', noise: .025, seed: 'decay-recording' }).points;
  return Array.from({ length: 701 }, (_, index) => ({ time: index / 100, thrust: interpolate(generated, index / 100 - 2) }));
}

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} should equal ${expected}`);

test('moving decay onset preserves the actual measured peak, burn start, duration and fixed sample grid', () => {
  const original = recording(), measured = metrics(original);
  for (const tailStart of [.8, 1.4]) {
    const result = fitDecayStart(original, tailStart);
    const after = metrics(result);
    close(after.peak, measured.peak);
    close(after.burnStart, measured.burnStart);
    close(after.burnEnd, measured.burnEnd);
    close(after.burnDuration, measured.burnDuration);
    assert.deepEqual(result.map(point => point.time), original.map(point => point.time));
    assert.ok(result.every(point => Number.isFinite(point.thrust) && point.thrust >= 0 && point.thrust <= measured.peak));
    assert.ok(result.every((point, index) => point !== original[index]));
    for (const point of result) if (point.time < measured.burnStart || point.time > measured.burnEnd) assert.ok(point.thrust < measured.peak * .05);
    assert.ok(captureNoise(result, result, [measured.burnStart + .3, measured.burnEnd - .3], { window: 15 }).rms > .05);
  }
});

test('different decay times change the curve and its impulse without compounding repeated inputs', () => {
  const original = recording(), before = structuredClone(original);
  const early = fitDecayStart(original, .8);
  const later = fitDecayStart(original, 1.4);
  assert.notDeepEqual(later, early);
  assert.ok(Math.abs(metrics(early).impulse - metrics(later).impulse) > 1);
  assert.deepEqual(fitDecayStart(original, .8), early);
  assert.deepEqual(original, before);
});

test('frozen recordings can be reused and retain their quiet prelude and postlude', () => {
  const points = Object.freeze(recording().map(Object.freeze));
  const result = fitDecayStart(points, 1.4);
  for (let index = 0; index < points.length; index++) if (points[index].time < 1 || points[index].time > 6) assert.deepEqual(result[index], points[index]);
  assert.ok(metrics(result).peak > 0);
});

test('zero-thrust, invalid thrust and invalid time grids fail without modifying the source', () => {
  const original = recording();
  assert.throws(() => fitDecayStart(original.map(point => ({ ...point, thrust: 0 })), 1), /positive thrust/);
  for (const thrust of [-1, NaN, Infinity]) {
    const invalid = structuredClone(original);
    invalid[200].thrust = thrust;
    assert.throws(() => fitDecayStart(invalid, 1));
    assert.equal(invalid[200].thrust, thrust);
  }
  const duplicate = structuredClone(original);
  duplicate[200].time = duplicate[199].time;
  assert.throws(() => fitDecayStart(duplicate, 1), /strictly increasing/);
  for (const tailStart of [0, -1, Infinity, metrics(original).burnDuration]) assert.throws(() => fitDecayStart(original, tailStart));
});
