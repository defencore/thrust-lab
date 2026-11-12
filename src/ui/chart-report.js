import { icon } from './icons.js';

/** The visible report groups the profile and its metrics for review and image export. */
export function renderChartReport() {
  return `<section id="chart-report" class="chart-report" aria-label="Profile chart">
    <div class="chart-heading">
      <div><span class="eyebrow">THRUST CURVE</span><h1 id="chart-name" data-i18n="ignore">Working profile</h1></div>
      <div class="chart-image-actions" role="group" aria-label="Chart image actions">
        <button id="copy-chart-image" class="button quiet small" type="button" title="Copy chart image">${icon('copy')}<span>Copy image</span></button>
        <button id="save-chart-image" class="button small" type="button" title="Save chart image as PNG">${icon('download')}<span>Save PNG</span></button>
        <details class="chart-image-settings">
          <summary title="Image settings">${icon('sliders')}<span>Image settings</span>${icon('chevron')}</summary>
          <div class="chart-image-settings-panel">
            <p>Applies to copied and saved images.</p>
            <label><input id="chart-image-details" type="checkbox"><span>Show metric details</span></label>
            <label><input id="chart-image-legend" type="checkbox"><span>Show legend</span></label>
          </div>
        </details>
      </div>
    </div>
    <div class="metrics-grid">
      <article class="metric"><span>TOTAL IMPULSE</span><div><strong id="metric-impulse">0</strong><small>N·s</small></div><p id="metric-class">Integrated thrust</p></article>
      <article class="metric"><span class="peak-metric-label">PEAK THRUST</span><div><strong id="metric-peak">0</strong><small>N</small></div><p id="metric-peak-time">Maximum measured force</p></article>
      <article class="metric"><span>BURN DURATION</span><div><strong id="metric-burn">0</strong><small>s</small></div><p>5% peak threshold</p></article>
      <article class="metric"><span>MEAN BURN THRUST</span><div><strong id="metric-average">0</strong><small>N</small></div><p>Impulse / 5% burn duration</p></article>
    </div>
    <div class="chart-legend" aria-label="Curve legend"><span><i class="blue"></i>Working</span><span id="theory-legend"><i class="amber"></i>Theoretical</span><span id="original-legend" hidden><i class="gray"></i>Original</span></div>
    <div id="profile-chart" class="profile-chart" tabindex="0" aria-label="Interactive thrust profile chart"></div>
  </section>`;
}
