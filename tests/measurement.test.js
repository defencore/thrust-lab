import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementAt, measureProfile } from '../src/measurement.js';
import { renderMeasurements } from '../src/chart-measurements.js';

const profile = () => [{ time: -.2, thrust: 0 }, { time: .1, thrust: 10 }, { time: .25, thrust: 4 }, { time: .8, thrust: 20 }, { time: 1.5, thrust: 0 }];

test('measuring cursors snap to actual irregular samples and clamp to the timeline', () => {
  const points = profile();
  assert.deepEqual(measurementAt(points, .2), points[2]);
  assert.deepEqual(measurementAt(points, .1), points[1]);
  assert.deepEqual(measurementAt(points, -100), points[0]);
  assert.deepEqual(measurementAt(points, 100), points.at(-1));
  assert.deepEqual(measurementAt([{ time: 2, thrust: 3 }], 100), { time: 2, thrust: 3 });
});

test('equal-distance ties select the earlier measurement', () => {
  const points = [{ time: 0, thrust: 1 }, { time: .5, thrust: 5 }, { time: 1, thrust: 10 }];
  assert.deepEqual(measurementAt(points, .25), points[0]);
  assert.deepEqual(measurementAt(points, .75), points[1]);
});

test('zero, one and two markers provide the expected nullable readouts', () => {
  const points = profile();
  assert.deepEqual(measureProfile(points), { a: null, b: null, deltaTime: null, deltaThrust: null });
  assert.deepEqual(measureProfile(points, [.2]), { a: points[2], b: null, deltaTime: null, deltaThrust: null });
  assert.deepEqual(measureProfile(points, [.1, .8]), { a: points[1], b: points[3], deltaTime: .8 - .1, deltaThrust: 10 });
});

test('differences are signed B-minus-A and coincident markers read zero', () => {
  const points = profile();
  const backwards = measureProfile(points, [.8, .1]);
  assert.equal(backwards.deltaTime, .1 - .8);
  assert.equal(backwards.deltaThrust, -10);
  const coincident = measureProfile(points, [.2, .25]);
  assert.equal(coincident.deltaTime, 0);
  assert.equal(coincident.deltaThrust, 0);
});

test('measurements never mutate data or marker times and return detached coordinates', () => {
  const points = profile(), times = [.2, .8];
  const before = structuredClone(points), beforeTimes = [...times];
  const measured = measureProfile(points, times);
  measured.a.thrust = 100;
  measured.b.time = 100;
  const single = measurementAt(points, .1);
  single.thrust = 999;
  assert.deepEqual(points, before);
  assert.deepEqual(times, beforeTimes);
});

test('invalid recordings and cursor inputs fail with useful errors', () => {
  const points = profile();
  for (const invalid of [null, [], [null], [{ time: 0, thrust: -1 }], [{ time: Infinity, thrust: 0 }], [{ time: 0, thrust: NaN }], [points[1], points[1]], [points[2], points[1]]]) {
    assert.throws(() => measurementAt(invalid, 0));
    assert.throws(() => measureProfile(invalid));
  }
  for (const invalid of [NaN, Infinity, -Infinity, '1', null]) assert.throws(() => measurementAt(points, invalid), /finite time/);
  for (const invalid of [null, 'all', [0, 1, 2], [NaN], [Infinity], ['1'], Array(1)]) assert.throws(() => measureProfile(points, invalid), /up to two finite/);
});

test('extreme finite sample times remain measurable and overflowing differences fail', () => {
  const points = [{ time: -Number.MAX_VALUE, thrust: 0 }, { time: Number.MAX_VALUE, thrust: 1 }];
  assert.deepEqual(measurementAt(points, 0), points[0]);
  assert.throws(() => measureProfile(points, [-Number.MAX_VALUE, Number.MAX_VALUE]), /outside the supported numeric range/);
});

const renderer = measurement => renderMeasurements({ measurement, x: time => 70 + time * 200, y: thrust => 250 - thrust * 8, box: { left: 60, right: 460, top: 25, bottom: 260 }, units: { time: 'ms', thrust: 'kN', impulse: 'N·s' } });

test('the SVG overlay renders a single labeled draggable marker without empty delta labels', () => {
  assert.equal(renderer(measureProfile(profile())), '');
  const markup = renderer(measureProfile(profile(), [.1]));
  assert.match(markup, /data-measure-marker="0"/);
  assert.doesNotMatch(markup, /data-measure-marker="1"|Δt|ΔF/);
  assert.match(markup, /A 100\.000 ms · 0\.010 kN/);
  assert.match(markup, /stroke-dasharray="4 4"/);
  assert.match(markup, /#168b88/);
});

test('the SVG overlay displays both marker coordinates and signed differences in selected units', () => {
  const markup = renderer(measureProfile(profile(), [.8, .1]));
  assert.match(markup, /data-measure-marker="0"/);
  assert.match(markup, /data-measure-marker="1"/);
  assert.match(markup, /#8766b3/);
  assert.match(markup, /B 100\.000 ms · 0\.010 kN/);
  assert.match(markup, /Δt -700\.000 ms/);
  assert.match(markup, /ΔF -0\.010 kN/);
  assert.doesNotMatch(markup, /NaN|Infinity|undefined/);
});

test('coincident marker labels use different positions and stay inside the plot', () => {
  const markup = renderer(measureProfile(profile(), [.1, .1]));
  const rectangles = [...markup.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/g)].map(([, left, top, width, height]) => ({ left: Number(left), top: Number(top), width: Number(width), height: Number(height) }));
  assert.equal(rectangles.length, 4);
  assert.notEqual(rectangles[0].top, rectangles[1].top);
  assert.ok(rectangles.every(rect => rect.height > 0 && rect.left >= 60 && rect.left + rect.width <= 460 && rect.top >= 25 && rect.top + rect.height <= 260));
});
