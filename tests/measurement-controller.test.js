import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeasurementController } from '../src/controllers/measurement-controller.js';
import { createProjectStore } from '../src/project-store.js';

class Element extends EventTarget {
  constructor(doc) {
    super();
    this.ownerDocument = doc; this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false;
    this.attributes = new Map();
    const classes = new Set();
    this.classList = { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  input(value) { this.value = String(value); this.ownerDocument.activeElement = this; this.dispatchEvent(new Event('input')); }
  blur() { this.ownerDocument.activeElement = null; this.dispatchEvent(new Event('blur')); }
}

function harness() {
  const points = [{ time: 0, thrust: 0 }, { time: .1, thrust: 5 }, { time: .35, thrust: 20 }, { time: .8, thrust: 12 }, { time: 1, thrust: 0 }];
  const store = createProjectStore({ name: 'Measured', points, original: structuredClone(points), selection: [.1, .35], scope: 'selection' }, { storage: null });
  const document = { activeElement: null };
  const elements = new Map(['measurement-panel', 'measurement-empty', 'measure-time-a', 'measure-time-b', 'measure-a-thrust', 'measure-b-thrust', 'measure-delta-time', 'measure-delta-thrust', 'clear-measurement'].map(id => [`#${id}`, new Element(document)]));
  const ui = { tool: 'measure', mode: 'edit' };
  const errors = [];
  let activePoints = null, controller;
  let timeScale = 1, thrustScale = 1;
  const ctx = {
    ui, store, $: selector => elements.get(selector), $$: () => [],
    activeProfile: () => activePoints ? { points: activePoints } : store.get(),
    units: {
      read: id => Number(elements.get(`#${id}`).value) / timeScale,
      set: (id, value) => { elements.get(`#${id}`).value = String(value * timeScale); },
      format: (value, dimension) => String(Number((value * (dimension === 'time' ? timeScale : thrustScale)).toFixed(6))),
      symbol: dimension => dimension === 'time' ? timeScale === 1000 ? 'ms' : 's' : thrustScale === .1 ? 'daN' : 'N',
    },
    render() { controller?.reconcile(); controller?.render(); },
    error: error => errors.push(error),
  };
  controller = createMeasurementController(ctx);
  controller.render();
  return { controller, store, ui, errors, elements, setProfile(value) { activePoints = value; controller.reconcile(); controller.render(); }, setUnits(time, thrust) { timeScale = time; thrustScale = thrust; controller.render(); } };
}

function click(h, time) { h.controller.pointerStart(null, time); h.controller.pointerEnd(); }

test('successive clicks place A, B and a fresh A without touching project history or selection', () => {
  const h = harness();
  const before = h.store.get();
  click(h, .12);
  assert.deepEqual(h.ui.measurementTimes, [.1]);
  assert.deepEqual(h.controller.chartState(), { a: { time: .1, thrust: 5 }, b: null, deltaTime: null, deltaThrust: null });
  assert.equal(h.elements.get('#measure-b-thrust').textContent, '—');
  assert.equal(h.elements.get('#measure-time-b').disabled, false);
  click(h, .75);
  assert.deepEqual(h.ui.measurementTimes, [.1, .8]);
  assert.equal(h.controller.chartState().deltaThrust, 7);
  click(h, .34);
  assert.deepEqual(h.ui.measurementTimes, [.35]);
  assert.equal(h.store.get(), before);
  assert.equal(h.store.status().undoCount, 0);
  assert.equal(h.errors.length, 0);
  h.store.destroy();
});

test('dragging from empty space builds a pair while dragging an existing marker preserves the other', () => {
  const h = harness();
  const index = h.controller.pointerStart(null, .1);
  h.controller.pointerMove(index, .81);
  h.controller.pointerEnd();
  assert.deepEqual(h.ui.measurementTimes, [.1, .8]);
  h.controller.pointerStart(1, .8);
  h.controller.pointerMove(1, .36);
  h.controller.pointerEnd();
  assert.deepEqual(h.ui.measurementTimes, [.1, .35]);
  h.controller.pointerStart(0, .1);
  h.controller.pointerMove(0, .99);
  h.controller.pointerEnd();
  assert.deepEqual(h.ui.measurementTimes, [1, .35]);
  assert.equal(h.controller.chartState().deltaTime, -.65);
  assert.equal(h.controller.chartState().deltaThrust, 20);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('cancel restores the previous markers for both marker drags and new pair gestures', () => {
  const h = harness();
  click(h, .1); click(h, .8);
  h.controller.pointerStart(0, .1);
  h.controller.pointerMove(0, .35);
  h.controller.pointerEnd(true);
  assert.deepEqual(h.ui.measurementTimes, [.1, .8]);
  h.controller.pointerStart(null, .35);
  h.controller.pointerMove(0, 1);
  h.controller.pointerEnd(true);
  assert.deepEqual(h.ui.measurementTimes, [.1, .8]);
  h.controller.clear();
  h.controller.pointerStart(null, .35);
  h.controller.pointerMove(0, 1);
  h.controller.pointerEnd(true);
  assert.deepEqual(h.ui.measurementTimes, []);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('ruler forces follow live measurements and ruler times snap safely onto a changed grid', () => {
  const h = harness();
  click(h, .1); click(h, .8);
  h.store.edit('Update thrust', project => { project.points[3].thrust = 30; });
  h.controller.reconcile(); h.controller.render();
  assert.equal(h.controller.chartState().b.thrust, 30);
  assert.equal(h.elements.get('#measure-b-thrust').textContent, '30 N');
  assert.equal(h.elements.get('#measure-delta-thrust').textContent, '25 N');
  assert.deepEqual(h.ui.measurementTimes, [.1, .8]);
  h.setProfile([{ time: 0, thrust: 1 }, { time: .15, thrust: 2 }, { time: .7, thrust: 3 }, { time: 1, thrust: 4 }]);
  assert.deepEqual(h.ui.measurementTimes, [.15, .7]);
  assert.equal(h.store.status().undoCount, 1);
  h.store.destroy();
});

test('numeric ruler fields use canonical units, retain focused text, snap and clamp without edits', () => {
  const h = harness();
  const before = h.store.get();
  h.setUnits(1000, .1);
  const a = h.elements.get('#measure-time-a'), b = h.elements.get('#measure-time-b');
  a.input(360);
  assert.deepEqual(h.ui.measurementTimes, [.35]);
  assert.equal(a.value, '360');
  a.blur();
  assert.equal(a.value, '350');
  b.input(850);
  assert.deepEqual(h.ui.measurementTimes, [.35, .8]);
  assert.equal(b.value, '850');
  b.blur();
  assert.equal(b.value, '800');
  assert.equal(h.elements.get('#measure-delta-time').textContent, '450 ms');
  assert.equal(h.elements.get('#measure-delta-thrust').textContent, '-0.8 daN');
  a.input(-100); b.input(9999);
  assert.deepEqual(h.ui.measurementTimes, [0, 1]);
  assert.equal(h.store.get(), before);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('incomplete input preserves markers and clearing rulers leaves the edit selection intact', () => {
  const h = harness();
  const before = h.store.get();
  click(h, 0); click(h, 1);
  const a = h.elements.get('#measure-time-a');
  a.input('');
  assert.deepEqual(h.ui.measurementTimes, [0, 1]);
  assert.equal(a.attributes.get('aria-invalid'), 'true');
  a.blur();
  assert.equal(a.value, '0');
  assert.equal(a.attributes.get('aria-invalid'), 'false');
  a.input(.35);
  h.elements.get('#clear-measurement').onclick();
  assert.deepEqual(h.ui.measurementTimes, []);
  assert.equal(a.value, '');
  assert.equal(h.elements.get('#measure-time-b').value, '');
  assert.equal(h.elements.get('#measure-time-b').disabled, true);
  assert.equal(h.elements.get('#measurement-empty').hidden, false);
  assert.equal(h.store.get(), before);
  assert.deepEqual(h.store.get().selection, [.1, .35]);
  assert.equal(h.store.status().undoCount, 0);
  h.ui.tool = 'select'; h.controller.render();
  assert.equal(h.elements.get('#measurement-panel').hidden, true);
  assert.equal(h.errors.length, 0);
  h.store.destroy();
});
