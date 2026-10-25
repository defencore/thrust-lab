import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectStore } from '../src/project-store.js';
import { createLiveEffects } from '../src/live-effects.js';
import { transform } from '../src/profile.js';

const project = () => ({ name: 'Measured', points: [{ time: .013, thrust: 3 }, { time: .029, thrust: 12 }, { time: .067, thrust: 4 }], curveEdit: { nodes: [{ time: .013, thrust: 3 }, { time: .067, thrust: 4 }], range: null, interpolation: 'smooth' } });

test('repeated live gains recompute from one baseline instead of compounding', () => {
  const store = createProjectStore(project(), { storage: null });
  const effects = createLiveEffects(store);
  effects.run('gain', 'Adjust gain', base => transform(base, { type: 'scale', factor: 2 }));
  effects.run('gain', 'Adjust gain', base => transform(base, { type: 'scale', factor: 3 }));
  assert.equal(store.get().points[1].thrust, 36);
  assert.equal(store.status().undoCount, 1);
  assert.deepEqual(store.get().points.map(point => point.time), project().points.map(point => point.time));
  store.undo(); assert.equal(store.get().points[1].thrust, 12);
  store.destroy();
});

test('new effect identifiers and explicit reset capture the current result as a new baseline', () => {
  const store = createProjectStore(project(), { storage: null });
  const effects = createLiveEffects(store);
  effects.run('gain', 'Gain', base => transform(base, { type: 'scale', factor: 2 }));
  effects.run('offset', 'Offset', base => transform(base, { type: 'offset', amount: 1 }));
  assert.equal(store.get().points[1].thrust, 25);
  effects.reset();
  assert.equal(effects.activeId, null);
  assert.equal(store.get().points[1].thrust, 25);
  effects.run('offset', 'Offset', base => transform(base, { type: 'offset', amount: 1 }));
  assert.equal(store.get().points[1].thrust, 26);
  assert.equal(store.status().undoCount, 3);
  store.destroy();
});

test('compute callbacks receive detached baselines and may update curve metadata explicitly', () => {
  const store = createProjectStore(project(), { storage: null });
  const effects = createLiveEffects(store);
  effects.run('curve', 'Live curve', base => { base[1].thrust = 30; return { points: base, curveEdit: null }; });
  assert.equal(store.get().curveEdit, null);
  effects.run('curve', 'Live curve', base => { assert.equal(base[1].thrust, 12); base[1].thrust = 20; return base; });
  assert.equal(store.get().points[1].thrust, 20);
  store.undo(); assert.deepEqual(store.get().curveEdit, project().curveEdit);
  store.destroy();
});

test('invalid or failed effect computations do not change the project or discard a valid active baseline', () => {
  const store = createProjectStore(project(), { storage: null });
  const effects = createLiveEffects(store);
  effects.run('gain', 'Gain', base => transform(base, { type: 'scale', factor: 2 }));
  const before = store.get();
  assert.throws(() => effects.run('bad', 'Bad', base => { base[1].thrust = -1; return base; }), /negative thrust/);
  assert.equal(effects.activeId, 'gain');
  assert.equal(store.get(), before);
  assert.throws(() => effects.run('bad', 'Bad', () => { throw new Error('Cannot compute'); }), /Cannot compute/);
  assert.equal(store.get(), before);
  effects.run('gain', 'Gain', base => transform(base, { type: 'scale', factor: 4 }));
  assert.equal(store.get().points[1].thrust, 48);
  assert.equal(store.status().undoCount, 1);
  store.destroy();
});

test('returning a live parameter to its initial value removes the net-zero undo entry', () => {
  const store = createProjectStore(project(), { storage: null });
  const effects = createLiveEffects(store);
  effects.run('gain', 'Gain', base => transform(base, { type: 'scale', factor: 2 }));
  effects.run('gain', 'Gain', base => transform(base, { type: 'scale', factor: 1 }));
  assert.deepEqual(store.get().points, project().points);
  assert.equal(store.status().undoCount, 0);
  store.destroy();
});
