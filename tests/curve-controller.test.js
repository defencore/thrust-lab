import test from 'node:test';
import assert from 'node:assert/strict';
import { createCurveController } from '../src/controllers/curve-controller.js';
import { createProjectStore } from '../src/project-store.js';

function harness({ range = null, saved = null, points = Array.from({ length: 21 }, (_, index) => ({ time: index / 10, thrust: 10 + (index % 4) })) } = {}) {
  const store = createProjectStore({ name: 'Measured curve', points, original: structuredClone(points), theory: null, selection: range, scope: range ? 'selection' : 'all', curveEdit: saved }, { storage: null });
  const doc = { activeElement: null };
  const elements = new Map();
  for (const name of ['start', 'node-count', 'interpolation', 'node-list', 'point-status', 'time', 'thrust', 'add', 'remove', 'reset', 'edit-controls']) {
    const handlers = new Map();
    const input = { value: name === 'node-count' ? '5' : name === 'interpolation' ? 'smooth' : '', ownerDocument: doc, hidden: false, disabled: false, innerHTML: '', textContent: '', addEventListener(type, handler) { handlers.set(type, handler); }, emit(type) { handlers.get(type)?.(); }, checkValidity() { return this.value.trim() !== '' && Number.isFinite(Number(this.value)) && (this.min === undefined || Number(this.value) >= Number(this.min)) && (this.max === undefined || Number(this.value) <= Number(this.max)); } };
    elements.set(`#curve-${name}`, input);
  }
  const ui = { mode: 'edit', tool: 'select', playhead: 1, view: [0, 2] };
  elements.set('.curve-boundary-note', { textContent: '' });
  const errors = [];
  let controller;
  const ctx = {
    store, ui, $: selector => elements.get(selector), $$: () => [],
    units: { read: id => Number(elements.get(`#${id}`).value), set: (id, value) => { elements.get(`#${id}`).value = String(value); }, get: () => ({ thrust: 'N', time: 's', impulse: 'N·s' }), symbol: dimension => dimension === 'time' ? 's' : 'N', format: value => String(value) },
    beforeEdit() {}, getRange: () => store.get().scope === 'selection' ? store.get().selection : null,
    setInspector: tab => { ui.inspectorTab = tab; },
    render() { controller?.reconcile(); }, notify() {}, error: error => errors.push(error),
  };
  controller = createCurveController(ctx);
  store.subscribe(() => ctx.render());
  return { controller, store, ui, errors, elements, doc };
}

test('activation only creates visible handles and never changes measurements', () => {
  const h = harness();
  const before = h.store.get();
  h.controller.activate();
  assert.equal(h.store.get(), before);
  assert.equal(h.store.status().undoCount, 0);
  assert.equal(h.controller.isActive, true);
  assert.equal(h.ui.tool, 'curve');
  assert.equal(h.ui.inspectorTab, 'curve');
  assert.equal(h.controller.chartState().curveNodes.length, 5);
  assert.equal(h.elements.get('#curve-edit-controls').hidden, false);
  assert.match(h.elements.get('#curve-node-list').innerHTML, /aria-pressed="true"/);
  h.controller.select(3);
  assert.equal(h.controller.chartState().curveSelected, 3);
  assert.equal(h.store.get(), before);
  assert.equal(h.store.status().undoCount, 0);
});

test('the displayed anchor count follows topology changes and Undo without changing measurements', () => {
  const h = harness();
  h.controller.activate();
  const before = structuredClone(h.store.get().points);
  const count = h.elements.get('#curve-node-count');
  count.value = '9'; count.onchange();
  assert.equal(count.value, '9');
  h.store.undo();
  assert.equal(count.value, '5');
  assert.equal(h.controller.chartState().curveNodes.length, 5);
  assert.deepEqual(h.store.get().points, before);
});

test('point dragging writes live changes and keeps the whole gesture in one undo step', () => {
  const h = harness();
  const original = structuredClone(h.store.get());
  h.controller.activate();
  assert.equal(h.controller.pointerStart(2, 1, 30), 2);
  h.controller.pointerMove(2, 1.1, 30);
  assert.equal(h.store.get().points.find(point => point.time === 1.1).thrust, 30);
  h.controller.pointerMove(2, 1.2, 40);
  assert.equal(h.store.get().points.find(point => point.time === 1.2).thrust, 40);
  h.controller.pointerEnd(false);
  assert.equal(h.store.status().undoCount, 1);
  assert.equal(h.controller.chartState().curveSelected, 2);
  assert.deepEqual(h.store.get().points.map(point => point.time), original.points.map(point => point.time));
  assert.equal(h.store.get().curveEdit.nodes[2].thrust, 40);
  assert.equal(h.store.undo(), true);
  assert.deepEqual(h.store.get().points, original.points);
  assert.equal(h.store.redo(), true);
  assert.deepEqual(h.controller.chartState().curveNodes, h.store.get().curveEdit.nodes);
  assert.equal(h.errors.length, 0);
});

test('canceling a drag restores both samples and anchor selection without adding history', () => {
  const h = harness();
  h.controller.activate();
  const before = structuredClone(h.store.get());
  const nodes = structuredClone(h.controller.chartState().curveNodes);
  h.controller.pointerStart(1, .5, 30);
  h.controller.pointerMove(1, .6, 30);
  h.controller.pointerEnd(true);
  assert.deepEqual(h.store.get(), before);
  assert.deepEqual(h.controller.chartState().curveNodes, nodes);
  assert.equal(h.store.status().undoCount, 0);
});

test('selected range endpoints remain pinned while whole-profile endpoint thrust stays editable', () => {
  const selected = harness({ range: [.2, 1.8] });
  selected.controller.activate();
  const before = structuredClone(selected.store.get().points);
  selected.controller.pointerStart(0, .2, 90);
  selected.controller.pointerMove(0, .3, 90);
  selected.controller.pointerEnd();
  assert.deepEqual(selected.store.get().points, before);
  assert.equal(selected.elements.get('#curve-thrust').disabled, true);
  assert.match(selected.elements.get('.curve-boundary-note').textContent, /connected to its surroundings/);
  const full = harness();
  full.controller.activate();
  full.controller.pointerStart(0, 0, 90);
  full.controller.pointerMove(0, .4, 90);
  full.controller.pointerEnd();
  assert.equal(full.store.get().points[0].time, 0);
  assert.equal(full.store.get().points[0].thrust, 90);
  assert.equal(full.elements.get('#curve-time').disabled, true);
  assert.match(full.elements.get('.curve-boundary-note').textContent, /their thrust can be edited/);
});

test('typing updates the live curve, keeps focused input intact, and uses the stable session base', () => {
  const h = harness();
  h.controller.activate();
  h.controller.select(2);
  const input = h.elements.get('#curve-thrust');
  h.doc.activeElement = input;
  input.value = '35.0'; input.emit('input');
  assert.equal(h.store.get().points[10].thrust, 35);
  assert.equal(input.value, '35.0');
  const firstEdit = structuredClone(h.store.get().points);
  input.value = '45.0'; input.emit('input');
  assert.equal(h.store.get().points[10].thrust, 45);
  input.value = '35.0'; input.emit('input');
  assert.deepEqual(h.store.get().points, firstEdit);
  assert.equal(h.store.status().undoCount, 1);
  h.doc.activeElement = null; input.emit('blur');
  assert.equal(input.value, '35');
  assert.equal(h.errors.length, 0);
});

test('count, interpolation, add, remove and reset actions update immediately', () => {
  const h = harness();
  h.controller.activate();
  h.elements.get('#curve-node-count').value = '3';
  h.elements.get('#curve-node-count').onchange();
  assert.equal(h.store.get().curveEdit.nodes.length, 3);
  h.elements.get('#curve-interpolation').value = 'linear';
  h.elements.get('#curve-interpolation').onchange();
  assert.equal(h.store.get().curveEdit.interpolation, 'linear');
  h.ui.playhead = .6;
  h.elements.get('#curve-add').onclick();
  assert.equal(h.store.get().curveEdit.nodes.length, 4);
  assert.equal(h.controller.chartState().curveSelected, 1);
  h.elements.get('#curve-remove').onclick();
  assert.equal(h.store.get().curveEdit.nodes.length, 3);
  h.elements.get('#curve-reset').onclick();
  assert.equal(h.store.get().curveEdit.nodes.length, 3);
  assert.equal(h.errors.length, 0);
});

test('external edits and saved metadata rebase handles without silently modifying data', () => {
  const h = harness();
  h.controller.activate();
  h.controller.pointerStart(2, 1, 30);
  h.controller.pointerMove(2, 1, 30);
  h.controller.pointerEnd();
  h.controller.deactivate();
  const current = h.store.get();
  h.controller.activate();
  assert.deepEqual(h.controller.chartState().curveNodes, current.curveEdit.nodes);
  assert.equal(h.store.get(), current);
  h.store.edit('External sample edit', project => { project.points[6].thrust = 99; project.curveEdit = null; });
  assert.equal(h.controller.chartState().curveBase[6].thrust, 99);
  assert.equal(h.store.get().points[6].thrust, 99);
  h.ui.tool = 'select'; h.controller.reconcile();
  assert.equal(h.controller.isActive, false);
  assert.equal(h.controller.chartState().curveNodes, null);
});

test('undo, redo and external rebases retain the selected handle in the same scope', () => {
  const h = harness();
  h.controller.activate();
  h.controller.select(3);
  h.controller.pointerStart(3, 1.5, 40);
  h.controller.pointerMove(3, 1.4, 40);
  h.controller.pointerEnd();
  h.store.undo();
  assert.equal(h.controller.isActive, true);
  assert.equal(h.controller.chartState().curveSelected, 3);
  h.store.redo();
  assert.equal(h.controller.chartState().curveSelected, 3);
  h.store.edit('External measurement', project => { project.points[7].thrust = 50; project.curveEdit = null; });
  assert.equal(h.controller.chartState().curveSelected, 3);
  assert.equal(h.controller.chartState().curveBase[7].thrust, 50);
  h.store.edit('Fewer restored handles', project => { project.curveEdit = { nodes: [project.points[0], project.points.at(-1)], range: null, interpolation: 'smooth' }; });
  assert.equal(h.controller.chartState().curveSelected, 1);
  h.store.edit('Select another scope', project => { project.selection = [.2, 1.8]; project.scope = 'selection'; project.curveEdit = null; });
  assert.equal(h.controller.chartState().curveSelected, 1);
  assert.equal(h.errors.length, 0);
});

test('invalid add positions close their gesture and do not accidentally move a selected point', () => {
  const h = harness();
  h.controller.activate();
  const before = h.store.get();
  assert.equal(h.controller.pointerStart(null, -1, 50), null);
  h.controller.pointerMove(1, .7, 50);
  h.controller.pointerEnd();
  assert.equal(h.store.get(), before);
  assert.equal(h.store.status().undoCount, 0);
  assert.equal(h.errors.length, 1);
  assert.equal(h.controller.pointerStart(null, .7, 25), 2);
  h.controller.pointerEnd();
  assert.equal(h.store.get().curveEdit.nodes.length, 6);
});

test('row selection retains keyboard focus and updates existing row elements in place', () => {
  const h = harness();
  const list = h.elements.get('#curve-node-list');
  let rows = [];
  let replacements = 0;
  Object.defineProperty(list, 'innerHTML', {
    get() { return ''; },
    set(html) {
      replacements++;
      rows = [...html.matchAll(/data-curve-select="(\d+)"/g)].map(([, index]) => {
        const children = new Map(['.curve-node-time', '.curve-node-thrust', '.curve-row-lock'].map(name => [name, { textContent: '', hidden: false }]));
        const classes = new Set();
        const attributes = new Map();
        const row = { dataset: { curveSelect: index }, children, classes, attributes, classList: { toggle(name, selected) { selected ? classes.add(name) : classes.delete(name); } }, setAttribute(name, value) { attributes.set(name, value); }, querySelector(name) { return children.get(name); }, closest() { return row; }, focus() { h.doc.activeElement = row; } };
        return row;
      });
    },
  });
  list.querySelectorAll = () => rows;
  list.contains = row => rows.includes(row);
  h.controller.activate();
  const third = rows[2];
  third.focus();
  h.controller.select(2);
  assert.equal(replacements, 1);
  assert.equal(h.doc.activeElement, third);
  assert.ok(third.classes.has('selected'));
  assert.equal(third.attributes.get('aria-pressed'), 'true');
  h.controller.pointerStart(2, 1, 35);
  h.controller.pointerMove(2, 1.1, 35);
  h.controller.pointerEnd();
  assert.equal(replacements, 1);
  assert.equal(h.doc.activeElement, third);
  assert.match(third.children.get('.curve-node-thrust').textContent, /35 N/);
  h.elements.get('#curve-remove').onclick();
  assert.equal(replacements, 2);
  assert.equal(h.doc.activeElement, rows[h.controller.chartState().curveSelected]);
});

function detailedProfile() {
  const points = Array.from({ length: 41 }, (_, index) => ({ time: index / 10, thrust: index % 2 ? 24 : 16 }));
  points[4].thrust = 140;
  points[18].thrust = 80;
  points[35].thrust = 120;
  return points;
}

function editForce(h, index, thrust) {
  h.controller.select(index);
  const input = h.elements.get('#curve-thrust');
  input.value = String(thrust);
  input.emit('input');
}

test('editing one handle preserves remote peaks exactly and retains detail inside its neighboring span', () => {
  const h = harness({ points: detailedProfile() });
  h.controller.activate();
  const before = structuredClone(h.store.get().points);
  editForce(h, 2, 44);
  const result = h.store.get().points;
  assert.equal(result[20].thrust, 44);
  assert.deepEqual(result.map(point => point.time), before.map(point => point.time));
  for (let index = 0; index < result.length; index++) {
    if (result[index].time <= 1 || result[index].time >= 3) assert.deepEqual(result[index], before[index]);
  }
  assert.ok(result[18].thrust >= before[18].thrust, 'The existing interior peak must survive the local upward adjustment.');
  assert.ok(result[18].thrust - Math.max(result[17].thrust, result[19].thrust) > 45);
  for (let index = 21; index < 28; index += 2) assert.ok(result[index].thrust > result[index + 1].thrust, 'Recorded alternating detail must survive the deformation.');
  assert.equal(h.errors.length, 0);
});

test('redistributing, adding and removing handles preserve every current measurement', () => {
  const h = harness({ points: detailedProfile() });
  h.controller.activate();
  editForce(h, 2, 44);
  const edited = structuredClone(h.store.get().points);
  h.elements.get('#curve-node-count').value = '9';
  h.elements.get('#curve-node-count').onchange();
  assert.equal(h.store.get().curveEdit.nodes.length, 9);
  assert.deepEqual(h.store.get().points, edited);
  h.ui.playhead = 1.34;
  h.elements.get('#curve-add').onclick();
  assert.equal(h.store.get().curveEdit.nodes.length, 10);
  assert.deepEqual(h.store.get().points, edited);
  h.elements.get('#curve-remove').onclick();
  assert.equal(h.store.get().curveEdit.nodes.length, 9);
  assert.deepEqual(h.store.get().points, edited);
  h.ui.playhead = 2;
  h.elements.get('#curve-add').onclick();
  assert.equal(h.store.get().curveEdit.nodes.length, 10);
  assert.deepEqual(h.store.get().points, edited);
  h.elements.get('#curve-remove').onclick();
  h.elements.get('#curve-reset').onclick();
  assert.deepEqual(h.store.get().points, edited);
  editForce(h, 4, edited[20].thrust + 5);
  for (let index = 0; index < edited.length; index++) {
    if (edited[index].time <= 1.5 || edited[index].time >= 2.5) assert.deepEqual(h.store.get().points[index], edited[index]);
  }
  assert.equal(h.errors.length, 0);
});

test('saved handle forces rebase to noisy measurements without applying stale targets elsewhere', () => {
  const points = detailedProfile();
  const saved = { nodes: [0, 10, 20, 30, 40].map(index => ({ time: points[index].time, thrust: 500 + index })), range: null, interpolation: 'smooth' };
  const h = harness({ points, saved });
  const before = h.store.get();
  h.controller.activate();
  assert.equal(h.store.get(), before);
  for (const node of h.controller.chartState().curveNodes) assert.equal(node.thrust, points.find(point => point.time === node.time).thrust);
  editForce(h, 2, 30);
  for (let index = 0; index < points.length; index++) {
    if (points[index].time <= 1 || points[index].time >= 3) assert.deepEqual(h.store.get().points[index], points[index]);
  }
  assert.equal(h.store.get().points[20].thrust, 30);
  const current = h.store.get();
  h.controller.deactivate();
  h.controller.activate();
  assert.equal(h.store.get(), current);
  editForce(h, 2, 30);
  assert.deepEqual(h.store.get().points, current.points);
  assert.equal(h.errors.length, 0);
});

test('a denser handle layout narrows a point edit without changing the initial profile', () => {
  const points = detailedProfile();
  const wide = harness({ points });
  const narrow = harness({ points });
  wide.controller.activate(); narrow.controller.activate();
  narrow.elements.get('#curve-node-count').value = '9';
  narrow.elements.get('#curve-node-count').onchange();
  assert.deepEqual(narrow.store.get().points, points);
  editForce(wide, 2, 40);
  editForce(narrow, 4, 40);
  assert.notEqual(wide.store.get().points[12].thrust, points[12].thrust);
  assert.deepEqual(narrow.store.get().points[12], points[12]);
  for (let index = 0; index < points.length; index++) {
    if (points[index].time <= 1.5 || points[index].time >= 2.5) assert.deepEqual(narrow.store.get().points[index], points[index]);
  }
  assert.equal(wide.store.get().points[20].thrust, 40);
  assert.equal(narrow.store.get().points[20].thrust, 40);
});

test('canceling an added handle restores the previous deformation baseline for later input', () => {
  const h = harness({ points: detailedProfile() });
  h.controller.activate();
  editForce(h, 2, 44);
  const beforeAdd = structuredClone(h.store.get());
  const added = h.controller.pointerStart(null, 1.3, 55);
  h.controller.pointerMove(added, 1.4, 60);
  h.controller.pointerEnd(true);
  assert.deepEqual(h.store.get(), beforeAdd);
  editForce(h, 2, 54);
  editForce(h, 2, 44);
  assert.deepEqual(h.store.get().points, beforeAdd.points);
  assert.equal(h.errors.length, 0);
});

test('undo and redo rebase the next local edit without replaying old adjustments', () => {
  const h = harness({ points: detailedProfile() });
  h.controller.activate();
  editForce(h, 2, 44);
  const edited = structuredClone(h.store.get().points);
  assert.equal(h.store.undo(), true);
  assert.equal(h.store.redo(), true);
  editForce(h, 2, 54);
  editForce(h, 2, 44);
  assert.deepEqual(h.store.get().points, edited);
  for (let index = 0; index < edited.length; index++) {
    if (edited[index].time <= 1 || edited[index].time >= 3) assert.deepEqual(h.store.get().points[index], detailedProfile()[index]);
  }
  assert.equal(h.errors.length, 0);
});
