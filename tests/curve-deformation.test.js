import test from 'node:test';
import assert from 'node:assert/strict';
import { deformControlCurve } from '../src/curve-deformation.js';
import { createCurveNodes } from '../src/control-curve.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} should equal ${expected}`);
const recording = () => Array.from({ length: 21 }, (_, index) => ({ time: index / 10, thrust: index === 3 ? 80 : 10 + index % 3 }));
const valuesAt = (points, times) => times.map(time => ({ ...points.find(point => point.time === time) }));

test('unchanged handles preserve a recording exactly, including sharp peaks and noise', () => {
  const points = recording();
  const original = structuredClone(points);
  for (const count of [2, 3, 5, 10, 21]) {
    for (const interpolation of ['smooth', 'linear']) {
      const nodes = createCurveNodes(points, null, count);
      const deformed = deformControlCurve(points, nodes, { interpolation });
      assert.deepEqual(deformed, original);
      assert.notEqual(deformed, points);
      assert.ok(deformed.every((point, index) => point !== points[index]));
    }
  }
  assert.deepEqual(points, original);
});

test('moving one handle changes only intervals beside its immediate neighbours', () => {
  const points = recording();
  const nodes = valuesAt(points, [0, .5, 1, 1.5, 2]);
  nodes[2].thrust += 20;
  const originalNodes = structuredClone(nodes);
  const deformed = deformControlCurve(points, nodes);
  for (let index = 0; index < points.length; index++) {
    const time = points[index].time;
    if (time <= .5 || time >= 1.5) assert.deepEqual(deformed[index], points[index]);
    else assert.ok(deformed[index].thrust > points[index].thrust);
  }
  assert.equal(deformed[3].thrust, 80);
  assert.equal(deformed[10].thrust, nodes[2].thrust);
  assert.deepEqual(nodes, originalNodes);
  assert.deepEqual(deformed.map(point => point.time), points.map(point => point.time));
});

test('the original local detail survives beneath an additive smooth deformation', () => {
  const points = recording();
  const nodes = valuesAt(points, [0, .5, 1, 1.5, 2]);
  nodes[1].thrust += 10;
  const deformed = deformControlCurve(points, nodes);
  for (const index of [1, 2, 3, 4]) {
    const fraction = points[index].time / .5;
    const correction = 10 * fraction * fraction * (3 - 2 * fraction);
    close(deformed[index].thrust - points[index].thrust, correction);
  }
  assert.ok(deformed[3].thrust > 80);
});

test('linear and smooth corrections use elapsed time on irregular measurement grids', () => {
  const points = [0, .02, .1, .2, .4, .9, 1].map((time, index) => ({ time, thrust: 20 + index % 2 }));
  const nodes = valuesAt(points, [0, .4, 1]);
  nodes[1].thrust += 10;
  const linear = deformControlCurve(points, nodes, { interpolation: 'linear' });
  const smooth = deformControlCurve(points, nodes);
  close(linear[2].thrust, points[2].thrust + 2.5);
  close(smooth[2].thrust, points[2].thrust + 1.5625);
  close(linear[5].thrust, points[5].thrust + 10 * (1 - (.9 - .4) / .6));
  for (const result of [linear, smooth]) {
    for (const node of nodes) assert.equal(result.find(point => point.time === node.time).thrust, node.thrust);
    assert.deepEqual(result.map(point => point.time), points.map(point => point.time));
  }
});

test('corrections join with zero first derivatives at neighbouring handles', () => {
  const points = Array.from({ length: 2001 }, (_, index) => ({ time: index / 1000, thrust: 20 }));
  const nodes = [{ time: 0, thrust: 20 }, { time: 1, thrust: 30 }, { time: 2, thrust: 20 }];
  const deformed = deformControlCurve(points, nodes);
  assert.ok(deformed[1].thrust - deformed[0].thrust < .0001);
  assert.ok(deformed[1000].thrust - deformed[999].thrust < .0001);
  close(deformed[1000].thrust - deformed[999].thrust, deformed[1000].thrust - deformed[1001].thrust);
});

test('selected range and anchor span retain exact outside values and endpoint targets', () => {
  const points = recording();
  const nodes = valuesAt(points, [.5, 1, 1.5]);
  nodes[0].thrust = 0;
  nodes[1].thrust += 5;
  nodes[2].thrust = 30;
  const deformed = deformControlCurve(points, nodes, { range: [.4, 1.6] });
  for (let index = 0; index < points.length; index++) if (points[index].time < .5 || points[index].time > 1.5) assert.deepEqual(deformed[index], points[index]);
  for (const node of nodes) assert.equal(deformed.find(point => point.time === node.time).thrust, node.thrust);
  assert.ok(deformed.every(point => point.thrust >= 0));
});

test('returning a handle to its baseline restores every original sample', () => {
  const points = recording();
  const nodes = valuesAt(points, [0, .5, 1, 1.5, 2]);
  const baseline = nodes[2].thrust;
  nodes[2].thrust += 20;
  assert.notDeepEqual(deformControlCurve(points, nodes), points);
  nodes[2].thrust = baseline;
  assert.deepEqual(deformControlCurve(points, nodes), points);
});

test('inserting or horizontally repositioning an unchanged constraint does not resample the recording', () => {
  const points = recording();
  const nodes = valuesAt(points, [0, .5, 1, 1.5, 2]);
  nodes.splice(2, 0, { ...points[7] });
  assert.deepEqual(deformControlCurve(points, nodes), points);
  nodes[2] = { ...points[8] };
  assert.deepEqual(deformControlCurve(points, nodes), points);
});

test('downward deformation clamps measurements at zero without changing anchor targets', () => {
  const points = [{ time: 0, thrust: 10 }, { time: .25, thrust: 0 }, { time: .5, thrust: 10 }, { time: .75, thrust: 1 }, { time: 1, thrust: 10 }];
  const nodes = valuesAt(points, [0, .5, 1]);
  nodes[1].thrust = 0;
  const deformed = deformControlCurve(points, nodes);
  assert.deepEqual(deformed.map(point => point.thrust), [10, 0, 0, 0, 10]);
  assert.deepEqual(points.map(point => point.thrust), [10, 0, 10, 1, 10]);
});

test('invalid grids, constraints, ranges and interpolation fail without mutating inputs', () => {
  const points = recording();
  const original = structuredClone(points);
  const nodes = valuesAt(points, [0, 1, 2]);
  for (const invalid of [[], [points[0]], [{ time: 0, thrust: -1 }, points[1]], [points[1], points[0]], [{ time: NaN, thrust: 0 }, points[1]]]) assert.throws(() => deformControlCurve(invalid, nodes));
  for (const invalid of [[], [nodes[0]], Array.from({ length: 129 }, () => nodes[0]), [nodes[0], nodes[0]], [{ time: 0, thrust: 0 }, { time: .12345, thrust: 5 }], [{ time: 0, thrust: 0 }, { time: 2, thrust: Infinity }]]) assert.throws(() => deformControlCurve(points, invalid));
  for (const range of [[0, 0], [-1, 2], [0, 3], [0, Infinity], [.5, 1.5]]) assert.throws(() => deformControlCurve(points, nodes, { range }));
  assert.throws(() => deformControlCurve(points, nodes, { interpolation: 'spline' }), /smooth or linear/);
  assert.deepEqual(points, original);
});

test('very large finite targets stay exact and unsupported output overflow is rejected', () => {
  const points = [0, .25, .5, .75, 1].map(time => ({ time, thrust: 0 }));
  const nodes = [{ time: 0, thrust: 0 }, { time: .5, thrust: 1e300 }, { time: 1, thrust: 0 }];
  const deformed = deformControlCurve(points, nodes);
  assert.equal(deformed[2].thrust, 1e300);
  assert.ok(deformed.every(point => Number.isFinite(point.thrust)));
  const opposed = deformControlCurve([{ time: 0, thrust: 0 }, { time: .5, thrust: Number.MAX_VALUE }, { time: 1, thrust: Number.MAX_VALUE }], [{ time: 0, thrust: Number.MAX_VALUE }, { time: 1, thrust: 0 }]);
  assert.equal(opposed[1].thrust, Number.MAX_VALUE);
  assert.throws(() => deformControlCurve([{ time: 0, thrust: 0 }, { time: .5, thrust: Number.MAX_VALUE }, { time: 1, thrust: 0 }], [{ time: 0, thrust: Number.MAX_VALUE }, { time: 1, thrust: Number.MAX_VALUE }]), /remain finite/);
});
