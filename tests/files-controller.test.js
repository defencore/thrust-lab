import test from 'node:test';
import assert from 'node:assert/strict';
import { createFilesController } from '../src/controllers/files-controller.js';
import { createProjectStore } from '../src/project-store.js';
import { createPreferences } from '../src/preferences.js';
import { parseCSV, parseProject } from '../src/csv.js';

const sourceCSV = 'Time (ms);Thrust (N)\n4084;943.0\n4085;944.0\n';

class Control extends EventTarget {
  constructor(value = '') {
    super(); this.value = value; this.textContent = ''; this.innerHTML = ''; this.hidden = false;
    this.open = false; this.files = []; this.childNodes = [{ textContent: '' }];
  }
  click() { this.onclick?.(); }
  close() { this.open = false; this.hidden = true; }
  showModal() { this.open = true; this.hidden = false; }
}

function fixture(t, { source = false, times = null, secondThrust = 944, anchors = false } = {}) {
  const imported = parseCSV(sourceCSV);
  const points = structuredClone(imported.points), original = structuredClone(imported.points);
  points[0].thrust = 943.062; points[1].thrust = secondThrust;
  if (times) for (let index = 0; index < points.length; index++) points[index].time = original[index].time = times[index];
  const store = createProjectStore({
    name: 'Edited recording', points, original,
    theory: [{ time: 4, thrust: 0 }, { time: 5, thrust: 1000 }],
    selection: [points[0].time, points[1].time], scope: 'selection',
    ...(anchors ? { curveEdit: { nodes: structuredClone(points), range: null, interpolation: 'smooth' } } : {}),
    ...(source ? { csvFormat: imported.csvFormat } : {}),
  }, { storage: null });
  const preferences = createPreferences(null);
  preferences.update({ controls: { 'export-time': 'us', 'export-thrust': 'lbf', 'export-delimiter': ',', 'export-precision': '3' } });
  const fields = new Map();
  const $ = selector => { if (!fields.has(selector)) fields.set(selector, new Control()); return fields.get(selector); };
  for (const [id, value] of Object.entries(preferences.get().controls)) $(`#${id}`).value = value;
  for (const id of ['csv-header', 'csv-time-unit', 'csv-thrust-unit']) $(`#${id}`).value = 'auto';
  const ui = { mode: 'edit', screen: 'studio' }, notifications = [], errors = [], beforeEdits = [];
  let resets = 0;
  const ctx = {
    $, preferences, store, ui, activeProfile: () => store.get(),
    beforeEdit: id => beforeEdits.push(id), setMode: mode => { ui.mode = mode; },
    edit: (label, mutate) => store.edit(label, mutate), render() {},
    signal: { resetSource() { resets++; } }, samples: { reset() { resets++; } }, fitView() { resets++; },
    notify: message => notifications.push(message), error: error => errors.push(error),
  };
  const previousDocument = globalThis.document, blobs = new Map(), downloads = [];
  globalThis.document = {
    body: { append() {} },
    createElement() {
      return { href: '', download: '', click() { downloads.push({ filename: this.download, blob: blobs.get(this.href) }); }, remove() {} };
    },
  };
  t.mock.method(URL, 'createObjectURL', blob => { const url = `blob:test-${blobs.size}`; blobs.set(url, blob); return url; });
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.mock.method(globalThis, 'setTimeout', () => 0);
  t.after(() => { store.destroy(); globalThis.document = previousDocument; });
  const controller = createFilesController(ctx);
  async function chooseCSV(button, text = sourceCSV, name = 'Original.csv') {
    $(button).click();
    const input = $('#csv-file'); input.files = [{ name, size: text.length, text: async () => text }];
    await input.onchange({ target: input });
  }
  const submitImport = () => $('#import-form').onsubmit({ preventDefault() {} });
  return { $, store, controller, preferences, ui, notifications, errors, beforeEdits, downloads, chooseCSV, submitImport, imported, get resets() { return resets; } };
}

test('working CSV imports retain their numeric format and theory imports cannot replace it', async t => {
  const f = fixture(t);
  await f.chooseCSV('#import'); f.submitImport();
  assert.deepEqual(f.store.get().csvFormat, f.imported.csvFormat);
  assert.deepEqual(f.store.get().points, f.imported.points);
  const working = structuredClone(f.store.get());
  await f.chooseCSV('#import-theory', 'Time (s),Thrust (kN)\n0.0000,0.00\n1.0000,1.00\n', 'Theory.csv');
  f.submitImport();
  assert.deepEqual(f.store.get().csvFormat, working.csvFormat);
  assert.deepEqual(f.store.get().points, working.points);
  assert.deepEqual(f.store.get().original, working.original);
  assert.deepEqual(f.store.get().theory, [{ time: 0, thrust: 0 }, { time: 1, thrust: 1000 }]);
  assert.equal(f.errors.length, 0);
});

test('source-format exports ignore cached custom units and precision without changing measurements', async t => {
  const f = fixture(t, { source: true }), before = structuredClone(f.store.get());
  f.controller.openExport();
  assert.equal(f.$('#export-source-format').hidden, false);
  assert.equal(f.$('#export-custom-format').hidden, true);
  assert.equal(f.$('#export-source-time-example').textContent, '4084');
  assert.equal(f.$('#export-source-thrust-example').textContent, '943.0');
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(f.downloads.length, 1);
  const csv = await f.downloads[0].blob.text();
  const rows = csv.trim().split('\r\n');
  assert.equal(rows[0], 'Time (ms);Thrust (N)');
  assert.equal(rows[11], '4084;943.1');
  assert.equal(rows[12], '4085;944.0');
  assert.equal(parseCSV(csv).syntheticMarker.detected, true);
  assert.deepEqual(parseCSV(csv).points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.store.status().undoCount, 0);
  assert.equal(f.$('#export-error').hidden, true);
});

test('saved native projects retain original number formatting and every edited value', async t => {
  const f = fixture(t, { source: true }), before = structuredClone(f.store.get());
  f.controller.openExport(); f.$('#save-project').click();
  const project = parseProject(await f.downloads[0].blob.text());
  assert.deepEqual(project.csvFormat, before.csvFormat);
  assert.deepEqual(project.points, before.points);
  assert.deepEqual(project.original, before.original);
  assert.deepEqual(f.store.get(), before);
});

test('CSV A supplies exact timings while CSV B keeps its edited forces and existing reference', async t => {
  const f = fixture(t, { times: [0, 1], secondThrust: 944.09, anchors: true }), before = structuredClone(f.store.get());
  f.controller.openExport();
  await f.chooseCSV('#export-read-source'); f.submitImport();
  assert.deepEqual(f.store.get().csvFormat, f.imported.csvFormat);
  assert.deepEqual(f.store.get().points, f.imported.points.map((point, index) => ({ time: point.time, thrust: before.points[index].thrust })));
  assert.deepEqual(f.store.get().original, f.imported.points.map((point, index) => ({ time: point.time, thrust: before.original[index].thrust })));
  assert.deepEqual(f.store.get().theory, before.theory);
  assert.equal(f.store.get().name, before.name);
  assert.equal(f.store.get().selection, null);
  assert.equal(f.store.get().scope, 'all');
  assert.equal(f.store.get().curveEdit, null);
  assert.ok(f.resets > 0);
  assert.equal(f.$('#export-dialog').open, true);
  assert.equal(f.$('#export-source-format').hidden, false);
  assert.equal(f.$('#import-dialog').open, false);
  assert.equal(f.$('#import-error').hidden, true);
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const rows = (await f.downloads[0].blob.text()).trim().split('\r\n');
  assert.equal(rows[11], '4084;943.1');
  assert.equal(rows[12], '4085;944.1');
});

test('different row counts cannot combine timing and thrust files or replace the current recording', async t => {
  const f = fixture(t, { times: [0, 1], secondThrust: 944.09 }), before = f.store.get();
  f.controller.openExport();
  await f.chooseCSV('#export-read-source', 'Time (ms);Thrust (N)\n4084;943.0\n4085;944.0\n4086;945.0\n');
  f.submitImport();
  assert.equal(f.store.get(), before);
  assert.equal(f.store.status().undoCount, 0);
  assert.equal(f.$('#import-error').hidden, false);
  assert.equal(f.$('#import-error').textContent, 'The time source must contain the same number of measurements as the current profile.');
  assert.equal(f.$('#import-dialog').open, true);
  assert.equal(f.resets, 0);
});
