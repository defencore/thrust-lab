import { transform } from '../profile.js';
import { blendSelection, fitWithFeather } from '../feather.js';
import { captureNoise, applyCapturedNoise, findUneditedRange } from '../noise.js';
import { matchNoise, findAdjacentNoiseRange } from '../noise-match.js';
import { visibleEnvelope } from '../chart-data.js';
import { fitDecayStart } from '../decay-fit.js';

/** Every live tool recomputes from its own stable starting curve. */
export function createEffectsController(ctx) {
  const { $, store, effects, getRange, units, ui } = ctx;
  let captured = null;
  let report = null;
  let baselineCurveEdit = null;
  let matchSession = null;
  const toggles = ['fit-peak-enabled', 'fit-impulse-enabled', 'fit-tail-enabled', 'random-noise-enabled', 'smoothing-enabled', 'captured-noise-enabled'];
  const read = (id, min = -Infinity, max = Infinity, { integer = false, odd = false } = {}) => {
    const value = units.read(id);
    const valid = Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)) && (!odd || (Number.isInteger(value) && value % 2 === 1));
    $(`#${id}`).classList.toggle('input-error', !valid);
    $(`#${id}`).setAttribute('aria-invalid', String(!valid));
    if (!valid) throw new Error('Enter a valid value.');
    return value;
  };
  function reset(except = '', { preserveTransform = false } = {}) {
    effects.reset();
    baselineCurveEdit = null;
    matchSession = null;
    report = null;
    for (const id of toggles) if (id !== except) $(`#${id}`).checked = false;
    if (!preserveTransform) {
      for (const [id, value] of Object.entries({ 'edit-width': 100, 'edit-gain': 100, 'edit-offset': 0 })) units.set(id, value, { force: true });
    }
  }
  function run(id, label, compute, toggle = '') {
    if (ui.mode !== 'edit') return;
    try {
      if (effects.activeId !== id) {
        ctx.fit?.deactivate();
        ctx.shift?.deactivate();
        ctx.curve?.deactivate(); reset(toggle, { preserveTransform: id === 'transform' });
        baselineCurveEdit = structuredClone(store.get().curveEdit);
      }
      effects.run(id, label, base => {
        const points = compute(base);
        const unchanged = points.length === base.length && points.every((point, index) => point.time === base[index].time && point.thrust === base[index].thrust);
        return { points, curveEdit: unchanged ? structuredClone(baselineCurveEdit) : null };
      });
      $('#inspector-error').hidden = true;
    } catch (error) { ctx.error(error); }
  }
  const feather = () => getRange() ? read('edit-feather', 0, 50) / 100 : 0;
  const blend = (base, result) => blendSelection(base, result, getRange(), feather());
  const replayMode = () => {
    const mode = $('#captured-mode').value;
    if (!['repeat', 'stretch'].includes(mode)) throw new Error('Choose a valid noise replay mode.');
    return mode;
  };
  function transformLive() {
    const width = read('edit-width', 1, 10000) / 100;
    const gain = read('edit-gain', 0, 10000) / 100;
    const offset = read('edit-offset');
    const anchor = $('#edit-anchor').value;
    run('transform', 'Shape and scale', base => {
      let result = transform(base, { type: 'retime', range: getRange(), factor: width, anchor });
      result = transform(result, { type: 'scale', range: getRange(), factor: gain });
      result = transform(result, { type: 'offset', range: getRange(), amount: offset });
      return blend(base, result);
    });
  }
  const tools = {
    'fit-peak': () => run('fit-peak', 'Fit peak thrust', base => $('#fit-peak-enabled').checked ? fitWithFeather(base, { type: 'fit-peak', target: read('target-peak', 0), range: getRange(), feather: feather() }) : base, 'fit-peak-enabled'),
    'fit-impulse': () => run('fit-impulse', 'Fit impulse', base => $('#fit-impulse-enabled').checked ? fitWithFeather(base, { type: 'fit-impulse', target: read('target-impulse', 0), range: getRange(), feather: feather() }) : base, 'fit-impulse-enabled'),
    'fit-tail': () => {
      if (getRange()) { ctx.error(new Error('Choose Entire profile to adjust the final decay timing.')); return; }
      run('fit-tail', 'Adjust final decay start', base => $('#fit-tail-enabled').checked ? fitDecayStart(base, read('target-tail-start', Number.MIN_VALUE)) : base, 'fit-tail-enabled');
    },
    noise: () => run('noise', 'Seeded noise', base => $('#random-noise-enabled').checked ? blend(base, transform(base, { type: 'noise', range: getRange(), amount: read('noise-amount', 0, 100) / 100, seed: read('noise-seed', 0, 4294967295, { integer: true }) })) : base, 'random-noise-enabled'),
    smooth: () => run('smooth', 'Smooth curve', base => $('#smoothing-enabled').checked ? blend(base, transform(base, { type: 'smooth', range: getRange(), window: read('smooth-window', 3, 51, { odd: true }) })) : base, 'smoothing-enabled'),
    captured: () => run('captured', 'Recorded noise', base => {
      if (!$('#captured-noise-enabled').checked) return base;
      if (!captured) throw new Error('Capture a noise sample first.');
      return blend(base, applyCapturedNoise(base, captured, { range: getRange(), gain: read('captured-gain', 0, 10000) / 100, mode: replayMode() }));
    }, 'captured-noise-enabled'),
  };
  const validateTool = {
    'fit-peak': () => read('target-peak', 0),
    'fit-impulse': () => read('target-impulse', 0),
    'fit-tail': () => read('target-tail-start', Number.MIN_VALUE),
    noise: () => { read('noise-amount', 0, 100); read('noise-seed', 0, 4294967295, { integer: true }); },
    smooth: () => read('smooth-window', 3, 51, { odd: true }),
    captured: () => { read('captured-gain', 0, 10000); replayMode(); },
  };
  function bind(ids, callback, enabled, validate) {
    for (const id of ids) $(`#${id}`).addEventListener('input', () => {
      if (enabled && (ui.mode !== 'edit' || $(enabled).disabled)) return;
      if (enabled === '#captured-noise-enabled' && (!captured || effects.activeId === 'noise-match')) return;
      try {
        if (enabled) {
          validate(); feather();
          $(enabled).checked = true;
        }
        callback();
      } catch (error) { if ($(`#${id}`).value.trim()) ctx.error(error); }
    });
  }
  bind(['edit-width', 'edit-gain', 'edit-offset', 'edit-anchor'], transformLive);
  for (const [tool, ids, toggle] of [
    ['fit-peak', ['target-peak'], 'fit-peak-enabled'], ['fit-impulse', ['target-impulse'], 'fit-impulse-enabled'], ['fit-tail', ['target-tail-start'], 'fit-tail-enabled'],
    ['noise', ['noise-amount', 'noise-seed'], 'random-noise-enabled'], ['smooth', ['smooth-window'], 'smoothing-enabled'],
    ['captured', ['captured-gain', 'captured-mode'], 'captured-noise-enabled'],
  ]) {
    bind(ids, tools[tool], `#${toggle}`, validateTool[tool]);
    $(`#${toggle}`).addEventListener('change', tools[tool]);
  }
  bind(['edit-feather'], () => {
    if (effects.activeId === 'transform') transformLive();
    else ({ 'fit-peak': tools['fit-peak'], 'fit-impulse': tools['fit-impulse'], 'fit-tail': tools['fit-tail'], noise: tools.noise, smooth: tools.smooth, captured: tools.captured, 'noise-match': matchLive }[effects.activeId])?.();
    ctx.render();
  });
  $('#reset-transform').onclick = () => {
    ctx.shift?.reset();
    for (const [id, value] of Object.entries({ 'edit-width': 100, 'edit-gain': 100, 'edit-offset': 0 })) {
      units.set(id, value, { force: true });
      ctx.preferences.update({ controls: { [id]: String(value) } });
    }
    transformLive();
  };
  $('#trim').onclick = () => ctx.edit('Zero outside selection', project => { project.points = transform(project.points, { type: 'trim', range: project.selection }); project.curveEdit = null; });
  function capture(range) {
    try {
      const project = store.get();
      captured = captureNoise(project.points, project.original, range, { window: read('capture-window', 3, 51, { odd: true }) });
      $('#noise-source-card').classList.add('captured');
      const peak = Math.max(...captured.points.map(p => Math.abs(p.thrust))) || 1;
      const envelope = visibleEnvelope(captured.points, 0, captured.duration, 400);
      $('#noise-preview').innerHTML = `<path d="${envelope.map((p, index) => `${index ? 'L' : 'M'}${p.time / captured.duration * 200},${16 - p.thrust / peak * 13}`).join('')}" fill="none" stroke="currentColor"/>`;
      $('#noise-preview').removeAttribute('hidden');
      ctx.render(); ctx.notify('Noise source captured');
    } catch (error) { ctx.error(error); }
  }
  $('#capture-noise').onclick = () => capture(store.get().selection);
  $('#auto-noise').onclick = () => {
    const p = store.get(); const range = findUneditedRange(p.points, p.original, getRange());
    if (range) capture(range); else ctx.error(new Error('No unedited region with at least 7 samples was found.'));
  };
  function matchOptions() {
    return { gain: read('match-noise-gain', 0, 1000) / 100, mode: replayMode(), window: read('capture-window', 3, 51, { odd: true }), transition: feather() };
  }
  function matchLive() {
    if (ui.mode !== 'edit' || !matchSession) return;
    try {
      const options = matchOptions();
      let result;
      effects.run('noise-match', 'Noise matched to reference', base => {
        result = matchNoise(base, matchSession.source, { ...options, range: matchSession.range });
        return { points: result.points, curveEdit: structuredClone(baselineCurveEdit) };
      });
      report = result.report;
      $('#inspector-error').hidden = true;
      ctx.render();
    } catch (error) { ctx.error(error); }
  }
  function match(useCaptured) {
    if (ui.mode !== 'edit') return;
    try {
      const p = store.get(), range = getRange();
      let source = captured;
      if (!useCaptured) {
        const adjacent = findAdjacentNoiseRange(p.points, p.original, range);
        if (!adjacent) throw new Error('No unchanged neighbouring region is available.');
        source = captureNoise(p.points, p.original, adjacent, { window: read('capture-window', 3, 51, { odd: true }) });
      }
      if (!source) throw new Error('Capture a noise sample first.');
      matchOptions();
      ctx.beforeEdit('noise-match');
      baselineCurveEdit = structuredClone(p.curveEdit);
      matchSession = { source: structuredClone(source), range: structuredClone(range) };
      matchLive();
    } catch (error) { ctx.error(error); }
  }
  bind(['match-noise-gain', 'captured-mode', 'capture-window'], () => {
    if (effects.activeId === 'noise-match') matchLive();
  });
  $('#match-neighbours').onclick = () => match(false);
  $('#match-captured').onclick = () => match(true);
  if ($('#curve-match-noise')) $('#curve-match-noise').onclick = () => match(!!captured);
  function render() {
    $('#fit-tail-enabled').disabled = !!getRange();
    $('#target-tail-start').disabled = !!getRange();
    $('#captured-noise-enabled').disabled = !captured;
    $('#match-captured').disabled = !captured;
    $('#match-neighbours').disabled = !getRange();
    $('#noise-match-report').hidden = !report;
    if (captured) {
      $('#noise-source-label').textContent = `${units.format(captured.range[0], 'time', 3)} — ${units.format(captured.range[1], 'time', 3)} ${units.symbol('time')}`;
      $('#noise-source-details').textContent = `${captured.samples} source samples · RMS ${units.format(captured.rms, 'thrust', 3)} ${units.symbol('thrust')}`;
    }
    if (report) for (const [id, key] of [['source', 'sourceRms'], ['before', 'beforeRms'], ['after', 'afterRms']]) $(`#noise-match-${id}`).textContent = `${units.format(report[key], 'thrust', 3)} ${units.symbol('thrust')} RMS`;
  }
  return { reset, render, getCaptured: () => captured ? structuredClone(captured) : null, resetSource() { captured = null; report = null; $('#noise-source-label').textContent = 'No noise sample captured'; $('#noise-source-details').textContent = 'Select at least 7 unedited samples to capture a noise source.'; $('#noise-preview').setAttribute('hidden', ''); $('#noise-source-card').classList.remove('captured'); reset(); } };
}
