import { MOTOR_PRESETS } from '../catalog.js';
import { createGeneratorDraft, applyDraftToEditor } from '../workspace.js';
import { GENERATOR_DEFAULTS } from '../studio-model.js';
import { escape } from '../ui/dom.js';

/** Generation owns a separate preview; live target changes cannot replace measurements. */
export function createGeneratorController(ctx) {
  const { $, $$, ui, units, preferences, store } = ctx;
  let settings = { ...GENERATOR_DEFAULTS, ...preferences.get().generator };
  let draft = null;
  let valid = true;
  function read() {
    const numeric = (id, min, max) => {
      const value = units.read(`gen-${id}`);
      if (!Number.isFinite(value) || value < min || value > max) throw new Error('Enter valid generator targets to update the preview.');
      return value;
    };
    const seed = numeric('seed', 0, 4294967295);
    if (!Number.isInteger(seed)) throw new Error('The random seed must be a whole number.');
    return {
      peak: numeric('peak', .001, 1e7), duration: numeric('duration', .001, 1e5), impulse: numeric('impulse', .000001, 1e12),
      interval: numeric('interval', .000001, 1000), sampling: $('#gen-sampling').value,
      jitter: $('#gen-sampling').value === 'uniform' ? settings.jitter : numeric('jitter', 0, 80) / 100,
      noise: numeric('noise', 0, 100) / 100, seed,
      shape: $('#gen-shape').value, presetId: settings.presetId,
    };
  }
  function sync() {
    for (const [id, value] of Object.entries({ peak: settings.peak, duration: settings.duration, impulse: settings.impulse, interval: settings.interval, shape: settings.shape, sampling: settings.sampling, jitter: settings.jitter * 100, noise: settings.noise * 100, seed: settings.seed })) {
      units.set(`gen-${id}`, value, { force: true });
    }
    $('#gen-jitter').disabled = settings.sampling === 'uniform';
    $('#jitter-field').classList.toggle('muted-field', settings.sampling === 'uniform');
  }
  function generate({ fromInputs = true } = {}) {
    try {
      const next = fromInputs ? read() : settings;
      const generated = createGeneratorDraft(next);
      settings = next; draft = generated; valid = true;
      preferences.update({ generator: settings });
      $('#generation-notes').textContent = generated.notes.join(' ');
      $('#generation-notes').hidden = !generated.notes.length;
      if (ui.mode === 'create') { ui.view = [...draft.view]; ui.thrustView = null; ui.playhead = draft.playhead; }
    } catch (error) {
      valid = false;
      $('#generation-notes').textContent = error.message; $('#generation-notes').hidden = false;
    }
    $('#gen-jitter').disabled = $('#gen-sampling').value === 'uniform';
    $('#jitter-field').classList.toggle('muted-field', $('#gen-jitter').disabled);
    ctx.render();
  }
  function presets(search = '') {
    const filtered = MOTOR_PRESETS.filter(p => `${p.manufacturer} ${p.name}`.toLowerCase().includes(search.toLowerCase()));
    $('#preset-list').innerHTML = filtered.map(p => `<button class="preset-card ${settings.presetId === p.id ? 'selected' : ''}" data-preset="${p.id}" title="Load ${escape(p.manufacturer)} ${escape(p.name)} generator targets"><span class="motor-class">${escape(p.className)}</span><span class="preset-info"><strong>${escape(p.name)}<small>${escape(p.manufacturer)}</small></strong><span>${units.format(p.impulse, 'impulse', 1)} ${units.symbol('impulse')} <i>·</i> ${units.format(p.duration, 'time', 2)} ${units.symbol('time')}</span></span><svg viewBox="0 0 54 26" class="preset-spark" aria-hidden="true"><path d="${p.template.map((v, index) => `${index ? 'L' : 'M'}${v.time * 50 + 2},${24 - v.thrust * 21}`).join('')}"/></svg></button>`).join('') || '<p class="empty-state">No matching motor presets.</p>';
  }
  $('#preset-list').addEventListener('click', event => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    const p = MOTOR_PRESETS.find(item => item.id === button.dataset.preset);
    settings = { ...settings, peak: p.peak, duration: p.duration, impulse: p.impulse, shape: p.shape, presetId: p.id };
    sync(); generate({ fromInputs: false }); ctx.setMode('create'); presets($('#preset-search').value);
  });
  $('#preset-search').oninput = event => presets(event.target.value);
  $('#generator-form').addEventListener('submit', event => event.preventDefault());
  $('#generator-form').addEventListener('input', event => {
    if (event.target.id === 'gen-shape') settings.presetId = null;
    generate();
  });
  $('#random-seed').onclick = () => { $('#gen-seed').value = crypto.getRandomValues(new Uint32Array(1))[0]; generate(); };
  $('#adopt-draft').onclick = () => {
    if (!draft || !valid) return;
    ctx.beforeEdit('adopt');
    store.replace('New profile opened in editor', applyDraftToEditor(store.get(), draft));
    ctx.signal?.resetSource(); ctx.fitView(); ctx.setMode('edit'); ctx.setTool('select');
  };
  function render() {
    const preset = MOTOR_PRESETS.find(p => p.id === settings.presetId);
    $('#generator-preset').textContent = preset ? `${preset.name} reference` : 'Custom profile';
    $('#preview-status').textContent = valid ? 'Preview updates live' : 'Check generator targets';
    $('#adopt-draft').disabled = !draft || !valid;
    $('#preview-details').textContent = draft ? `${draft.points.length.toLocaleString('en-US')} measurement points` : 'No preview generated yet.';
    $('#kept-profile-name').textContent = store.get().name;
    $$('[data-preset]').forEach(button => button.classList.toggle('selected', button.dataset.preset === settings.presetId));
  }
  sync(); presets(); generate({ fromInputs: false });
  return { getDraft: () => draft, render, presets, reset() { settings = { ...GENERATOR_DEFAULTS }; sync(); generate({ fromInputs: false }); presets(); } };
}
