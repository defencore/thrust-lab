import { icon, iconButton } from './icons.js';

/** Independent axis controls change the view without changing profile measurements. */
export function renderAxisZoomControls() {
  return `<div class="axis-zoom-controls" aria-label="Chart scale controls">
    <div class="axis-zoom-group" role="group" aria-label="Time zoom"><span class="axis-zoom-label">Time</span>${iconButton('zoom-out', 'zoomOut', 'Time zoom out')}${iconButton('zoom-in', 'zoomIn', 'Time zoom in')}</div>
    <div class="axis-zoom-group thrust-zoom-group" role="group" aria-label="Thrust zoom" title="Shift + wheel: thrust zoom · Double-click thrust axis: auto scale"><span class="axis-zoom-label">Thrust</span>${iconButton('thrust-zoom-out', 'zoomOut', 'Thrust zoom out')}${iconButton('thrust-zoom-in', 'zoomIn', 'Thrust zoom in')}${iconButton('thrust-zoom-fit', 'reset', 'Reset thrust scale')}<output id="thrust-scale-status" class="thrust-scale-status" aria-label="Thrust scale" title="Visible thrust range">Auto</output></div>
    <button id="zoom-fit" class="button quiet small fit-all-axes" title="Fit all axes (F)" aria-label="Fit all axes (F)">${icon('fit')}<span>Fit all axes</span><kbd>F</kbd></button>
    <span class="axis-zoom-help" title="Shift + wheel: thrust zoom · Double-click thrust axis: auto scale">${icon('help')}<span>Shift + wheel</span></span>
  </div>`;
}
