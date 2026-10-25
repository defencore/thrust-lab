import test from 'node:test';
import assert from 'node:assert/strict';
import { createShiftController } from '../src/controllers/shift-controller.js';
import { createProjectStore } from '../src/project-store.js';
import { shiftProfile } from '../src/profile-shift.js';
import { findBackgroundNoise } from '../src/background-noise.js';

class Control extends EventTarget {
  constructor(value = '') {
    super(); this.value = String(value); this.attributes = new Map(); const classes = new Set();
    this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value) };
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
}

function fixture({ range = null, mode = 'edit', points = Array.from({ length: 21 }, (_, index) => ({ time: index / 10, thrust: index > 3 && index < 17 ? 10 + index : 0 })) } = {}) {
  const store = createProjectStore({ name: 'Recording', points, original: structuredClone(points), selection: range, scope: range ? 'selection' : 'all', curveEdit: { nodes: [points[0], points.at(-1)], range: null, interpolation: 'smooth' } }, { storage: null });
  const fields = new Map([['#edit-shift', new Control(0)], ['#edit-feather', new Control(0)], ['#edit-shift-fill', new Control('zero')], ['#edit-shift-noise-gain', new Control(100)], ['#shift-background-status', new Control()]]);
  const $ = selector => fields.get(selector);
  const beforeEdits = [], errors = [], preferences = [];
  const ui = { mode, tool: 'select' };
  let controller;
  const ctx = {
    $, $$: () => [], store, ui, getRange: () => store.get().scope === 'selection' ? store.get().selection : null,
    units: { read: id => $(`#${id}`).value.trim() ? Number($(`#${id}`).value) : NaN, set: (id, value) => { $(`#${id}`).value = String(value); }, format: value => String(value), symbol: () => 'N' },
    beforeEdit: id => beforeEdits.push(id), render() { controller?.render(); }, error: error => errors.push(error),
    preferences: { update: value => preferences.push(value) },
  };
  controller = createShiftController(ctx);
  store.subscribe(() => controller.render());
  return { $, store, ui, controller, beforeEdits, errors, preferences, points };
}

test('typed offsets activate shifting and recompute from a stable baseline without compounding', () => {
  const f = fixture(), before = structuredClone(f.store.get());
  f.$('#edit-shift').input(.2);
  assert.equal(f.ui.tool, 'shift');
  assert.equal(f.controller.isActive, true);
  assert.deepEqual(f.store.get().points, shiftProfile(before.points, .2));
  f.$('#edit-shift').input(.4);
  assert.deepEqual(f.store.get().points, shiftProfile(before.points, .4));
  f.$('#edit-shift').input(.2);
  assert.deepEqual(f.store.get().points, shiftProfile(before.points, .2));
  assert.equal(f.beforeEdits.length, 1);
  assert.equal(f.store.status().undoCount, 1);
  assert.deepEqual(f.store.get().original, before.original);
  assert.deepEqual(f.store.get().points.map(point => point.time), before.points.map(point => point.time));
  f.store.destroy();
});

test('returning to zero restores baseline forces and control metadata as a net-zero history edit', () => {
  const f = fixture(), before = structuredClone(f.store.get());
  f.$('#edit-shift').input(.3);
  assert.equal(f.store.get().curveEdit, null);
  f.$('#edit-shift').input(0);
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});

test('one drag is a single undo gesture and following typed offsets refine its initial baseline', () => {
  const f = fixture(), before = structuredClone(f.store.get());
  assert.equal(f.controller.pointerStart(.5), true);
  f.controller.pointerMove(.7);
  f.controller.pointerMove(.9);
  f.controller.pointerEnd();
  assert.deepEqual(f.store.get().points, shiftProfile(before.points, .9 - .5));
  assert.equal(f.store.status().undoCount, 1);
  f.$('#edit-shift').input(.2);
  assert.deepEqual(f.store.get().points, shiftProfile(before.points, .2));
  f.controller.deactivate(); f.store.undo(); f.store.undo();
  assert.deepEqual(f.store.get(), before);
  f.store.destroy();
});

test('starting another drag bakes the prior result and creates a fresh zero-offset baseline', () => {
  const f = fixture();
  f.$('#edit-shift').input(.2);
  const first = structuredClone(f.store.get().points);
  f.controller.pointerStart(.5);
  assert.equal(f.$('#edit-shift').value, '0');
  f.controller.pointerMove(.7);
  f.controller.pointerEnd();
  assert.deepEqual(f.store.get().points, shiftProfile(first, .7 - .5));
  assert.equal(f.store.status().undoCount, 2);
  f.store.destroy();
});

test('canceling a drag restores its full baseline and neutral input without adding history', () => {
  const f = fixture(), before = structuredClone(f.store.get());
  f.controller.pointerStart(.5);
  f.controller.pointerMove(.8);
  assert.notDeepEqual(f.store.get().points, before.points);
  f.controller.pointerEnd(true);
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.$('#edit-shift').value, '0');
  assert.equal(f.controller.isActive, false);
  assert.equal(f.store.status().undoCount, 0);
  assert.equal(f.preferences.length, 0);
  f.store.destroy();
});

test('selected shifts preserve outside measurements and react to edge transition controls', () => {
  const f = fixture({ range: [.4, 1.6] }), before = structuredClone(f.store.get().points);
  f.$('#edit-shift').input(.2);
  assert.deepEqual(f.store.get().points, shiftProfile(before, .2, { range: [.4, 1.6] }));
  f.$('#edit-feather').input(25);
  assert.deepEqual(f.store.get().points, shiftProfile(before, .2, { range: [.4, 1.6], transition: .25 }));
  assert.deepEqual(f.store.get().points[4], before[4]);
  assert.deepEqual(f.store.get().points[16], before[16]);
  f.store.destroy();
});

test('external edits and undo neutralize the private baseline without changing stored data', () => {
  const f = fixture();
  f.$('#edit-shift').input(.2);
  f.store.edit('External correction', project => { project.points[10].thrust = 99; });
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#edit-shift').value, '0');
  assert.equal(f.store.get().points[10].thrust, 99);
  f.store.undo();
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#edit-shift').value, '0');
  assert.equal(f.preferences.length, 0);
  f.store.destroy();
});

test('invalid offsets and create-mode gestures leave measurements unchanged', () => {
  const f = fixture(), before = f.store.get();
  f.$('#edit-shift').input('');
  f.$('#edit-shift').input('bad');
  assert.equal(f.controller.pointerStart(NaN), false);
  assert.equal(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  f.ui.mode = 'create';
  f.$('#edit-shift').input(.2);
  assert.equal(f.controller.pointerStart(.5), false);
  assert.equal(f.store.get(), before);
  assert.equal(f.errors.length, 2);
  f.store.destroy();
});

const quietRecording = () => Array.from({ length: 41 }, (_, index) => ({ time: index / 10, thrust: index >= 10 && index <= 30 ? 100 : .1 + .03 * Math.sin(index * 2) }));
const chooseFill = (f, mode) => { f.$('#edit-shift-fill').value = mode; f.$('#edit-shift-fill').dispatchEvent(new Event('change')); };

test('changing gap fill and its level recomputes the same shift without touching occupied samples', () => {
  const f = fixture({ points: quietRecording() }), original = structuredClone(f.points);
  const background = findBackgroundNoise(original);
  f.$('#edit-shift').input(.5);
  const zeros = structuredClone(f.store.get().points);
  chooseFill(f, 'background');
  const filled = structuredClone(f.store.get().points);
  assert.deepEqual(filled, shiftProfile(original, .5, { background, noiseGain: 1 }));
  assert.notDeepEqual(filled.slice(0, 5), zeros.slice(0, 5));
  assert.deepEqual(filled.slice(5), zeros.slice(5));
  f.$('#edit-shift-noise-gain').input(200);
  assert.deepEqual(f.store.get().points, shiftProfile(original, .5, { background, noiseGain: 2 }));
  f.$('#edit-shift-noise-gain').input(100);
  assert.deepEqual(f.store.get().points, filled);
  assert.match(f.$('#shift-background-status').textContent, /source samples · RMS/);
  chooseFill(f, 'zero');
  assert.deepEqual(f.store.get().points, zeros);
  assert.equal(f.$('#edit-shift-noise-gain').disabled, true);
  f.controller.reset();
  assert.deepEqual(f.store.get().points, original);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});

test('background replay stays tied to the original recording across subsequent shifts', () => {
  const f = fixture({ points: quietRecording() }), original = structuredClone(f.points);
  chooseFill(f, 'background');
  assert.deepEqual(f.store.get().points, original);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.store.status().undoCount, 0);
  f.controller.pointerStart(0);
  f.controller.pointerMove(.7);
  f.controller.pointerEnd();
  const first = structuredClone(f.store.get().points);
  f.controller.pointerStart(0);
  f.controller.pointerMove(-.4);
  f.controller.pointerEnd();
  assert.deepEqual(f.store.get().points, shiftProfile(first, -.4, { background: findBackgroundNoise(original), noiseGain: 1 }));
  assert.deepEqual(f.store.get().original, original);
  f.controller.deactivate(); f.store.undo();
  assert.deepEqual(f.store.get().points, first);
  f.store.destroy();
});

test('missing background and invalid levels retain the last valid curve and allow returning to zero', () => {
  const f = fixture(), before = structuredClone(f.store.get());
  f.$('#edit-shift').input(.2);
  const shifted = structuredClone(f.store.get().points);
  chooseFill(f, 'background');
  assert.match(f.errors.at(-1).message, /No recorded background/);
  assert.deepEqual(f.store.get().points, shifted);
  assert.match(f.$('#shift-background-status').textContent, /No quiet source/);
  f.$('#edit-shift-noise-gain').input('bad');
  assert.match(f.errors.at(-1).message, /Background level/);
  assert.deepEqual(f.store.get().points, shifted);
  f.$('#edit-shift').input(0);
  assert.deepEqual(f.store.get(), before);
  f.store.destroy();
});
