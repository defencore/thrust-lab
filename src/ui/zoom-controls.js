import { icon, iconButton } from './icons.js';

/** Independent axis controls change the view without changing profile measurements. */
export function renderAxisZoomControls() {
  return `<div class="axis-zoom-controls" aria-label="Chart scale controls">
    <div class="axis-zoom-group" role="group" aria-label="Time zoom"><span class="axis-zoom-label">Time</span>${iconButton('zoom-out', 'zoomOut', 'Time zoom out')}${iconButton('zoom-in', 'zoomIn', 'Time zoom in')}</div>
    <div class="axis-zoom-group thrust-zoom-group" role="group" aria-label="Thrust zoom" title="Shift + wheel: thrust zoom · Double-click thrust axis: auto scale"><span class="axis-zoom-label">Thrust</span>${iconButton('thrust-zoom-out', 'zoomOut', 'Thrust zoom out')}${iconButton('thrust-zoom-in', 'zoomIn', 'Thrust zoom in')}${iconButton('thrust-zoom-fit', 'reset', 'Reset thrust scale')}<output id="thrust-scale-status" class="thrust-scale-status" aria-label="Thrust scale" title="Visible thrust range">Auto</output></div>
    <div class="axis-fit-controls">
      <button id="zoom-fit" class="button quiet small fit-all-axes" title="Fit all axes (F)" aria-label="Fit all axes (F)">${icon('fit')}<span>Fit all axes</span><kbd>F</kbd></button>
      <button id="zoom-burn" class="button quiet small fit-burn-region" title="Fit the active burn window, excluding idle time before and after thrust." aria-label="Fit burn region">${icon('wave')}<span>Fit burn region</span></button>
    </div>
    <span class="axis-zoom-help" title="Shift + wheel: thrust zoom · Double-click thrust axis: auto scale">${icon('help')}<span>Shift + wheel</span></span>
  </div>
  <div class="chart-display-controls" aria-label="Chart detail controls">
    <label class="chart-grid-mode">Thrust grid<select id="thrust-grid-mode" aria-label="Thrust grid mode"><option value="auto">Auto</option><option value="custom">Custom step</option></select></label>
    <label class="chart-grid-step">Grid step<span class="input-unit"><input id="thrust-grid-step" type="number" min="0" step="any" value="25" aria-label="Thrust grid step" disabled><span id="thrust-grid-unit">N</span></span></label>
    <label class="chart-height-control">Chart height<select id="chart-height" aria-label="Chart height"><option value="auto">Auto height</option><option value="340">Compact</option><option value="520">Medium</option><option value="760">Large</option><option value="1000">Tall</option></select></label>
    <p id="thrust-grid-status" class="chart-grid-status" role="status"></p>
    <p id="thrust-grid-error" class="chart-grid-error" role="alert" hidden></p>
  </div>`;
}
