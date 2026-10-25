import test from 'node:test';
import assert from 'node:assert/strict';
import { clearChartSelection } from '../src/controllers/selection-controller.js';
import { createProjectStore } from '../src/project-store.js';

function fixture(mode = 'edit') {
  const points = [0, .2, .7, 1].map((time, index) => ({ time, thrust: 10 + index }));
  const store = createProjectStore({ name: 'Measurement', points, original: structuredClone(points), theory: null, selection: [.2, .7], scope: 'selection' }, { storage: null });
  const ui = { mode, tool: 'curve', selectedSample: 2, measurementTimes: [.2, .7] };
  const calls = [];
  const ctx = {
    store, ui, chart: { cancelDrag() { calls.push('cancel'); } }, signal: { reset() { calls.push('effect'); } },
    curve: { deactivate() { calls.push('curve'); } }, measurement: { clear() { ui.measurementTimes = []; } },
    render() { calls.push('render'); },
  };
  return { ctx, store, calls };
}

test('clear selection removes range, control highlight, sample highlight and rulers without editing data', () => {
  const { ctx, store, calls } = fixture();
  const before = structuredClone(store.get().points);
  clearChartSelection(ctx);
  assert.equal(store.get().selection, null);
  assert.equal(store.get().scope, 'all');
  assert.equal(ctx.ui.selectedSample, null);
  assert.equal(ctx.ui.tool, 'select');
  assert.deepEqual(ctx.ui.measurementTimes, []);
  assert.deepEqual(store.get().points, before);
  assert.deepEqual(calls, ['cancel', 'effect', 'curve', 'render']);
  store.undo();
  assert.deepEqual(store.get().selection, [.2, .7]);
  assert.deepEqual(store.get().points, before);
});

test('clearing overlays in a generator preview preserves the working profile and its range', () => {
  const { ctx, store } = fixture('create');
  const before = store.get();
  clearChartSelection(ctx);
  assert.equal(store.get(), before);
  assert.equal(store.status().undoCount, 0);
  assert.deepEqual(ctx.ui.measurementTimes, []);
});

test('clearing an already empty selection does not add history', () => {
  const { ctx, store } = fixture();
  clearChartSelection(ctx);
  const count = store.status().undoCount;
  clearChartSelection(ctx);
  assert.equal(store.status().undoCount, count);
});
