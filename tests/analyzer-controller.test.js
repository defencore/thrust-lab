import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyzerController } from '../src/controllers/analyzer-controller.js';
import { analyzeSavedFile } from '../src/analyzer.js';
import { exportCSV, serializeProject } from '../src/csv.js';

const points = Array.from({ length: 21 }, (_, index) => ({ time: index / 10, thrust: index < 2 || index > 18 ? 0 : 15 + index }));

class Field extends EventTarget {
  constructor(value = '') { super(); this.value = value; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.attributes = new Map(); this.dataset = {}; this.clicks = 0; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  click() { this.clicks++; }
  change(value) { this.value = value; this.dispatchEvent(new Event('change')); }
}

function fixture(mode = 'edit') {
  const ids = ['analyzer-workspace', 'analyzer-result-heading', 'analyzer-result-description', 'analyzer-result-icon', 'analyzer-error', 'analyzer-facts', 'analyzer-format', 'analyzer-marker-note', 'analyzer-time-column', 'analyzer-thrust-column', 'analyzer-time-unit', 'analyzer-thrust-unit', 'analyzer-header', 'analyzer-scheme', 'analyzer-marker-count', 'analyzer-sample-count', 'analyzer-timeline', 'analyzer-file-name', 'analyzer-csv-options', 'mode-analyzer', 'mode-edit', 'mode-create', 'workspace-caption', 'analyzer-open', 'analyzer-file'];
  const fields = new Map(ids.map(id => [`#${id}`, new Field()]));
  for (const id of ['analyzer-header', 'analyzer-time-unit', 'analyzer-thrust-unit']) fields.get(`#${id}`).value = 'auto';
  const $ = selector => fields.get(selector);
  const ui = { mode, screen: 'studio', view: [.3, 1.5], playhead: .7, tool: 'curve' };
  let renders = 0, cancellations = 0;
  const previousDocument = globalThis.document;
  globalThis.document = { body: { dataset: { screen: 'studio' } } };
  const ctx = { $, ui, chart: { cancelDrag: () => { cancellations++; } }, render: () => { renders++; }, get store() { throw new Error('Analyzer must not access editor data.'); } };
  const controller = createAnalyzerController(ctx);
  return { $, ui, controller, get renders() { return renders; }, get cancellations() { return cancellations; }, restore: () => { globalThis.document = previousDocument; } };
}

test('analyzer reads CSV and native projects with the same clean measurement interval', () => {
  const csv = analyzeSavedFile(exportCSV(points), 'profile.csv');
  const project = analyzeSavedFile(serializeProject({ name: 'Study', points }, { syntheticMarker: true }), 'profile.thrustlab.json');
  for (const result of [csv, project]) {
    assert.equal(result.detected, true);
    assert.equal(result.scheme, 'thrust-lab-v1');
    assert.equal(result.markerCount, 10);
    assert.equal(result.samples, points.length);
    assert.equal(result.start, 0);
    assert.equal(result.end, 2);
  }
  assert.equal(csv.format, 'CSV');
  assert.equal(project.format, 'Thrust Lab project');
  assert.equal(analyzeSavedFile(exportCSV(points, { syntheticMarker: false }), 'real.csv').detected, false);
});

test('analyzer tabs retain the editor mode, view, cursor and tool without accessing its store', () => {
  const f = fixture('create');
  try {
    const before = structuredClone(f.ui);
    f.controller.open();
    assert.equal(f.ui.screen, 'analyzer');
    assert.equal(f.$('#mode-analyzer').attributes.get('aria-selected'), 'true');
    assert.equal(f.$('#analyzer-workspace').hidden, false);
    assert.equal(f.cancellations, 1);
    f.controller.close();
    assert.deepEqual(f.ui, before);
    assert.equal(f.$('#mode-create').attributes.get('aria-selected'), 'true');
    assert.equal(f.$('#analyzer-workspace').hidden, true);
  } finally { f.restore(); }
});

test('successful inspection renders marker results and later failures clear every positive result', () => {
  const f = fixture();
  try {
    f.controller.analyzeText(exportCSV(points), '<study>.csv');
    assert.equal(f.controller.getResult().detected, true);
    assert.equal(f.$('#analyzer-result-heading').textContent, 'Synthetic marker detected');
    assert.equal(f.$('#analyzer-file-name').textContent, '<study>.csv');
    assert.equal(f.$('#analyzer-file-name').attributes.get('data-i18n'), 'ignore');
    assert.equal(f.$('#analyzer-file-name').innerHTML, '');
    assert.equal(f.$('#analyzer-marker-count').textContent, '10');
    assert.equal(f.$('#analyzer-marker-note').hidden, false);
    f.controller.analyzeText('Time (s),Thrust (N)\n0,5\n0,7', 'bad.csv');
    assert.equal(f.controller.getResult(), null);
    assert.equal(f.$('#analyzer-facts').hidden, true);
    assert.equal(f.$('#analyzer-format').hidden, true);
    assert.equal(f.$('#analyzer-marker-note').hidden, true);
    assert.equal(f.$('#analyzer-error').hidden, false);
    assert.equal(f.$('#analyzer-workspace').dataset.result, 'error');
    f.controller.analyzeText(exportCSV(points, { syntheticMarker: false }), 'unmarked.csv');
    assert.equal(f.controller.getResult().detected, false);
    assert.equal(f.$('#analyzer-marker-count').textContent, '0');
    assert.equal(f.$('#analyzer-error').hidden, true);
    assert.equal(f.$('#analyzer-result-heading').textContent, 'No synthetic marker found');
  } finally { f.restore(); }
});

test('column and unit changes reanalyze a reordered CSV immediately', () => {
  const f = fixture();
  try {
    const input = exportCSV(points, { timeUnit: 'ms', thrustUnit: 'kgf' }).trim().split(/\r?\n/).map(line => line.split(',').reverse().join(',')).join('\n').replace('Time (ms)', 'Clock (ms)');
    f.controller.analyzeText(input, 'reordered.csv');
    f.$('#analyzer-time-column').change('1');
    f.$('#analyzer-thrust-column').change('0');
    assert.equal(f.controller.getResult().detected, true);
    assert.equal(f.controller.getResult().end, 2);
    f.$('#analyzer-thrust-unit').change('N');
    assert.equal(f.controller.getResult().detected, false);
    f.$('#analyzer-thrust-unit').change('kgf');
    assert.equal(f.controller.getResult().detected, true);
    f.$('#analyzer-time-column').change('0');
    assert.equal(f.controller.getResult(), null);
    assert.equal(f.$('#analyzer-facts').hidden, true);
  } finally { f.restore(); }
});

test('asynchronous file reads cannot overwrite a newer inspection', async () => {
  const f = fixture();
  try {
    let releaseFirst;
    const pending = f.controller.analyzeFile({ name: 'older.csv', size: 50, text: () => new Promise(resolve => { releaseFirst = resolve; }) });
    assert.equal(f.$('#analyzer-result-heading').textContent, 'Reading file…');
    f.controller.analyzeText(exportCSV(points, { syntheticMarker: false }), 'newer.csv');
    releaseFirst(exportCSV(points));
    await pending;
    assert.equal(f.$('#analyzer-file-name').textContent, 'newer.csv');
    assert.equal(f.controller.getResult().detected, false);
    await f.controller.analyzeFile({ name: 'oversized.csv', size: 20_000_001, text: () => { throw new Error('Must reject before reading.'); } });
    assert.equal(f.controller.getResult(), null);
    assert.match(f.$('#analyzer-error').textContent, /smaller than 20 MB/);
  } finally { f.restore(); }
});
