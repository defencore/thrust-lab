import { axisTicks, defaultThrustView } from '../vertical-view.js';
import { fromDisplay, toDisplay } from '../units.js';

const DEFAULTS = Object.freeze({ mode: 'auto', stepSI: 25, height: null });
const HEIGHTS = [340, 520, 760, 1000];

/** Grid spacing and chart height are view preferences, never measurement edits. */
export function createChartGridController(ctx) {
  const { $, preferences, units } = ctx;
  const mode = $('#thrust-grid-mode'), step = $('#thrust-grid-step'), height = $('#chart-height');
  const status = $('#thrust-grid-status'), error = $('#thrust-grid-error');
  let settings = { ...DEFAULTS }, lastUnit = '', renderedValue = '', renderedSI = 25, errorText = '';

  function writeStep(value) {
    step.value = String(Number(toDisplay(value, 'thrust', units.get()).toPrecision(8)));
    renderedValue = step.value; renderedSI = value;
  }

  function view() {
    if (ctx.chart?.state) return ctx.chart.effectiveThrustView();
    const profile = ctx.activeProfile();
    let peak = 0;
    for (const points of [profile.points, ...(profile.showTheory && profile.theory ? [profile.theory] : []), ...(profile.showOriginal && profile.original ? [profile.original] : [])]) {
      for (const point of points) peak = Math.max(peak, point.thrust);
    }
    return defaultThrustView(peak, units.get());
  }

  function validation(message = '') {
    errorText = message;
    step.classList.toggle('input-error', !!message);
    if (message) step.setAttribute('aria-invalid', 'true');
    else step.removeAttribute('aria-invalid');
  }

  function save() { preferences.update({ chartGrid: settings }); }

  function updateGrid() {
    try {
      if (!['auto', 'custom'].includes(mode.value)) throw new Error('Choose Auto or Custom step.');
      if (mode.value === 'auto') settings.mode = 'auto';
      else {
        const displayed = step.value.trim() ? Number(step.value) : NaN;
        if (!Number.isFinite(displayed) || displayed <= 0) throw new Error('Grid step must be finite and greater than zero.');
        const canonical = step.value === renderedValue ? renderedSI : fromDisplay(displayed, 'thrust', units.get());
        axisTicks(view(), units.get(), 5, { stepSI: canonical });
        settings.mode = 'custom'; settings.stepSI = canonical;
        renderedValue = step.value; renderedSI = canonical;
      }
      validation(); save();
    } catch (issue) { validation(issue.message); }
    ctx.render();
  }

  mode.addEventListener('change', () => {
    if (mode.value === 'custom') writeStep(settings.stepSI);
    updateGrid();
  });
  step.addEventListener('input', () => { if (mode.value === 'custom') updateGrid(); });
  height.addEventListener('change', () => {
    const selected = height.value === 'auto' ? null : Number(height.value);
    if (selected !== null && !HEIGHTS.includes(selected)) { validation('Choose a valid chart height.'); ctx.render(); return; }
    settings.height = selected; save(); ctx.render();
  });
  $('#zoom-burn').addEventListener('click', () => ctx.chart.fitBurnRegion());

  function restorePreferences() {
    settings = { ...DEFAULTS, ...preferences.get().chartGrid };
    mode.value = settings.mode; height.value = settings.height == null ? 'auto' : String(settings.height);
    validation(); writeStep(settings.stepSI);
    lastUnit = units.get().thrust;
  }

  function render() {
    const unit = units.get().thrust;
    if (lastUnit !== unit) { lastUnit = unit; mode.value = settings.mode; validation(); writeStep(settings.stepSI); }
    $('#thrust-grid-unit').textContent = units.symbol('thrust');
    step.disabled = mode.value !== 'custom';
    const info = ctx.chart?.gridInfo;
    if (mode.value === 'auto') writeStep(info?.stepSI || axisTicks(view(), units.get()).stepSI);
    status.textContent = info?.densityLimited ? 'Zoom in to show every grid line.' : info?.labelEvery > 1 ? 'Increase chart height or zoom in to show more labels.' : '';
    status.hidden = !status.textContent;
    error.hidden = !errorText; error.textContent = errorText;
    $('#zoom-burn').disabled = !ctx.chart.canFitBurnRegion();
  }

  restorePreferences();
  return { render, restorePreferences, getState: () => ({ gridStepSI: settings.mode === 'custom' ? settings.stepSI : null, chartHeight: settings.height }) };
}
