import { icon, iconButton } from './icons.js';
import { $, escape } from './dom.js';
import { generatorControls, creationInspector } from './generator.js';
import { inspectorControls } from './inspector.js';
import { workspaceDialogs } from './dialogs.js';
import { measurementPanel } from './measurement.js';
import { renderAxisZoomControls } from './zoom-controls.js';
import { brandMarkup } from './brand.js';
import { renderAnalyzer } from './analyzer.js';

function displayUnitControls(unitOptions) {
  return `<div class="display-units-bar" title="Display units change the chart, measurements, and editing fields. Imported data and CSV export settings stay unchanged."><span class="display-units-title">${icon('sliders')}Display units</span>${['thrust', 'time', 'impulse'].map(dimension => `<label><span>${{ thrust: 'Thrust', time: 'Time', impulse: 'Impulse' }[dimension]}</span><select id="display-${dimension}" aria-label="${{ thrust: 'Thrust display unit', time: 'Time display unit', impulse: 'Impulse display unit' }[dimension]}">${unitOptions[dimension].map(unit => `<option value="${escape(unit.value)}" title="${escape(unit.label)}">${escape(unit.symbol)}</option>`).join('')}</select></label>`).join('')}</div>`;
}

export function buildLayout({ name, presetCount, defaultPreset, catalogNotice, catalogSources, unitOptions }) {
  $('#app').innerHTML = `
  <header class="app-header">
    ${brandMarkup()}
    <span class="header-divider"></span><span class="workspace-caption">Burn profile workspace</span><span class="live-status" id="save-status" role="status">Changes saved automatically · Undo available</span>
    <div class="header-actions"><label class="language-picker"><span class="sr-only">Interface language</span><select id="language-select" aria-label="Interface language"><option value="en">EN</option><option value="uk">UA</option></select></label><span class="local-badge"><span></span> Browser local</span>
      <div class="history-controls">${iconButton('undo', 'undo', 'Undo (Ctrl/⌘ Z)')}${iconButton('redo', 'redo', 'Redo (Ctrl/⌘ Shift Z)')}</div>
      <button class="button quiet guide-button" id="guide">${icon('help')}<span>Quick guide</span></button>
      <button class="button" id="import">${icon('upload')}<span>Import CSV</span></button>
      <button class="button primary" id="export">${icon('download')}<span>Export</span>${icon('chevron')}</button>
    </div>
  </header>
  <div class="workspace-bar"><nav class="workspace-modes" role="tablist" aria-label="Workspace"><button id="mode-edit" role="tab" aria-selected="true">${icon('chart')}Edit profile</button><button id="mode-create" role="tab" aria-selected="false">${icon('spark')}Create profile</button><button id="mode-analyzer" role="tab" aria-selected="false" aria-controls="analyzer-workspace">${icon('search')}Analyzer</button></nav><span id="workspace-caption">Editing workspace</span><button id="settings-open" class="button quiet small">${icon('sliders')}Saved settings</button></div>
  <div class="project-bar"><div class="project-title"><span class="eyebrow">PROFILE / 01</span><input id="project-name" aria-label="Profile name" maxlength="120" value="${escape(name)}"><span class="saved-dot" title="Saved in this browser"></span></div><div class="project-tools"><button id="focus-editor" class="button quiet small" aria-pressed="false">${icon('fit')}<span>Focus mode</span></button><button class="button quiet small" id="open-project">${icon('file')}<span>Open project</span></button><button class="button small" id="new-profile">${icon('plus')}<span>Create profile</span></button></div></div>
  <main class="studio">
    <aside class="library-panel panel"><section class="active-profile-card"><span class="eyebrow">ACTIVE PROFILE</span><div class="active-file-icon">${icon('file')}</div><h2 id="active-profile-name"></h2><p id="active-profile-meta"></p><p class="section-description">Edit the loaded curve with Transform, Curve, Signal, or Theory.</p><button id="import-another" class="button full">${icon('upload')}Import another CSV</button></section>
      <div class="panel-heading"><h2>Profile library</h2><span class="count">${presetCount}</span></div>
      <div class="library-search">${icon('search')}<input id="preset-search" type="search" placeholder="Find a motor…" aria-label="Search motor presets"></div>
      <div class="section-label">REFERENCE PRESETS <span>SYNTHETIC</span></div>
      <div id="preset-list" class="preset-list"></div>
      <div class="library-notice">${icon('help')}<p>Reference-inspired starting points.<br><button id="catalog-info" class="inline-button">About these profiles</button></p></div>
      <div class="layers-section"><div class="panel-heading"><h2>Curve layers</h2>${icon('layers')}</div>
        <div class="layer-row"><span class="line-swatch blue"></span><div><strong>Working profile</strong><small id="working-source">Editable · thrust</small></div><span class="layer-active">ACTIVE</span></div>
        <label class="layer-row"><span class="line-swatch amber"></span><div><strong>Theoretical</strong><small id="theory-source">Reference overlay</small></div><input id="layer-theory" type="checkbox" checked aria-label="Show theoretical curve"></label>
        <label class="layer-row"><span class="line-swatch gray"></span><div><strong>Original</strong><small>Before your edits</small></div><input id="layer-original" type="checkbox" aria-label="Show original curve"></label>
      </div>
      <div class="library-bottom">${icon('lock')}<span>Your data stays on this device.<br>No uploads. No account needed.</span></div>
    </aside>
    <section class="work-area" aria-label="Profile editor">
      ${displayUnitControls(unitOptions)}
      <div class="metrics-grid">
        <article class="metric"><span>TOTAL IMPULSE</span><div><strong id="metric-impulse">0</strong><small>N·s</small></div><p id="metric-class">Integrated thrust</p></article>
        <article class="metric"><span>PEAK THRUST</span><div><strong id="metric-peak">0</strong><small>N</small></div><p id="metric-peak-time">Maximum measured force</p></article>
        <article class="metric"><span>BURN DURATION</span><div><strong id="metric-burn">0</strong><small>s</small></div><p>5% peak threshold</p></article>
        <article class="metric"><span>MEAN BURN THRUST</span><div><strong id="metric-average">0</strong><small>N</small></div><p>Impulse / 5% burn duration</p></article>
      </div>
      <div class="chart-panel panel">
        <div class="chart-toolbar"><div class="tool-group" role="group" aria-label="Chart tools"><button data-tool="select" class="icon-button active" aria-label="Select range (V)" title="Select range (V)">${icon('select')}</button><button data-tool="draw" class="icon-button" aria-label="Draw thrust (D)" title="Draw thrust (D)">${icon('draw')}</button><button data-tool="curve" class="icon-button" aria-label="Curve points (C)" title="Curve points (C)">${icon('curve')}</button><button data-tool="shift" class="icon-button" aria-label="Shift profile (G)" title="Drag left or right to shift thrust values along the fixed timeline.">${icon('shift')}</button><button data-tool="measure" class="icon-button" aria-label="Measure (M)" title="Measure (M)">${icon('measure')}</button><button data-tool="pan" class="icon-button" aria-label="Pan view (H)" title="Pan view (H)">${icon('hand')}</button></div><div class="mobile-history">${iconButton('mobile-undo', 'undo', 'Undo (Ctrl/⌘ Z)')}${iconButton('mobile-redo', 'redo', 'Redo (Ctrl/⌘ Shift Z)')}${iconButton('mobile-guide', 'help', 'Quick guide')}</div><span class="toolbar-separator"></span><span class="tool-caption" id="tool-caption">Drag to select a range</span><button id="clear-selection" class="button small clear-selection-button" title="Clear selected range, point, and measurement markers (Esc)" aria-label="Clear selection (Esc)" disabled>${icon('close')}<span>Clear selection</span><kbd>Esc</kbd></button></div>
        ${renderAxisZoomControls()}
        <div class="chart-heading"><div><span class="eyebrow">THRUST CURVE</span><h1 id="chart-name">Working profile</h1></div><div class="chart-legend"><span><i class="blue"></i>Working</span><span id="theory-legend"><i class="amber"></i>Theoretical</span></div></div>
        <div id="profile-chart" class="profile-chart" tabindex="0" aria-label="Interactive thrust profile chart"></div>
        ${measurementPanel()}
        <div class="chart-bottom"><span class="timestamp-lock">${icon('lock')}Timestamps locked</span><span id="selection-summary">Full profile</span></div>
        <div class="timeline"><div class="timeline-label"><span>OVERVIEW</span><span id="view-label">0.00 — 1.70 s</span></div><div id="overview" class="overview" aria-label="Profile overview. Drag to pan the zoomed chart."></div><div class="timeline-footer"><span id="timeline-start">0.000 s</span><label>CURSOR <input id="cursor-time" type="number" step="0.001" aria-label="Cursor time"><span id="cursor-time-unit">s</span> <span class="cursor-value" id="cursor-thrust">0.00 N</span></label><span id="timeline-end">1.700 s</span></div></div>
      </div>
      ${generatorControls(defaultPreset)}
      <section class="bottom-panel panel">
        <div class="bottom-tabs" role="tablist" aria-label="Workspace panels"><button data-bottom="samples" role="tab" aria-selected="true" class="active">${icon('file')}Sample data<span id="sample-count" class="count"></span></button><button data-bottom="history" role="tab" aria-selected="false">${icon('history')}History</button></div>
        <div id="samples-panel" role="tabpanel" hidden></div><div id="history-panel" role="tabpanel" hidden></div>
      </section>
    </section>
    ${inspectorControls()}
    ${creationInspector()}
  </main>
  ${renderAnalyzer()}
  <footer class="status-bar"><span><i class="status-led"></i><span>Browser local</span></span><span id="data-status"></span><span class="status-hint">V Select <kbd>D</kbd> Draw <kbd>C</kbd> Curve <kbd>G</kbd> Shift profile <kbd>M</kbd> Measure <kbd>H</kbd> Pan <kbd>F</kbd> Fit</span><span class="version">THRUST LAB STUDIO <b>1.0</b></span></footer>
  <div id="toast" class="toast" role="status" hidden></div>
  ${workspaceDialogs({ catalogNotice, catalogSources })}
`;
}
