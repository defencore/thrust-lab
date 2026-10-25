import { metrics } from '../profile.js';
import { fitRecordingToTheory } from '../theory-fit-workflow.js';
import { THEORY_FIT_DEFAULTS } from '../theory-fit-settings.js';
import { renderFitComparison } from '../ui/theory-fit-results.js';

let fitSequence = 0;
const copy = value => structuredClone(value);
const equalPoints = (a, b) => a === b || !!a && !!b && a.length === b.length && a.every((point, index) => point.time === b[index].time && point.thrust === b[index].thrust);
const numericFields = { start: 'start', duration: 'duration', peak: 'peak', impulse: 'impulse', average: 'average' };

/** A coordinated live edit owns one baseline, including its original recording texture. */
export function createTheoryFitController(ctx) {
  const { $, store, ui, units, preferences } = ctx;
  const field = name => $(`#tf-${name}`);
  let session = null;
  let summary = null;
  let writing = false;
  let status = 'Adjust a target to start live matching.';
  let errorText = '';
  let sourceWasPresent = false;

  function defaultsFrom(points = store.get().theory || store.get().points) {
    const target = metrics(points), current = metrics(store.get().points);
    return { ...THEORY_FIT_DEFAULTS, start: current.burnStart, duration: target.burnDuration || current.burnDuration || 1, peak: target.peak || current.peak || 100, impulse: target.impulse || current.impulse || 60, average: target.burnAverage || current.burnAverage || 60 };
  }

  function setFields(settings) {
    for (const [key, id] of Object.entries(numericFields)) units.set(`tf-${id}`, settings[key], { force: true, precision: 10 });
    field('area-mode').value = settings.areaMode;
    field('shape-blend').value = String(settings.shapeBlend * 100);
    field('noise-source').value = settings.noiseSource === 'captured' && !ctx.signal.getCaptured() ? 'original' : settings.noiseSource;
    field('noise-level').value = String(settings.noiseLevel * 100);
    field('noise-window').value = String(settings.window);
    field('tail-enabled').checked = settings.tailStart != null;
    units.set('tf-tail-start', settings.tailStart ?? settings.duration * .8, { force: true, precision: 10 });
    syncDerived();
  }

  function read(name, minimum = -Infinity, maximum = Infinity) {
    const input = field(name), value = units.read(`tf-${name}`);
    const valid = Number.isFinite(value) && value >= minimum && value <= maximum;
    input.classList.toggle('input-error', !valid); input.setAttribute('aria-invalid', String(!valid));
    if (!valid) throw new Error('Complete the highlighted target to update the curve.');
    return value;
  }

  function syncDerived() {
    const byAverage = field('area-mode').value === 'average';
    field('impulse').readOnly = byAverage; field('average').readOnly = !byAverage;
    const duration = units.read('tf-duration');
    const independent = units.read(byAverage ? 'tf-average' : 'tf-impulse');
    const derived = byAverage ? independent * duration : independent / duration;
    if (duration > 0 && Number.isFinite(derived) && derived > 0) units.set(byAverage ? 'tf-impulse' : 'tf-average', derived, { force: true, precision: 10 });
  }

  function settings() {
    syncDerived();
    const areaMode = field('area-mode').value;
    if (!['impulse', 'average'].includes(areaMode)) throw new Error('Choose impulse or mean burn thrust as the independent target.');
    const noiseSource = field('noise-source').value;
    if (!['original', 'captured', 'none'].includes(noiseSource)) throw new Error('Choose a valid recording texture source.');
    const result = {
      start: read('start'), duration: read('duration', Number.MIN_VALUE), peak: read('peak', Number.MIN_VALUE),
      areaMode, impulse: read('impulse', Number.MIN_VALUE), average: read('average', Number.MIN_VALUE),
      tailStart: field('tail-enabled').checked ? read('tail-start', Number.MIN_VALUE) : null,
      shapeBlend: read('shape-blend', 0, 100) / 100, noiseSource,
      noiseLevel: noiseSource === 'none' ? 0 : read('noise-level', 0, 1000) / 100,
      window: noiseSource === 'none' || noiseSource === 'captured' ? preferences.get().theoryFit?.window || 15 : read('noise-window', 3, 101),
    };
    if (!Number.isInteger(result.window) || result.window % 2 !== 1) {
      field('noise-window').classList.add('input-error'); field('noise-window').setAttribute('aria-invalid', 'true');
      throw new Error('The texture baseline window must be an odd whole number.');
    }
    return result;
  }

  function deactivate() {
    session = null;
    field('enabled').checked = false;
    status = 'Adjust a target to start live matching.';
    errorText = '';
  }

  function restorePreferences() {
    deactivate(); summary = null;
    setFields(preferences.get().theoryFit || defaultsFrom());
  }

  function explain(error) {
    if (error.code === 'IMPULSE_LIMIT') return `For this shape, peak and duration, choose an impulse from ${units.format(error.details.minImpulse, 'impulse', 3)} to ${units.format(error.details.maxImpulse, 'impulse', 3)} ${units.symbol('impulse')}.`;
    if (error.code === 'TIME_LIMIT') return `The burn window must stay between ${units.format(error.details.minimumStart, 'time', 3)} and ${units.format(error.details.maximumEnd, 'time', 3)} ${units.symbol('time')}.`;
    return error.message;
  }

  function update() {
    if (ui.mode !== 'edit' || !store.get().theory) return;
    let requested;
    try { requested = settings(); }
    catch (error) { field('enabled').checked = !!session; errorText = error.message; status = 'The last valid result is kept.'; ctx.render(); return; }
    try {
      const project = store.get();
      const baseline = session?.base || project.points;
      const original = session?.original || project.original || baseline;
      // Compute first, so invalid targets cannot open a partial edit or change the recording.
      const result = fitRecordingToTheory(baseline, project.theory, original, requested, { captured: ctx.signal.getCaptured() });
      if (!session) {
        ctx.beforeEdit('theory-fit');
        session = { key: `theory-fit:${++fitSequence}`, base: copy(baseline), original: copy(original), curveEdit: copy(project.curveEdit), scope: project.scope, selection: copy(project.selection), expected: project.points };
      }
      summary = { before: session.base, result };
      status = result.report.notes.length ? result.report.notes.join(' ') : 'Duration, peak and total target matched.';
      errorText = '';
      field('enabled').checked = true;
      writing = true;
      try {
        session.expected = result.points;
        store.edit('Match theory and recording texture', draft => { draft.points = result.points; draft.curveEdit = null; draft.scope = 'all'; }, { key: session.key });
        session.expected = store.get().points;
      } finally { writing = false; }
      preferences.update({ theoryFit: requested });
      ctx.render();
    } catch (error) {
      field('enabled').checked = !!session;
      if (error.code === 'IMPULSE_LIMIT') field(requested.areaMode).classList.add('input-error');
      if (error.code === 'TIME_LIMIT') { field('start').classList.add('input-error'); field('duration').classList.add('input-error'); }
      if (requested.tailStart != null && requested.tailStart >= requested.duration) field('tail-start').classList.add('input-error');
      errorText = explain(error); status = 'The last valid result is kept.';
      ctx.render();
    }
  }

  function disable() {
    if (!session) { deactivate(); ctx.render(); return; }
    const baseline = session;
    writing = true;
    try {
      session = null; summary = null;
      store.edit('Disable theory matching', draft => { draft.points = copy(baseline.base); draft.curveEdit = copy(baseline.curveEdit); draft.scope = baseline.scope; draft.selection = copy(baseline.selection); }, { key: baseline.key });
    } finally { writing = false; }
    deactivate(); ctx.render();
  }

  function useValues(points, fromCurrent = false) {
    const previous = preferences.get().theoryFit || defaultsFrom();
    const measured = metrics(points);
    setFields({ ...previous, ...defaultsFrom(points), start: fromCurrent ? measured.burnStart : metrics(session?.base || store.get().points).burnStart, areaMode: field('area-mode').value, noiseSource: field('noise-source').value, noiseLevel: Number.isFinite(units.read('tf-noise-level')) ? units.read('tf-noise-level') / 100 : 1, shapeBlend: Number.isFinite(units.read('tf-shape-blend')) ? units.read('tf-shape-blend') / 100 : 1, window: Number.isFinite(units.read('tf-noise-window')) ? units.read('tf-noise-window') : 15, duration: measured.burnDuration || previous.duration });
    update();
  }

  field('enabled').addEventListener('change', () => { field('enabled').checked ? update() : disable(); });
  for (const name of ['start', 'duration', 'tail-start', 'peak', 'area-mode', 'impulse', 'average', 'shape-blend', 'noise-source', 'noise-level', 'noise-window']) {
    field(name).addEventListener('input', () => { if (name === 'tail-start') field('tail-enabled').checked = true; update(); });
    field(name).addEventListener('blur', () => { syncDerived(); });
  }
  field('use-theory').onclick = () => { if (store.get().theory) useValues(store.get().theory); };
  field('use-current').onclick = () => useValues(store.get().points, true);
  field('tail-enabled').addEventListener('change', update);

  function render() {
    const project = store.get(), hasTheory = !!project.theory;
    if (!writing && session && !equalPoints(project.points, session.expected)) deactivate();
    if (summary && !equalPoints(project.points, summary.result.points)) summary = null;
    if (!hasTheory && session) deactivate();
    field('enabled').disabled = !hasTheory || ui.mode !== 'edit';
    field('fit-body').disabled = !hasTheory || ui.mode !== 'edit';
    $('#tf-reference-status').textContent = hasTheory ? `${project.theory.length.toLocaleString('en-US')} reference measurements · source preserved` : 'Load a theory profile to begin.';
    const sourceOptions = $('#theory-source-options');
    if (!hasTheory) sourceOptions.open = true;
    else if (!sourceWasPresent) sourceOptions.open = false;
    sourceWasPresent = hasTheory;
    const captured = ctx.signal.getCaptured();
    if (!captured && field('noise-source').value === 'captured') field('noise-source').value = 'original';
    const capturedOption = field('noise-source').querySelector?.('option[value="captured"]');
    if (capturedOption) capturedOption.disabled = !captured;
    $('#tf-noise-hint').textContent = captured ? 'Recorded texture is available from the original recording or your captured sample.' : 'Original recording texture stays available after fitting. Capture a source in Signal to use a captured sample.';
    field('noise-level').disabled = field('noise-source').value === 'none';
    field('noise-window').disabled = field('noise-source').value !== 'original';
    field('status').textContent = hasTheory ? status : 'Load a theory profile to begin.';
    field('error').hidden = !errorText; field('error').textContent = errorText;
    field('comparison').innerHTML = renderFitComparison({ before: summary?.before || session?.base || project.points, theory: project.theory, result: project.points, units });
    const texture = summary?.result.textureReport;
    const textureReport = $('#tf-noise-report');
    if (textureReport) {
      textureReport.hidden = !texture;
      textureReport.textContent = texture ? `Recorded noise RMS: ${units.format(texture.activeBurnRms ?? texture.appliedRms, 'thrust', 3)} ${units.symbol('thrust')}` : '';
    }
    syncDerived();
  }

  restorePreferences();
  return { deactivate, restorePreferences, render, chartReference: () => session && summary ? summary.result.reference : null, get isActive() { return !!session; } };
}
