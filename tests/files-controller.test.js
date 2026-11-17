import test from 'node:test';
import assert from 'node:assert/strict';
import { createFilesController } from '../src/controllers/files-controller.js';
import { createProjectStore } from '../src/project-store.js';
import { createPreferences } from '../src/preferences.js';
import { inspectCSV, parseCSV, parseProject } from '../src/csv.js';
import { burnRegionView } from '../src/burn-region.js';

const sourceCSV = 'Time (ms);Thrust (N)\n4084;943.0\n4085;944.0\n';
const downloadText = async download => new TextDecoder('utf-8', { ignoreBOM: true }).decode(await download.blob.arrayBuffer());

class Control extends EventTarget {
  constructor(value = '') {
    super(); this.value = value; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.checked = false;
    this.open = false; this.files = []; this.childNodes = [{ textContent: '' }];
  }
  get lastChild() { return this.childNodes.at(-1); }
  click() { this.onclick?.(); }
  change(value) { this.value = String(value); this.dispatchEvent(new Event('change')); }
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
    const file = new Blob([text]);
    const input = $('#csv-file'); input.files = [{ name, size: file.size, text: () => file.text(), arrayBuffer: () => file.arrayBuffer() }];
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
  assert.equal(f.$('#export-synthetic-marker').checked, false);
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(f.downloads.length, 1);
  const csv = await f.downloads[0].blob.text();
  assert.equal(csv, 'Time (ms);Thrust (N)\n4084;943.1\n4085;944.0\n');
  const decoded = parseCSV(csv, { timeUnit: 'ms', thrustUnit: 'N' });
  assert.equal(inspectCSV(csv).hasHeader, true);
  assert.equal(decoded.syntheticMarker.detected, false);
  assert.deepEqual(decoded.points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.store.status().undoCount, 0);
  assert.equal(f.$('#export-error').hidden, true);
});

test('saved native projects retain original number formatting and every edited value', async t => {
  const f = fixture(t, { source: true }), before = structuredClone(f.store.get());
  f.controller.openExport(); f.$('#save-project').click();
  const saved = await f.downloads[0].blob.text();
  const project = parseProject(saved);
  assert.equal(JSON.parse(saved).points.length, before.points.length + 10);
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
  assert.equal(await f.downloads[0].blob.text(), 'Time (ms);Thrust (N)\n4084;943.1\n4085;944.1\n');
});

test('imported downloads keep reordered auxiliary columns, quoting, BOM, whitespace and EOF spelling', async t => {
  const f = fixture(t);
  const first = '  "000,00" ; "4084" ; "943,0" ; "ignition; raw"';
  const last = ' "001,50";"4085";"944,00";"line 1\nline ""2"""';
  const source = `\uFEFF"Pressure";"Time (ms)";"Thrust (N)";"Notes"\r\n${first}\r\n${last}`;
  await f.chooseCSV('#import', source, 'Quoted source.csv');
  f.submitImport();
  assert.equal(f.errors.length, 0);
  assert.equal(f.$('#import-error').hidden, true);
  f.store.edit('Edit measured thrust', project => { project.points[0].thrust = 943.062; });
  const before = structuredClone(f.store.get());
  f.controller.openExport();
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(f.$('#export-error').hidden, true);
  const bytes = await f.downloads[0].blob.arrayBuffer();
  assert.deepEqual([...new Uint8Array(bytes).slice(0, 3)], [239, 187, 191]);
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  assert.equal(csv, source.replace('"943,0"', '"943,1"'));
  const decoded = parseCSV(csv, { timeColumn: 1, thrustColumn: 2, timeUnit: 'ms', thrustUnit: 'N' });
  assert.deepEqual(decoded.points, [{ time: before.points[0].time, thrust: 943.1 }, { time: before.points[1].time, thrust: 944 }]);
  assert.equal(decoded.syntheticMarker.detected, false);
  assert.deepEqual(f.store.get(), before);
});

test('a source time_ms,thrust,pressure header and all three columns remain unchanged around edited thrust', async t => {
  const f = fixture(t);
  const source = 'time_ms,thrust,pressure\n0,0.0,10.00\n16,45.0,11.25\n33,0.0,12.00\n';
  await f.chooseCSV('#import', source, 'Three columns.csv'); f.submitImport();
  f.store.edit('Correct thrust', project => { project.points[1].thrust = 45.062; });
  const before = structuredClone(f.store.get());
  f.controller.openExport(); f.$('#export-form').onsubmit({ preventDefault() {} });
  const csv = await f.downloads[0].blob.text();
  assert.equal(csv, source.replace('16,45.0,11.25', '16,45.1,11.25'));
  assert.deepEqual(inspectCSV(csv).headers, ['time_ms', 'thrust', 'pressure']);
  assert.equal(csv.trim().split('\n').length, 4);
  assert.deepEqual(parseCSV(csv).points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(f.store.get(), before);
});

test('headerless source records stay headerless without losing their auxiliary column or numeric spelling', async t => {
  const f = fixture(t);
  const source = '0000;00,0;001,20\n0016;07,0;001,30';
  await f.chooseCSV('#import', source, 'No header.csv');
  f.$('#csv-time-unit').value = 'ms'; f.submitImport();
  f.store.edit('Correct thrust', project => { project.points[1].thrust = 7.16; });
  const before = structuredClone(f.store.get());
  f.controller.openExport(); f.$('#export-form').onsubmit({ preventDefault() {} });
  const csv = await f.downloads[0].blob.text();
  assert.equal(csv, '0000;00,0;001,20\n0016;07,2;001,30');
  assert.equal(inspectCSV(csv).hasHeader, false);
  assert.deepEqual(parseCSV(csv, { timeUnit: 'ms' }).points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(f.store.get(), before);
});

test('an imported recording adds the synthetic prefix only after explicit opt-in', async t => {
  const f = fixture(t, { source: true }), before = structuredClone(f.store.get());
  f.controller.openExport();
  assert.equal(f.$('#export-synthetic-marker').checked, false);
  f.$('#export-synthetic-marker').checked = true;
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const csv = await f.downloads[0].blob.text();
  const decoded = parseCSV(csv, { timeUnit: 'ms', thrustUnit: 'N' });
  assert.equal(inspectCSV(csv).hasHeader, true);
  assert.equal(decoded.syntheticMarker.detected, true);
  assert.equal(csv.trim().split(/\r\n|\r|\n/).length, before.points.length + 11);
  assert.deepEqual(decoded.points.map(point => point.time), before.points.map(point => point.time));
  assert.deepEqual(f.store.get(), before);
  f.controller.openExport();
  assert.equal(f.$('#export-synthetic-marker').checked, false);
});

test('older saved numeric formats explain that the original CSV is needed to restore its discarded layout', async t => {
  const f = fixture(t, { source: true });
  f.store.edit('Load older saved formatting', project => { delete project.csvFormat.layout; });
  f.controller.openExport();
  assert.equal(f.$('#export-source-layout-note').hidden, false);
  assert.equal(f.$('#export-read-source').lastChild.textContent, 'Restore original CSV layout');
  assert.equal(f.$('#export-synthetic-marker').checked, false);
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(f.$('#export-error').hidden, true);
  const csv = await f.downloads[0].blob.text();
  assert.equal(inspectCSV(csv).hasHeader, true);
  assert.equal(parseCSV(csv, { timeUnit: 'ms' }).syntheticMarker.detected, false);
  assert.deepEqual(parseCSV(csv, { timeUnit: 'ms' }).points.map(point => point.time), f.imported.points.map(point => point.time));
  await f.chooseCSV('#export-read-source'); f.submitImport();
  assert.equal(f.$('#export-source-layout-note').hidden, true);
  assert.equal(f.$('#export-read-source').lastChild.textContent, 'Use timings from another CSV');
});

test('generated downloads omit column names and reset provenance defaults for their own source type', async t => {
  const f = fixture(t, { source: true });
  f.controller.openExport();
  assert.equal(f.$('#export-synthetic-marker').checked, false);
  f.store.edit('Adopt generated preview', project => { delete project.csvFormat; });
  f.ui.mode = 'create';
  const before = structuredClone(f.store.get());
  f.controller.openExport();
  assert.equal(f.$('#export-custom-format').hidden, false);
  assert.equal(f.$('#export-synthetic-marker').checked, true);
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const marked = await f.downloads[0].blob.text();
  assert.equal(inspectCSV(marked).hasHeader, false);
  const options = { timeUnit: 'us', thrustUnit: 'lbf' };
  assert.equal(parseCSV(marked, options).syntheticMarker.detected, true);
  f.controller.openExport();
  f.$('#export-synthetic-marker').checked = false;
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const unmarked = await f.downloads[1].blob.text();
  assert.equal(inspectCSV(unmarked).hasHeader, false);
  assert.equal(parseCSV(unmarked, options).syntheticMarker.detected, false);
  assert.equal(parseCSV(unmarked, options).points.length, before.points.length);
  assert.deepEqual(f.store.get(), before);
  f.controller.openExport();
  assert.equal(f.$('#export-synthetic-marker').checked, true);
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

test('invalid UTF-8 source bytes are rejected before a lossy import preview can replace the recording', async t => {
  const f = fixture(t), before = f.store.get();
  const encoder = new TextEncoder();
  const bytes = new Uint8Array([...encoder.encode('Time (s),Thrust (N),Notes\n0,1,'), 255, ...encoder.encode('\n1,2,ok\n')]);
  const file = new Blob([bytes]);
  f.$('#import').click();
  const input = f.$('#csv-file');
  input.files = [{ name: 'Invalid encoding.csv', size: file.size, text: () => file.text(), arrayBuffer: () => file.arrayBuffer() }];
  await input.onchange({ target: input });
  assert.equal(f.store.get(), before);
  assert.equal(f.errors.length, 1);
  assert.equal(f.$('#import-dialog').open, false);
  assert.equal(f.store.status().undoCount, 0);
});

test('custom export units convert actual values and header labels while original format remains byte-exact', async t => {
  const f = fixture(t);
  const source = '\uFEFFpressure;"time_ms";"thrust_kgf";notes\r\n001,00;"001000";"1,000";"a;1"\r\n002,00;"001250";"2,000";"b""2"\r\n003,00;"001500";"0,000";"c"';
  await f.chooseCSV('#import', source, 'Units.csv'); f.submitImport();
  const before = structuredClone(f.store.get());
  f.controller.openExport();
  assert.equal(f.$('#export-format-mode').value, 'source');
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(await downloadText(f.downloads[0]), source);

  f.controller.openExport();
  f.$('#export-format-mode').change('custom');
  f.$('#export-time').change('s'); f.$('#export-thrust').change('N'); f.$('#export-precision').change('2');
  assert.equal(f.$('#export-custom-format').hidden, false);
  assert.equal(f.$('#export-source-format').hidden, true);
  assert.equal(f.$('#export-delimiter').disabled, true);
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const converted = await downloadText(f.downloads[1]);
  assert.equal(converted, '\uFEFFpressure;"time_s";"thrust_N";notes\r\n001,00;"1";"9,81";"a;1"\r\n002,00;"1.25";"19,61";"b""2"\r\n003,00;"1.5";"0,00";"c"');
  const parsed = parseCSV(converted);
  assert.deepEqual(parsed.points, [{ time: 1, thrust: 9.81 }, { time: 1.25, thrust: 19.61 }, { time: 1.5, thrust: 0 }]);

  f.controller.openExport();
  assert.equal(f.$('#export-format-mode').value, 'custom');
  assert.equal(f.$('#export-time').value, 's'); assert.equal(f.$('#export-thrust').value, 'N');
  assert.equal(f.$('#export-precision').value, '2');
  f.$('#export-time').change('ms'); f.$('#export-thrust').change('kgf'); f.$('#export-precision').change('3');
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(await downloadText(f.downloads[2]), source);
  f.controller.openExport(); f.$('#export-format-mode').change('source');
  f.$('#export-form').onsubmit({ preventDefault() {} });
  assert.equal(await downloadText(f.downloads[3]), source);
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.$('#export-error').hidden, true);
});

test('burn-only source exports use Fit burn bounds and retain original row indices and absolute clocks', async t => {
  const f = fixture(t);
  const rows = ['1000,0.0,001.00', '1130,4.0,001.20', '1270,60.0,001.40', '2910,100.0,001.60', '3040,7.0,001.80', '3580,0.0,002.00', '8000,0.0,002.20'];
  await f.chooseCSV('#import', `time_ms,thrust,pressure\n${rows.join('\n')}`, 'Burn.csv'); f.submitImport();
  f.store.edit('Correct peak', project => { project.points[3].thrust = 100.06; });
  f.ui.timeOrigin = 1.13;
  const before = structuredClone(f.store.get());
  const bounds = burnRegionView(before.points);
  assert.equal(before.points.some(point => point.time === bounds[0] || point.time === bounds[1]), false);
  const selected = before.points.filter(point => point.time >= bounds[0] && point.time <= bounds[1]);
  assert.deepEqual(selected.map(point => point.time), before.points.slice(1, 5).map(point => point.time));
  f.controller.openExport(); f.$('#export-scope').change('burn');
  assert.equal(f.$('#export-submit').disabled, false);
  assert.equal(f.$('#export-scope-status').textContent, '4 measurements · 1130 — 3040 ms');
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const csv = await downloadText(f.downloads[0]);
  assert.equal(csv, `time_ms,thrust,pressure\n${rows.slice(1, 5).join('\n').replace('2910,100.0,001.60', '2910,100.1,001.60')}\n`);
  assert.deepEqual(parseCSV(csv).points.map(point => point.time), selected.map(point => point.time));
  assert.equal(parseCSV(csv).points[0].time, before.points[1].time);
  assert.notEqual(parseCSV(csv).points[0].time, 0);
  assert.deepEqual(f.store.get(), before);
  assert.equal(f.ui.timeOrigin, 1.13);
});

test('burn-only custom exports convert only retained rows while keeping their auxiliary measurements', async t => {
  const f = fixture(t);
  const source = 'Time (ms);Thrust (kgf);Pressure\n100000;0.000;00.0\n110000;0.000;11.0\n111000;1.000;12.0\n112000;2.000;13.0\n113000;0.000;14.0\n120000;0.000;15.0\n';
  await f.chooseCSV('#import', source); f.submitImport();
  f.ui.timeOrigin = 110;
  const before = structuredClone(f.store.get()), bounds = burnRegionView(before.points);
  const selected = before.points.filter(point => point.time >= bounds[0] && point.time <= bounds[1]);
  f.controller.openExport();
  f.$('#export-format-mode').change('custom'); f.$('#export-scope').change('burn');
  f.$('#export-time').change('s'); f.$('#export-thrust').change('N'); f.$('#export-precision').change('3');
  f.$('#export-form').onsubmit({ preventDefault() {} });
  const csv = await downloadText(f.downloads[0]);
  assert.equal(csv, 'Time (s);Thrust (N);Pressure\n110;0.000;11.0\n111;9.807;12.0\n112;19.613;13.0\n113;0.000;14.0\n');
  assert.deepEqual(parseCSV(csv).points.map(point => point.time), selected.map(point => point.time));
  assert.deepEqual(f.store.get(), before);
});

test('missing or undersampled burn regions disable download and reject direct submit without changing the profile', async t => {
  const f = fixture(t);
  for (const [source, expectedError] of [
    ['Time (s),Thrust (N)\n5,0.0\n6,0.0\n', /No measurable burn region/],
    ['Time (s),Thrust (N)\n5,100.0\n6,0.0\n', /fewer than two measurements/],
  ]) {
    await f.chooseCSV('#import', source); f.submitImport();
    const before = structuredClone(f.store.get());
    f.controller.openExport(); f.$('#export-scope').change('burn');
    assert.equal(f.$('#export-submit').disabled, true);
    assert.match(f.$('#export-scope-status').textContent, expectedError);
    f.$('#export-form').onsubmit({ preventDefault() {} });
    assert.equal(f.downloads.length, 0);
    assert.equal(f.$('#export-error').hidden, false);
    assert.match(f.$('#export-error').textContent, expectedError);
    assert.deepEqual(f.store.get(), before);
    f.$('#export-scope').change('all');
    assert.equal(f.$('#export-submit').disabled, false);
    assert.equal(f.$('#export-error').hidden, true);
  }
});

test('export mode, scope and conversion choices survive reopening and return to defaults after settings reset', t => {
  const f = fixture(t, { source: true });
  f.controller.openExport();
  f.$('#export-format-mode').change('custom'); f.$('#export-scope').change('burn');
  f.$('#export-time').change('ms'); f.$('#export-thrust').change('kgf'); f.$('#export-precision').change('4');
  f.controller.openExport();
  assert.deepEqual(f.preferences.get().csvExport, { formatMode: 'custom', scope: 'burn' });
  for (const [id, value] of [['export-format-mode', 'custom'], ['export-scope', 'burn'], ['export-time', 'ms'], ['export-thrust', 'kgf'], ['export-precision', '4']]) assert.equal(f.$(`#${id}`).value, value);
  f.preferences.reset(); f.controller.openExport();
  for (const [id, value] of [['export-format-mode', 'source'], ['export-scope', 'all'], ['export-time', 's'], ['export-thrust', 'N'], ['export-precision', '6']]) assert.equal(f.$(`#${id}`).value, value);
  assert.equal(f.$('#export-custom-format').hidden, true);
});

test('generated profiles force custom export without replacing the imported-profile format preference', t => {
  const f = fixture(t, { source: true });
  const importedFormat = structuredClone(f.store.get().csvFormat);
  f.controller.openExport();
  assert.equal(f.$('#export-format-mode').value, 'source');
  assert.equal(f.$('#export-format-mode option[value="source"]').disabled, false);
  f.store.edit('Adopt preview', project => { delete project.csvFormat; });
  f.ui.mode = 'create'; f.controller.openExport();
  assert.equal(f.$('#export-format-mode').value, 'custom');
  assert.equal(f.$('#export-format-mode option[value="source"]').disabled, true);
  f.$('#export-time').change('ms'); f.$('#export-scope').change('all');
  assert.equal(f.preferences.get().csvExport.formatMode, 'source');
  f.store.edit('Restore imported profile', project => { project.csvFormat = importedFormat; });
  f.ui.mode = 'edit'; f.controller.openExport();
  assert.equal(f.$('#export-format-mode').value, 'source');
  assert.equal(f.$('#export-format-mode option[value="source"]').disabled, false);
  assert.equal(f.$('#export-time').value, 'ms');
});
