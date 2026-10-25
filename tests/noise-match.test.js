import test from 'node:test';
import assert from 'node:assert/strict';
import { captureNoise } from '../src/noise.js';
import { findAdjacentNoiseRange, matchNoise } from '../src/noise-match.js';

const noisy = (amplitude, count = 101) => Array.from({ length: count }, (_, index) => ({
  time: index * .01,
  thrust: 30 + index * .03 + (index % 2 ? amplitude : -amplitude),
}));
const source = noisy(.4);
const reference = captureNoise(source, source, [0, 1], { window: 15 });
const mean = points => points.slice(1).reduce((sum, point, index) => sum + (point.time - points[index].time) * (point.thrust / 2 + points[index].thrust / 2), 0) / (points.at(-1).time - points[0].time);

test('matching replaces excessive target noise rather than adding another noise layer', () => {
  const target = noisy(4);
  const result = matchNoise(target, reference, { transition: 0 });
  assert.ok(result.report.beforeRms > 3);
  assert.ok(result.report.afterRms < result.report.beforeRms * .2);
  assert.ok(result.report.afterRms > .25 && result.report.afterRms < .6);
  assert.ok(Math.abs(mean(result.points) - mean(target)) < 1e-10);
  assert.equal(result.report.gain, 1);
  assert.equal(result.report.samples, target.length);
});

test('matching brings a quiet target to the recorded source noise scale', () => {
  const target = noisy(0);
  const result = matchNoise(target, reference, { transition: 0 });
  assert.ok(result.report.beforeRms < 1e-12);
  assert.ok(result.report.afterRms > .25 && result.report.afterRms < .6);
  assert.ok(Math.abs(result.report.sourceRms - reference.rms) < 1e-12);
  const stronger = matchNoise(target, reference, { gain: 2, transition: 0 });
  assert.ok(Math.abs(stronger.report.afterRms / result.report.afterRms - 2) < 1e-10);
});

test('selected matching retains exact timestamps, unchanged exterior and smooth boundaries', () => {
  const target = noisy(2);
  const targetCopy = structuredClone(target);
  const referenceCopy = structuredClone(reference);
  const result = matchNoise(target, reference, { range: [.2, .8], transition: .2 });
  assert.deepEqual(result.points.map(point => point.time), target.map(point => point.time));
  for (let index = 0; index < target.length; index += 1) {
    if (target[index].time <= .2 || target[index].time >= .8) assert.deepEqual(result.points[index], target[index]);
  }
  assert.ok(result.points.some((point, index) => point.thrust !== target[index].thrust));
  assert.deepEqual(target, targetCopy);
  assert.deepEqual(reference, referenceCopy);
});

test('repeat retains source timing while stretch fits a whole source pattern to target duration', () => {
  const captured = {
    points: [{ time: 0, thrust: 0 }, { time: .1, thrust: 2 }, { time: .2, thrust: 0 }, { time: .3, thrust: -2 }, { time: .4, thrust: 0 }],
    duration: .4,
  };
  const target = Array.from({ length: 41 }, (_, index) => ({ time: index * .02, thrust: 30 }));
  const repeated = matchNoise(target, captured, { window: 3, transition: 0 });
  const stretched = matchNoise(target, captured, { window: 3, transition: 0, mode: 'stretch' });
  assert.ok(Math.abs(repeated.points[5].thrust - repeated.points[25].thrust) < 1e-10);
  assert.ok(stretched.points[10].thrust > stretched.points[30].thrust);
  assert.notDeepEqual(repeated.points, stretched.points);
});

test('zero gain removes target residuals and zero-noise references remain usable', () => {
  const target = noisy(3);
  const removed = matchNoise(target, reference, { gain: 0, transition: 0 });
  assert.ok(removed.report.afterRms < removed.report.beforeRms * .05);
  const quiet = noisy(0);
  const zero = captureNoise(quiet, quiet, [0, 1]);
  const result = matchNoise(target, zero, { transition: 0 });
  assert.ok(result.report.afterRms < .1);
});

test('matching clips only final physical thrust and supports irregular sampling', () => {
  const irregular = Array.from({ length: 40 }, (_, index) => ({ time: index ** 1.2 / 100, thrust: .05 + (index % 2 ? .02 : 0) }));
  const result = matchNoise(irregular, reference, { gain: 3, mode: 'stretch', range: [.08, .6] });
  assert.deepEqual(result.points.map(point => point.time), irregular.map(point => point.time));
  assert.ok(result.points.every(point => point.thrust >= 0 && Number.isFinite(point.thrust)));
  assert.ok(Number.isFinite(result.report.afterRms));
});

test('matching rejects invalid references, target ranges, counts, gains and options', () => {
  const target = noisy(1);
  assert.throws(() => matchNoise(target, null), /Capture a noise source/);
  assert.throws(() => matchNoise(target, { points: reference.points, duration: -1 }), /positive duration/);
  assert.throws(() => matchNoise(target, reference, { gain: -1 }), /nonnegative/);
  assert.throws(() => matchNoise(target, reference, { gain: Infinity }), /finite/);
  assert.throws(() => matchNoise(target, reference, { transition: .6 }), /50 percent/);
  assert.throws(() => matchNoise(target, reference, { mode: 'invalid' }), /repeat or stretch/);
  assert.throws(() => matchNoise(target, reference, { range: [0, 1.1] }), /within/);
  assert.throws(() => matchNoise(target, reference, { range: [0, .04] }), /at least 7/);
  assert.throws(() => matchNoise(target, reference, { window: 4 }), /odd/);
});

test('automatic neighbouring source selection finds closest unchanged recording and side overrides', () => {
  const original = noisy(.4);
  const edited = structuredClone(original);
  for (let index = 30; index <= 65; index += 1) edited[index].thrust += 2;
  assert.deepEqual(findAdjacentNoiseRange(edited, original, [.4, .6]), [.66, 1]);
  assert.deepEqual(findAdjacentNoiseRange(edited, original, [.4, .6], 'after'), [.66, 1]);
  assert.deepEqual(findAdjacentNoiseRange(edited, original, [.4, .6], 'before'), [0, .29]);
  assert.equal(findAdjacentNoiseRange(edited, original, [0, 1]), null);
});

test('neighbour source ranges are capped near the edit and skip short unchanged islands', () => {
  const original = noisy(.4, 1001);
  const edited = structuredClone(original);
  for (let index = 400; index <= 600; index += 1) edited[index].thrust += 1;
  assert.deepEqual(findAdjacentNoiseRange(edited, original, [4, 6], 'before'), [2, 3.99]);
  assert.deepEqual(findAdjacentNoiseRange(edited, original, [4, 6], 'after'), [6.01, 8]);
  edited[393].thrust += 1;
  assert.deepEqual(findAdjacentNoiseRange(edited, original, [4, 6], 'before'), [1.93, 3.92]);
  assert.equal(findAdjacentNoiseRange(edited, original.slice(1), [4, 6]), null);
  assert.throws(() => findAdjacentNoiseRange(edited, original, [4, 6], 'left'), /before, after/);
});
