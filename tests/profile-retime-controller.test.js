import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileRetimeController } from '../src/controllers/profile-retime-controller.js';
import { createProjectStore } from '../src/project-store.js';
import { createPreferences } from '../src/preferences.js';
import { parseCSV } from '../src/csv.js';
import { metrics } from '../src/profile.js';

class Control extends EventTarget {
  constructor(value = '') {
    super();
    Object.assign(this, { value: String(value), checked: false, disabled: false, hidden: false, readOnly: false, textContent: '', innerHTML: '' });
    this.attributes = new Map();
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
      toggle(name, state) { if (state ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
    };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
  change(value) { this.value = String(value); this.dispatchEvent(new Event('change')); }
  toggle(checked) { this.checked = checked; this.dispatchEvent(new Event('change')); }
}

function recording() {
  const rows = Array.from({ length: 601 }, (_, index) => {
    const time = index / 100;
    const phase = (time - 1) / 2.5;
    const thrust = phase < 0 || phase > 1 ? 0 : 5 + 95 * Math.sin(Math.PI * phase) * (.97 + .03 * Math.cos(16 * Math.PI * phase));
    return `${index * 10},${thrust.toFixed(6)}`;
  });
  return parseCSV(`time_ms,thrust_N\n${rows.join('\n')}\n`);
}

function fixture({ mode = 'edit', settings = null, factors = {} } = {}) {
  const imported = recording(), initial = imported.points;
  const project = {
    name: 'Synthetic controller recording', points: initial, original: structuredClone(initial), theory: null,
    csvFormat: imported.csvFormat, selection: [.5, 4.5], scope: 'selection',
    curveEdit: { nodes: [initial[0], initial[225], initial.at(-1)], range: null, interpolation: 'smooth' },
  };
  const store = createProjectStore(project, { storage: null });
  const preferences = createPreferences(null);
  if (settings) preferences.update({ profileRetime: settings });
  const fields = new Map();
  const $ = selector => { if (!fields.has(selector)) fields.set(selector, new Control()); return fields.get(selector); };
  const dimensionFor = id => ({ 'retime-duration': 'time', 'retime-impulse': 'impulse', 'retime-peak': 'thrust' })[id];
  const factorFor = id => factors[dimensionFor(id)] ?? 1;
  const units = {
    read: id => $(`#${id}`).value.trim() ? Number($(`#${id}`).value) / factorFor(id) : NaN,
    set: (id, value) => { $(`#${id}`).value = String(value * factorFor(id)); },
    format: (value, dimension) => String(value * (factors[dimension] ?? 1)),
    symbol: dimension => ({ time: 's', thrust: 'N', impulse: 'N·s' })[dimension],
  };
  const beforeEdits = [], errors = [], ui = { mode };
  let controller;
  const ctx = {
    $, store, ui, units, preferences,
    beforeEdit(id) { beforeEdits.push(id); if (id !== 'profile-retime') controller?.deactivate(); },
    render() { controller?.render(); }, error: error => errors.push(error), getRange: () => store.get().scope === 'selection' ? store.get().selection : null,
  };
  controller = createProfileRetimeController(ctx);
  store.subscribe(event => {
    if (['undo', 'redo', 'cancel'].includes(event.type)) controller.deactivate();
    controller.render();
  });
  controller.render();
  return { $, store, controller, preferences, units, initial, beforeEdits, errors, ui };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-8, `${actual} should equal ${expected}`);

test('current recording initializes inactive duration targets without a theory or an edit', () => {
  const f = fixture(), before = f.store.get(), measured = metrics(before.points);
  close(measured.burnDuration, 2.5);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#retime-enabled').checked, false);
  assert.equal(f.$('#retime-enabled').disabled, false);
  close(Number(f.$('#retime-duration').value), measured.burnDuration);
  close(Number(f.$('#retime-impulse').value), measured.impulse);
  close(Number(f.$('#retime-peak').value), measured.peak);
  assert.equal(f.$('#retime-impulse-mode').value, 'preserve');
  assert.equal(f.$('#retime-peak-mode').value, 'auto');
  assert.equal(f.$('#retime-impulse').readOnly, true);
  assert.equal(f.$('#retime-peak').readOnly, true);
  assert.equal(f.store.status().undoCount, 0);
  assert.deepEqual(before.points, f.initial);
  f.store.destroy();
});

test('extending a 2.5 s burn to 3.5 s keeps impulse and every imported timestamp', () => {
  const f = fixture(), before = structuredClone(f.store.get()), measured = metrics(before.points);
  f.$('#retime-duration').input(3.5);
  const result = f.store.get(), after = metrics(result.points);
  assert.equal(f.controller.isActive, true);
  assert.equal(f.$('#retime-enabled').checked, true);
  close(after.burnStart, measured.burnStart);
  close(after.burnDuration, 3.5);
  close(after.impulse, measured.impulse);
  assert.ok(after.peak < measured.peak);
  close(Number(f.$('#retime-peak').value), after.peak);
  assert.deepEqual(result.points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(result.original, before.original);
  assert.deepEqual(result.csvFormat, before.csvFormat);
  assert.equal(result.theory, null);
  assert.equal(result.curveEdit, null);
  assert.equal(result.scope, 'all');
  assert.deepEqual(f.beforeEdits, ['profile-retime']);
  assert.equal(f.$('#retime-results').hidden, false);
  assert.equal(f.$('#retime-error').hidden, true);
  f.store.destroy();
});

test('repeated duration edits recalculate from the same source rather than stretching the latest result', () => {
  const f = fixture(), sourceImpulse = metrics(f.initial).impulse;
  f.$('#retime-duration').input(3.5);
  const first = structuredClone(f.store.get().points);
  f.$('#retime-duration').input(3.8);
  close(metrics(f.store.get().points).burnDuration, 3.8);
  close(metrics(f.store.get().points).impulse, sourceImpulse);
  f.$('#retime-duration').input(3.5);
  assert.deepEqual(f.store.get().points, first);
  assert.equal(f.beforeEdits.length, 1);
  assert.equal(f.store.status().undoCount, 1);
  f.store.destroy();
});

test('custom impulse and peak targets fit together and returning to preserve mode uses source impulse', () => {
  const f = fixture(), originalImpulse = metrics(f.initial).impulse;
  f.$('#retime-duration').input(3.5);
  f.$('#retime-impulse-mode').change('custom');
  assert.equal(f.$('#retime-impulse').readOnly, false);
  f.$('#retime-impulse').input(200);
  close(metrics(f.store.get().points).impulse, 200);
  f.$('#retime-peak-mode').change('custom');
  assert.equal(f.$('#retime-peak').readOnly, false);
  f.$('#retime-peak').input(100);
  const after = metrics(f.store.get().points);
  close(after.burnDuration, 3.5);
  close(after.peak, 100);
  close(after.impulse, 200);
  f.$('#retime-impulse-mode').change('preserve');
  close(metrics(f.store.get().points).impulse, originalImpulse);
  assert.equal(f.$('#retime-impulse').readOnly, true);
  assert.equal(f.$('#retime-error').hidden, true);
  f.store.destroy();
});

test('disabling a live duration edit restores curve metadata, scope and exact CSV data', () => {
  const f = fixture(), before = structuredClone(f.store.get());
  f.$('#retime-duration').input(3.5);
  assert.notDeepEqual(f.store.get(), before);
  f.$('#retime-enabled').toggle(false);
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#retime-enabled').checked, false);
  assert.equal(f.store.status().undoCount, 0);
  f.store.destroy();
});

test('incomplete and infeasible targets retain the last valid profile and recover without compounding', () => {
  const f = fixture(), initial = f.store.get();
  f.$('#retime-duration').input('');
  assert.equal(f.store.get(), initial);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#retime-duration').value, '');
  f.$('#retime-duration').input(20);
  assert.equal(f.store.get(), initial);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#retime-error').hidden, false);
  f.$('#retime-duration').input(3.5);
  const valid = f.store.get();
  f.$('#retime-duration').input(-1);
  assert.equal(f.store.get(), valid);
  assert.equal(f.controller.isActive, true);
  f.$('#retime-duration').input(3.5);
  f.$('#retime-impulse-mode').change('custom');
  f.$('#retime-peak-mode').change('custom');
  const custom = f.store.get();
  f.$('#retime-impulse').input(1e9);
  assert.equal(f.store.get(), custom);
  assert.equal(f.$('#retime-error').hidden, false);
  f.$('#retime-impulse').input(200);
  close(metrics(f.store.get().points).impulse, 200);
  assert.equal(f.$('#retime-error').hidden, true);
  f.store.destroy();
});

test('deactivation commits the visible result and later external edits become a fresh baseline', () => {
  const f = fixture();
  f.$('#retime-duration').input(3.5);
  const fitted = structuredClone(f.store.get().points);
  f.controller.deactivate();
  assert.deepEqual(f.store.get().points, fitted);
  assert.equal(f.controller.isActive, false);
  f.store.edit('External correction', draft => { draft.points[200].thrust += 5; });
  const corrected = structuredClone(f.store.get().points), impulse = metrics(corrected).impulse;
  f.$('#retime-duration').input(3.8);
  close(metrics(f.store.get().points).impulse, impulse);
  f.$('#retime-enabled').toggle(false);
  assert.deepEqual(f.store.get().points, corrected);
  f.$('#retime-duration').input(3.8);
  f.store.edit('Unrelated data edit', draft => { draft.points[201].thrust += 1; });
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#retime-enabled').checked, false);
  f.store.destroy();
});

test('recovering from an infeasible custom peak clears derived-field validation', () => {
  const f = fixture();
  f.$('#retime-duration').input(3.5);
  f.$('#retime-peak-mode').change('custom');
  f.$('#retime-peak').input(.01);
  assert.equal(f.$('#retime-error').hidden, false);
  assert.equal(f.$('#retime-peak').attributes.get('aria-invalid'), 'true');
  f.$('#retime-peak-mode').change('auto');
  assert.equal(f.$('#retime-error').hidden, true);
  for (const name of ['duration', 'impulse', 'peak']) {
    assert.equal(f.$(`#retime-${name}`).classList.contains('input-error'), false);
    assert.notEqual(f.$(`#retime-${name}`).attributes.get('aria-invalid'), 'true');
  }
  close(metrics(f.store.get().points).burnDuration, 3.5);
  f.store.destroy();
});

test('undo and redo restore data without replaying an old live duration baseline', () => {
  const f = fixture(), initial = structuredClone(f.store.get().points);
  f.$('#retime-duration').input(3.5);
  const fitted = structuredClone(f.store.get().points);
  f.store.undo();
  assert.deepEqual(f.store.get().points, initial);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.$('#retime-enabled').checked, false);
  f.store.redo();
  assert.deepEqual(f.store.get().points, fitted);
  assert.equal(f.controller.isActive, false);
  f.store.destroy();
});

test('display units convert duration and custom output targets back into SI', () => {
  const f = fixture({ factors: { time: 1000, thrust: .001, impulse: .001 } });
  close(Number(f.$('#retime-duration').value), 2500);
  f.$('#retime-duration').input(3500);
  f.$('#retime-impulse-mode').change('custom');
  f.$('#retime-impulse').input(.2);
  f.$('#retime-peak-mode').change('custom');
  f.$('#retime-peak').input(.1);
  const result = metrics(f.store.get().points);
  close(result.burnDuration, 3.5);
  close(result.impulse, 200);
  close(result.peak, 100);
  f.store.destroy();
});

test('automatic output fields ignore synthetic input events and a replacement recording supplies fresh targets', () => {
  const f = fixture(), before = f.store.get();
  f.$('#retime-impulse').input(1e9);
  f.$('#retime-peak').input(1e9);
  assert.equal(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  const replacement = structuredClone(before);
  replacement.name = 'Second synthetic recording';
  replacement.points = replacement.points.map(point => ({ ...point, thrust: point.thrust * 2 }));
  replacement.original = structuredClone(replacement.points);
  f.store.replace('Import another recording', replacement);
  const measured = metrics(f.store.get().points), history = f.store.status().undoCount;
  close(Number(f.$('#retime-duration').value), measured.burnDuration);
  close(Number(f.$('#retime-impulse').value), measured.impulse);
  close(Number(f.$('#retime-peak').value), measured.peak);
  assert.equal(f.controller.isActive, false);
  f.controller.restorePreferences();
  assert.equal(f.store.status().undoCount, history);
  close(Number(f.$('#retime-impulse').value), measured.impulse);
  f.store.destroy();
});

test('create mode ignores target changes and preference restoration never rewrites a profile', () => {
  const f = fixture({ mode: 'create', settings: { impulseMode: 'custom', peakMode: 'custom' } }), before = f.store.get();
  f.$('#retime-duration').input(3.5);
  f.$('#retime-enabled').toggle(true);
  assert.equal(f.store.get(), before);
  assert.equal(f.controller.isActive, false);
  assert.equal(f.store.status().undoCount, 0);
  f.controller.restorePreferences();
  assert.equal(f.store.get(), before);
  assert.equal(f.$('#retime-enabled').checked, false);
  assert.equal(f.$('#retime-impulse-mode').value, 'custom');
  assert.equal(f.$('#retime-peak-mode').value, 'custom');
  f.store.destroy();
});
