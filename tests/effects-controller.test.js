import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectStore } from '../src/project-store.js';
import { createLiveEffects } from '../src/live-effects.js';
import { createEffectsController } from '../src/controllers/effects-controller.js';

class Control extends EventTarget {
  constructor(value = '') {
    super(); this.value = String(value); this.checked = false; this.disabled = false; this.hidden = false; this.attributes = new Map();
    const classes = new Set();
    this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), toggle(name, active) { if (active ?? !classes.has(name)) classes.add(name); else classes.delete(name); } };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
  toggle(checked) { this.checked = checked; this.dispatchEvent(new Event('change')); }
  click() { this.onclick?.(); }
}

function fixture() {
  const initial = Array.from({ length: 101 }, (_, index) => ({ time: index * .1, thrust: 30 + index * .03 + (index % 2 ? .5 : -.5) }));
  const store = createProjectStore({ name: 'Measured', points: initial, original: structuredClone(initial), selection: [3, 6], scope: 'all', curveEdit: { nodes: [initial[0], initial.at(-1)], range: null, interpolation: 'smooth' } }, { storage: null });
  const fields = new Map();
  const $ = selector => {
    const id = selector.slice(1);
    if (!fields.has(id)) fields.set(id, new Control());
    return fields.get(id);
  };
  for (const [id, value] of Object.entries({ 'edit-width': 100, 'edit-gain': 100, 'edit-offset': 0, 'edit-anchor': 'start', 'edit-feather': 15, 'target-peak': 50, 'target-impulse': 200, 'noise-amount': 3, 'noise-seed': 84, 'smooth-window': 9, 'capture-window': 15, 'captured-gain': 100, 'captured-mode': 'repeat', 'match-noise-gain': 100 })) $(`#${id}`).value = String(value);
  $('#noise-preview').setAttribute('hidden', '');
  const effects = createLiveEffects(store);
  const errors = [];
  const preferences = [];
  let range = null;
  let controller;
  const ctx = {
    $, store, effects, ui: { mode: 'edit' }, getRange: () => range,
    units: { read: id => $(`#${id}`).value.trim() ? Number($(`#${id}`).value) : NaN, set: (id, value) => { $(`#${id}`).value = String(value); }, format: value => String(value), symbol: () => 'N' },
    preferences: { update: value => preferences.push(value) },
    curve: { deactivate() {} }, render() { controller?.render(); }, notify() {}, error(error) { errors.push(error); },
    edit(label, mutate) { controller.reset(); store.edit(label, mutate); }, beforeEdit() { controller.reset(); },
  };
  controller = createEffectsController(ctx);
  return { store, effects, controller, $, errors, preferences, initial, setRange(value) { range = value; } };
}

test('live transform controls retain the displayed new gain and never compound parameter changes', () => {
  const f = fixture();
  f.$('#edit-gain').input(120);
  assert.equal(f.$('#edit-gain').value, '120');
  assert.equal(f.store.get().points[50].thrust, f.initial[50].thrust * 1.2);
  f.$('#edit-gain').input(130);
  assert.equal(f.store.get().points[50].thrust, f.initial[50].thrust * 1.3);
  assert.equal(f.store.status().undoCount, 1);
  assert.equal(f.errors.length, 0);
  f.store.destroy();
});

test('unrelated edits neutralize relative controls before a new live transform session', () => {
  const f = fixture();
  f.$('#edit-gain').input(150);
  const scaled = f.store.get().points[50].thrust;
  f.controller.reset();
  assert.equal(f.$('#edit-gain').value, '100');
  assert.equal(f.$('#edit-width').value, '100');
  assert.equal(f.$('#edit-offset').value, '0');
  assert.equal(f.preferences.length, 0);
  f.$('#edit-offset').input(2);
  assert.equal(f.store.get().points[50].thrust, scaled + 2);
  assert.equal(f.$('#edit-offset').value, '2');
  assert.equal(f.store.status().undoCount, 2);
  f.store.destroy();
});

test('disabling a live filter restores its baseline points and control metadata as one net-zero edit', () => {
  const f = fixture();
  const original = f.store.get();
  f.$('#smoothing-enabled').toggle(true);
  assert.equal(f.store.get().curveEdit, null);
  assert.notDeepEqual(f.store.get().points, original.points);
  f.$('#smoothing-enabled').toggle(false);
  assert.deepEqual(f.store.get(), original);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});

test('fractional random seeds and even smoothing windows leave actual data unchanged', () => {
  const f = fixture();
  const original = f.store.get();
  f.$('#noise-seed').value = '1.5';
  f.$('#random-noise-enabled').toggle(true);
  assert.equal(f.store.get(), original);
  f.$('#smooth-window').value = '4';
  f.$('#smoothing-enabled').toggle(true);
  assert.equal(f.store.get(), original);
  assert.equal(f.errors.length, 2);
  f.store.destroy();
});

test('changing a valid effect parameter immediately enables that effect and updates data', () => {
  const f = fixture();
  f.$('#target-peak').input(80);
  assert.equal(f.$('#fit-peak-enabled').checked, true);
  assert.equal(Math.max(...f.store.get().points.map(point => point.thrust)), 80);
  const fitted = structuredClone(f.store.get().points);
  f.$('#noise-amount').input(5);
  assert.equal(f.$('#random-noise-enabled').checked, true);
  assert.equal(f.$('#fit-peak-enabled').checked, false);
  assert.notDeepEqual(f.store.get().points, fitted);
  f.$('#random-noise-enabled').toggle(false);
  assert.deepEqual(f.store.get().points, fitted);
  assert.equal(f.errors.length, 0);
  f.store.destroy();
});

test('incomplete parameters and source-dependent fields do not activate unavailable effects', () => {
  const f = fixture();
  const before = f.store.get();
  f.$('#noise-amount').input('');
  assert.equal(f.$('#random-noise-enabled').checked, false);
  f.$('#noise-seed').input(1.5);
  assert.equal(f.$('#random-noise-enabled').checked, false);
  f.$('#smooth-window').input(4);
  assert.equal(f.$('#smoothing-enabled').checked, false);
  f.$('#captured-gain').input(120);
  assert.equal(f.$('#captured-noise-enabled').checked, false);
  assert.equal(f.store.get(), before);
  assert.equal(f.effects.activeId, null);
  f.store.destroy();
});

test('recorded noise preview becomes visible and the curve shortcut prefers its captured source', () => {
  const f = fixture();
  f.$('#capture-noise').click();
  assert.equal(f.$('#noise-preview').attributes.has('hidden'), false);
  f.setRange(null);
  f.$('#curve-match-noise').click();
  assert.equal(f.errors.length, 0);
  assert.equal(f.store.status().undoCount, 1);
  assert.equal(f.$('#noise-match-report').hidden, false);
  f.controller.resetSource();
  assert.equal(f.$('#noise-preview').attributes.has('hidden'), true);
  assert.equal(f.$('#captured-noise-enabled').checked, false);
  f.store.destroy();
});

test('the curve noise shortcut automatically uses an unchanged neighbouring source when none is captured', () => {
  const f = fixture();
  f.setRange([3, 6]);
  f.store.edit('Quiet edit', project => { for (let index = 31; index < 60; index += 1) project.points[index].thrust = 31; });
  const before = f.store.get();
  f.$('#curve-match-noise').click();
  assert.equal(f.errors.length, 0);
  assert.ok(f.store.get().points.some((point, index) => point.thrust !== before.points[index].thrust));
  assert.deepEqual(f.store.get().points.map(point => point.time), before.points.map(point => point.time));
  for (let index = 0; index < before.points.length; index += 1) if (before.points[index].time <= 3 || before.points[index].time >= 6) assert.deepEqual(f.store.get().points[index], before.points[index]);
  assert.equal(f.$('#noise-match-report').hidden, false);
  f.store.destroy();
});

test('matched noise gain and replay controls update the same baseline immediately', () => {
  const f = fixture();
  const anchors = f.store.get().curveEdit;
  f.$('#capture-noise').click();
  f.$('#match-captured').click();
  const matched = structuredClone(f.store.get().points);
  assert.equal(f.effects.activeId, 'noise-match');
  f.$('#match-noise-gain').input(0);
  const quiet = structuredClone(f.store.get().points);
  assert.notDeepEqual(quiet, matched);
  f.$('#match-noise-gain').input(200);
  assert.notDeepEqual(f.store.get().points, quiet);
  f.$('#match-noise-gain').input(100);
  assert.deepEqual(f.store.get().points, matched);
  f.$('#captured-mode').input('stretch');
  assert.notDeepEqual(f.store.get().points, matched);
  f.$('#captured-mode').input('repeat');
  assert.deepEqual(f.store.get().points, matched);
  f.$('#capture-window').input(21);
  assert.notDeepEqual(f.store.get().points, matched);
  f.$('#capture-window').input(15);
  assert.deepEqual(f.store.get().points, matched);
  assert.deepEqual(f.store.get().curveEdit, anchors);
  assert.equal(f.store.status().undoCount, 1);
  assert.equal(f.errors.length, 0);
  f.controller.reset();
  f.$('#match-noise-gain').input(50);
  assert.deepEqual(f.store.get().points, matched);
  f.controller.render();
  assert.equal(f.$('#noise-match-report').hidden, true);
  f.store.destroy();
});
