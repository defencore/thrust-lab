import { timeTicks } from '../time-axis.js';
import { fromDisplay, toDisplay } from '../units.js';

const DEFAULTS = Object.freeze({ visible: true, mode: 'auto', stepSI: .5 });

/** Keep time grid display settings separate from the recording and edit history. */
export function createTimeGridController(ctx) {
  const { $, preferences, units } = ctx;
  const visible = $('#time-grid-visible'), mode = $('#time-grid-mode'), step = $('#time-grid-step');
  const status = $('#time-grid-status'), error = $('#time-grid-error');
  let settings = { ...DEFAULTS }, lastUnit = '', renderedValue = '', renderedSI = .5, errorText = '';

  function validation(message = '') {
    errorText = message;
    step.classList.toggle('input-error', !!message);
    if (message) step.setAttribute('aria-invalid', 'true');
    else step.removeAttribute('aria-invalid');
  }

  function writeStep(value) {
    try {
      step.value = String(Number(toDisplay(value, 'time', units.get()).toPrecision(12)));
      renderedValue = step.value; renderedSI = value;
    } catch (issue) { step.value = ''; validation(issue.message); }
  }

  function ticks(stepSI = null, strict = true) {
    const points = ctx.activeProfile().points;
    const view = ctx.chart?.state?.view ?? [points[0].time, points.at(-1).time];
    return timeTicks(view, { originSI: ctx.chart?.state?.timeOriginSI ?? 0, stepSI, width: ctx.chart?.box?.width ?? 640, strict });
  }

  function save() { preferences.update({ timeGrid: settings }); }

  function updateGrid() {
    try {
      if (!['auto', 'custom'].includes(mode.value)) throw new Error('Choose Auto or Custom step.');
      if (mode.value === 'auto') settings.mode = 'auto';
      else {
        const displayed = step.value.trim() ? Number(step.value) : NaN;
        if (!Number.isFinite(displayed) || displayed <= 0) throw new Error('Grid step must be finite and greater than zero.');
        const canonical = step.value === renderedValue ? renderedSI : fromDisplay(displayed, 'time', units.get());
        ticks(canonical);
        settings.mode = 'custom'; settings.stepSI = canonical;
        renderedValue = step.value; renderedSI = canonical;
      }
      validation(); save();
    } catch (issue) { validation(issue.message); }
    ctx.render();
  }

  visible.addEventListener('change', () => {
    settings.visible = visible.checked;
    mode.value = settings.mode; validation(); writeStep(settings.stepSI);
    save(); ctx.render();
  });
  mode.addEventListener('change', () => {
    if (mode.value === 'custom') writeStep(settings.stepSI);
    updateGrid();
  });
  step.addEventListener('input', () => { if (mode.value === 'custom' && settings.visible) updateGrid(); });

  function restorePreferences() {
    settings = { ...DEFAULTS, ...preferences.get().timeGrid };
    visible.checked = settings.visible; mode.value = settings.mode;
    validation(); writeStep(settings.stepSI);
    lastUnit = units.get().time;
  }

  function render() {
    const unit = units.get().time;
    if (lastUnit !== unit) { lastUnit = unit; mode.value = settings.mode; validation(); writeStep(settings.stepSI); }
    $('#time-grid-unit').textContent = units.symbol('time');
    mode.disabled = !settings.visible;
    step.disabled = !settings.visible || mode.value !== 'custom';
    const info = ctx.chart?.timeGridInfo;
    if (mode.value === 'auto') writeStep(info?.stepSI ?? ticks().stepSI);
    status.textContent = settings.visible ? info?.densityLimited ? 'Zoom in to show every grid line.' : info?.labelEvery > 1 ? 'Zoom in or widen the chart to show more time labels.' : '' : '';
    status.hidden = !status.textContent;
    error.hidden = !errorText || !settings.visible; error.textContent = errorText;
  }

  restorePreferences();
  return { render, restorePreferences, getState: () => ({ timeGridVisible: settings.visible, timeGridStepSI: settings.mode === 'custom' ? settings.stepSI : null }) };
}
