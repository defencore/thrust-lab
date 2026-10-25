import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleEnvelope } from '../src/chart-data.js';

const line = (length) => Array.from({ length }, (_, time) => ({ time, thrust: time }));

test('visible extraction preserves samples and one neighbor on either side', () => {
  const points = line(10);
  assert.deepEqual(visibleEnvelope(points, 3, 5), points.slice(2, 7));
  assert.deepEqual(visibleEnvelope(points, 3.2, 5.8), points.slice(3, 7));
  assert.deepEqual(visibleEnvelope(points, 3.2, 3.8), points.slice(3, 5));
  assert.deepEqual(visibleEnvelope(points, 3, 3), points.slice(2, 5));
  assert.deepEqual(visibleEnvelope(points, -10, -2), [points[0]]);
  assert.deepEqual(visibleEnvelope(points, 20, 30), [points.at(-1)]);
  assert.deepEqual(visibleEnvelope(points, -1, 20), points);
  assert.deepEqual(visibleEnvelope([], 0, 1), []);
});

test('envelope keeps a single-sample peak that stride decimation would omit', () => {
  const points = Array.from({ length: 30000 }, (_, index) => ({ time: index / 1000, thrust: index === 1 ? 100 : 0 }));
  const envelope = visibleEnvelope(points, 0, 29.999);
  assert.ok(envelope.includes(points[1]));
  assert.equal(envelope[0], points[0]);
  assert.equal(envelope.at(-1), points.at(-1));
  assert.ok(envelope.length <= 2500);
  assert.ok(envelope.every((point, index) => !index || point.time > envelope[index - 1].time));
});

test('envelope retains local minima and maxima in chronological order', () => {
  const points = line(1000).map((point, index) => ({ ...point, thrust: index % 31 === 0 ? 100 : index % 29 === 0 ? 0 : 50 }));
  const envelope = visibleEnvelope(points, 0, 999, 102);
  assert.ok(envelope.length <= 102);
  assert.ok(envelope.filter(point => point.thrust === 100).length > 25);
  assert.ok(envelope.filter(point => point.thrust === 0).length > 25);
  assert.ok(envelope.every((point, index) => !index || point.time > envelope[index - 1].time));
});

test('zoomed extraction recovers original measurement detail without mutation', () => {
  const points = Array.from({ length: 30000 }, (_, index) => ({ time: index / 1000, thrust: index % 13 }));
  const snapshot = structuredClone(points);
  const envelope = visibleEnvelope(points, 5.2, 5.21, 100);
  assert.deepEqual(envelope, points.slice(5199, 5212));
  assert.deepEqual(points, snapshot);
  assert.equal(envelope[0], points[5199]);
});

test('limits remain bounded for odd limits and constant signals', () => {
  const points = line(1000).map(point => ({ ...point, thrust: 5 }));
  for (const limit of [4, 5, 17, 100]) {
    const envelope = visibleEnvelope(points, 0, 999, limit);
    assert.ok(envelope.length <= limit);
    assert.equal(envelope[0], points[0]);
    assert.equal(envelope.at(-1), points.at(-1));
  }
  assert.throws(() => visibleEnvelope(points, 10, 0), /bounds/);
  assert.throws(() => visibleEnvelope(points, 0, 999, 2), /at least four/);
});
