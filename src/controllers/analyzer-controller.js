import { analyzeSavedFile, inspectAnalyzerCSV } from '../analyzer.js';
import { escape } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

/** File inspection owns its inputs and results, independently of editing state. */
export function createAnalyzerController(ctx) {
  const { $, ui } = ctx;
  const panel = $('#analyzer-workspace');
  let source = null, sequence = 0, result = null;
  const text = (id, value) => { $(`#${id}`).textContent = value; };
  function fileName(name) {
    $('#analyzer-file-name').setAttribute('data-i18n', name ? 'ignore' : '');
    text('analyzer-file-name', name || 'Untitled file');
  }
  const projectFile = (content, name) => /\.json$/i.test(name) || content.trimStart().startsWith('{');

  function clearResult(heading, description) {
    result = null;
    panel.dataset.result = 'empty';
    text('analyzer-result-heading', heading); text('analyzer-result-description', description);
    $('#analyzer-result-icon').innerHTML = icon('search');
    for (const id of ['analyzer-error', 'analyzer-facts', 'analyzer-format', 'analyzer-marker-note']) $(`#${id}`).hidden = true;
  }

  function fail(error) {
    clearResult('Unable to inspect this file', 'Check the file format, columns, and units, then try again.');
    panel.dataset.result = 'error';
    text('analyzer-error', error.message); $('#analyzer-error').hidden = false;
  }

  function options() {
    const header = $('#analyzer-header').value;
    return {
      ...(header === 'auto' ? {} : { hasHeader: header === 'yes' }),
      timeColumn: Number($('#analyzer-time-column').value), thrustColumn: Number($('#analyzer-thrust-column').value),
      timeUnit: $('#analyzer-time-unit').value, thrustUnit: $('#analyzer-thrust-unit').value,
    };
  }

  function mapColumns({ reset = false } = {}) {
    const inspected = inspectAnalyzerCSV(source.content, $('#analyzer-header').value);
    const savedTime = $('#analyzer-time-column').value, savedThrust = $('#analyzer-thrust-column').value;
    for (const id of ['analyzer-time-column', 'analyzer-thrust-column']) $(`#${id}`).innerHTML = inspected.headers.map((header, index) => `<option value="${index}">${escape(header)}</option>`).join('');
    const infer = (pattern, fallback) => { const index = inspected.headers.findIndex(header => pattern.test(header.trim())); return index < 0 ? fallback : index; };
    $('#analyzer-time-column').value = !reset && savedTime !== '' && Number(savedTime) < inspected.headers.length ? savedTime : String(infer(/^(?:time|timestamp|elapsed|seconds?|milliseconds?|microseconds?|t(?:\b|_))/i, 0));
    $('#analyzer-thrust-column').value = !reset && savedThrust !== '' && Number(savedThrust) < inspected.headers.length ? savedThrust : String(infer(/^(?:thrust|force|load|f(?:\b|_))/i, 1));
    if (reset && $('#analyzer-time-column').value === $('#analyzer-thrust-column').value) $('#analyzer-thrust-column').value = $('#analyzer-time-column').value === '0' ? '1' : '0';
  }

  function renderResult(next) {
    result = next;
    panel.dataset.result = next.detected ? 'detected' : 'unmarked';
    text('analyzer-result-heading', next.detected ? 'Synthetic marker detected' : 'No synthetic marker found');
    text('analyzer-result-description', next.detected ? 'The first ten records match the Thrust Lab synthetic pattern.' : 'This file does not contain the recognized Thrust Lab marker.');
    $('#analyzer-result-icon').innerHTML = icon(next.detected ? 'check' : 'search');
    text('analyzer-format', next.format); $('#analyzer-format').hidden = false;
    text('analyzer-scheme', next.scheme || 'Not detected');
    text('analyzer-marker-count', String(next.markerCount));
    text('analyzer-sample-count', next.samples.toLocaleString('en-US'));
    text('analyzer-timeline', `${next.start} — ${next.end} s`);
    $('#analyzer-facts').hidden = false; $('#analyzer-error').hidden = true;
    $('#analyzer-marker-note').hidden = !next.detected;
  }

  function inspectCurrent() {
    if (!source) return null;
    try {
      const next = analyzeSavedFile(source.content, source.name, source.project ? {} : options());
      renderResult(next); return next;
    } catch (error) { fail(error); return null; }
  }

  function acceptText(content, name) {
    source = { content, name, project: projectFile(content, name) };
    fileName(name);
    $('#analyzer-csv-options').hidden = source.project;
    if (!source.project) {
      for (const id of ['analyzer-header', 'analyzer-time-unit', 'analyzer-thrust-unit']) $(`#${id}`).value = 'auto';
      try { mapColumns({ reset: true }); }
      catch (error) { fail(error); return null; }
    }
    return inspectCurrent();
  }

  function analyzeText(content, name = 'profile.csv') {
    sequence++;
    if (typeof content !== 'string' || content.length > 20_000_000) {
      source = null; fileName(name);
      fail(new Error(typeof content !== 'string' ? 'File content must be text.' : 'Analyzer files must be smaller than 20 MB.'));
      return null;
    }
    return acceptText(content, name);
  }

  async function analyzeFile(file) {
    if (!file) return null;
    const token = ++sequence;
    source = null; fileName(file.name);
    $('#analyzer-csv-options').hidden = true;
    clearResult('Reading file…', 'Analysis runs locally in this browser.');
    try {
      if (file.size > 20_000_000) throw new Error('Analyzer files must be smaller than 20 MB.');
      const content = await file.text();
      if (token !== sequence) return null;
      return acceptText(content, file.name || 'profile.csv');
    } catch (error) { if (token === sequence) fail(error); return null; }
  }

  function open() {
    ctx.chart?.cancelDrag();
    const toast = $('#toast'); if (toast) toast.hidden = true;
    ui.screen = 'analyzer'; document.body.dataset.screen = 'analyzer'; panel.hidden = false;
    $('#mode-analyzer').setAttribute('aria-selected', 'true');
    $('#mode-edit').setAttribute('aria-selected', 'false'); $('#mode-create').setAttribute('aria-selected', 'false');
    text('workspace-caption', 'Synthetic data analyzer');
    ctx.render();
  }

  function close() {
    ui.screen = 'studio'; document.body.dataset.screen = 'studio'; panel.hidden = true;
    $('#mode-analyzer').setAttribute('aria-selected', 'false');
    $('#mode-edit').setAttribute('aria-selected', String(ui.mode === 'edit')); $('#mode-create').setAttribute('aria-selected', String(ui.mode === 'create'));
    text('workspace-caption', ui.mode === 'edit' ? 'Editing workspace' : 'Generator preview');
  }

  $('#analyzer-open').onclick = () => $('#analyzer-file').click();
  $('#analyzer-file').onchange = async event => { await analyzeFile(event.target.files[0]); event.target.value = ''; };
  for (const id of ['analyzer-time-column', 'analyzer-thrust-column', 'analyzer-time-unit', 'analyzer-thrust-unit']) $(`#${id}`).addEventListener('change', inspectCurrent);
  $('#analyzer-header').addEventListener('change', () => {
    if (!source || source.project) return;
    try { mapColumns(); inspectCurrent(); } catch (error) { fail(error); }
  });
  return { open, close, analyzeText, analyzeFile, getResult: () => result && { ...result } };
}
