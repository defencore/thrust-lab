import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrateProfile } from '../src/theory-fit.js';
import { metrics } from '../src/profile.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * tolerance, `${actual} should equal ${expected}`);
const theory = () => [{ time: 0, thrust: 0 }, { time: .2, thrust: 10 }, { time: .5, thrust: 8 }, { time: .8, thrust: 5 }, { time: 1, thrust: 0 }];
const recording = () => Array.from({ length: 501 }, (_, index) => ({ time: index / 100, thrust: index < 50 || index > 350 ? 0 : 50 * Math.sin(Math.PI * (index - 50) / 300) }));

test('joint fitting meets peak, impulse and exact 5% burn duration on fixed timestamps', () => {
  const points = recording(), source = theory();
  const before = structuredClone(points), sourceBefore = structuredClone(source);
  const fitted = calibrateProfile(points, source, { start: 1, duration: 2, peak: 100, impulse: 100 });
  close(fitted.report.achieved.start, 1);
  close(fitted.report.achieved.duration, 2);
  close(fitted.report.achieved.peak, 100);
  close(fitted.report.achieved.impulse, 100);
  close(fitted.report.achieved.average, 50);
  close(metrics(fitted.points).burnDuration, 2);
  assert.deepEqual(fitted.points.map(point => point.time), points.map(point => point.time));
  assert.deepEqual(points, before);
  assert.deepEqual(source, sourceBefore);
  assert.deepEqual(fitted.reference, fitted.points);
  assert.ok(fitted.reference.every((point, index) => point !== fitted.points[index]));
});

test('mean burn thrust derives the coupled impulse while an omitted peak preserves theory shape', () => {
  const fitted = calibrateProfile(recording(), theory(), { start: 1, duration: 2, average: 40 });
  close(fitted.report.achieved.impulse, 80);
  close(fitted.report.achieved.average, 40);
  assert.equal(fitted.report.shapeExponent, 1);
  assert.equal(fitted.report.requested.peak, null);
  const paired = calibrateProfile(recording(), theory(), { start: 1, duration: 2, peak: 100, impulse: 100, average: 50 });
  close(paired.report.achieved.impulse, 100);
  assert.throws(() => calibrateProfile(recording(), theory(), { start: 1, duration: 2, peak: 100, impulse: 100, average: 60 }), error => error.code === 'INCONSISTENT_TARGETS');
});

test('irregular measurements retain exact requested threshold crossings and joint amplitude targets', () => {
  const points = [0, .1, .24, .41, .6, .9, 1.2, 1.56, 1.9, 2.2, 2.51, 2.7, 3.1].map((time, index) => ({ time, thrust: index ? 10 + index % 3 : 0 }));
  const base = calibrateProfile(points, theory(), { start: .37, duration: 2.11, peak: 70 });
  const target = (base.report.feasible.minImpulse + base.report.feasible.maxImpulse) / 2;
  const fitted = calibrateProfile(points, theory(), { start: .37, duration: 2.11, peak: 70, impulse: target });
  close(fitted.report.achieved.start, .37);
  close(fitted.report.achieved.duration, 2.11);
  close(fitted.report.achieved.peak, 70);
  close(fitted.report.achieved.impulse, target);
  assert.deepEqual(fitted.points.map(point => point.time), points.map(point => point.time));
});

test('pure theoretical shaping retains its recognizable rise, peak and decay', () => {
  const fitted = calibrateProfile(recording(), theory(), { start: 1, duration: 2, peak: 100 });
  assert.equal(fitted.report.shapeExponent, 1);
  assert.ok(fitted.report.shapeError < 1e-12);
  const at = time => fitted.points.find(point => point.time === time).thrust;
  assert.ok(at(1.2) < at(1.5));
  assert.ok(at(1.5) > at(2));
  assert.ok(at(2) > at(2.5));
  assert.ok(fitted.points.filter(point => point.time < 1 || point.time > 3).every(point => point.thrust < 5));
});

test('shape blend chooses working or theoretical contour before coordinated target fitting', () => {
  const options = { start: 1, duration: 2, peak: 100 };
  const theoretical = calibrateProfile(recording(), theory(), { ...options, shapeBlend: 1 });
  const working = calibrateProfile(recording(), theory(), { ...options, shapeBlend: 0 });
  const peakTime = points => points.reduce((highest, point) => point.thrust > highest.thrust ? point : highest).time;
  assert.ok(peakTime(theoretical.points) < peakTime(working.points));
  for (const fitted of [theoretical, working]) {
    close(fitted.report.achieved.duration, 2);
    close(fitted.report.achieved.peak, 100);
    assert.equal(fitted.report.shapeExponent, 1);
  }
});

test('an empty working signal can adopt a theoretical shape and defaults use theory burn duration', () => {
  const points = recording().map(point => ({ ...point, thrust: 0 }));
  const fitted = calibrateProfile(points, theory(), { shapeBlend: 0, peak: 100 });
  close(fitted.report.achieved.start, 0);
  close(fitted.report.achieved.duration, metrics(theory()).burnDuration);
  close(fitted.report.achieved.peak, 100);
  assert.match(fitted.report.notes.join(' '), /working profile has no positive thrust/);
});

test('the two reachable impulse limits are reported accurately and attainable', () => {
  const options = { start: 1, duration: 2, peak: 100 };
  const base = calibrateProfile(recording(), theory(), options);
  for (const impulse of [base.report.feasible.minImpulse, base.report.feasible.maxImpulse]) {
    const fitted = calibrateProfile(recording(), theory(), { ...options, impulse });
    close(fitted.report.achieved.impulse, impulse);
    close(fitted.report.achieved.duration, 2);
    assert.ok(fitted.report.notes.length);
  }
  assert.throws(() => calibrateProfile(recording(), theory(), { ...options, impulse: base.report.feasible.maxImpulse * 2 }), error => error.code === 'IMPULSE_LIMIT' && error.details.minImpulse > 0 && error.details.maxImpulse > error.details.minImpulse);
  assert.throws(() => calibrateProfile(recording(), theory(), { ...options, impulse: base.report.feasible.minImpulse / 2 }), error => error.code === 'IMPULSE_LIMIT');
});

test('selected fitting ranges preserve every outside sample exactly and explain scoped metrics', () => {
  const points = recording();
  const fitted = calibrateProfile(points, theory(), { range: [.5, 4], start: 1, duration: 2, peak: 100, impulse: 100 });
  for (let index = 0; index < points.length; index++) if (points[index].time < .5 || points[index].time > 4) assert.deepEqual(fitted.points[index], points[index]);
  assert.match(fitted.report.notes.join(' '), /selected fitting range/);
  close(fitted.report.achieved.impulse, 100);
});

test('coarse samples support exact feasible triangle boundaries and reject impossible ones', () => {
  const points = [{ time: 0, thrust: 0 }, { time: 1, thrust: 10 }, { time: 2, thrust: 0 }];
  const fitted = calibrateProfile(points, points, { start: .05, duration: 1.9, peak: 10, impulse: 10 });
  close(fitted.report.achieved.start, .05);
  close(fitted.report.achieved.duration, 1.9);
  close(fitted.report.achieved.impulse, 10);
  assert.throws(() => calibrateProfile(points, points, { start: .1, duration: 1.8, peak: 10 }), error => error.code === 'BOUNDARY_LIMIT');
});

test('timeline limits and sparse intervals fail clearly without modifying source data', () => {
  const points = recording(), before = structuredClone(points);
  assert.throws(() => calibrateProfile(points, theory(), { start: 4, duration: 2, peak: 100 }), error => error.code === 'TIME_LIMIT' && error.details.maximumEnd === 5);
  assert.throws(() => calibrateProfile(points, theory(), { start: -1, duration: 2 }), error => error.code === 'TIME_LIMIT');
  assert.throws(() => calibrateProfile(points, theory(), { start: 1, duration: .001 }), error => error.code === 'INSUFFICIENT_SAMPLES');
  assert.deepEqual(points, before);
});

test('default start follows the working ignition and mean is distinct from CSV timeline average', () => {
  const points = recording();
  const fitted = calibrateProfile(points, theory(), { duration: 2, peak: 100, impulse: 100 });
  assert.ok(fitted.report.requested.start > .5 && fitted.report.requested.start < 1);
  close(fitted.report.achieved.average, 50);
  close(metrics(fitted.points).average, 20);
});

test('invalid profiles and incompatible fitting parameters fail before output', () => {
  const points = recording(), source = theory();
  for (const invalid of [null, [], [points[0]], [points[0], points[0]], [{ time: 0, thrust: -1 }, points[1]], [{ time: NaN, thrust: 1 }, points[1]]]) {
    assert.throws(() => calibrateProfile(invalid, source));
    assert.throws(() => calibrateProfile(points, invalid));
  }
  assert.throws(() => calibrateProfile(points, source.map(point => ({ ...point, thrust: 0 }))), error => error.code === 'EMPTY_THEORY');
  for (const options of [{ duration: 0 }, { peak: -1 }, { impulse: Infinity }, { average: '50' }, { start: NaN }, { shapeBlend: 1.1 }, { range: [0, 6] }, { range: [.5, .5] }, { duration: 2, average: Number.MAX_VALUE }]) assert.throws(() => calibrateProfile(points, source, options));
});

test('a requested final tail is remapped to elapsed burn time and remains monotonic', () => {
  const points = recording();
  const fitted = calibrateProfile(points, theory(), { start: 1, duration: 2, peak: 100, tailStart: 1.1 });
  close(fitted.report.requested.tailStart, 1.1);
  close(fitted.report.achieved.tailStart, 1.1);
  close(fitted.report.achieved.duration, 2);
  close(fitted.report.achieved.peak, 100);
  const tail = fitted.points.filter(point => point.time >= 2.1);
  assert.ok(tail.every((point, index) => !index || point.thrust <= tail[index - 1].thrust + 1e-12));
  assert.ok(tail[0].thrust > tail.find(point => point.time === 2.8).thrust);
  assert.deepEqual(fitted.points.map(point => point.time), points.map(point => point.time));
});

test('joint impulse fitting changes the pre-tail body while retaining the final tail exactly', () => {
  const options = { start: 1, duration: 2, peak: 100, tailStart: 1.1 };
  const base = calibrateProfile(recording(), theory(), options);
  for (const fraction of [.2, .8]) {
    const impulse = base.report.feasible.minImpulse + fraction * (base.report.feasible.maxImpulse - base.report.feasible.minImpulse);
    const fitted = calibrateProfile(recording(), theory(), { ...options, impulse });
    close(fitted.report.achieved.impulse, impulse);
    close(fitted.report.achieved.duration, 2);
    close(fitted.report.achieved.peak, 100);
    assert.deepEqual(fitted.points.filter(point => point.time >= 2.1), base.points.filter(point => point.time >= 2.1));
  }
});

test('final tail detection ignores a boost-to-sustain drop near the beginning', () => {
  const reference = [{ time: 0, thrust: 0 }, { time: .1, thrust: 10 }, { time: .2, thrust: 3 }, { time: .85, thrust: 3 }, { time: 1, thrust: 0 }];
  const fitted = calibrateProfile(recording(), reference, { start: 1, duration: 2, peak: 100, tailStart: 1.2 });
  assert.ok(fitted.report.sourceTailStart / metrics(reference).burnDuration > .75);
  close(fitted.report.achieved.tailStart, 1.2);
});

test('self-reference tail shaping retains the current peak, impulse and 5% burn duration', () => {
  const points = recording(), current = metrics(points);
  const fitted = calibrateProfile(points, points, { start: current.burnStart, duration: current.burnDuration, peak: current.peak, impulse: current.impulse, tailStart: current.burnDuration * .7 });
  close(fitted.report.achieved.peak, current.peak);
  close(fitted.report.achieved.impulse, current.impulse);
  close(fitted.report.achieved.duration, current.burnDuration);
  assert.deepEqual(fitted.points.map(point => point.time), points.map(point => point.time));
});

test('tail shaping handles irregular sampling honestly and an omitted tail retains old behavior', () => {
  const points = [0, .1, .24, .41, .6, .9, 1.2, 1.56, 1.9, 2.2, 2.51, 2.7, 3.1].map((time, index) => ({ time, thrust: index ? 10 + index % 3 : 0 }));
  const options = { start: .37, duration: 2.11, peak: 70 };
  assert.deepEqual(calibrateProfile(points, theory(), options), calibrateProfile(points, theory(), { ...options, tailStart: null }));
  const fitted = calibrateProfile(points, theory(), { ...options, tailStart: 1.25 });
  close(fitted.report.requested.tailStart, 1.25);
  close(fitted.report.achieved.tailStart, 1.9 - .37);
  assert.match(fitted.report.notes.join(' '), /next existing measurement time/);
  const tail = fitted.points.filter(point => point.time >= 1.9);
  assert.ok(tail.every((point, index) => !index || point.thrust <= tail[index - 1].thrust + 1e-12));
  close(fitted.report.achieved.duration, 2.11);
});

test('invalid final tail targets fail before changing any sample', () => {
  const points = recording(), before = structuredClone(points);
  for (const tailStart of [0, -1, 2, 3, Infinity, NaN, '1']) assert.throws(() => calibrateProfile(points, theory(), { start: 1, duration: 2, peak: 100, tailStart }), error => error.code === 'INVALID_TARGET');
  assert.throws(() => calibrateProfile(points, theory(), { start: 1, duration: 2, peak: 100, tailStart: .001 }), error => error.code === 'TAIL_LIMIT');
  assert.deepEqual(points, before);
});
