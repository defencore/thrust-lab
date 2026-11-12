/** Time grid preferences affect the chart view without changing timestamps. */
export function renderTimeGridControls() {
  return `<div class="chart-display-controls time-grid-controls" role="group" aria-label="Time grid controls">
    <label class="time-grid-toggle"><input id="time-grid-visible" type="checkbox" checked><span>Time grid</span></label>
    <label class="time-grid-mode">Spacing<select id="time-grid-mode" aria-label="Time grid mode"><option value="auto">Auto</option><option value="custom">Custom step</option></select></label>
    <label class="time-grid-step">Grid step<span class="input-unit"><input id="time-grid-step" type="number" min="0" step="any" value="0.5" aria-label="Time grid step" aria-describedby="time-grid-error" disabled><span id="time-grid-unit">s</span></span></label>
    <p id="time-grid-status" class="chart-grid-status" role="status" hidden></p>
    <p id="time-grid-error" class="chart-grid-error" role="alert" hidden></p>
  </div>`;
}
