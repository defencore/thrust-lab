import test from 'node:test';
import assert from 'node:assert/strict';
import { drawStroke } from '../src/draw-stroke.js';

const samples = () => [0, .1, .4, .9, 1.5, 2].map((time, index) => ({ time, thrust: 10 + index }));
const forces = points => points.map(point => point.thrust);

test('starting a stroke edits only the nearest measurement and preserves every timestamp', () => {
  const points = samples();
  const original = structuredClone(points);
  const result = drawStroke(points, { time: .36, thrust: 40 });
  assert.deepEqual(forces(result), [10, 11, 40, 13, 14, 15]);
  assert.deepEqual(result.map(point => point.time), points.map(point => point.time));
  assert.deepEqual(points, original);
  assert.notEqual(result, points);
  assert.ok(result.every((point, index) => point !== points[index]));
});

test('a pointer exactly between samples consistently chooses the earlier sample', () => {
  const points = [{ time: 0, thrust: 1 }, { time: 1, thrust: 2 }, { time: 2, thrust: 3 }];
  assert.deepEqual(forces(drawStroke(points, { time: .5, thrust: 9 })), [9, 2, 3]);
});

test('continuous strokes interpolate force using the irregular measurement times', () => {
  const points = samples();
  const result = drawStroke(points, { time: 1.5, thrust: 50, previous: { time: .1, thrust: 15 } });
  assert.deepEqual(forces(result), [10, 15, 22.5, 35, 50, 15]);
  assert.deepEqual(result.map(point => point.time), points.map(point => point.time));
});

test('painting backward follows the same time-based line without reversing measurements', () => {
  const points = samples();
  const backward = drawStroke(points, { time: .1, thrust: 15, previous: { time: 1.5, thrust: 50 } });
  const forward = drawStroke(points, { time: 1.5, thrust: 50, previous: { time: .1, thrust: 15 } });
  for (let index = 0; index < points.length; index++) assert.ok(Math.abs(backward[index].thrust - forward[index].thrust) < 1e-12);
  assert.deepEqual(backward.map(point => point.time), points.map(point => point.time));
});

test('selection boundaries are inclusive and measurements outside the selection stay exact', () => {
  const points = samples();
  const result = drawStroke(points, { time: 2, thrust: 60, previous: { time: 0, thrust: 20 } }, [.4, 1.5]);
  assert.deepEqual(forces(result), [10, 11, 28, 38, 50, 15]);
  assert.deepEqual(result[0], points[0]);
  assert.deepEqual(result[1], points[1]);
  assert.deepEqual(result.at(-1), points.at(-1));
  assert.deepEqual(result.map(point => point.time), points.map(point => point.time));
});

test('a stroke cannot pull an out-of-scope nearest sample into the selection', () => {
  const points = samples();
  assert.deepEqual(drawStroke(points, { time: .12, thrust: 50 }, [.4, 1.5]), points);
  assert.deepEqual(drawStroke(points, { time: 1.98, thrust: 50, previous: { time: 1.9, thrust: 20 } }, [.4, 1.5]), points);
});

test('subsample strokes affect the nearest sample using a clamped endpoint value', () => {
  const points = samples();
  const result = drawStroke(points, { time: .45, thrust: 50, previous: { time: .42, thrust: 20 } });
  assert.deepEqual(forces(result), [10, 11, 20, 13, 14, 15]);
  assert.deepEqual(result.map(point => point.time), points.map(point => point.time));
});

test('repeated pointer positions allow force changes without a division by zero', () => {
  const points = samples();
  const result = drawStroke(points, { time: .4, thrust: 0, previous: { time: .4, thrust: 50 } });
  assert.deepEqual(forces(result), [10, 11, 0, 13, 14, 15]);
  assert.ok(result.every(point => Number.isFinite(point.thrust) && point.thrust >= 0));
});

test('invalid current coordinates fail before touching the source measurements', () => {
  const points = samples();
  const original = structuredClone(points);
  for (const coordinates of [{ time: NaN, thrust: 5 }, { time: Infinity, thrust: 5 }, { time: .1, thrust: NaN }, { time: .1, thrust: Infinity }, { time: .1, thrust: -1 }]) assert.throws(() => drawStroke(points, coordinates), /finite and nonnegative/);
  for (const previous of [{ time: NaN, thrust: 5 }, { time: 0, thrust: Infinity }, { time: 0, thrust: -1 }]) assert.throws(() => drawStroke(points, { time: .1, thrust: 10, previous }), /finite and nonnegative/);
  assert.deepEqual(points, original);
});
