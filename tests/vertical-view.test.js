import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultThrustView, axisTicks, zoomVerticalView, panVerticalView } from '../src/vertical-view.js';
import { unitFactor } from '../src/units.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected || 1) * 1e-12, `${actual} should equal ${expected}`);

test('automatic thrust view adds headroom and rounds to nice ticks in display units', () => {
  assert.deepEqual(defaultThrustView(100), [0, 125]);
  assert.deepEqual(defaultThrustView(1000, { thrust: 'kN' }), [0, 1250]);
  close(defaultThrustView(9.80665, { thrust: 'kgf' })[1], 1.25 * 9.80665);
  close(defaultThrustView(4.4482216152605, { thrust: 'lbf' })[1], 1.25 * 4.4482216152605);
});

test('zero-force recordings have a stable positive fallback view', () => {
  assert.deepEqual(defaultThrustView(0), [0, 1.25]);
  close(defaultThrustView(0, { thrust: 'kN' })[1], 1.25);
  for (const thrust of ['N', 'kN', 'kgf', 'lbf']) assert.ok(defaultThrustView(0, { thrust })[1] > 1);
});

test('axis ticks remain inside the viewport and carry exact canonical force values', () => {
  const ticks = axisTicks([0, 1250], { thrust: 'kN' });
  assert.deepEqual(ticks.valuesSI, [0, 250, 500, 750, 1000, 1250]);
  assert.equal(ticks.stepSI, 250);
  assert.equal(ticks.precision, 3);
  const offset = axisTicks([130, 690], { thrust: 'N' });
  assert.ok(offset.valuesSI.every(value => value >= 130 && value <= 690));
  assert.ok(offset.valuesSI.length > 1);
});

test('tick generation is bounded and display-unit changes retain physical viewport limits', () => {
  const view = [0, 100];
  for (const thrust of ['N', 'kN', 'kgf', 'lbf']) {
    const ticks = axisTicks(view, { thrust }, 100000);
    assert.ok(ticks.valuesSI.length <= 12);
    assert.ok(ticks.valuesSI.every(value => value >= view[0] && value <= view[1]));
    assert.ok(ticks.stepSI / unitFactor('thrust', { thrust }) > 0);
    assert.ok(Number.isInteger(ticks.precision) && ticks.precision >= 0 && ticks.precision <= 12);
  }
  assert.deepEqual(view, [0, 100]);
});

test('zoom buttons scale force around zero and are reversible before hitting limits', () => {
  const extent = [0, 100];
  const original = [...extent];
  const enlarged = zoomVerticalView(extent, .5, { extent });
  assert.deepEqual(enlarged, [0, 50]);
  assert.deepEqual(zoomVerticalView(enlarged, 2, { extent }), extent);
  assert.deepEqual(zoomVerticalView(extent, 2, { extent }), [0, 200]);
  assert.deepEqual(extent, original);
  assert.notEqual(enlarged, extent);
});

test('an explicit force anchor retains its relative screen position during zoom', () => {
  const result = zoomVerticalView([20, 100], .5, { anchor: 60, extent: [0, 100] });
  assert.deepEqual(result, [40, 80]);
  assert.deepEqual(zoomVerticalView([20, 100], .5, { anchor: null, extent: [0, 100] }), [40, 80]);
  assert.deepEqual(zoomVerticalView([0, 100], 2, { anchor: 50, extent: [0, 100] }), [0, 200]);
});

test('zoom limits permit 1000-fold enlargement and twenty-fold compression', () => {
  const extent = [0, 100];
  assert.deepEqual(zoomVerticalView(extent, 1e-100, { extent }), [0, .1]);
  assert.deepEqual(zoomVerticalView(extent, 1e100, { extent }), [0, 2000]);
});

test('panning retains view width while clamping to zero and the upper viewing extent', () => {
  const options = { extent: [0, 100] };
  assert.deepEqual(panVerticalView([20, 40], 10, options), [30, 50]);
  assert.deepEqual(panVerticalView([20, 40], -100, options), [0, 20]);
  assert.deepEqual(panVerticalView([20, 40], 1e308, options), [1980, 2000]);
  assert.deepEqual(panVerticalView([0, 2000], 100, options), [0, 2000]);
});

test('small and large force scales produce finite views and usable ticks', () => {
  for (const peak of [1e-250, 1e-9, 1e250, Number.MAX_VALUE]) {
    for (const thrust of ['N', 'kN', 'kgf', 'lbf']) {
      const view = defaultThrustView(peak, { thrust });
      assert.ok(Number.isFinite(view[1]) && view[1] >= peak);
      const ticks = axisTicks(view, { thrust });
      assert.ok(Number.isFinite(ticks.stepSI) && ticks.stepSI > 0);
      assert.ok(ticks.valuesSI.length <= 12 && ticks.valuesSI.every(Number.isFinite));
      const zoomed = zoomVerticalView(view, .5, { extent: view });
      assert.ok(zoomed.every(Number.isFinite) && zoomed[1] > zoomed[0]);
    }
  }
});

test('invalid views, factors, anchors, peaks and tick counts fail before mutation', () => {
  const invalidViews = [null, [], [0], [0, 0], [2, 1], [-1, 1], [0, Infinity], [NaN, 1]];
  for (const view of invalidViews) {
    assert.throws(() => axisTicks(view));
    assert.throws(() => zoomVerticalView(view, .5));
    assert.throws(() => panVerticalView(view, 1));
  }
  for (const peak of [-1, NaN, Infinity, '100']) assert.throws(() => defaultThrustView(peak), /finite and nonnegative/);
  for (const count of [0, -1, 2.5, Infinity]) assert.throws(() => axisTicks([0, 100], undefined, count), /positive whole/);
  for (const factor of [0, -1, NaN, Infinity]) assert.throws(() => zoomVerticalView([0, 100], factor), /finite positive/);
  assert.throws(() => zoomVerticalView([0, 100], .5, { anchor: Infinity }), /anchor must be finite/);
  assert.throws(() => zoomVerticalView([0, 100], .5, { extent: [0, 0] }), /Automatic thrust extent/);
  assert.throws(() => panVerticalView([0, 100], Infinity), /finite force shift/);
});
