import { icon } from './icons.js';

/** Measurement markers inspect the curve without changing its edit selection. */
export function measurementPanel() {
  return `<section id="measurement-panel" class="measurement-panel" aria-label="Measurement" hidden>
    <div class="measurement-heading"><h2>${icon('measure')}Measurement</h2><button id="clear-measurement" class="button quiet small" type="button">${icon('close')}Clear measurement</button></div>
    <p id="measurement-empty" class="measurement-empty">Click two points or drag to measure time and thrust.</p>
    <div class="measurement-grid">
      <div class="measurement-endpoint measure-a"><span class="measurement-badge">A</span><label class="measurement-time">Time<span class="input-unit"><input id="measure-time-a" type="number" step="any" inputmode="decimal" aria-label="Marker A time"><span>s</span></span></label><div class="measurement-force"><span>Thrust</span><output id="measure-a-thrust">—</output></div></div>
      <div class="measurement-endpoint measure-b"><span class="measurement-badge">B</span><label class="measurement-time">Time<span class="input-unit"><input id="measure-time-b" type="number" step="any" inputmode="decimal" aria-label="Marker B time" disabled><span>s</span></span></label><div class="measurement-force"><span>Thrust</span><output id="measure-b-thrust">—</output></div></div>
      <div class="measurement-delta"><span>Time difference</span><output id="measure-delta-time">—</output></div>
      <div class="measurement-delta"><span>Thrust difference</span><output id="measure-delta-thrust">—</output></div>
    </div>
    <p class="measurement-note">Measurements are independent of the edit selection.</p>
  </section>`;
}
