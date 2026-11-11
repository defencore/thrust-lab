import { metrics } from '../profile.js';
import { retimeProfile } from '../profile-retime.js';

const copy = value => structuredClone(value);
const equalPoints = (a, b) => a === b || !!a && !!b && a.length === b.length && a.every((point, index) => point.time === b[index].time && point.thrust === b[index].thrust);
let sequence = 0;

/** Duration and output targets are one live edit of the unchanged measurement grid. */
export function createProfileRetimeController(ctx) {
  const { $, store, ui, units, preferences } = ctx;
  const field = name => $(`#retime-${name}`);
  let session = null, summary = null, idleSource = null, writing = false;
  let status = 'Adjust duration or targets to update the current profile.';
  let errorText = '';

  function clearValidation() {
    for (const name of ['duration', 'impulse', 'peak']) {
      field(name).classList.remove('input-error'); field(name).removeAttribute('aria-invalid');
    }
  }

  function defaults() {
    const measured = metrics(store.get().points);
    for (const [name, value] of [['duration', measured.burnDuration], ['impulse', measured.impulse], ['peak', measured.peak]]) units.set(`retime-${name}`, value, { force: true, precision: 8 });
    idleSource = store.get().points;
    clearValidation();
  }

  function deactivate() {
    session = null; summary = null; idleSource = null;
    field('enabled').checked = false;
    status = 'Adjust duration or targets to update the current profile.';
    errorText = '';
    clearValidation();
  }

  function restorePreferences() {
    deactivate();
    const saved = preferences.get().profileRetime;
    field('impulse-mode').value = saved?.impulseMode || 'preserve';
    field('peak-mode').value = saved?.peakMode || 'auto';
    field('targets').open = saved?.impulseMode === 'custom' || saved?.peakMode === 'custom';
    defaults();
  }

  function read(name) {
    const value = units.read(`retime-${name}`);
    const valid = Number.isFinite(value) && value > 0;
    field(name).classList.toggle('input-error', !valid); field(name).setAttribute('aria-invalid', String(!valid));
    if (!valid) throw new Error('Complete the highlighted target to update the profile.');
    return value;
  }

  function settings() {
    const impulseMode = field('impulse-mode').value, peakMode = field('peak-mode').value;
    if (!['preserve', 'custom'].includes(impulseMode)) throw new Error('Choose a valid impulse mode.');
    if (!['auto', 'custom'].includes(peakMode)) throw new Error('Choose a valid peak mode.');
    return { duration: read('duration'), impulse: impulseMode === 'custom' ? read('impulse') : null, peak: peakMode === 'custom' ? read('peak') : null };
  }

  function explain(error, baseline) {
    if (error.code === 'IMPULSE_LIMIT') return `For this shape, peak and duration, choose an impulse from ${units.format(error.details.minImpulse, 'impulse', 3)} to ${units.format(error.details.maxImpulse, 'impulse', 3)} ${units.symbol('impulse')}.`;
    if (error.code === 'TIME_LIMIT') return `Maximum burn duration on this timeline: ${units.format(error.details.maximumEnd - metrics(baseline).burnStart, 'time', 3)} ${units.symbol('time')}.`;
    return error.message;
  }

  function update() {
    if (ui.mode !== 'edit') return;
    const project = store.get(), baseline = session?.base || project.points;
    try {
      const requested = settings();
      // Invalid targets cannot reset other tools or partially change the recording.
      const result = retimeProfile(baseline, requested);
      clearValidation();
      if (!session) {
        const original = { curveEdit: copy(project.curveEdit), scope: project.scope, selection: copy(project.selection) };
        ctx.beforeEdit('profile-retime');
        session = { ...original, base: copy(baseline), key: `profile-retime:${++sequence}`, expected: project.points };
      }
      summary = result.report;
      status = result.report.notes.length ? result.report.notes.join(' ') : 'Duration matching is active.';
      errorText = '';
      writing = true;
      try {
        session.expected = result.points;
        store.edit('Burn duration matched', draft => {
          draft.points = result.points;
          draft.curveEdit = equalPoints(result.points, session.base) ? copy(session.curveEdit) : null;
          draft.scope = 'all';
        }, { key: session.key });
        session.expected = store.get().points;
      } finally { writing = false; }
      field('enabled').checked = true;
      preferences.update({ profileRetime: { impulseMode: field('impulse-mode').value, peakMode: field('peak-mode').value } });
    } catch (error) {
      field('enabled').checked = !!session;
      const invalid = error.code === 'TIME_LIMIT' ? 'duration' : error.code === 'IMPULSE_LIMIT' ? (field('impulse-mode').value === 'custom' ? 'impulse' : 'peak') : null;
      if (invalid) { field(invalid).classList.add('input-error'); field(invalid).setAttribute('aria-invalid', 'true'); }
      errorText = explain(error, baseline); status = 'The last valid result is kept.';
    }
    ctx.render();
  }

  function disable() {
    if (session) {
      const previous = session;
      writing = true;
      try {
        session = null; summary = null;
        store.edit('Disable duration matching', draft => {
          draft.points = copy(previous.base); draft.curveEdit = copy(previous.curveEdit);
          draft.scope = previous.scope; draft.selection = copy(previous.selection);
        }, { key: previous.key });
      } finally { writing = false; }
    }
    deactivate(); ctx.render();
  }

  field('enabled').addEventListener('change', () => { if (ui.mode === 'edit') field('enabled').checked ? update() : disable(); });
  for (const name of ['duration', 'impulse', 'peak']) field(name).addEventListener('input', () => { if (!field(name).readOnly) update(); });
  for (const name of ['impulse-mode', 'peak-mode']) field(name).addEventListener('change', update);

  function render() {
    const project = store.get();
    if (!writing && session && (ui.mode !== 'edit' || !equalPoints(project.points, session.expected))) deactivate();
    if (!writing && !session && idleSource !== project.points) defaults();
    const current = metrics(project.points), source = summary?.before || current;
    const unavailable = ui.mode !== 'edit' || !(source.burnDuration > 0) || !(source.impulse > 0);
    for (const name of ['enabled', 'duration', 'impulse-mode', 'impulse', 'peak-mode', 'peak']) field(name).disabled = unavailable;
    field('impulse').readOnly = field('impulse-mode').value === 'preserve';
    field('peak').readOnly = field('peak-mode').value === 'auto';
    if (field('impulse').readOnly) units.set('retime-impulse', source.impulse, { force: true, precision: 8 });
    if (field('peak').readOnly) units.set('retime-peak', summary?.achieved.peak ?? current.peak, { force: true, precision: 8 });
    field('enabled').checked = !!session;
    field('status').textContent = source.burnDuration > 0 ? status : 'No positive burn was found in the current profile.';
    field('error').hidden = !errorText; field('error').textContent = errorText;
    field('results').hidden = !summary;
    if (summary) for (const [name, key, dimension, digits] of [['duration', 'burnDuration', 'time', 3], ['impulse', 'impulse', 'impulse', 3], ['peak', 'peak', 'thrust', 3]]) {
      for (const [side, measured] of [['before', summary.before], ['after', summary.achieved]]) field(`${side}-${name}`).textContent = `${units.format(measured[key], dimension, digits)} ${units.symbol(dimension)}`;
    }
  }

  restorePreferences();
  return { deactivate, restorePreferences, render, get isActive() { return !!session; } };
}
