import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticMarker, inspectSyntheticMarker, SYNTHETIC_MARKER_COUNT, SYNTHETIC_MARKER_ID } from '../src/synthetic-marker.js';

const recording = () => [{ time: 0, thrust: 82 }, { time: .00017, thrust: 112 }, { time: .0023, thrust: 0 }];

test('the tiny ten-record prefix precedes rather than replaces actual measurements', () => {
  const points = recording(), before = structuredClone(points);
  const prefix = createSyntheticMarker(points);
  assert.equal(prefix.length, SYNTHETIC_MARKER_COUNT);
  assert.ok(prefix.every((point, index) => point.time < points[0].time && point.thrust > 0 && point.thrust < 1e-7 && (!index || point.time > prefix[index - 1].time)));
  assert.deepEqual(points, before);
  assert.deepEqual(prefix.map(point => point.thrust / 1e-9), [13, 71, 29, 83, 47, 19, 61, 37, 97, 53]);
  const inspection = inspectSyntheticMarker([...prefix, ...points]);
  assert.equal(inspection.detected, true);
  assert.equal(inspection.scheme, SYNTHETIC_MARKER_ID);
  assert.equal(inspection.markerCount, 10);
  assert.deepEqual(inspection.profilePoints, points);
  inspection.profilePoints[0].thrust = 0;
  inspection.markerPoints[0].thrust = 1;
  assert.deepEqual(points, before);
  assert.notEqual(prefix[0].thrust, 1);
});

test('prefix timestamps stay finite and ordered on negative, tiny and large-origin timelines', () => {
  for (const points of [
    [{ time: -42, thrust: 1 }, { time: -41, thrust: 0 }],
    [{ time: 0, thrust: 1 }, { time: Number.MIN_VALUE, thrust: 0 }],
    [{ time: 1e100, thrust: 1 }, { time: 1.000000000000001e100, thrust: 0 }],
    [{ time: -1e300, thrust: 1 }, { time: -9e299, thrust: 0 }],
  ]) {
    const prefix = createSyntheticMarker(points);
    assert.ok(prefix.every((point, index) => Number.isFinite(point.time) && point.time < points[0].time && (!index || point.time > prefix[index - 1].time)));
    assert.deepEqual(inspectSyntheticMarker([...prefix, ...points]).profilePoints, points);
  }
  assert.throws(() => createSyntheticMarker([{ time: -Number.MAX_VALUE, thrust: 1 }, { time: 0, thrust: 0 }]), /no room/);
});

test('partial, changed, reordered and ordinary near-zero samples are retained as real data', () => {
  const points = recording(), prefix = createSyntheticMarker(points);
  for (const input of [
    points,
    [...prefix.slice(1), ...points],
    [...prefix.map((point, index) => ({ ...point, thrust: point.thrust * (index === 4 ? 1.00000001 : 1) })), ...points],
    [...prefix.map((point, index) => ({ ...point, thrust: prefix[prefix.length - index - 1].thrust })), ...points],
    [...prefix.map(point => ({ ...point, thrust: .00000004 })), ...points],
    [...prefix, points[0]],
  ]) {
    const result = inspectSyntheticMarker(input);
    assert.equal(result.detected, false);
    assert.equal(result.scheme, null);
    assert.equal(result.markerCount, 0);
    assert.deepEqual(result.markerPoints, []);
    assert.deepEqual(result.profilePoints, input);
  }
});

test('detection rejects invalid prefix timestamps and permits only floating-point conversion error', () => {
  const points = recording(), prefix = createSyntheticMarker(points);
  const converted = prefix.map(point => ({ ...point, thrust: point.thrust / 9.80665 * 9.80665 }));
  assert.equal(inspectSyntheticMarker([...converted, ...points]).detected, true);
  for (const time of [NaN, Infinity, prefix[1].time, points[0].time]) {
    const invalid = structuredClone(prefix); invalid[0].time = time;
    assert.equal(inspectSyntheticMarker([...invalid, ...points]).detected, false);
  }
  assert.throws(() => inspectSyntheticMarker(null), /array/);
  for (const input of [[], [points[0]], [{ time: 0, thrust: -1 }, points[1]], [{ time: 0, thrust: 1 }, { time: 0, thrust: 2 }], new Array(2)]) assert.throws(() => createSyntheticMarker(input), /valid measurements/);
});
