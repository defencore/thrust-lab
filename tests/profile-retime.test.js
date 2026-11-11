import test from 'node:test';
import assert from 'node:assert/strict';
import { interpolate, metrics } from '../src/profile.js';
import { retimeProfile } from '../src/profile-retime.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

function recording({ irregular = false, offset = 0 } = {}) {
  const template = [
    { time: -.004, thrust: 0 }, { time: 0, thrust: 5 }, { time: .14, thrust: 100 },
    { time: .2, thrust: 95 }, { time: .45, thrust: 80 }, { time: .7, thrust: 76 },
    { time: .88, thrust: 50 }, { time: 1, thrust: 5 }, { time: 1.004, thrust: 0 },
  ];
  return Array.from({ length: 601 }, (_, index) => {
    const localTime = index / 100 + (irregular && index && index < 600 ? Math.sin(index * 1.7) * .0025 : 0);
    const phase = (localTime - .5) / 2.5;
    const texture = phase > .2 && phase < .8 ? Math.sin(phase * 131) * 1.7 : 0;
    return { time: offset + localTime, thrust: Math.max(0, interpolate(template, phase) + texture) };
  });
}

function assertFixedTimes(result, original) {
  assert.equal(result.length, original.length);
  result.forEach((point, index) => assert.ok(Object.is(point.time, original[index].time)));
}

test('a 2.5 s recording stretches to 3.5 s with the same impulse and lower automatic peak', () => {
  const points = recording();
  const original = structuredClone(points);
  const before = metrics(points);
  close(before.burnDuration, 2.5);
  const result = retimeProfile(points, { duration: 3.5 });
  assertFixedTimes(result.points, points);
  assert.deepEqual(points, original);
  close(result.report.achieved.burnStart, before.burnStart);
  close(result.report.achieved.burnDuration, 3.5);
  close(result.report.achieved.impulse, before.impulse);
  close(result.report.achieved.peak, before.peak * 2.5 / 3.5, .001);
  assert.ok(result.report.achieved.peak < before.peak);
  assert.equal(result.report.requested.preserveImpulse, true);
  assert.equal(result.report.requested.automaticPeak, true);
  assert.equal(result.report.shapeExponent, 1);
});

test('stretching preserves the sampled raw shape and its recorded variation without smoothing', () => {
  const points = recording();
  const before = metrics(points);
  const result = retimeProfile(points, { duration: 3.5 });
  const ratios = result.points.filter(point => point.time > 1.3 && point.time < 3).map(point => {
    const sourceTime = before.burnStart + (point.time - before.burnStart) * before.burnDuration / 3.5;
    return point.thrust / interpolate(points, sourceTime);
  });
  ratios.forEach(ratio => close(ratio, ratios[0], 1e-12));
  assert.ok(result.report.shapeError < 1e-12);
});

test('irregular measurements and a nonzero absolute time retain exact timestamps and ignition', () => {
  const points = recording({ irregular: true, offset: 4.084 });
  const before = metrics(points);
  for (const duration of [1.5, 3.5]) {
    const result = retimeProfile(points, { duration });
    assertFixedTimes(result.points, points);
    close(result.report.achieved.burnStart, before.burnStart);
    close(result.report.achieved.burnDuration, duration);
    close(result.report.achieved.impulse, before.impulse);
    assert.ok(result.points.every(point => Number.isFinite(point.thrust) && point.thrust >= 0));
  }
});

test('a custom impulse retains the shape while the peak is calculated automatically', () => {
  const points = recording();
  const result = retimeProfile(points, { duration: 3.5, impulse: 210 });
  close(result.report.achieved.burnDuration, 3.5);
  close(result.report.achieved.impulse, 210);
  assert.equal(result.report.requested.preserveImpulse, false);
  assert.equal(result.report.requested.automaticPeak, true);
  assert.equal(result.report.shapeExponent, 1);
  assert.ok(result.report.shapeError < 1e-12);
});

test('custom peak and impulse are solved together on the unchanged measurement grid', () => {
  const points = recording({ irregular: true });
  const result = retimeProfile(points, { duration: 3.5, impulse: 210, peak: 110 });
  assertFixedTimes(result.points, points);
  close(result.report.achieved.burnDuration, 3.5);
  close(result.report.achieved.impulse, 210);
  close(result.report.achieved.peak, 110);
  assert.equal(result.report.requested.automaticPeak, false);
  assert.notEqual(result.report.shapeExponent, 1);
  assert.ok(result.report.shapeError > 0);
});

test('unchanged targets are an exact identity and return an independent point array', () => {
  const points = recording({ irregular: true });
  const before = metrics(points);
  for (const options of [{}, { duration: before.burnDuration }, { duration: before.burnDuration, impulse: before.impulse, peak: before.peak }]) {
    const result = retimeProfile(points, options);
    assert.deepEqual(result.points, points);
    assert.notEqual(result.points, points);
    assert.notEqual(result.points[0], points[0]);
    assert.deepEqual(result.report.before, result.report.achieved);
    assert.equal(result.report.shapeError, 0);
  }
});

test('an interval outside the existing recording fails without clipping or adding timestamps', () => {
  const points = recording();
  const original = structuredClone(points);
  assert.throws(() => retimeProfile(points, { duration: 8 }), error => error.code === 'TIME_LIMIT' && error.details.maximumEnd === 6);
  assert.deepEqual(points, original);
});

test('incompatible custom targets retain the solver feasible impulse range', () => {
  assert.throws(() => retimeProfile(recording(), { duration: 3.5, impulse: 1e6, peak: 100 }), error => error.code === 'IMPULSE_LIMIT' && error.details.minImpulse > 0 && error.details.maxImpulse < 1e6);
});

test('invalid targets, empty burns, and malformed source measurements fail clearly', () => {
  const points = recording();
  for (const options of [null, [], '3.5']) assert.throws(() => retimeProfile(points, options), error => error.code === 'INVALID_TARGET');
  for (const name of ['duration', 'impulse', 'peak']) for (const value of [0, -1, Infinity, NaN, '3.5']) assert.throws(() => retimeProfile(points, { [name]: value }), error => error.code === 'INVALID_TARGET');
  for (const source of [null, [], points.slice(0, 2)]) assert.throws(() => retimeProfile(source, { duration: 3.5 }), error => error.code === 'INSUFFICIENT_SAMPLES');
  assert.throws(() => retimeProfile(points.map(point => ({ ...point, thrust: 0 })), { duration: 3.5 }), error => error.code === 'EMPTY_PROFILE');
  for (const source of [[null, ...points.slice(1)], [{ ...points[0], thrust: -1 }, ...points.slice(1)], [points[1], points[0], ...points.slice(2)], [{ ...points[0], time: Infinity }, ...points.slice(1)]]) assert.throws(() => retimeProfile(source, { duration: 3.5 }), error => error.code === 'INVALID_PROFILE');
});
