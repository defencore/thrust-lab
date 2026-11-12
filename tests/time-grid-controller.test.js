import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeGridController } from '../src/controllers/time-grid-controller.js';
import { createPreferences } from '../src/preferences.js';
import { createProjectStore } from '../src/project-store.js';
import { timeTicks } from '../src/time-axis.js';
import { unitSymbol } from '../src/units.js';

class Control extends EventTarget {
  constructor() {
    super(); this.value = ''; this.checked = false; this.textContent = ''; this.hidden = false; this.disabled = false; this.attributes = new Map();
    const classes = new Set();
    this.classList = { toggle(name, state) { if (state) classes.add(name); else classes.delete(name); } };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  change(value) { this.value = String(value); this.dispatchEvent(new Event('change')); }
  input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
  check(value) { this.checked = value; this.dispatchEvent(new Event('change')); }
}

function fixture() {
  const fields = new Map(), $ = id => { if (!fields.has(id)) fields.set(id, new Control()); return fields.get(id); };
  const preferences = createPreferences(null);
  const store = createProjectStore({ name: 'Timed recording', points: [{ time: 10, thrust: 0 }, { time: 11, thrust: 8000 }, { time: 12, thrust: 0 }] }, { storage: null });
  let display = { thrust: 'N', time: 's', impulse: 'N·s' }, controller;
  const chart = { state: { view: [10, 12], timeOriginSI: 10 }, box: { width: 640 }, timeGridInfo: null };
  const ctx = {
    $, preferences, store, chart, activeProfile: () => store.get(),
    units: { get: () => display, symbol: dimension => unitSymbol(dimension, display) },
    render() {
      const settings = controller.getState();
      chart.timeGridInfo = timeTicks(chart.state.view, { originSI: chart.state.timeOriginSI, stepSI: settings.timeGridStepSI, width: chart.box.width, strict: false });
      controller.render();
    },
  };
  controller = createTimeGridController(ctx); ctx.render();
  return { $, preferences, store, controller, chart, render: ctx.render, setUnits(time) { display = { ...display, time }; ctx.render(); }, setView(view) { chart.state.view = view; ctx.render(); } };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected || 1) * 1e-10, `${actual} should equal ${expected}`);

test('time grid visibility and canonical spacing are cached without altering samples or history', () => {
  const f = fixture(), original = f.store.get();
  assert.deepEqual(f.controller.getState(), { timeGridVisible: true, timeGridStepSI: null });
  assert.equal(f.$('#time-grid-step').disabled, true);
  f.$('#time-grid-mode').change('custom');
  assert.deepEqual(f.chart.timeGridInfo.valuesSI, [10, 10.5, 11, 11.5, 12]);
  f.$('#time-grid-step').input(.25);
  assert.equal(f.controller.getState().timeGridStepSI, .25);
  f.$('#time-grid-visible').check(false);
  assert.equal(f.$('#time-grid-mode').disabled, true);
  assert.equal(f.$('#time-grid-step').disabled, true);
  assert.deepEqual(f.preferences.get().timeGrid, { visible: false, mode: 'custom', stepSI: .25 });
  f.$('#time-grid-visible').check(true);
  assert.equal(f.$('#time-grid-step').disabled, false);
  assert.equal(f.controller.getState().timeGridStepSI, .25);
  assert.equal(f.store.get(), original);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});

test('display time units convert controls while preserving exact canonical steps and relative grid origin', () => {
  const f = fixture();
  f.setUnits('ms');
  f.$('#time-grid-mode').change('custom'); f.$('#time-grid-step').input(125);
  const canonical = f.controller.getState().timeGridStepSI, ticks = [...f.chart.timeGridInfo.valuesSI];
  assert.equal(canonical, .125);
  assert.equal(f.$('#time-grid-unit').textContent, 'ms');
  f.setUnits('min');
  close(Number(f.$('#time-grid-step').value), .125 / 60);
  f.$('#time-grid-mode').change('custom');
  assert.equal(f.controller.getState().timeGridStepSI, canonical);
  f.setUnits('us');
  assert.equal(Number(f.$('#time-grid-step').value), 125000);
  assert.deepEqual(f.chart.timeGridInfo.valuesSI, ticks);
  assert.equal(f.chart.timeGridInfo.valuesSI[0], 10);
  f.store.destroy();
});

test('invalid and excessively dense time grid drafts retain the last valid step and recover live', () => {
  const f = fixture();
  f.$('#time-grid-mode').change('custom'); f.$('#time-grid-step').input(.25);
  for (const value of ['', 0, -1, Infinity, .001]) {
    f.$('#time-grid-step').input(value);
    assert.equal(f.controller.getState().timeGridStepSI, .25);
    assert.equal(f.$('#time-grid-error').hidden, false);
    assert.equal(f.$('#time-grid-step').attributes.get('aria-invalid'), 'true');
    assert.equal(f.preferences.get().timeGrid.stepSI, .25);
  }
  f.$('#time-grid-step').input(.5);
  assert.equal(f.$('#time-grid-error').hidden, true);
  assert.equal(f.$('#time-grid-step').attributes.has('aria-invalid'), false);
  f.setView([10, 10000]);
  assert.equal(f.chart.timeGridInfo.densityLimited, true);
  assert.equal(f.$('#time-grid-status').textContent, 'Zoom in to show every grid line.');
  f.$('#time-grid-visible').check(false);
  assert.equal(f.$('#time-grid-status').hidden, true);
  f.store.destroy();
});

test('zoom label density, Auto and preference reset update view controls independently of recording data', () => {
  const f = fixture(), original = f.store.get();
  f.$('#time-grid-mode').change('custom'); f.$('#time-grid-step').input(.01);
  assert.ok(f.chart.timeGridInfo.labelEvery > 1);
  assert.equal(f.$('#time-grid-status').textContent, 'Zoom in or widen the chart to show more time labels.');
  f.setView([10, 10.02]);
  assert.equal(f.$('#time-grid-status').hidden, true);
  f.$('#time-grid-mode').change('auto');
  assert.equal(f.controller.getState().timeGridStepSI, null);
  f.$('#time-grid-visible').check(false);
  f.preferences.reset(); f.controller.restorePreferences(); f.render();
  assert.deepEqual(f.controller.getState(), { timeGridVisible: true, timeGridStepSI: null });
  assert.equal(f.$('#time-grid-visible').checked, true);
  assert.equal(f.$('#time-grid-mode').value, 'auto');
  assert.equal(f.$('#time-grid-step').disabled, true);
  assert.equal(f.store.get(), original);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});
