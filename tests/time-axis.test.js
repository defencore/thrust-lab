import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime, timeTicks } from '../src/time-axis.js';
import { formatTime } from '../src/units.js';

test('relative time changes labels without changing timestamp coordinates', () => {
  assert.equal(relativeTime(3.5, 3), .5);
  assert.equal(relativeTime(3, 3), 0);
  assert.equal(relativeTime(2.5, 3), -.5);
  assert.equal(relativeTime(3.5, null), 3.5);
  assert.equal(relativeTime(-0), 0);
});

test('custom time intervals align to origin and retain the same physical detail in milliseconds', () => {
  const view = [3, 6.5], before = [...view];
  const ticks = timeTicks(view, { originSI: 3, stepSI: .5 });
  assert.deepEqual(ticks.valuesSI, [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5]);
  assert.deepEqual(ticks.valuesSI.map(value => formatTime(relativeTime(value, 3), { time: 'ms' })), ['0', '500', '1000', '1500', '2000', '2500', '3000', '3500']);
  assert.equal(ticks.stepSI, .5);
  assert.equal(ticks.labelEvery, 1);
  assert.equal(ticks.custom, true);
  assert.equal(ticks.densityLimited, false);
  assert.deepEqual(view, before);
});

test('custom tick alignment keeps a fixed origin through panning and supports negative labels', () => {
  assert.deepEqual(timeTicks([3.2, 6.2], { originSI: 3, stepSI: .5 }).valuesSI, [3.5, 4, 4.5, 5, 5.5, 6]);
  assert.deepEqual(timeTicks([2, 4], { originSI: 3, stepSI: .5 }).valuesSI.map(value => relativeTime(value, 3)), [-1, -.5, 0, .5, 1]);
  const decimal = timeTicks([.3, .6], { stepSI: .1 });
  assert.deepEqual(decimal.valuesSI.map(value => formatTime(value)), ['0.3', '0.4', '0.5', '0.6']);
});

test('automatic time ticks retain viewport endpoints and thin labels without dropping custom grid lines', () => {
  const automatic = timeTicks([3, 6.5], { originSI: 3, count: 5 });
  assert.equal(automatic.valuesSI.length, 6);
  assert.equal(automatic.valuesSI[0], 3);
  assert.equal(automatic.valuesSI.at(-1), 6.5);
  assert.equal(automatic.custom, false);
  assert.equal(automatic.stepSI, .7);
  const narrow = timeTicks([0, 10], { stepSI: .1, width: 300 });
  assert.equal(narrow.valuesSI.length, 101);
  assert.ok(narrow.labelEvery > 1);
  assert.equal(narrow.labelStepSI, narrow.stepSI * narrow.labelEvery);
  const tiny = timeTicks([0, Number.MIN_VALUE]);
  assert.deepEqual(tiny.valuesSI, [0, Number.MIN_VALUE]);
  assert.equal(tiny.stepSI, Number.MIN_VALUE);
});

test('dense and extreme custom time grids fail validation clearly and remain bounded when rendering', () => {
  assert.throws(() => timeTicks([0, 10], { stepSI: .001 }), issue => issue.code === 'GRID_DENSITY' && issue.minimumStepSI === 10 / 499);
  for (const [view, stepSI] of [[[0, 10], .001], [[0, Number.MAX_VALUE], Number.MIN_VALUE]]) {
    const ticks = timeTicks(view, { stepSI, strict: false });
    assert.equal(ticks.densityLimited, true);
    assert.ok(ticks.valuesSI.length > 1 && ticks.valuesSI.length <= 500);
    assert.ok(ticks.valuesSI.every(Number.isFinite));
    assert.ok(Number.isFinite(ticks.stepSI) && ticks.stepSI > 0);
  }
  assert.ok(timeTicks([0, 10], { count: 1e10 }).valuesSI.length <= 500);
});

test('invalid time views, origins and grid parameters fail before rendering', () => {
  for (const view of [null, [], [0], [1, 1], [2, 1], [0, Infinity], [NaN, 1], [-Number.MAX_VALUE, Number.MAX_VALUE]]) assert.throws(() => timeTicks(view), /Time view/);
  for (const stepSI of [0, -1, Infinity, NaN]) assert.throws(() => timeTicks([0, 1], { stepSI }), /finite and greater/);
  for (const count of [0, -1, 2.5, Infinity]) assert.throws(() => timeTicks([0, 1], { count }), /positive whole/);
  for (const width of [0, -1, Infinity, NaN]) assert.throws(() => timeTicks([0, 1], { width }), /width/);
  assert.throws(() => relativeTime(NaN), /finite/);
  assert.throws(() => relativeTime(1, Infinity), /finite/);
  assert.throws(() => relativeTime(Number.MAX_VALUE, -Number.MAX_VALUE), /numeric range/);
});
