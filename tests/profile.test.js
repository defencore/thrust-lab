import test from 'node:test';
import assert from 'node:assert/strict';
import { metrics, interpolate, generateProfile, transform } from '../src/profile.js';

const triangle = [{ time: 0, thrust: 0 }, { time: 1, thrust: 10 }, { time: 2, thrust: 0 }];
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);

test('metrics integrates irregular timestamps and interpolates 5% burn boundaries', () => {
  const result = metrics([{ time: 3, thrust: 0 }, { time: 3.2, thrust: 10 }, { time: 4, thrust: 10 }, { time: 5, thrust: 0 }]);
  close(result.impulse, 14);
  close(result.average, 7);
  close(result.burnDuration, 1.94);
  assert.equal(result.peak, 10);
  assert.equal(result.duration, 2);
  assert.equal(result.samples, 4);
  assert.equal(metrics([]).impulse, 0);
});

test('interpolation is linear, exact at samples, and zero outside the timeline', () => {
  close(interpolate(triangle, 0.25), 2.5);
  close(interpolate(triangle, 1), 10);
  close(interpolate(triangle, 1.5), 5);
  assert.equal(interpolate(triangle, -1), 0);
  assert.equal(interpolate(triangle, 3), 0);
  assert.equal(interpolate([], 1), 0);
});

test('generation fits actual sampled peak, impulse and duration, even with noise', () => {
  for (const sampling of ['uniform', 'jitter', 'random']) {
    const generated = generateProfile({ peak: 125, duration: 2.4, impulse: 180, interval: 0.01, sampling, jitter: 0.6, noise: 0.08, seed: 'repeatable', shape: 'boost-sustain' });
    const measured = metrics(generated.points);
    close(measured.peak, 125);
    close(measured.impulse, 180);
    close(measured.duration, 2.4);
    assert.deepEqual(generated.notes, []);
    assert.equal(generated.points[0].thrust, 0);
    assert.equal(generated.points.at(-1).thrust, 0);
    assert.ok(generated.points.every((point, i) => point.thrust >= 0 && (!i || point.time > generated.points[i - 1].time)));
  }
});

test('generation is reproducible and seed changes both timing and noise', () => {
  const options = { peak: 80, duration: 1.5, impulse: 60, interval: 0.01, sampling: 'jitter', noise: 0.05, seed: 42 };
  const first = generateProfile(options);
  assert.deepEqual(first, generateProfile(options));
  assert.notDeepEqual(first.points, generateProfile({ ...options, seed: 43 }).points);
});

test('seed also varies the smooth base without adding measurement noise', () => {
  const options = { peak: 80, duration: 1.5, impulse: 60, interval: 0.01, sampling: 'uniform', noise: 0, seed: 42 };
  const first = generateProfile(options);
  const second = generateProfile({ ...options, seed: 43 });
  assert.notDeepEqual(first.points, second.points);
  assert.deepEqual(first.points, first.theory);
  assert.deepEqual(first.points.map((point) => point.time), second.points.map((point) => point.time));
  close(metrics(first.points).impulse, 60);
  close(metrics(second.points).impulse, 60);
});

test('infeasible generation keeps peak and duration, returning an explicit constraint note', () => {
  const generated = generateProfile({ peak: 10, duration: 1, impulse: 100, interval: 0.01, noise: 0 });
  assert.equal(generated.notes.length, 1);
  close(metrics(generated.points).peak, 10);
  assert.ok(metrics(generated.points).impulse < 10);
  assert.throws(() => generateProfile({ interval: 1e-8 }), /30,000 samples/);
  assert.throws(() => generateProfile({ duration: 1, interval: 2 }), /smaller than/);
  assert.throws(() => generateProfile({ peak: -1 }), /Peak thrust/);
  assert.throws(() => generateProfile({ sampling: 'invalid' }), /sampling/);
});

test('generation accepts normalized reference templates', () => {
  const generated = generateProfile({ peak: 20, duration: 3, interval: 0.02, impulse: 30, noise: 0, template: [{ time: 0, thrust: 0 }, { time: 0.2, thrust: 1 }, { time: 0.7, thrust: 0.4 }, { time: 1, thrust: 0 }] });
  close(metrics(generated.points).peak, 20);
  close(metrics(generated.points).impulse, 30);
  assert.throws(() => generateProfile({ template: triangle }), /normalized template/);
});

test('every operation preserves exact timestamps and input immutability', () => {
  const original = generateProfile({ interval: 0.03, sampling: 'jitter', peak: 100, duration: 2, impulse: 120, seed: 8 }).points;
  const snapshot = structuredClone(original);
  const operations = [{ type: 'scale', factor: 1.1 }, { type: 'offset', amount: -4 }, { type: 'retime', factor: 0.8 }, { type: 'trim' }, { type: 'noise', amount: 0.1 }, { type: 'smooth', window: 5 }, { type: 'fit-peak', target: 200 }, { type: 'fit-impulse', target: 80 }, { type: 'fit-theory', theory: triangle, blend: 0.5 }];
  for (const operation of operations) {
    const result = transform(original, { ...operation, range: [0.3, 1.7] });
    assert.deepEqual(result.map((point) => point.time), original.map((point) => point.time));
    assert.ok(result.every((point) => Number.isFinite(point.thrust) && point.thrust >= 0));
    assert.notEqual(result, original);
  }
  assert.deepEqual(original, snapshot);
});

test('selected transforms leave every outside amplitude untouched', () => {
  const source = [{ time: 0, thrust: 2 }, { time: 1, thrust: 4 }, { time: 2, thrust: 8 }, { time: 3, thrust: 4 }, { time: 4, thrust: 2 }];
  for (const operation of [{ type: 'scale', factor: 2 }, { type: 'retime', factor: 0.5, anchor: 'center' }, { type: 'noise', amount: 0.5 }, { type: 'smooth', window: 3 }, { type: 'fit-theory', theory: triangle }]) {
    const changed = transform(source, { ...operation, range: [1, 3] });
    assert.equal(changed[0].thrust, 2);
    assert.equal(changed[4].thrust, 2);
  }
});

test('time compression resamples and zero-fills on the unchanged measurement grid', () => {
  const source = Array.from({ length: 9 }, (_, i) => ({ time: i / 2, thrust: i <= 4 ? i * 2.5 : (8 - i) * 2.5 }));
  const compressed = transform(source, { type: 'retime', factor: 0.5, anchor: 'start' });
  assert.deepEqual(compressed.map((point) => point.thrust), [0, 5, 10, 5, 0, 0, 0, 0, 0]);
  const centered = transform(source, { type: 'retime', factor: 0.5, anchor: 'center' });
  assert.deepEqual(centered.map((point) => point.thrust), [0, 0, 0, 5, 10, 5, 0, 0, 0]);
  const expanded = transform(source, { type: 'retime', factor: 2, anchor: 'start' });
  close(expanded[4].thrust, 5);
});

test('trim mutes outside the selection and retains all samples', () => {
  const source = [{ time: 0, thrust: 4 }, { time: 1, thrust: 5 }, { time: 2, thrust: 6 }, { time: 3, thrust: 7 }];
  assert.deepEqual(transform(source, { type: 'trim', range: [1, 2] }).map((point) => point.thrust), [0, 5, 6, 0]);
});

test('peak and full impulse fitting reach the requested target', () => {
  close(metrics(transform(triangle, { type: 'fit-peak', target: 25 })).peak, 25);
  close(metrics(transform(triangle, { type: 'fit-impulse', target: 40 })).impulse, 40);
  assert.deepEqual(transform(triangle, { type: 'fit-impulse', target: 0 }).map((point) => point.thrust), [0, 0, 0]);
});

test('selected impulse fitting accounts for interpolated boundary contributions', () => {
  const source = [{ time: 0, thrust: 10 }, { time: 1, thrust: 10 }, { time: 2, thrust: 10 }, { time: 3, thrust: 10 }];
  const result = transform(source, { type: 'fit-impulse', range: [0.5, 2.5], target: 30 });
  const clipped = [{ time: 0.5, thrust: interpolate(result, 0.5) }, result[1], result[2], { time: 2.5, thrust: interpolate(result, 2.5) }];
  close(metrics(clipped).impulse, 30);
  assert.equal(result[0].thrust, 10);
  assert.equal(result[3].thrust, 10);
  assert.throws(() => transform(source, { type: 'fit-impulse', range: [0.5, 2.5], target: 0 }), /cannot be reached/);
});

test('noise is seeded; smoothing reduces alternating signal variation', () => {
  const noisy = transform(triangle, { type: 'noise', amount: 0.4, seed: 4 });
  assert.deepEqual(noisy, transform(triangle, { type: 'noise', amount: 0.4, seed: 4 }));
  const oscillating = Array.from({ length: 21 }, (_, i) => ({ time: i / 10, thrust: i % 2 ? 20 : 0 }));
  const smoothed = transform(oscillating, { type: 'smooth', window: 5 });
  const variation = (points) => points.slice(1).reduce((sum, point, i) => sum + Math.abs(point.thrust - points[i].thrust), 0);
  assert.ok(variation(smoothed) < variation(oscillating) / 3);
});

test('invalid operations fail clearly instead of corrupting a profile', () => {
  assert.throws(() => transform(triangle, { type: 'retime', factor: 0 }), /Time scale/);
  assert.throws(() => transform(triangle, { type: 'scale', factor: -1 }), /Thrust scale/);
  assert.throws(() => transform(triangle, { type: 'smooth', window: 4 }), /odd/);
  assert.throws(() => transform(triangle, { type: 'scale', factor: 1, range: [5, 6] }), /no samples/);
  assert.throws(() => transform([{ time: 0, thrust: 0 }, { time: 0, thrust: 1 }], { type: 'scale', factor: 1 }), /strictly increasing/);
  assert.throws(() => transform(triangle, { type: 'fit-theory', theory: [] }), /theoretical profile/);
});
