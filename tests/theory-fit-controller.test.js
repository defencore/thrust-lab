import test from 'node:test';
import assert from 'node:assert/strict';
import { createTheoryFitController } from '../src/controllers/theory-fit-controller.js';
import { createProjectStore } from '../src/project-store.js';
import { createPreferences } from '../src/preferences.js';
import { metrics } from '../src/profile.js';

class Control extends EventTarget {
  constructor(value = '') {
    super(); this.value = String(value); this.checked = false; this.disabled = false; this.hidden = false; this.textContent = ''; this.innerHTML = ''; this.attributes = new Map(); this.children = new Map();
    const classes = new Set();
    this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), toggle(name, state) { if (state ?? !classes.has(name)) classes.add(name); else classes.delete(name); } };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, new Control()); return this.children.get(selector); }
  input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
  toggle(checked) { this.checked = checked; this.dispatchEvent(new Event('change')); }
  click() { this.onclick?.(); }
}

function fixture({ hasTheory = true, mode = 'edit', settings = {}, cached = true } = {}) {
  const initial = Array.from({ length: 501 }, (_, index) => {
    const signal = index < 50 || index > 350 ? 0 : 50 * Math.sin(Math.PI * (index - 50) / 300);
    return { time: index / 100, thrust: signal > 1 ? signal + (index % 2 ? .6 : -.6) : Math.max(0, signal) };
  });
  const theory = [{ time: 0, thrust: 0 }, { time: .2, thrust: 10 }, { time: .5, thrust: 8 }, { time: .8, thrust: 5 }, { time: 1, thrust: 0 }];
  const store = createProjectStore({ name: 'Measured recording', points: initial, original: structuredClone(initial), theory: hasTheory ? theory : null, selection: [.5, 4], scope: 'selection', curveEdit: { nodes: [initial[0], initial.at(-1)], range: null, interpolation: 'smooth' } }, { storage: null });
  const preferences = createPreferences(null);
  if (cached) preferences.update({ theoryFit: { start: 1, duration: 2, peak: 100, areaMode: 'impulse', impulse: 100, average: 50, shapeBlend: 1, noiseSource: 'none', noiseLevel: 1, window: 15, tailStart: null, ...settings } });
  const fields = new Map();
  const $ = selector => { if (!fields.has(selector)) fields.set(selector, new Control()); return fields.get(selector); };
  const units = {
    read: id => $(`#${id}`).value.trim() ? Number($(`#${id}`).value) : NaN,
    set: (id, value) => { $(`#${id}`).value = String(value); },
    format: value => String(value), symbol: dimension => ({ time: 's', thrust: 'N', impulse: 'N·s' })[dimension],
  };
  const errors = [], beforeEdits = [];
  let controller, captured = null, resets = 0;
  const ui = { mode };
  const ctx = {
    $, $$: () => [], store, ui, units, preferences,
    signal: { getCaptured: () => captured, reset() { resets++; } }, curve: { deactivate() {} },
    beforeEdit(id) { beforeEdits.push(id); if (id !== 'theory-fit') controller?.deactivate(); this.signal.reset(); this.curve.deactivate(); },
    render() { controller?.render(); }, error: error => errors.push(error),
  };
  controller = createTheoryFitController(ctx);
  store.subscribe(event => { if (['undo', 'redo', 'cancel'].includes(event.type)) controller.deactivate(); controller.render(); });
  controller.render();
  return { $, controller, store, preferences, initial, errors, beforeEdits, ui, get resets() { return resets; }, setCaptured(value) { captured = value; } };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-9, `${actual} should equal ${expected}`);

test('restored targets remain inactive until a valid edit and never change the recording on load', () => {
  const f = fixture();
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#tf-enabled').checked, false);
  assert.equal(f.$('#tf-duration').value, '2');
  assert.equal(f.$('#tf-average').readOnly, true);
  assert.equal(f.store.status().undoCount, 0);
  assert.deepEqual(f.store.get().points, f.initial);
  assert.equal(f.controller.chartReference(), null);
  f.store.destroy();
});

test('editing duration enables coordinated live fitting with exact peak, impulse and timestamps', () => {
  const f = fixture();
  const before = structuredClone(f.store.get());
  f.$('#tf-duration').input(2.2);
  const achieved = metrics(f.store.get().points);
  assert.equal(f.controller.isActive, true);
  assert.equal(f.$('#tf-enabled').checked, true);
  close(achieved.burnDuration, 2.2);
  close(achieved.peak, 100);
  close(achieved.impulse, 100);
  close(Number(f.$('#tf-average').value), 100 / 2.2);
  assert.deepEqual(f.store.get().points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(f.store.get().original, before.original);
  assert.deepEqual(f.store.get().theory, before.theory);
  assert.equal(f.store.get().scope, 'all');
  assert.equal(f.store.get().curveEdit, null);
  assert.equal(f.beforeEdits.length, 1);
  assert.equal(f.resets, 1);
  assert.ok(f.controller.chartReference()?.length);
  assert.equal(f.errors.length, 0);
  f.store.destroy();
});

test('peak and total targets fit together while mean and impulse modes update the derived field', () => {
  const f = fixture();
  f.$('#tf-peak').input(120);
  close(metrics(f.store.get().points).peak, 120);
  close(metrics(f.store.get().points).impulse, 100);
  f.$('#tf-impulse').input(120);
  close(metrics(f.store.get().points).impulse, 120);
  close(Number(f.$('#tf-average').value), 60);
  f.$('#tf-area-mode').input('average');
  assert.equal(f.$('#tf-average').readOnly, false);
  assert.equal(f.$('#tf-impulse').readOnly, true);
  f.$('#tf-average').input(55);
  close(Number(f.$('#tf-impulse').value), 110);
  close(metrics(f.store.get().points).impulse, 110);
  close(metrics(f.store.get().points).burnAverage, 55);
  f.$('#tf-duration').input(2.2);
  close(Number(f.$('#tf-impulse').value), 121);
  close(metrics(f.store.get().points).burnAverage, 55);
  f.store.destroy();
});

test('repeated mixed-shape and texture edits recompute from one stable recording baseline', () => {
  const f = fixture({ settings: { shapeBlend: .35, noiseSource: 'original' } });
  f.$('#tf-duration').input(2.2);
  const first = structuredClone(f.store.get().points);
  const clean = f.controller.chartReference();
  assert.notDeepEqual(first, clean);
  f.$('#tf-duration').input(2.4);
  assert.notDeepEqual(f.store.get().points, first);
  f.$('#tf-duration').input(2.2);
  assert.deepEqual(f.store.get().points, first);
  f.$('#tf-noise-level').input(0);
  assert.deepEqual(f.store.get().points, f.controller.chartReference());
  f.$('#tf-noise-level').input(100);
  assert.deepEqual(f.store.get().points, first);
  assert.equal(f.store.status().undoCount, 1);
  assert.equal(f.$('#tf-error').hidden, true);
  f.store.destroy();
});

test('disabling matching restores the complete session baseline and removes a net-zero history edit', () => {
  const f = fixture();
  const before = structuredClone(f.store.get());
  f.$('#tf-duration').input(2.2);
  assert.notDeepEqual(f.store.get(), before);
  f.$('#tf-enabled').toggle(false);
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.store.status().undoCount, 0);
  assert.equal(f.controller.chartReference(), null);
  f.store.destroy();
});

test('incomplete and infeasible targets keep the last valid recording without activating a new session', () => {
  const f = fixture();
  const before = f.store.get();
  f.$('#tf-duration').input('');
  assert.equal(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#tf-enabled').checked, false);
  f.$('#tf-duration').input(20);
  assert.equal(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  assert.match(f.$('#tf-error').textContent, /burn window must stay between/);
  f.$('#tf-duration').input(2.2);
  const valid = f.store.get();
  f.$('#tf-impulse').input(1e9);
  assert.equal(f.store.get(), valid);
  assert.equal(f.controller.isActive, true);
  assert.match(f.$('#tf-error').textContent, /choose an impulse from/);
  f.$('#tf-enabled').toggle(false);
  assert.deepEqual(f.store.get().points, before.points);
  f.store.destroy();
});

test('undo and unrelated edits end fitting without reapplying a stale live baseline', () => {
  const f = fixture();
  const initial = structuredClone(f.store.get().points);
  f.$('#tf-duration').input(2.2);
  const fitted = structuredClone(f.store.get().points);
  f.controller.deactivate();
  f.store.undo();
  assert.deepEqual(f.store.get().points, initial);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#tf-enabled').checked, false);
  f.store.redo();
  assert.deepEqual(f.store.get().points, fitted);
  assert.equal(f.controller.isActive, false);
  f.$('#tf-duration').input(2.4);
  f.store.edit('External sample correction', project => { project.points[200].thrust += 1; });
  assert.equal(f.controller.isActive, false);
  assert.equal(f.controller.chartReference(), null);
  f.store.destroy();
});

test('a missing theoretical source and create mode keep fitting controls unavailable', () => {
  for (const options of [{ hasTheory: false }, { mode: 'create' }]) {
    const f = fixture(options), before = f.store.get();
    assert.equal(f.$('#tf-enabled').disabled, true);
    assert.equal(f.$('#tf-fit-body').disabled, true);
    f.$('#tf-duration').input(2.2);
    assert.equal(f.store.get(), before);
    assert.equal(f.controller.isActive, false);
    f.store.destroy();
  }
});

test('cached settings restore in SI without restoring live activation or changing project history', () => {
  const f = fixture();
  f.$('#tf-duration').input(2.2);
  f.$('#tf-peak').input(120);
  const project = f.store.get(), count = f.store.status().undoCount;
  f.controller.restorePreferences();
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#tf-enabled').checked, false);
  assert.equal(f.$('#tf-duration').value, '2.2');
  assert.equal(f.$('#tf-peak').value, '120');
  assert.equal(f.store.get(), project);
  assert.equal(f.store.status().undoCount, count);
  assert.equal(f.preferences.get().theoryFit.duration, 2.2);
  f.store.destroy();
});

test('editing tail onset enables its constraint and preserves all coordinated metrics', () => {
  const f = fixture();
  f.$('#tf-tail-start').input(1.2);
  assert.equal(f.$('#tf-tail-enabled').checked, true);
  assert.equal(f.controller.isActive, true);
  const achieved = metrics(f.store.get().points);
  close(achieved.burnDuration, 2);
  close(achieved.peak, 100);
  close(achieved.impulse, 100);
  const reference = f.controller.chartReference().filter(point => point.time >= 2.2);
  assert.ok(reference.every((point, index) => !index || point.thrust <= reference[index - 1].thrust + 1e-12));
  f.store.destroy();
});
