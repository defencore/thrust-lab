import test from 'node:test';
import assert from 'node:assert/strict';
import { bindNavigation } from '../src/controllers/navigation-controller.js';

test('the cursor accepts fitted-region time while retaining recording coordinates internally', t => {
  const controls = new Map();
  const $ = selector => {
    if (!controls.has(selector)) controls.set(selector, {});
    return controls.get(selector);
  };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { addEventListener() {} } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else delete globalThis.document; });
  const points = Object.freeze([Object.freeze({ time: 12, thrust: 0 }), Object.freeze({ time: 16, thrust: 0 })]);
  const ui = { timeOriginSI: 12, playhead: 12 };
  let entered = .7, renders = 0;
  bindNavigation({ $, $$: () => [], ui, store: {}, units: { read: () => entered }, activeProfile: () => ({ points }), render() { renders++; } });
  const move = () => $('#cursor-time').oninput();
  move();
  assert.equal(ui.playhead, 12.7);
  entered = 100; move();
  assert.equal(ui.playhead, 16);
  ui.timeOriginSI = null; entered = 13.25; move();
  assert.equal(ui.playhead, 13.25);
  entered = Infinity; move();
  assert.equal(ui.playhead, 13.25);
  assert.equal(renders, 3);
  assert.deepEqual(points.map(point => point.time), [12, 16]);
});
