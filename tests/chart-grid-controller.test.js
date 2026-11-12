import test from 'node:test';
import assert from 'node:assert/strict';
import { createChartGridController } from '../src/controllers/chart-grid-controller.js';
import { createPreferences } from '../src/preferences.js';
import { createProjectStore } from '../src/project-store.js';
import { axisTicks } from '../src/vertical-view.js';
import { unitSymbol } from '../src/units.js';

class Control extends EventTarget {
  constructor() {
    super(); this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false; this.attributes = new Map();
    const classes = new Set();
    this.classList = { toggle(name, state) { if (state) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  change(value) { this.value = String(value); this.dispatchEvent(new Event('change')); }
  input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
}

function fixture() {
  const fields = new Map(), $ = id => { if (!fields.has(id)) fields.set(id, new Control()); return fields.get(id); };
  const preferences = createPreferences(null);
  const store = createProjectStore({ name: 'Grid recording', points: [{ time: 0, thrust: 0 }, { time: 1, thrust: 8000 }, { time: 2, thrust: 0 }] }, { storage: null });
  let display = { thrust: 'kgf', time: 's', impulse: 'N·s' }, view = [0, 1000 * 9.80665], controller;
  const chart = { state: {}, effectiveThrustView: () => view, gridInfo: null, canFitBurnRegion: () => true, fitBurnRegion() {} };
  const ctx = {
    $, preferences, store, chart, activeProfile: () => store.get(),
    units: { get: () => display, symbol: dimension => unitSymbol(dimension, display) },
    render() {
      const settings = controller.getState();
      chart.gridInfo = { ...axisTicks(view, display, 5, { stepSI: settings.gridStepSI, strict: false }), labelEvery: 1 };
      controller.render();
    },
  };
  controller = createChartGridController(ctx); ctx.render();
  return { $, preferences, store, controller, chart, render: ctx.render, setUnits(thrust) { display = { ...display, thrust }; ctx.render(); }, setView(next) { view = next; ctx.render(); } };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected || 1) * 1e-10, `${actual} should equal ${expected}`);

test('custom display-unit spacing and height are cached without changing measurements or undo history', () => {
  const f = fixture(), original = f.store.get();
  f.$('#thrust-grid-mode').change('custom');
  f.$('#thrust-grid-step').input(25);
  close(f.controller.getState().gridStepSI, 25 * 9.80665);
  assert.equal(f.chart.gridInfo.valuesSI.length, 41);
  assert.equal(f.$('#thrust-grid-step').disabled, false);
  f.$('#chart-height').change('760');
  assert.equal(f.controller.getState().chartHeight, 760);
  assert.deepEqual(f.preferences.get().chartGrid, { mode: 'custom', stepSI: 25 * 9.80665, height: 760 });
  assert.equal(f.store.get(), original);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});

test('unit changes convert custom grid spacing while keeping physical grid lines and view intact', () => {
  const f = fixture();
  f.$('#thrust-grid-mode').change('custom'); f.$('#thrust-grid-step').input(25);
  const canonical = f.controller.getState().gridStepSI, ticks = [...f.chart.gridInfo.valuesSI];
  f.setUnits('N');
  close(Number(f.$('#thrust-grid-step').value), canonical);
  assert.equal(f.$('#thrust-grid-unit').textContent, 'N');
  assert.deepEqual(f.chart.gridInfo.valuesSI, ticks);
  f.setUnits('kN');
  close(Number(f.$('#thrust-grid-step').value), canonical / 1000);
  f.$('#thrust-grid-mode').change('custom');
  assert.equal(f.controller.getState().gridStepSI, canonical);
  f.store.destroy();
});

test('invalid and excessively dense drafts leave the last valid spacing usable', () => {
  const f = fixture();
  f.$('#thrust-grid-mode').change('custom'); f.$('#thrust-grid-step').input(25);
  const valid = f.controller.getState().gridStepSI;
  for (const value of ['', 0, -1, .001]) {
    f.$('#thrust-grid-step').input(value);
    assert.equal(f.controller.getState().gridStepSI, valid);
    assert.equal(f.$('#thrust-grid-error').hidden, false);
    assert.equal(f.$('#thrust-grid-step').attributes.get('aria-invalid'), 'true');
  }
  f.$('#thrust-grid-step').input(50);
  close(f.controller.getState().gridStepSI, 50 * 9.80665);
  assert.equal(f.$('#thrust-grid-error').hidden, true);
  f.setView([0, 1e9]);
  assert.equal(f.chart.gridInfo.densityLimited, true);
  assert.equal(f.$('#thrust-grid-status').textContent, 'Zoom in to show every grid line.');
  f.store.destroy();
});

test('Auto and reset preferences restore only display settings; invalid unit drafts do not change the mode', () => {
  const f = fixture(), original = f.store.get();
  f.$('#thrust-grid-mode').change('custom'); f.$('#thrust-grid-step').input(25);
  f.$('#thrust-grid-mode').change('auto');
  assert.equal(f.controller.getState().gridStepSI, null);
  assert.equal(f.$('#thrust-grid-step').disabled, true);
  f.setView([0, 1e8]);
  f.$('#thrust-grid-mode').change('custom');
  assert.equal(f.controller.getState().gridStepSI, null);
  assert.equal(f.$('#thrust-grid-error').hidden, false);
  f.setUnits('N');
  assert.equal(f.$('#thrust-grid-mode').value, 'auto');
  assert.equal(f.$('#thrust-grid-step').disabled, true);
  assert.equal(f.$('#thrust-grid-error').hidden, true);
  f.preferences.reset(); f.controller.restorePreferences(); f.render();
  assert.deepEqual(f.controller.getState(), { gridStepSI: null, chartHeight: null });
  assert.equal(f.store.get(), original);
  f.store.destroy();
});

test('burn-region fit control follows the active recording availability and delegates only a view action', () => {
  const f = fixture(), original = f.store.get();
  let clicks = 0;
  f.chart.fitBurnRegion = () => { clicks++; };
  f.$('#zoom-burn').dispatchEvent(new Event('click'));
  assert.equal(clicks, 1);
  assert.equal(f.$('#zoom-burn').disabled, false);
  f.chart.canFitBurnRegion = () => false; f.render();
  assert.equal(f.$('#zoom-burn').disabled, true);
  assert.equal(f.store.get(), original);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});
