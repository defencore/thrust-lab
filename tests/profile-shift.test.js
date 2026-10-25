import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftProfile } from '../src/profile-shift.js';
import { createBackgroundNoiseSampler } from '../src/background-noise.js';

const recording = () => [0, .1, .4, 1, 1.5, 2].map(time => ({ time, thrust: time <= 1 ? time * 100 : (2 - time) * 100 }));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} should equal ${b}`);

test('positive offsets delay amplitudes by interpolation on the exact irregular grid', () => {
  const points = recording(), original = structuredClone(points);
  const shifted = shiftProfile(points, .2);
  for (const [index, thrust] of [0, 0, 20, 80, 70, 20].entries()) close(shifted[index].thrust, thrust);
  assert.deepEqual(shifted.map(point => point.time), points.map(point => point.time));
  assert.deepEqual(points, original);
  assert.ok(shifted.every((point, index) => point !== points[index]));
});

test('negative offsets advance amplitudes and zero the emptied right edge', () => {
  const shifted = shiftProfile(recording(), -.3);
  for (const [index, thrust] of [30, 40, 70, 70, 20, 0].entries()) close(shifted[index].thrust, thrust);
});

test('zero shift is exact identity and shifts past either end yield zero amplitude', () => {
  const points = recording();
  assert.deepEqual(shiftProfile(points, 0), points);
  for (const offset of [-100, 100, -Number.MAX_VALUE, Number.MAX_VALUE]) assert.ok(shiftProfile(points, offset).every(point => point.thrust === 0));
});

test('selected shifts retain exact outside values and only read sources within that range', () => {
  const points = recording();
  const shifted = shiftProfile(points, .2, { range: [.4, 1.5] });
  for (const [index, thrust] of [0, 10, 0, 80, 70, 0].entries()) close(shifted[index].thrust, thrust);
  assert.deepEqual(shifted[1], points[1]);
  assert.deepEqual(shifted.at(-1), points.at(-1));
});

test('feathered shifts retain boundary forces and smoothly transition into the shifted section', () => {
  const points = Array.from({ length: 21 }, (_, index) => ({ time: index / 10, thrust: 10 + index }));
  const shifted = shiftProfile(points, .3, { range: [.4, 1.6], transition: .25 });
  assert.deepEqual(shifted[4], points[4]);
  assert.deepEqual(shifted[16], points[16]);
  assert.ok(shifted[5].thrust > 0 && shifted[5].thrust < points[5].thrust);
  close(shifted[10].thrust, 17);
  assert.deepEqual(shifted.map(point => point.time), points.map(point => point.time));
});

test('decimal subtraction does not drop source samples at a selected boundary', () => {
  const points = Array.from({ length: 11 }, (_, index) => ({ time: index / 10, thrust: 100 }));
  const shifted = shiftProfile(points, .3, { range: [.4, 1] });
  assert.equal(shifted[7].thrust, 100);
  assert.equal(shifted[6].thrust, 0);
  assert.equal(shiftProfile(points, .30000000000000004, { range: [.4, 1] })[7].thrust, 0);
  assert.equal(shiftProfile(points, Number.MIN_VALUE)[0].thrust, 0);
});

test('invalid data, offsets, ranges and edge transitions fail before source mutation', () => {
  const points = recording(), original = structuredClone(points);
  for (const invalid of [[], [points[0]], [points[0], points[0]], [points[1], points[0]], [{ time: 0, thrust: -1 }, points[1]], [{ time: NaN, thrust: 0 }, points[1]]]) assert.throws(() => shiftProfile(invalid, .1));
  for (const offset of [NaN, Infinity, '1']) assert.throws(() => shiftProfile(points, offset), /finite time offset/);
  for (const range of [[0, 0], [-1, 1], [0, 3], [0, Infinity], Array(2)]) assert.throws(() => shiftProfile(points, .1, { range }), /range/);
  for (const transition of [-.1, .51, NaN, Infinity]) assert.throws(() => shiftProfile(points, .1, { transition }), /edge transition/);
  assert.deepEqual(points, original);
});

const background = () => ({ points: [0, .1, .2, .3, .4, .5, .6].map((time, index) => ({ time, thrust: 1 + index })), duration: .6 });

test('measured background fills only newly vacated samples and leaves shifted data exact', () => {
  const points = recording(), source = background(), saved = structuredClone(source);
  for (const offset of [.2, -.3, 100, -100]) {
    const shifted = shiftProfile(points, offset, { background: source, noiseGain: 2 });
    const replay = createBackgroundNoiseSampler(source, { gain: 2 });
    const zeroFill = shiftProfile(points, offset);
    for (let index = 0; index < points.length; index++) {
      const sourceTime = points[index].time - offset;
      const vacant = sourceTime < points[0].time || sourceTime > points.at(-1).time;
      close(shifted[index].thrust, vacant ? replay(points[index].time - points[0].time) : zeroFill[index].thrust);
      assert.equal(shifted[index].time, points[index].time);
    }
  }
  assert.deepEqual(source, saved);
  assert.deepEqual(shiftProfile(points, 0, { background: source }), points);
  assert.deepEqual(shiftProfile(points, .2, { background: source, noiseGain: 0 }), shiftProfile(points, .2));
});

test('background shifts are deterministic and selected fills retain outside values and feathered edges', () => {
  const points = Array.from({ length: 21 }, (_, index) => ({ time: index / 10, thrust: 10 + index }));
  const options = { range: [.4, 1.6], transition: .25, background: background() };
  const first = shiftProfile(points, .3, options), second = shiftProfile(points, .3, options);
  assert.deepEqual(first, second);
  assert.deepEqual(first[4], points[4]); assert.deepEqual(first[16], points[16]);
  assert.deepEqual(first[3], points[3]); assert.deepEqual(first[17], points[17]);
  assert.ok(first[5].thrust > 0 && first[5].thrust < points[5].thrust);
  close(first[10].thrust, 17);
  assert.deepEqual(first.map(point => point.time), points.map(point => point.time));
});

test('background shift validates noise options before changing data', () => {
  const points = recording(), saved = structuredClone(points);
  assert.throws(() => shiftProfile(points, .2, { background: {} }), /at least 7/);
  for (const noiseGain of [-1, NaN, Infinity, '1']) assert.throws(() => shiftProfile(points, .2, { noiseGain }), /finite and nonnegative/);
  assert.throws(() => shiftProfile(points, .2, { background: background(), noiseGain: Number.MAX_VALUE }), /too large/);
  assert.deepEqual(points, saved);
});
