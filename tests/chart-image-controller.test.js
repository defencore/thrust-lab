import test from 'node:test';
import assert from 'node:assert/strict';
import { createChartImageController, chartImageModel } from '../src/controllers/chart-image-controller.js';

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

function reportFixture(settings = {}) {
  const fields = new Map();
  for (const [name, label, value, unit, detail] of [
    ['impulse', 'TOTAL IMPULSE', '921.569', 'N·s', '352 measurement points'],
    ['peak', 'PEAK THRUST', '455.200', 'N', 'at 2.500 s'],
    ['burn', 'BURN DURATION', '3.500', 's', '5% peak threshold'],
    ['average', 'MEAN BURN THRUST', '263.305', 'N', 'Impulse / 5% burn duration'],
  ]) {
    const card = { querySelector: selector => ({ textContent: selector === 'span' ? label : detail }) };
    fields.set(`#metric-${name}`, { textContent: value, nextElementSibling: { textContent: unit }, closest: () => card });
  }
  const item = (id, label) => ({ id, hidden: false, textContent: label, css: {}, querySelector: () => ({ css: { borderTopColor: '#3978b8', borderTopStyle: 'solid' } }) });
  const entries = [item('', 'Working'), item('theory-legend', 'Theoretical'), item('original-legend', 'Original')];
  const container = { hidden: false, css: {}, querySelectorAll: () => entries };
  fields.set('#chart-report .chart-legend', container); fields.set('#chart-name', { textContent: 'Measured profile' });
  const profile = { showTheory: true, theory: [{}], showOriginal: true, original: [{}] };
  const ctx = { $: selector => fields.get(selector), imageSettings: { getState: () => settings }, activeProfile: () => profile, ui: { view: [1, 4.5] }, units: { format: value => value.toFixed(3), symbol: () => 's' } };
  return { ctx, profile, entries, container, getStyle: node => ({ display: 'inline', visibility: 'visible', opacity: '1', ...node.css }) };
}

test('image model hides details and legend by default while retaining metric values and the visible window', () => {
  const f = reportFixture(), model = chartImageModel(f.ctx, f);
  assert.equal(model.showDetails, false); assert.equal(model.showLegend, false);
  assert.deepEqual(model.metrics.map(metric => metric.detail), ['', '', '', '']);
  assert.deepEqual(model.metrics.map(metric => metric.value), ['921.569', '455.200', '3.500', '263.305']);
  assert.deepEqual(model.metrics.map(metric => metric.key), ['impulse', 'peak', 'burn', 'average']);
  assert.deepEqual(model.legend, []);
  assert.equal(model.footer, 'Time window: 1.000 — 4.500 s');
  const detailed = reportFixture({ showDetails: true, showLegend: true }), enabled = chartImageModel(detailed.ctx, detailed);
  assert.equal(enabled.metrics[0].detail, '352 measurement points');
  assert.ok(enabled.footer.startsWith('Full profile metrics · Time window:'));
});

test('fitted-region images use the same zero-based time labels as the plot without retiming the view', () => {
  const f = reportFixture();
  f.ctx.ui.timeOriginSI = 1;
  assert.equal(chartImageModel(f.ctx, f).footer, 'Time from fitted region start: 0.000 — 3.500 s');
  assert.deepEqual(f.ctx.ui.view, [1, 4.5]);
  f.ctx.ui.view = [2, 3];
  assert.equal(chartImageModel(f.ctx, f).footer, 'Time from fitted region start: 1.000 — 2.000 s');
  f.ctx.ui.timeOriginSI = null;
  assert.equal(chartImageModel(f.ctx, f).footer, 'Time window: 2.000 — 3.000 s');
});

test('enabled image legend follows actual profile layers and computed DOM visibility', () => {
  const f = reportFixture({ showLegend: true });
  f.profile.showTheory = false; f.profile.showOriginal = false;
  assert.deepEqual(chartImageModel(f.ctx, f).legend.map(item => item.label), ['Working']);
  f.profile.showTheory = true; f.profile.showOriginal = true;
  f.entries[1].hidden = true; f.entries[2].css.visibility = 'hidden';
  assert.deepEqual(chartImageModel(f.ctx, f).legend.map(item => item.label), ['Working']);
  f.entries[1].hidden = false; f.entries[2].css.visibility = 'visible';
  f.profile.theory = null;
  assert.deepEqual(chartImageModel(f.ctx, f).legend.map(item => item.label), ['Working', 'Original']);
  f.container.css.display = 'none';
  assert.deepEqual(chartImageModel(f.ctx, f).legend, []);
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
