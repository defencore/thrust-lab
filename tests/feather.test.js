import test from 'node:test';
import assert from 'node:assert/strict';
import { blendSelection, fitWithFeather } from '../src/feather.js';
import { interpolate, transform } from '../src/profile.js';

const points = times => times.map(time => ({ time, thrust: 20 + time }));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} should equal ${expected}`);

test('selected gain has exact unchanged boundaries and full proportional gain in the center', () => {
  const original = points([0, 1, 1.5, 2, 3, 4, 4.5, 5, 6]);
  const edited = original.map(point => ({ ...point, thrust: point.thrust * 2 }));
  const result = blendSelection(original, edited, [1, 5], 0.25);
  assert.equal(result[0].thrust, original[0].thrust);
  assert.equal(result[1].thrust, original[1].thrust);
  close(result[2].thrust, original[2].thrust * 1.5);
  for (const index of [3, 4, 5]) assert.equal(result[index].thrust, edited[index].thrust);
  close(result[6].thrust, original[6].thrust * 1.5);
  assert.equal(result[7].thrust, original[7].thrust);
  assert.equal(result[8].thrust, original[8].thrust);
});

test('irregular time grids use elapsed time rather than sample position', () => {
  const original = points([0, 0.02, 0.1, 0.3, 0.55, 0.9, 0.98, 1]);
  const edited = original.map(point => ({ ...point, thrust: point.thrust + 10 }));
  const result = blendSelection(original, edited, [0, 1], 0.2);
  const alpha = 0.1 ** 2 * (3 - 2 * 0.1);
  close(result[1].thrust, original[1].thrust + alpha * 10);
  close(result[2].thrust, original[2].thrust + 5);
  assert.equal(result[3].thrust, edited[3].thrust);
  assert.equal(result[4].thrust, edited[4].thrust);
  close(result[6].thrust, original[6].thrust + alpha * 10);
});

test('zero transition applies the inclusive selection and whole-profile edits remain uniform', () => {
  const original = points([0, 1, 2, 3, 4]);
  const edited = original.map(point => ({ ...point, thrust: point.thrust * 0.6 }));
  const selected = blendSelection(original, edited, [1, 3], 0);
  assert.deepEqual(selected.map(point => point.thrust), [original[0].thrust, edited[1].thrust, edited[2].thrust, edited[3].thrust, original[4].thrust]);
  const full = blendSelection(original, edited, null, 0.5);
  assert.deepEqual(full, edited);
  assert.notEqual(full, edited);
  assert.ok(full.every((point, index) => point !== edited[index]));
});

test('half-width transitions meet at the center without renormalizing the result', () => {
  const original = points([0, 0.25, 0.5, 0.75, 1]);
  const edited = original.map(point => ({ ...point, thrust: 0 }));
  const result = blendSelection(original, edited, [0, 1], 0.5);
  assert.equal(result[0].thrust, original[0].thrust);
  close(result[1].thrust, original[1].thrust / 2);
  assert.equal(result[2].thrust, 0);
  close(result[3].thrust, original[3].thrust / 2);
  assert.equal(result[4].thrust, original[4].thrust);
});

test('blending preserves exact timestamps and never mutates either input', () => {
  const original = points([0.000001, 0.00123456789, 0.5, 1.345678901, 2]);
  const edited = original.map(point => ({ ...point, thrust: point.thrust + 5 }));
  const beforeOriginal = structuredClone(original);
  const beforeEdited = structuredClone(edited);
  const result = blendSelection(original, edited, [0.001, 1.9]);
  assert.deepEqual(result.map(point => point.time), original.map(point => point.time));
  assert.deepEqual(original, beforeOriginal);
  assert.deepEqual(edited, beforeEdited);
  assert.ok(result.every((point, index) => point !== original[index] && point !== edited[index]));
});

test('invalid measurement grids, values, ranges, and transition fractions fail clearly', () => {
  const original = points([0, 1, 2]);
  assert.throws(() => blendSelection([], original, null), /at least two samples/);
  assert.throws(() => blendSelection(original, original.slice(1), null), /timestamp sequence/);
  assert.throws(() => blendSelection(original, [{ time: 0, thrust: 1 }, { time: 0.5, thrust: 1 }, { time: 2, thrust: 1 }], null), /timestamp sequence/);
  assert.throws(() => blendSelection(original, original.map(point => ({ ...point, thrust: -1 })), null), /nonnegative thrust/);
  assert.throws(() => blendSelection([{ time: 0, thrust: 1 }, { time: 0, thrust: 2 }], original.slice(1), null), /strictly increasing/);
  for (const feather of [-0.1, 0.6, NaN, Infinity, '0.15']) assert.throws(() => blendSelection(original, original, [0, 2], feather), /finite fraction/);
  for (const range of [[1, 1], [2, 1], [0, Infinity], [-1, 1], [0, 3], ['0', 1], [0]]) assert.throws(() => blendSelection(original, original, range), /range/);
});

const selectedArea = (profile, range) => {
  const samples = [{ time: range[0], thrust: interpolate(profile, range[0]) }, ...profile.filter(point => point.time > range[0] && point.time < range[1]), { time: range[1], thrust: interpolate(profile, range[1]) }];
  return samples.slice(1).reduce((area, point, index) => area + (point.time - samples[index].time) * (point.thrust / 2 + samples[index].thrust / 2), 0);
};

test('smooth peak fitting reaches a feasible target while preserving edges and timestamps', () => {
  const original = points([0, 1, 1.25, 1.5, 2, 2.5, 2.75, 3, 4]);
  const result = fitWithFeather(original, { type: 'fit-peak', target: 60, range: [1, 3], feather: 0.25 });
  close(Math.max(...result.filter(point => point.time >= 1 && point.time <= 3).map(point => point.thrust)), 60);
  for (const index of [0, 1, 7, 8]) assert.deepEqual(result[index], original[index]);
  assert.deepEqual(result.map(point => point.time), original.map(point => point.time));
  assert.ok(result[2].thrust > original[2].thrust && result[2].thrust < original[2].thrust * (60 / original[5].thrust));
});

test('smooth impulse fitting integrates interpolated selection bounds on irregular timestamps', () => {
  const original = points([0, 0.15, 0.37, 0.52, 0.8, 1.05, 1.4, 1.8, 2]);
  const range = [0.2, 1.7];
  const result = fitWithFeather(original, { type: 'fit-impulse', target: 60, range, feather: 0.3 });
  close(selectedArea(result, range), 60);
  for (let index = 0; index < original.length; index++) if (original[index].time < range[0] || original[index].time > range[1]) assert.deepEqual(result[index], original[index]);
  assert.deepEqual(result.map(point => point.time), original.map(point => point.time));
});

test('smooth fitting rejects targets below fixed edge contributions', () => {
  const original = points([0, 1, 1.5, 2, 2.5, 3, 4]);
  assert.throws(() => fitWithFeather(original, { type: 'fit-peak', target: 10, range: [1, 3], feather: 0.25 }), /peak target cannot be reached/);
  assert.throws(() => fitWithFeather(original, { type: 'fit-impulse', target: 1, range: [1, 3], feather: 0.25 }), /impulse target cannot be reached/);
  assert.throws(() => fitWithFeather(original, { type: 'fit-peak', target: 50, range: [1, 1.5], feather: 0.25 }), /peak target cannot be reached/);
});

test('same-target smooth fitting leaves the curve unchanged and delegates unfeathered fits', () => {
  const original = points([0, 1, 2, 3, 4]);
  const saved = structuredClone(original);
  assert.deepEqual(fitWithFeather(original, { type: 'fit-peak', target: 23, range: [1, 3] }), original);
  assert.deepEqual(fitWithFeather(original, { type: 'fit-impulse', target: selectedArea(original, [1, 3]), range: [1, 3] }), original);
  for (const type of ['fit-peak', 'fit-impulse']) {
    assert.deepEqual(fitWithFeather(original, { type, target: 50, range: null }), transform(original, { type, target: 50, range: null }));
    assert.deepEqual(fitWithFeather(original, { type, target: 50, range: [1, 3], feather: 0 }), transform(original, { type, target: 50, range: [1, 3] }));
  }
  assert.deepEqual(original, saved);
});
