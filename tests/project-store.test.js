import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createProjectStore } from '../src/project-store.js';
import { serializeProject } from '../src/csv.js';

const project = () => ({ name: 'Measured profile', points: [{ time: .013, thrust: 0 }, { time: .029, thrust: 12 }, { time: .067, thrust: 0 }], theory: [{ time: 5, thrust: 0 }, { time: 5.5, thrust: 10 }], theoryAlignment: { mode: 'ignition', offset: -.15 }, selection: [.013, .067], scope: 'selection', curveEdit: { nodes: [{ time: .013, thrust: 0 }, { time: .029, thrust: 12 }, { time: .067, thrust: 0 }], range: [.013, .067], interpolation: 'smooth' } });
function memoryStorage(values = {}) {
  const entries = new Map(Object.entries(values));
  return { entries, writes: 0, getItem(key) { return entries.get(key) ?? null; }, setItem(key, value) { this.writes += 1; entries.set(key, value); } };
}

test('edits update canonical immutable SI state and subscribers synchronously', () => {
  const initial = { ...project(), tool: 'draw', view: [0, 100] };
  const store = createProjectStore(initial, { storage: null });
  const events = [];
  const unsubscribe = store.subscribe(event => events.push({ event, thrust: store.get().points[1].thrust }));
  store.edit('Change thrust', draft => { draft.points[1].thrust = 9.80665; });
  assert.equal(store.get().points[1].thrust, 9.80665);
  assert.deepEqual(store.get().points.map(point => point.time), initial.points.map(point => point.time));
  assert.equal(initial.points[1].thrust, 12);
  assert.equal(events[0].thrust, 9.80665);
  assert.equal(events[0].event.revision, 1);
  assert.equal(store.get().view, undefined);
  assert.equal(store.get().tool, undefined);
  assert.ok(Object.isFrozen(store.get().points[0]));
  assert.throws(() => { store.get().points[0].thrust = 4; }, TypeError);
  unsubscribe(); store.destroy();
});

test('invalid and empty edits leave the state and history untouched', () => {
  const store = createProjectStore(project(), { storage: null });
  const before = store.get();
  store.edit('No change', () => {});
  assert.equal(store.status().undoCount, 0);
  assert.throws(() => store.edit('Invalid', draft => { draft.points[1].thrust = -1; }), /negative thrust/);
  assert.throws(() => store.edit('Throw', draft => { draft.points[1].thrust = 4; throw new Error('Stop'); }), /Stop/);
  assert.equal(store.get(), before);
  assert.equal(store.status().revision, 0);
  assert.equal(store.status().undoCount, 0);
  store.destroy();
});

test('adjacent same-key parameter changes coalesce and a return to baseline removes the empty edit', () => {
  const store = createProjectStore(project(), { storage: null });
  store.edit('Gain', draft => { draft.points[1].thrust = 14; }, { key: 'gain' });
  store.edit('Gain', draft => { draft.points[1].thrust = 16; }, { key: 'gain' });
  assert.equal(store.status().undoCount, 1);
  store.edit('Gain', draft => { draft.points[1].thrust = 12; }, { key: 'gain' });
  assert.equal(store.status().undoCount, 0);
  assert.equal(store.status().activity.length, 1);
  store.edit('Gain', draft => { draft.points[1].thrust = 15; }, { key: 'gain' });
  store.edit('Offset', draft => { draft.points[1].thrust = 17; }, { key: 'offset' });
  assert.equal(store.status().undoCount, 2);
  store.undo(); assert.equal(store.get().points[1].thrust, 15);
  store.undo(); assert.equal(store.get().points[1].thrust, 12);
  store.destroy();
});

test('same keys outside the editing interval start a separate undo step', async () => {
  const store = createProjectStore(project(), { storage: null });
  store.edit('Gain', draft => { draft.points[1].thrust = 14; }, { key: 'gain' });
  await delay(825);
  store.edit('Gain', draft => { draft.points[1].thrust = 16; }, { key: 'gain' });
  assert.equal(store.status().undoCount, 2);
  store.undo(); assert.equal(store.get().points[1].thrust, 14);
  store.destroy();
});

test('gesture edits render immediately but one undo restores curve nodes and alignment', () => {
  const store = createProjectStore(project(), { storage: null });
  const initial = store.get();
  let updates = 0;
  store.subscribe(event => { if (event.type === 'edit') updates += 1; });
  store.begin('Drag control point');
  for (const thrust of [13, 15, 19]) {
    store.edit('Move point', draft => { draft.points[1].thrust = thrust; draft.curveEdit.nodes[1].thrust = thrust; draft.theoryAlignment.offset = .4; });
    assert.equal(store.get().points[1].thrust, thrust);
    assert.equal(store.status().undoCount, 1);
  }
  assert.equal(updates, 3);
  store.end();
  assert.equal(store.status().undoCount, 1);
  store.undo(); assert.deepEqual(store.get(), initial);
  store.redo(); assert.equal(store.get().curveEdit.nodes[1].thrust, 19);
  assert.equal(store.get().theoryAlignment.offset, .4);
  store.destroy();
});

test('canceling a live gesture restores its baseline and the existing redo chain', () => {
  const store = createProjectStore(project(), { storage: null });
  store.edit('Edit', draft => { draft.points[1].thrust = 18; });
  store.undo();
  store.begin('Canceled drag');
  store.edit('Drag', draft => { draft.points[1].thrust = 4; });
  assert.equal(store.status().canRedo, false);
  store.cancel();
  assert.equal(store.get().points[1].thrust, 12);
  assert.equal(store.status().canRedo, true);
  assert.equal(store.status().undoCount, 0);
  store.redo(); assert.equal(store.get().points[1].thrust, 18);
  store.destroy();
});

test('replace is undoable, breaks coalescing, bounds history, and drops redo after new edits', () => {
  const store = createProjectStore(project(), { storage: null, limit: 2 });
  store.edit('One', draft => { draft.points[1].thrust = 13; });
  store.edit('Two', draft => { draft.points[1].thrust = 14; });
  store.replace('Import', { ...project(), name: 'Imported', points: [{ time: 1, thrust: 3 }, { time: 2, thrust: 7 }], selection: null, scope: 'all', curveEdit: null });
  assert.equal(store.status().undoCount, 2);
  store.undo(); assert.equal(store.get().points[1].thrust, 14);
  store.undo(); assert.equal(store.get().points[1].thrust, 13);
  assert.equal(store.undo(), false);
  store.edit('New direction', draft => { draft.points[1].thrust = 20; });
  assert.equal(store.status().canRedo, false);
  store.destroy();
});

test('autosave is deferred while flush and destruction synchronously preserve the latest profile', async () => {
  const storage = memoryStorage();
  const store = createProjectStore(project(), { storage, saveDelay: 20 });
  store.edit('Live', draft => { draft.points[1].thrust = 21; });
  assert.equal(storage.writes, 0);
  assert.equal(store.status().saveStatus, 'pending');
  await delay(35);
  assert.equal(storage.writes, 1);
  assert.equal(JSON.parse(storage.entries.get('thrust-lab-project-v1')).points[1].thrust, 21);
  assert.equal(store.status().saveStatus, 'saved');
  store.edit('Latest', draft => { draft.points[1].thrust = 22; });
  store.destroy();
  assert.equal(JSON.parse(storage.entries.get('thrust-lab-project-v1')).points[1].thrust, 22);
  assert.throws(() => store.edit('Closed', () => {}), /destroyed/);
  await delay(30);
  assert.equal(storage.writes, 2);
});

test('valid saved projects restore, corrupt data falls back, and other storage keys survive', () => {
  const source = { ...project(), name: 'Saved project' };
  const storage = memoryStorage({ 'thrust-lab-project-v1': serializeProject(source), 'thrust-lab-language': 'uk' });
  const restored = createProjectStore(project(), { storage });
  assert.equal(restored.status().restored, true);
  assert.equal(restored.get().name, 'Saved project');
  restored.destroy();
  storage.entries.set('thrust-lab-project-v1', '{ invalid');
  const fresh = createProjectStore(project(), { storage });
  assert.equal(fresh.status().restored, false);
  assert.equal(fresh.get().name, 'Measured profile');
  fresh.flush(); fresh.destroy();
  assert.equal(storage.entries.get('thrust-lab-language'), 'uk');
});

test('unavailable storage keeps edits and undo usable and reports save failure', () => {
  const storage = { getItem() { throw new Error('Disabled'); }, setItem() { throw new Error('Full'); } };
  const store = createProjectStore(project(), { storage, saveDelay: 500 });
  store.edit('Offline edit', draft => { draft.points[1].thrust = 20; });
  assert.equal(store.flush(), false);
  assert.equal(store.status().saveStatus, 'unavailable');
  assert.equal(store.get().points[1].thrust, 20);
  store.undo(); assert.equal(store.get().points[1].thrust, 12);
  store.destroy();
});
