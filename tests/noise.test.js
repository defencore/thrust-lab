import test from 'node:test';
import assert from 'node:assert/strict';
import { findUneditedRange, captureNoise, applyCapturedNoise } from '../src/noise.js';

const profile = (count = 41) => Array.from({ length: count }, (_, index) => ({ time: index / 10, thrust: 20 + index * 0.4 + (index % 2 ? 0.8 : -0.8) }));
const area = points => points.slice(1).reduce((sum, point, index) => sum + (point.time - points[index].time) * (point.thrust + points[index].thrust) / 2, 0);

test('automatic capture finds the longest unchanged run and excludes the target inclusively', () => {
  const original = profile();
  const points = structuredClone(original);
  points[7].thrust += 2;
  points[30].thrust += 2;
  assert.deepEqual(findUneditedRange(points, original), [0.8, 2.9]);
  assert.deepEqual(findUneditedRange(points, original, [1.2, 2.5]), [3.1, 4]);
  assert.equal(findUneditedRange(points, original, [0, 4]), null);
  assert.equal(findUneditedRange(points, original.slice(1)), null);
});

test('capture extracts signed zero-mean residuals with actual relative timestamps', () => {
  const points = profile();
  const noise = captureNoise(points, structuredClone(points), [0.4, 3.6], { window: 9 });
  assert.deepEqual(noise.range, [0.4, 3.6]);
  assert.equal(noise.samples, 33);
  assert.equal(noise.points[0].time, 0);
  assert.equal(noise.points.at(-1).time, noise.duration);
  assert.ok(Math.abs(area(noise.points)) < 1e-12);
  assert.ok(noise.rms > 0.4 && noise.rms < 1.1);
  assert.ok(noise.peak > 0.5);
  assert.ok(noise.points.some(point => point.thrust < 0));
  assert.ok(noise.points.some(point => point.thrust > 0));
});

test('irregular clean slopes do not create false edge noise', () => {
  const points = Array.from({ length: 25 }, (_, index) => ({ time: index ** 1.3 / 50, thrust: 8 + 3 * index ** 1.3 / 50 }));
  const noise = captureNoise(points, points, [points[0].time, points.at(-1).time]);
  assert.ok(noise.peak < 1e-12);
  assert.ok(noise.rms < 1e-12);
});

test('capture rejects edited source data and changed measurement grids', () => {
  const original = profile();
  const edited = structuredClone(original);
  edited[10].thrust += 1;
  assert.throws(() => captureNoise(edited, original, [0, 2]), /edited measurements/);
  assert.doesNotThrow(() => captureNoise(edited, original, [2, 4]));
  edited[10].time += 0.01;
  assert.throws(() => captureNoise(edited, original, [2, 4]), /timestamp sequence/);
  assert.throws(() => captureNoise(original, original, [0, 0.4]), /at least 7/);
  assert.throws(() => captureNoise(original, original, [0, 2], { window: 4 }), /odd whole/);
});

test('captured noise preserves target timestamps, scope, input values and nonnegative thrust', () => {
  const source = profile();
  const noise = captureNoise(source, source, [0, 2]);
  const target = Array.from({ length: 100 }, (_, index) => ({ time: index * 0.077, thrust: 0.1 }));
  const snapshot = structuredClone(target);
  for (const mode of ['repeat', 'stretch']) {
    const result = applyCapturedNoise(target, noise, { range: [1, 6], gain: 3, mode });
    assert.deepEqual(result.map(point => point.time), target.map(point => point.time));
    assert.ok(result.every(point => point.thrust >= 0 && Number.isFinite(point.thrust)));
    assert.ok(result.some((point, index) => point.thrust !== target[index].thrust));
    for (let index = 0; index < target.length; index += 1) if (target[index].time < 1 || target[index].time > 6) assert.deepEqual(result[index], target[index]);
  }
  assert.deepEqual(target, snapshot);
});

test('stretch maps the captured signal endpoints and timing into the full target span', () => {
  const noise = { points: [{ time: 0, thrust: -2 }, { time: 0.25, thrust: 3 }, { time: 1, thrust: -1 }], duration: 1 };
  const target = [{ time: 10, thrust: 10 }, { time: 11, thrust: 10 }, { time: 14, thrust: 10 }];
  assert.deepEqual(applyCapturedNoise(target, noise, { mode: 'stretch' }).map(point => point.thrust), [8, 13, 9]);
});

test('repeat uses original source timing and joins cycles continuously', () => {
  const noise = { points: [{ time: 0, thrust: -2 }, { time: 0.25, thrust: 3 }, { time: 0.7, thrust: -1 }, { time: 1, thrust: 2 }], duration: 1 };
  const target = [0, 0.25, 0.7, 0.999999, 1, 1.000001, 1.25].map(time => ({ time, thrust: 10 }));
  const result = applyCapturedNoise(target, noise, { mode: 'repeat' });
  assert.equal(result[1].thrust, 13);
  assert.equal(result[2].thrust, 9);
  assert.equal(result[6].thrust, 13);
  assert.ok(Math.abs(result[3].thrust - result[4].thrust) < 0.0001);
  assert.ok(Math.abs(result[4].thrust - result[5].thrust) < 0.0001);
});

test('invalid gain, target bounds and replay modes fail clearly', () => {
  const points = profile();
  const noise = captureNoise(points, points, [0, 2]);
  assert.throws(() => applyCapturedNoise(points, noise, { gain: -1 }), /nonnegative/);
  assert.throws(() => applyCapturedNoise(points, noise, { mode: 'unknown' }), /repeat or stretch/);
  assert.throws(() => applyCapturedNoise(points, noise, { range: [0, 5] }), /within/);
  assert.deepEqual(applyCapturedNoise(points, noise, { gain: 0 }), points);
});
