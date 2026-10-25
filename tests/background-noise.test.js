import test from 'node:test';
import assert from 'node:assert/strict';
import { findBackgroundNoise, validateBackgroundNoise, createBackgroundNoiseSampler } from '../src/background-noise.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} should equal ${expected}`);
const points = (times, values) => times.map((time, index) => ({ time, thrust: values[index] }));
const source = () => ({ points: points([0, .1, .2, .3, .4, .5, .6], [1, 2, 3, 4, 5, 6, 7]), duration: .6 });

test('background detection selects the longest exterior quiet interval by physical duration', () => {
  const before = points([10, 10.03, 10.11, 10.19, 10.3, 10.42, 10.59, 10.7], [.6, .8, .3, .7, .4, .8, .5, .6]);
  const after = points([12.1, 12.3, 12.6, 12.9, 13.2, 13.5, 13.8], [.2, .8, .3, .9, .4, .6, .2]);
  const original = [...before, { time: 11, thrust: 100 }, { time: 12, thrust: 10 }, ...after];
  const saved = structuredClone(original), background = findBackgroundNoise(original);
  assert.deepEqual(background.range, [12.1, 13.8]);
  assert.equal(background.samples, after.length);
  assert.equal(background.threshold, 5);
  assert.equal(background.points[0].time, 0);
  assert.equal(background.points.at(-1).time, background.duration);
  assert.deepEqual(background.points.map(point => point.thrust), after.map(point => point.thrust));
  assert.ok(background.mean > .2 && background.mean < .9);
  assert.ok(background.rms > 0);
  assert.deepEqual(original, saved);
  assert.equal(validateBackgroundNoise(background), background);
});

test('quiet candidates exclude low thrust inside the burn and 5% ignition or decay samples', () => {
  const original = Array.from({ length: 35 }, (_, index) => ({ time: index / 10, thrust: index < 6 || index > 28 ? .5 : index < 10 || index > 24 ? 5 : index === 10 || index === 24 ? 100 : .4 }));
  assert.equal(findBackgroundNoise(original), null);
  original.unshift({ time: -.1, thrust: .7 });
  const background = findBackgroundNoise(original);
  assert.deepEqual(background.range, [-.1, .5]);
  assert.ok(background.points.every(point => point.thrust < 5));
});

test('missing and short quiet recordings return no source without inventing noise', () => {
  assert.equal(findBackgroundNoise([]), null);
  assert.equal(findBackgroundNoise(Array.from({ length: 6 }, (_, time) => ({ time, thrust: 0 }))), null);
  assert.equal(findBackgroundNoise(Array.from({ length: 20 }, (_, time) => ({ time, thrust: 100 }))), null);
});

test('all-zero and constant nonzero quiet sources honestly report zero AC noise', () => {
  const zeros = Array.from({ length: 7 }, (_, index) => ({ time: index * .13, thrust: 0 }));
  const silent = findBackgroundNoise(zeros);
  assert.equal(silent.mean, 0); assert.equal(silent.rms, 0);
  assert.equal(createBackgroundNoiseSampler(silent)(100), 0);
  const flat = findBackgroundNoise([...zeros.map(point => ({ ...point, thrust: .4 })), { time: 1, thrust: 100 }]);
  assert.equal(flat.rms, 0); assert.equal(flat.mean, .4);
  assert.equal(createBackgroundNoiseSampler(flat)(100), .4);
});

test('mean and AC RMS use physical irregular durations with exact linear-segment integration', () => {
  const original = points([0, .01, .04, .1, .3, .8, 1], [0, .01, .04, .1, .3, .8, 1]);
  original.push({ time: 2, thrust: 100 });
  const background = findBackgroundNoise(original);
  close(background.mean, .5);
  close(background.rms, Math.sqrt(1 / 12));
});

test('mirrored replay interpolates at elapsed physical time and is continuous at both loop turns', () => {
  const background = source(), saved = structuredClone(background), replay = createBackgroundNoiseSampler(background);
  close(replay(.15), 2.5); close(replay(.75), 5.5); close(replay(1.35), 2.5);
  assert.equal(replay(.6), 7); assert.equal(replay(1.2), 1);
  close(replay(.6 - 1e-6), replay(.6 + 1e-6));
  close(replay(1.2 - 1e-6), replay(1.2 + 1e-6));
  close(replay(-.15), replay(.15));
  assert.equal(replay(100), replay(100));
  close(createBackgroundNoiseSampler(background, { gain: 2 })(.15), 5);
  assert.equal(createBackgroundNoiseSampler(background, { gain: 0 })(.15), 0);
  assert.deepEqual(background, saved);
});

test('background validation rejects malformed data, inconsistent metadata and overflowing gain', () => {
  assert.throws(() => findBackgroundNoise(null), /array/);
  for (const original of [[{ time: NaN, thrust: 0 }], [{ time: 0, thrust: -1 }], [{ time: 0, thrust: 0 }, { time: 0, thrust: 1 }]]) assert.throws(() => findBackgroundNoise(original), /Background measurements/);
  assert.throws(() => findBackgroundNoise([{ time: -Number.MAX_VALUE, thrust: 0 }, { time: Number.MAX_VALUE, thrust: 0 }]), /timeline/);
  for (const invalid of [null, {}, { points: source().points.slice(1), duration: .6 }]) assert.throws(() => validateBackgroundNoise(invalid), /at least 7/);
  for (const invalid of [{ ...source(), duration: .7 }, { ...source(), points: source().points.map(point => ({ ...point, time: point.time + 1 })) }]) assert.throws(() => validateBackgroundNoise(invalid), /relative timestamps starting at zero/);
  for (const invalid of [{ ...source(), points: source().points.map(point => ({ ...point, thrust: -1 })) }, { ...source(), points: source().points.map(point => ({ ...point, time: 0 })) }]) assert.throws(() => validateBackgroundNoise(invalid), /Background samples/);
  for (const metadata of [{ samples: 8 }, { range: [0, 1] }, { rms: Infinity }, { mean: -1 }, { threshold: NaN }]) assert.throws(() => validateBackgroundNoise({ ...source(), ...metadata }), /metadata/);
  for (const gain of [-1, NaN, Infinity, '1']) assert.throws(() => createBackgroundNoiseSampler(source(), { gain }), /finite and nonnegative/);
  assert.throws(() => createBackgroundNoiseSampler(source(), { gain: Number.MAX_VALUE }), /too large/);
  assert.throws(() => createBackgroundNoiseSampler(source())(Infinity), /replay time/);
});

test('detection and replay remain finite for subnormal thrust and very long finite timelines', () => {
  const original = Array.from({ length: 7 }, (_, time) => ({ time, thrust: 0 }));
  original.push({ time: 7, thrust: Number.MIN_VALUE });
  const quiet = findBackgroundNoise(original);
  assert.ok(quiet); assert.equal(quiet.rms, 0);
  const background = { points: Array.from({ length: 7 }, (_, index) => ({ time: index / 6 * Number.MAX_VALUE, thrust: 1 + index })), duration: Number.MAX_VALUE };
  close(createBackgroundNoiseSampler(background)(Number.MAX_VALUE), 7);
});
