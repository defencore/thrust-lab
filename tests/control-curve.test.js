import test from 'node:test';
import assert from 'node:assert/strict';
import { createCurveNodes, snapCurveNode } from '../src/control-curve.js';

const profile = times => times.map(time => ({ time, thrust: 10 + time }));

test('initial anchors use real irregular sample times and retain actual scope boundaries', () => {
  const points = profile([0, .01, .07, .08, .2, .6, .7, .9, 1]);
  const original = structuredClone(points);
  const nodes = createCurveNodes(points, [.05, .95], 4);
  assert.deepEqual(nodes.map(node => node.time), [.07, .2, .6, .9]);
  assert.ok(nodes.every(node => points.some(point => point.time === node.time && point.thrust === node.thrust)));
  assert.ok(nodes.every(node => !points.includes(node)));
  assert.deepEqual(points, original);
});

test('node counts are limited by available measurements and remain distinct in order', () => {
  const points = profile(Array.from({ length: 1000 }, (_, index) => index / 1000));
  for (const count of [2, 3, 5, 128]) {
    const nodes = createCurveNodes(points, null, count);
    assert.equal(nodes.length, count);
    assert.equal(nodes[0].time, points[0].time);
    assert.equal(nodes.at(-1).time, points.at(-1).time);
    assert.ok(nodes.every((node, index) => !index || node.time > nodes[index - 1].time));
  }
  assert.deepEqual(createCurveNodes(points, [.1, .101], 128), [points[100], points[101]]);
});

test('invalid counts, malformed ranges and selections with fewer than two samples fail', () => {
  const points = profile([0, .5, 1]);
  for (const count of [1, 129, 2.5, NaN, Infinity, '5']) assert.throws(() => createCurveNodes(points, null, count), /between 2 and 128/);
  for (const range of [[0, 0], [1, 0], [-1, .5], [0, 2], [0, Infinity], [0], 'all']) assert.throws(() => createCurveNodes(points, range), /range/);
  assert.throws(() => createCurveNodes(points, [.1, .4]), /at least two measurements/);
  assert.throws(() => createCurveNodes(points, [.1, .5]), /at least two measurements/);
});

test('invalid source measurement grids fail before creation or snapping', () => {
  const nodes = profile([0, .5, 1]);
  for (const points of [[], [nodes[0]], [nodes[0], nodes[0]], [nodes[1], nodes[0]], [{ time: NaN, thrust: 1 }, nodes[1]], [{ time: 0, thrust: -1 }, nodes[1]], [{ time: 0, thrust: Infinity }, nodes[1]], [null, nodes[1]]]) {
    assert.throws(() => createCurveNodes(points));
    assert.throws(() => snapCurveNode(points, nodes, 1, .5, 20));
  }
});

test('moving anchors snaps to free samples without crossing neighbours or mutating inputs', () => {
  const points = profile([0, .1, .15, .2, .4, .8, 1]);
  const nodes = [{ time: 0, thrust: 0 }, { time: .2, thrust: 4 }, { time: .8, thrust: 8 }, { time: 1, thrust: 0 }];
  const originalPoints = structuredClone(points);
  const originalNodes = structuredClone(nodes);
  const snapped = snapCurveNode(points, nodes, 1, .12, 9);
  assert.deepEqual(snapped[1], { time: .1, thrust: 9 });
  assert.equal(snapCurveNode(points, nodes, 1, 50, 9)[1].time, .4);
  assert.equal(snapCurveNode(points, nodes, 2, -50, 9)[2].time, .4);
  assert.ok(snapped.every((node, index) => node !== nodes[index]));
  assert.deepEqual(points, originalPoints);
  assert.deepEqual(nodes, originalNodes);
});

test('nearest-time ties choose the earlier sample and tightly packed neighbours retain ordering', () => {
  const points = profile([0, .25, .5, .75, 1]);
  const nodes = [points[0], points[2], points[4]];
  assert.equal(snapCurveNode(points, nodes, 1, .375, 20)[1].time, .25);
  const packed = [points[0], points[1], points[2]];
  assert.equal(snapCurveNode(points, packed, 1, 1, 20)[1].time, .25);
  assert.equal(snapCurveNode(points, packed, 1, -1, 20)[1].time, .25);
});

test('endpoint measurement times stay fixed while their thrust remains editable', () => {
  const points = profile([-.1, 0, .1, .2, .3, .4]);
  const nodes = createCurveNodes(points, [0, .3], 3);
  assert.deepEqual(snapCurveNode(points, nodes, 0, .2, 0, { range: [0, .3] })[0], { time: 0, thrust: 0 });
  assert.deepEqual(snapCurveNode(points, nodes, 2, .1, Number.MAX_VALUE, { range: [0, .3] })[2], { time: .3, thrust: Number.MAX_VALUE });
});

test('snapping rejects invalid anchors, ranges, indexes and coordinates', () => {
  const points = profile([0, .5, 1]);
  const nodes = createCurveNodes(points);
  for (const invalid of [[], [nodes[0]], Array.from({ length: 129 }, () => nodes[0])]) assert.throws(() => snapCurveNode(points, invalid, 0, 0, 5), /between 2 and 128/);
  assert.throws(() => snapCurveNode(points, [nodes[0], nodes[0]], 0, 0, 5), /strictly increasing/);
  assert.throws(() => snapCurveNode(points, [nodes[0], { time: .4, thrust: 1 }], 0, 0, 5), /existing measurement timestamps/);
  assert.throws(() => snapCurveNode(points, [{ time: 0, thrust: -1 }, nodes[2]], 0, 0, 5), /nonnegative/);
  assert.throws(() => snapCurveNode(points, nodes, 1, .5, 5, { range: [.2, 1] }), /within the edit range/);
  for (const range of [[0, 0], [-1, 1], [0, Infinity]]) assert.throws(() => snapCurveNode(points, nodes, 1, .5, 5, { range }), /range/);
  for (const index of [-1, 3, .5, NaN]) assert.throws(() => snapCurveNode(points, nodes, index, .5, 5), /existing control point/);
  for (const [time, thrust] of [[Infinity, 5], [NaN, 5], [.5, -1], [.5, Infinity], [.5, NaN]]) assert.throws(() => snapCurveNode(points, nodes, 1, time, thrust), /finite time and nonnegative thrust/);
});
