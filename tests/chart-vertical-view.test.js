import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileChart } from '../src/chart.js';
import { createProjectStore } from '../src/project-store.js';

class Element {
  constructor(width = 800, height = 400) {
    this.clientWidth = width; this.clientHeight = height; this.innerHTML = ''; this.dataset = {}; this.style = {}; this.hidden = false;
    this.attributes = new Map(); this.listeners = new Map(); this.captured = new Set();
    this.classList = { add() {} };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append() {}
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  emit(type, values = {}) {
    const event = { type, button: 0, pointerId: 1, preventDefault() { this.prevented = true; }, ...values };
    this.listeners.get(type)?.(event);
    return event;
  }
}

function harness(overrides = {}) {
  const priorDocument = globalThis.document, priorObserver = globalThis.ResizeObserver;
  globalThis.document = { createElementNS: () => new Element(), createElement: () => new Element() };
  globalThis.ResizeObserver = class { observe() {} };
  const points = [{ time: 0, thrust: 20 }, { time: 1, thrust: 40 }, { time: 2, thrust: 60 }, { time: 3, thrust: 35 }, { time: 4, thrust: 20 }];
  const store = createProjectStore({ name: 'Measured', points, original: structuredClone(points) }, { storage: null });
  let state = { ...store.get(), view: [0, 4], units: { time: 's', thrust: 'N', impulse: 'N·s' }, playhead: 0, tool: 'select', thrustView: null, ...overrides };
  const calls = { time: [], thrust: [], draw: [], curve: [], measure: [], shiftStart: [], shiftMove: [], shiftEnd: [], selection: [], cursor: [], drawStart: 0 };
  let chart;
  const callbacks = {
    onView(view) { calls.time.push([...view]); state = { ...state, view }; chart.setState(state); },
    onThrustView(view) { calls.thrust.push(view ? [...view] : null); state = { ...state, thrustView: view }; chart.setState(state); },
    onDrawStart() { calls.drawStart++; }, onDraw(coords) { calls.draw.push(coords); }, onDrawEnd() {},
    onCurveStart(coords) { calls.curve.push(coords); return coords.index; }, onCurveMove(coords) { calls.curve.push(coords); }, onCurveEnd() {},
    onMeasureStart(coords) { calls.measure.push(coords); return coords.index; }, onMeasureMove(coords) { calls.measure.push(coords); }, onMeasureEnd() {},
    onShiftStart(coords) { calls.shiftStart.push(coords); }, onShiftMove(coords) { calls.shiftMove.push(coords); }, onShiftEnd(cancelled) { calls.shiftEnd.push(cancelled); },
    onCursor(time) { calls.cursor.push(time); }, onSelection(range) { calls.selection.push(range); }, onSelectionCancel() {},
  };
  try { chart = new ProfileChart(new Element(), new Element(800, 47), callbacks); }
  finally { globalThis.document = priorDocument; globalThis.ResizeObserver = priorObserver; }
  chart.setState(state);
  return {
    chart, calls, store,
    update(next) { state = { ...state, ...next }; chart.setState(state); },
    pointer(time, thrust) {
      const [min, max] = chart.effectiveThrustView();
      return { clientX: chart.box.left + (time - state.view[0]) / (state.view[1] - state.view[0]) * chart.box.width, clientY: chart.box.bottom - (thrust - min) / (max - min) * chart.box.height };
    },
  };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should be ${expected}`);

test('axis reset recognizes two pointer clicks even when SVG children are replaced between them', () => {
  const h = harness({ thrustView: [20, 60] });
  const axis = { clientX: 25, clientY: 180 };
  h.chart.svg.emit('pointerdown', axis); h.chart.svg.emit('pointerup', axis);
  h.chart.svg.emit('pointerdown', axis); h.chart.svg.emit('pointerup', axis);
  assert.equal(h.chart.state.thrustView, null);
  assert.equal(h.calls.thrust.at(-1), null);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('a nonzero thrust minimum maps screen coordinates, recorded path and y labels consistently', () => {
  const h = harness({ thrustView: [20, 60] });
  const { chart } = h;
  close(chart.coords({ clientX: chart.box.left, clientY: chart.box.bottom }).thrust, 20);
  close(chart.coords({ clientX: chart.box.right, clientY: chart.box.top }).thrust, 60);
  close(chart.coords({ clientX: 400, clientY: (chart.box.top + chart.box.bottom) / 2 }).thrust, 40);
  const path = chart.svg.innerHTML.match(/<path class="current-path" d="([^"]+)"/)[1];
  assert.match(path, /M62\.00,358\.00L240\.50,193\.00L419\.00,28\.00/);
  const labels = [...chart.svg.innerHTML.matchAll(/<text class="axis-label" x="49" y="[^"]+" text-anchor="end">([^<]+)<\/text>/g)].map(match => Number(match[1]));
  assert.ok(labels.includes(20) && labels.includes(60));
  assert.ok(labels.every(value => value >= 20 && value <= 60));
  h.store.destroy();
});

test('measurement markers and curve handles use the same shifted thrust mapping for hit testing', () => {
  const points = [{ time: 0, thrust: 20 }, { time: 1, thrust: 30 }, { time: 2, thrust: 60 }, { time: 3, thrust: 35 }, { time: 4, thrust: 20 }];
  const h = harness({ points, thrustView: [20, 60], tool: 'measure', measurement: { a: points[1], b: null, deltaTime: null, deltaThrust: null } });
  assert.match(h.chart.svg.innerHTML, /data-measure-marker="0" cx="240\.5" cy="275\.5"/);
  h.chart.svg.emit('pointerdown', h.pointer(1, 30));
  assert.equal(h.calls.measure[0].index, 0);
  h.chart.svg.emit('pointerup');
  h.update({ tool: 'curve', curveNodes: [{ time: 0, thrust: 20 }, { time: 1, thrust: 30 }, { time: 4, thrust: 20 }], curveSelected: 1 });
  assert.match(h.chart.svg.innerHTML, /data-curve-node="1"[^>]+cx="240\.5" cy="275\.5"/);
  h.chart.svg.emit('pointerdown', h.pointer(1, 30));
  assert.equal(h.calls.curve[0].index, 1);
  h.chart.svg.emit('pointerup');
  h.store.destroy();
});

test('draw and curve gestures freeze their thrust scale while live data changes', () => {
  for (const tool of ['draw', 'curve']) {
    const h = harness({ tool });
    const before = [...h.chart.effectiveThrustView()];
    h.chart.svg.emit('pointerdown', h.pointer(1, 40));
    h.update({ points: h.chart.state.points.map(point => ({ ...point, thrust: point.thrust * 10 })) });
    assert.deepEqual(h.chart.effectiveThrustView(), before);
    const mid = (h.chart.box.top + h.chart.box.bottom) / 2;
    close(h.chart.coords({ clientX: 300, clientY: mid }).thrust, (before[0] + before[1]) / 2);
    h.chart.svg.emit('pointermove', { clientX: 300, clientY: mid });
    const last = h.calls[tool].at(-1);
    close(last.thrust, (before[0] + before[1]) / 2);
    h.chart.svg.emit('pointerup');
    assert.ok(h.chart.effectiveThrustView()[1] > before[1]);
    h.store.destroy();
  }
});

test('manual thrust view survives data and display-unit changes, then reset restores automatic fit', () => {
  const h = harness();
  const original = h.store.get();
  h.chart.setThrustView([20, 60]);
  const beforeUnits = h.chart.svg.innerHTML.match(/<path class="current-path" d="([^"]+)"/)[1];
  h.update({ units: { time: 'ms', thrust: 'kN', impulse: 'N·s' } });
  assert.deepEqual(h.chart.effectiveThrustView(), [20, 60]);
  assert.equal(h.chart.svg.innerHTML.match(/<path class="current-path" d="([^"]+)"/)[1], beforeUnits);
  h.update({ points: h.chart.state.points.map(point => ({ ...point, thrust: point.thrust * 10 })) });
  assert.deepEqual(h.chart.effectiveThrustView(), [20, 60]);
  h.chart.fitThrust();
  assert.equal(h.calls.thrust.at(-1), null);
  assert.ok(h.chart.effectiveThrustView()[1] >= 600);
  assert.equal(h.store.get(), original);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('vertical zoom controls change only the view and preserve an explicit thrust anchor', () => {
  const h = harness({ thrustView: [20, 60] });
  const original = h.store.get();
  h.chart.zoomThrust(.5, 40);
  assert.deepEqual(h.chart.effectiveThrustView(), [30, 50]);
  h.chart.zoomThrust(2, 40);
  assert.deepEqual(h.chart.effectiveThrustView(), [20, 60]);
  assert.deepEqual(h.chart.state.view, [0, 4]);
  assert.equal(h.calls.time.length, 0);
  assert.equal(h.store.get(), original);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('pan drags move time and thrust together in the direction of the pointer', () => {
  const h = harness({ tool: 'pan', view: [1, 3], thrustView: [20, 60] });
  const original = h.store.get();
  const start = h.pointer(2, 40);
  h.chart.svg.emit('pointerdown', start);
  h.chart.svg.emit('pointermove', { clientX: start.clientX + h.chart.box.width / 10, clientY: start.clientY + h.chart.box.height / 10 });
  h.chart.svg.emit('pointerup');
  close(h.chart.state.view[0], .8); close(h.chart.state.view[1], 2.8);
  close(h.chart.effectiveThrustView()[0], 24); close(h.chart.effectiveThrustView()[1], 64);
  assert.equal(h.store.get(), original);
  assert.equal(h.store.status().undoCount, 0);
  h.store.destroy();
});

test('Shift-wheel zooms thrust around the pointer while ordinary wheel zooms time', () => {
  const h = harness({ thrustView: [20, 60] });
  const original = h.store.get();
  const event = h.chart.svg.emit('wheel', { ...h.pointer(2, 40), shiftKey: true, deltaY: -1 });
  assert.equal(event.prevented, true);
  assert.equal(h.calls.time.length, 0);
  assert.equal(h.calls.thrust.length, 1);
  const [low, high] = h.chart.effectiveThrustView();
  assert.ok(high - low < 40);
  close((40 - low) / (high - low), .5);
  h.chart.svg.emit('wheel', { ...h.pointer(2, 40), shiftKey: false, deltaY: -1 });
  assert.equal(h.calls.time.length, 1);
  assert.equal(h.calls.thrust.length, 1);
  assert.ok(h.chart.state.view[1] - h.chart.state.view[0] < 4);
  assert.equal(h.store.get(), original);
  h.store.destroy();
});

test('dragging the left axis magnifies thrust without invoking draw or selection, and double-click resets it', () => {
  for (const tool of ['draw', 'select']) {
    const h = harness({ tool, thrustView: [20, 60] });
    const original = h.store.get();
    const start = { clientX: 30, clientY: (h.chart.box.top + h.chart.box.bottom) / 2 };
    h.chart.svg.emit('pointerdown', start);
    h.chart.svg.emit('pointermove', { ...start, clientY: start.clientY - h.chart.box.height / 5 });
    h.chart.svg.emit('pointerup');
    const [minimum, maximum] = h.chart.effectiveThrustView();
    close(minimum, 20);
    assert.ok(maximum - minimum < 40);
    assert.equal(h.calls.drawStart, 0);
    assert.equal(h.calls.draw.length, 0);
    assert.equal(h.calls.selection.length, 0);
    assert.equal(h.calls.cursor.length, 0);
    h.chart.svg.emit('dblclick', start);
    assert.equal(h.calls.thrust.at(-1), null);
    assert.equal(h.chart.effectiveThrustView()[0], 0);
    assert.ok(h.chart.effectiveThrustView()[1] >= 60);
    assert.equal(h.calls.selection.length, 0);
    assert.equal(h.store.get(), original);
    assert.equal(h.store.status().undoCount, 0);
    h.store.destroy();
  }
});

test('canceling an axis drag restores its prior manual range or automatic mode', () => {
  for (const thrustView of [null, [20, 60]]) {
    for (const cancel of ['pointercancel', 'cancelDrag']) {
      const h = harness({ thrustView });
      const before = [...h.chart.effectiveThrustView()];
      const start = { clientX: 30, clientY: (h.chart.box.top + h.chart.box.bottom) / 2 };
      h.chart.svg.emit('pointerdown', start);
      h.chart.svg.emit('pointermove', { ...start, clientY: start.clientY - h.chart.box.height / 5 });
      assert.ok(h.chart.effectiveThrustView()[1] - h.chart.effectiveThrustView()[0] < before[1] - before[0]);
      if (cancel === 'cancelDrag') assert.equal(h.chart.cancelDrag(), true);
      else h.chart.svg.emit('pointercancel');
      assert.deepEqual(h.calls.thrust.at(-1), thrustView);
      assert.deepEqual(h.chart.effectiveThrustView(), before);
      assert.equal(h.chart.drag, null);
      assert.equal(h.chart.svg.hasPointerCapture(1), false);
      assert.equal(h.store.status().undoCount, 0);
      h.store.destroy();
    }
  }
});

test('profile-shift gestures route only amplitude-shift callbacks and freeze their thrust mapping', () => {
  for (const thrustView of [null, [20, 60]]) {
    const h = harness({ tool: 'shift', thrustView });
    const original = h.store.get();
    const before = [...h.chart.effectiveThrustView()];
    h.chart.svg.emit('pointerdown', h.pointer(1, 40));
    assert.equal(h.calls.shiftStart.length, 1);
    close(h.calls.shiftStart[0].time, 1);
    close(h.calls.shiftStart[0].thrust, 40);
    h.update({ points: h.chart.state.points.map(point => ({ ...point, thrust: point.thrust * 10 })) });
    assert.deepEqual(h.chart.effectiveThrustView(), before);
    const middle = (h.chart.box.top + h.chart.box.bottom) / 2;
    h.chart.svg.emit('pointermove', { ...h.pointer(1.5, 40), clientY: middle });
    h.chart.svg.emit('pointermove', { ...h.pointer(2, 40), clientY: middle });
    assert.equal(h.calls.shiftMove.length, 2);
    close(h.calls.shiftMove.at(-1).time, 2);
    close(h.calls.shiftMove.at(-1).thrust, (before[0] + before[1]) / 2);
    h.chart.svg.emit('pointerup');
    assert.deepEqual(h.calls.shiftEnd, [false]);
    for (const name of ['time', 'thrust', 'selection', 'draw', 'curve', 'measure', 'cursor']) assert.equal(h.calls[name].length, 0, `${name} must not handle a profile shift`);
    assert.equal(h.calls.drawStart, 0);
    if (thrustView) assert.deepEqual(h.chart.effectiveThrustView(), thrustView);
    else assert.ok(h.chart.effectiveThrustView()[1] > before[1]);
    assert.equal(h.store.get(), original);
    assert.equal(h.store.status().undoCount, 0);
    h.store.destroy();
  }
});

test('pointer cancellation and cancelDrag cancel a profile shift exactly once and release capture', () => {
  for (const cancel of ['pointercancel', 'cancelDrag']) {
    const h = harness({ tool: 'shift', thrustView: [20, 60] });
    h.chart.svg.emit('pointerdown', h.pointer(1, 40));
    h.chart.svg.emit('pointermove', h.pointer(1.5, 30));
    if (cancel === 'cancelDrag') assert.equal(h.chart.cancelDrag(), true);
    else h.chart.svg.emit('pointercancel');
    assert.deepEqual(h.calls.shiftEnd, [true]);
    assert.equal(h.chart.drag, null);
    assert.equal(h.chart.svg.hasPointerCapture(1), false);
    assert.equal(h.chart.cancelDrag(), false);
    h.chart.svg.emit('pointerup');
    h.chart.svg.emit('pointermove', h.pointer(2, 40));
    assert.equal(h.calls.shiftMove.length, 1);
    assert.deepEqual(h.calls.shiftEnd, [true]);
    for (const name of ['time', 'thrust', 'selection', 'draw', 'curve', 'measure', 'cursor']) assert.equal(h.calls[name].length, 0, `${name} must not handle shift cancellation`);
    assert.equal(h.store.status().undoCount, 0);
    h.store.destroy();
  }
});
