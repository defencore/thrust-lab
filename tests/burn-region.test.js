import test from 'node:test';
import assert from 'node:assert/strict';
import { burnRegionView } from '../src/burn-region.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} should be ${expected}`);

test('burn view uses 5% crossings with 4% padding at original nonzero timestamps', () => {
  const points = [{ time: 100, thrust: 0 }, { time: 110, thrust: 0 }, { time: 111, thrust: 100 }, { time: 112, thrust: 100 }, { time: 113, thrust: 0 }, { time: 120, thrust: 0 }];
  const before = structuredClone(points), view = burnRegionView(points);
  close(view[0], 109.934);
  close(view[1], 113.066);
  assert.deepEqual(points, before);
});

test('low baseline noise stays outside the burn view despite long recording edges', () => {
  const points = [{ time: -10, thrust: 2 }, { time: 9.9, thrust: 3 }, { time: 10, thrust: 0 }, { time: 10.1, thrust: 30 }, { time: 10.5, thrust: 100 }, { time: 11.5, thrust: 20 }, { time: 11.7, thrust: 0 }, { time: 900, thrust: 1 }, { time: 1000, thrust: 3 }];
  const view = burnRegionView(points);
  assert.ok(view[0] > 9 && view[0] < 10.1);
  assert.ok(view[1] > 11.5 && view[1] < 13);
});

test('irregular recordings retain their original samples when burn bounds fall between timestamps', () => {
  const points = [{ time: 1, thrust: 0 }, { time: 1.13, thrust: 4 }, { time: 1.27, thrust: 60 }, { time: 2.91, thrust: 100 }, { time: 3.04, thrust: 7 }, { time: 3.58, thrust: 0 }, { time: 8, thrust: 0 }];
  const before = structuredClone(points), view = burnRegionView(points);
  assert.ok(view[0] > 1 && view[0] < 1.13);
  assert.ok(view[1] > 3.04 && view[1] < 3.58);
  assert.equal(points.some(point => point.time === view[0] || point.time === view[1]), false);
  const included = points.filter(point => point.time >= view[0] && point.time <= view[1]);
  assert.deepEqual(included.map(point => point.time), [1.13, 1.27, 2.91, 3.04]);
  assert.deepEqual(points, before);
});

test('burn padding is clamped to available recording boundaries', () => {
  assert.deepEqual(burnRegionView([{ time: 5, thrust: 100 }, { time: 6, thrust: 100 }]), [5, 6]);
  const start = burnRegionView([{ time: 5, thrust: 10 }, { time: 6, thrust: 0 }]);
  assert.equal(start[0], 5);
  close(start[1], 5.988);
  const end = burnRegionView([{ time: 5, thrust: 0 }, { time: 6, thrust: 10 }]);
  close(end[0], 5.012);
  assert.equal(end[1], 6);
});

test('recordings without a finite positive burn window return no region', () => {
  for (const points of [[], [{ time: 5, thrust: 0 }], [{ time: 5, thrust: 100 }], [{ time: 5, thrust: 0 }, { time: 100, thrust: 0 }]]) assert.equal(burnRegionView(points), null);
});
