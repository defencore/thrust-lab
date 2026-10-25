import { MOTOR_PRESETS, CATALOG_NOTICE, CATALOG_SOURCES } from './catalog.js';
import { UNIT_OPTIONS } from './units.js';
import { createPreferences } from './preferences.js';
import { createProjectStore } from './project-store.js';
import { createLiveEffects } from './live-effects.js';
import { createInitialProject, createUIState, DEFAULT_PRESET } from './studio-model.js';
import { alignTheory } from './alignment.js';
import { $, $$, clamp } from './ui/dom.js';
import { buildLayout } from './ui/layout.js';
import { createStudioView } from './ui/studio-view.js';
import { createUnitsController } from './controllers/units-controller.js';
import { createCurveController } from './controllers/curve-controller.js';
import { createEffectsController } from './controllers/effects-controller.js';
import { createGeneratorController } from './controllers/generator-controller.js';
import { createSamplesController } from './controllers/samples-controller.js';
import { createFilesController } from './controllers/files-controller.js';
import { createTheoryController } from './controllers/theory-controller.js';
import { createTheoryFitController } from './controllers/theory-fit-controller.js';
import { createSettingsController } from './controllers/settings-controller.js';
import { createChartController } from './controllers/chart-controller.js';
import { createMeasurementController } from './controllers/measurement-controller.js';
import { createShiftController } from './controllers/shift-controller.js';
import { clearChartSelection } from './controllers/selection-controller.js';
import { bindNavigation } from './controllers/navigation-controller.js';

/** Assemble independent UI controllers around one transactional project store. */
export function createStudio() {
  const store = createProjectStore(createInitialProject());
  const preferences = createPreferences();
  const ui = createUIState(store.get());
  const effects = createLiveEffects(store);
  buildLayout({ name: store.get().name, presetCount: MOTOR_PRESETS.length, defaultPreset: DEFAULT_PRESET, catalogNotice: CATALOG_NOTICE, catalogSources: CATALOG_SOURCES, unitOptions: UNIT_OPTIONS });
  let view = null;
  let toastTimer;
  let editorView = [...ui.view], editorCursor = ui.playhead;
  let editorThrustView = null;
  const ctx = {
    $, $$, store, preferences, ui, effects,
    render() { view?.render(); },
    notify(message, error = false) {
      clearTimeout(toastTimer); $('#toast').textContent = message;
      $('#toast').classList.toggle('error', error); $('#toast').hidden = false;
      toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 7000 : 3000);
    },
    error(error) { $('#inspector-error').textContent = error.message; $('#inspector-error').hidden = false; },
    getRange() { const p = store.get(); return p.scope === 'selection' ? p.selection : null; },
    activeProfile() { return { ...(ui.mode === 'create' && ctx.generator?.getDraft() || store.get()), view: ui.view, playhead: ui.playhead, tool: ui.mode === 'create' && ui.tool !== 'measure' ? 'pan' : ui.tool }; },
    beforeEdit(id) {
      if (id !== 'theory-fit') ctx.fit?.deactivate();
      if (id !== 'shift') ctx.shift?.deactivate();
      if (['adopt', 'open', 'import', 'mode'].includes(id)) ctx.measurement?.clear();
      if (['adopt', 'open', 'import'].includes(id)) { ui.thrustView = null; editorThrustView = null; }
      ctx.signal?.reset();
      if (id !== 'curve') ctx.curve?.deactivate();
      ui.selectedSample = null; $('#inspector-error').hidden = true;
    },
    edit(label, mutate, options) {
      if (ui.mode !== 'edit') return;
      try { ctx.beforeEdit(label); store.edit(label, mutate, options); }
      catch (error) { ctx.error(error); }
    },
    undo() { if (ui.mode !== 'edit') return; ctx.fit.deactivate(); ctx.signal.reset(); const canceled = ctx.chart.cancelDrag(); ctx.shift.deactivate(); if (!canceled) store.undo(); ctx.render(); },
    redo() { if (ui.mode !== 'edit') return; ctx.fit.deactivate(); ctx.signal.reset(); const canceled = ctx.chart.cancelDrag(); ctx.shift.deactivate(); if (!canceled) store.redo(); ctx.render(); },
    clearSelection() { clearChartSelection(ctx); },
    fitView() {
      ctx.chart?.cancelDrag();
      const profile = ctx.activeProfile(); ui.view = [profile.points[0].time, profile.points.at(-1).time]; ui.thrustView = null; ui.playhead = clamp(ui.playhead, ...ui.view); ctx.render();
    },
    setTool(tool) {
      if (ui.mode !== 'edit' && !['measure', 'pan'].includes(tool)) return;
      if (tool !== ui.tool) ctx.chart.cancelDrag();
      if (tool !== 'shift') ctx.shift.deactivate();
      if (tool === 'curve') { ctx.curve.activate(); return; }
      if (tool !== 'pan') ctx.curve.deactivate();
      ui.tool = tool; ctx.render();
    },
    setInspector(tab) {
      if (!['transform', 'curve', 'signal', 'theory'].includes(tab)) return;
      ui.inspectorTab = tab; preferences.update({ inspectorTab: tab });
      $$('[data-inspector]').forEach(button => { button.classList.toggle('active', button.dataset.inspector === tab); button.setAttribute('aria-selected', String(button.dataset.inspector === tab)); });
      for (const name of ['transform', 'curve', 'signal', 'theory']) $(`#inspector-${name}`).hidden = name !== tab;
    },
    setBottom(tab) {
      if (!['samples', 'history'].includes(tab)) return;
      ui.bottomTab = tab; preferences.update({ editorTab: tab });
      $$('[data-bottom]').forEach(button => { button.classList.toggle('active', button.dataset.bottom === tab); button.setAttribute('aria-selected', String(button.dataset.bottom === tab)); });
      for (const name of ['samples', 'history']) $(`#${name}-panel`).hidden = name !== tab;
      ctx.render();
    },
    setMode(mode) {
      if (mode !== ui.mode) {
        ctx.chart?.cancelDrag();
        ctx.beforeEdit('mode');
        if (mode === 'create') { editorView = [...ui.view]; editorCursor = ui.playhead; editorThrustView = ui.thrustView ? [...ui.thrustView] : null; ui.view = [...ctx.generator.getDraft().view]; ui.thrustView = null; ui.playhead = ctx.generator.getDraft().playhead; }
        else { const points = store.get().points; const start = points[0].time, end = points.at(-1).time; const length = Math.min(editorView[1] - editorView[0], end - start); const left = clamp(editorView[0], start, end - length); ui.view = [left, left + length]; ui.thrustView = editorThrustView ? [...editorThrustView] : null; ui.playhead = clamp(editorCursor, start, end); }
      }
      ui.mode = mode; document.body.dataset.workspace = mode;
      $('#mode-edit').setAttribute('aria-selected', String(mode === 'edit')); $('#mode-create').setAttribute('aria-selected', String(mode === 'create'));
      $('#workspace-caption').textContent = mode === 'edit' ? 'Editing workspace' : 'Generator preview';
      $('#focus-editor').hidden = mode === 'create';
      const focus = mode === 'edit' && preferences.get().focus;
      document.body.classList.toggle('focus-mode', focus); $('#focus-editor').setAttribute('aria-pressed', String(focus)); $('#focus-editor').classList.toggle('active', focus);
      $('.chart-toolbar .tool-group').hidden = false;
      $$('button[data-tool]').forEach(button => { button.hidden = mode === 'create' && !['measure', 'pan'].includes(button.dataset.tool); });
      $('#export span').textContent = mode === 'create' ? 'Export preview' : 'Export';
      ctx.render();
    },
    chartState() {
      const profile = ctx.activeProfile();
      return { ...profile, units: ctx.units.get(), thrustView: ui.thrustView, theory: ui.mode === 'edit' && ctx.fit.chartReference() || alignTheory(profile.theory, profile.points, profile.theoryAlignment), ...(ui.mode === 'edit' ? ctx.curve.chartState() : {}), measurement: ctx.measurement.chartState(), selectedSample: ui.selectedSample, feather: ui.mode === 'edit' && ctx.getRange() ? Number($('#edit-feather').value || 0) / 100 : 0 };
    },
  };
  ctx.units = createUnitsController({ $, preferences, onChange() { ctx.generator?.presets($('#preset-search').value); ctx.samples?.render({ force: true }); ctx.render(); }, onError: ctx.error });
  ctx.curve = createCurveController(ctx);
  ctx.signal = createEffectsController(ctx);
  ctx.fit = createTheoryFitController(ctx);
  ctx.shift = createShiftController(ctx);
  ctx.generator = createGeneratorController(ctx);
  ctx.samples = createSamplesController(ctx);
  ctx.measurement = createMeasurementController(ctx);
  ctx.files = createFilesController(ctx);
  ctx.theory = createTheoryController(ctx);
  ctx.chart = createChartController(ctx);
  bindNavigation(ctx);
  ctx.settings = createSettingsController(ctx);
  // Relative adjustments begin at neutral for an already saved working profile.
  ctx.signal.reset();
  view = createStudioView(ctx);
  store.subscribe(event => {
    if (event.type === 'saved') { view.savedStatus(); return; }
    if (['undo', 'redo', 'cancel'].includes(event.type)) { ctx.fit.deactivate(); ctx.shift.deactivate(); ctx.signal.reset(); }
    const points = ctx.activeProfile().points, start = points[0].time, end = points.at(-1).time;
    if (ui.view[0] < start || ui.view[1] > end || ui.view[0] >= ui.view[1]) ui.view = [start, end];
    ui.playhead = clamp(ui.playhead, start, end);
    ctx.render();
  });
  window.addEventListener('pagehide', () => store.flush());
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });
  ctx.setMode('edit'); store.flush();
  return ctx;
}
