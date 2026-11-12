import test from 'node:test';
import assert from 'node:assert/strict';
import { createChartImageController } from '../src/controllers/chart-image-controller.js';

function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function fixture(dependencies = {}) {
  const controls = new Map();
  const $ = selector => { if (!controls.has(selector)) controls.set(selector, { disabled: false, attributes: new Map(), setAttribute(key, value) { this.attributes.set(key, value); } }); return controls.get(selector); };
  const notifications = [], profile = Object.freeze({ name: 'Test / recorded profile', points: Object.freeze([{ time: 0, thrust: 0 }, { time: 1, thrust: 20 }]) });
  const ctx = { $, activeProfile: () => profile, notify: (...args) => notifications.push(args) };
  const controller = createChartImageController(ctx, dependencies);
  return { $, controller, notifications, profile, ctx };
}

test('copy starts the promised PNG clipboard write before image generation and prevents concurrent exports', async () => {
  const events = [], pending = deferred(), blob = new Blob(['png'], { type: 'image/png' });
  let item;
  class ClipboardItem { constructor(value) { events.push('item'); this.value = value; item = this; } }
  const f = fixture({ makeImage() { events.push('generate'); return pending.promise; }, ClipboardItem, clipboard: { async write(items) { events.push('write'); assert.equal(items[0], item); await item.value['image/png']; } }, download() { events.push('download'); } });
  const copying = f.controller.copy();
  assert.deepEqual(events, ['item', 'write']);
  assert.equal(f.controller.isBusy, true);
  assert.equal(f.$('#copy-chart-image').disabled, true); assert.equal(f.$('#save-chart-image').disabled, true);
  await f.controller.save();
  assert.deepEqual(events, ['item', 'write', 'generate']);
  pending.resolve(blob); await copying;
  assert.equal(await item.value['image/png'], blob);
  assert.deepEqual(f.notifications, [['Chart image copied', false]]);
  assert.equal(f.controller.isBusy, false);
  assert.equal(f.$('#copy-chart-image').attributes.get('aria-busy'), 'false');
  assert.equal(f.$('#save-chart-image').disabled, false);
  assert.equal(f.profile.points[1].thrust, 20);
});

test('unsupported clipboard capability gives the explicit save-image route without generating or downloading anything', async () => {
  let generated = false;
  const f = fixture({ clipboard: null, ClipboardItem: null, makeImage() { generated = true; } });
  await f.controller.copy();
  assert.equal(generated, false); assert.equal(f.controller.isBusy, false);
  assert.deepEqual(f.notifications, [['Image copying is unavailable in this browser. Use Save PNG.', true]]);
});

test('clipboard denial and image encoding failures leave controls available and never report a successful copy', async () => {
  for (const imageFailure of [false, true]) {
    class ClipboardItem { constructor(value) { this.value = value; } }
    const f = fixture({ ClipboardItem, makeImage: () => imageFailure ? Promise.reject(new Error('canvas')) : Promise.resolve(new Blob(['png'])), clipboard: { async write(items) { if (imageFailure) await items[0].value['image/png']; else throw new Error('denied'); } } });
    await f.controller.copy();
    assert.equal(f.controller.isBusy, false);
    assert.equal(f.$('#copy-chart-image').disabled, false);
    assert.equal(f.notifications.length, 1);
    assert.equal(f.notifications[0][1], true);
    assert.ok(!f.notifications[0][0].includes('image copied'));
  }
});

test('save downloads the encoded PNG with the profile name and restores controls after failure', async () => {
  const downloads = [], blob = new Blob(['png'], { type: 'image/png' });
  const f = fixture({ makeImage: async () => blob, download: (...args) => downloads.push(args) });
  await f.controller.save();
  assert.deepEqual(downloads, [[blob, 'Test-recorded-profile-profile.png']]);
  assert.deepEqual(f.notifications, [['Chart image saved', false]]);
  assert.equal(f.controller.isBusy, false);
  const failed = fixture({ makeImage: async () => { throw new Error('encode'); } });
  await failed.controller.save();
  assert.deepEqual(failed.notifications, [['The chart image could not be saved. Try again.', true]]);
  assert.equal(failed.$('#save-chart-image').disabled, false);
});

test('an export keeps its original filename if the active profile changes during encoding', async () => {
  const pending = deferred(), downloads = [], blob = new Blob(['png'], { type: 'image/png' });
  const f = fixture({ makeImage: () => pending.promise, download: (...args) => downloads.push(args) });
  const saving = f.controller.save();
  f.ctx.activeProfile = () => ({ name: 'Another profile' });
  pending.resolve(blob);
  await saving;
  assert.deepEqual(downloads, [[blob, 'Test-recorded-profile-profile.png']]);
});
