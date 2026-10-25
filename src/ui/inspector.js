import { icon } from './icons.js';
import { renderTheoryFit } from './theory-fit.js';

function transformControls() {
  return `<div id="inspector-transform" class="inspector-content" role="tabpanel">
    <section><h3>Shape & scale</h3><p class="section-description">Changes update the curve immediately. Time marks stay fixed.</p>
      <label>Time shift<span class="input-unit"><input id="edit-shift" type="number" step="any" value="0" aria-label="Profile time shift"><span>s</span></span></label>
      <p class="section-description">Move the profile across fixed measurement times. Choose how emptied intervals are filled.</p>
      <label class="shift-fill-field">Fill emptied intervals<select id="edit-shift-fill"><option value="zero">Zeros</option><option value="background">Recorded background</option></select></label>
      <label>Background level<span class="input-unit"><input id="edit-shift-noise-gain" type="number" min="0" max="1000" step="10" value="100" aria-label="Background level"><span>%</span></span></label>
      <p id="shift-background-status" class="section-description" aria-live="polite">Choose recorded background to fill gaps with noise from the original no-thrust regions.</p>
      <p class="section-description shift-clipping-note">Values shifted outside the recording are clipped.</p>
      <label>Time width<span class="input-unit"><input id="edit-width" type="number" min="1" max="10000" step="5" value="100"><span>%</span></span></label>
      <label>Anchor<select id="edit-anchor"><option value="start">Selection start</option><option value="center">Center</option><option value="end">Selection end</option></select></label>
      <label>Thrust gain<span class="input-unit"><input id="edit-gain" type="number" min="0" max="10000" step="5" value="100"><span>%</span></span></label>
      <label id="feather-field">Edge transition<span class="input-unit"><input id="edit-feather" type="number" min="0" max="50" step="1" value="15"><span>%</span></span></label><p class="feather-description">Blend each selection edge smoothly into the untouched curve.</p>
      <label>Thrust offset<span class="input-unit"><input id="edit-offset" type="number" step="any" value="0"><span>N</span></span></label>
      <button id="reset-transform" class="inline-button reset-controls">Reset controls</button>
      <p class="live-edit-note">Adjust values to refine the same edit. Undo restores the previous result.</p>
    </section>
    <section><h3>Fit to target</h3>
      <label class="checkbox-row live-effect-toggle"><span>Fit peak thrust</span><input id="fit-peak-enabled" type="checkbox"></label>
      <label>Peak thrust<span class="input-unit"><input id="target-peak" type="number" min="0" step="any" value="100"><span>N</span></span></label>
      <label class="checkbox-row live-effect-toggle"><span>Fit impulse</span><input id="fit-impulse-enabled" type="checkbox"></label>
      <label id="impulse-target-label">Impulse<span class="input-unit"><input id="target-impulse" type="number" min="0" step="any" value="120"><span>N·s</span></span></label>
      <label class="checkbox-row live-effect-toggle"><span>Fit final fall-off</span><input id="fit-tail-enabled" type="checkbox"></label>
      <label>Decay starts after<span class="input-unit"><input id="target-tail-start" type="number" min="0" step="any" value="1.6" aria-label="Target final fall-off time"><span>s</span></span></label>
      <p class="section-description" id="decay-scope-note">Time from ignition until the final fall-off begins. Use Entire profile for this timing adjustment.</p>
      <p class="section-description" id="fit-scope-note">Targets apply to the entire profile.</p>
      <button id="open-theory-fit" class="button full" type="button">${icon('target')}Match all targets to theory</button>
    </section>
    <section class="trim-section"><button class="button full" id="trim">${icon('select')}Zero outside selection</button><p class="section-description">Keep every timestamp. Set values outside the selected range to zero.</p></section>
  </div>`;
}

function curveControls() {
  return `<div id="inspector-curve" class="inspector-content curve-inspector" role="tabpanel" hidden>
    <section><h3>Control points</h3><p class="section-description">Adjust nearby measurements without smoothing the rest of the recording.</p>
      <div class="curve-setup"><label>Anchor points<select id="curve-node-count"><option value="3">3</option><option value="5" selected>5</option><option value="7">7</option><option value="9">9</option><option value="12">12</option></select></label><button id="curve-start" class="button full">${icon('curve')}Start curve editing</button></div>
      <div id="curve-edit-controls" hidden>
        <div class="curve-edit-status"><span></span>Curve editing</div><p class="section-description">Moving a point changes the area between its neighbouring anchors. Existing detail and noise are kept.</p>
        <label class="curve-interpolation-label">Adjustment shape<select id="curve-interpolation"><option value="smooth">Smooth adjustment</option><option value="linear">Linear adjustment</option></select></label>
        <div id="curve-node-list" class="curve-node-list" aria-label="Control points"></div>
        <p id="curve-point-status" class="curve-point-status">No point selected</p>
        <p id="curve-influence-status" class="section-description" aria-live="polite"></p>
        <p class="section-description">Add more points to narrow the affected area.</p>
        <label>Point time<span class="input-unit"><input id="curve-time" type="number" step="any" aria-label="Point time"><span>s</span></span></label>
        <label>Point thrust<span class="input-unit"><input id="curve-thrust" type="number" step="any" min="0" aria-label="Point thrust"><span>N</span></span></label>
        <p class="section-description curve-boundary-note">Boundary points keep the edited range connected to its surroundings.</p>
        <div class="curve-point-actions"><button id="curve-add" class="button small">${icon('plus')}Add point at cursor</button><button id="curve-remove" class="button small">Remove point</button></div>
        <button id="curve-reset" class="inline-button reset-controls">Redistribute points</button>
        <button id="curve-match-noise" class="button full">${icon('wave')}Match noise after shaping</button>
        <p class="section-description curve-match-note">Existing noise is preserved. Use noise matching only when you want to replace it.</p>
      </div>
    </section>
  </div>`;
}

function recordedNoiseControls() {
  return `<section class="sampled-noise-section"><div class="noise-section-title"><h3>Noise from recording</h3><span class="new-badge">NEW</span></div>
    <p class="section-description">Capture natural noise from an unedited region, then enable it in your edit scope.</p>
    <h4>1. Capture a source</h4><label>Baseline window<select id="capture-window"><option value="9">9 samples</option><option value="15" selected>15 samples</option><option value="25">25 samples</option><option value="51">51 samples</option></select></label>
    <div class="noise-source-actions"><button class="button full" id="capture-noise">${icon('select')}Use selection as source</button><button class="button full" id="auto-noise">${icon('search')}Find unedited source</button></div>
    <div class="noise-source-card" id="noise-source-card"><span class="noise-source-icon">${icon('wave')}</span><div><strong id="noise-source-label">No noise sample captured</strong><p id="noise-source-details">Select at least 7 unedited samples to capture a noise source.</p><svg id="noise-preview" viewBox="0 0 200 32" aria-label="Captured noise preview" hidden></svg></div></div>
    <h4>2. Add recorded variation</h4><label class="checkbox-row live-effect-toggle"><span>Recorded noise</span><input id="captured-noise-enabled" type="checkbox" disabled></label>
    <label>Noise gain<span class="input-unit"><input id="captured-gain" type="number" min="0" max="10000" step="10" value="100"><span>%</span></span></label>
    <label>Pattern timing<select id="captured-mode"><option value="repeat">Repeat at source rate</option><option value="stretch">Stretch to edit scope</option></select></label>
  </section>`;
}

function matchingControls() {
  return `<section class="noise-match-section"><h3>Match noise</h3><p class="section-description">Replace noise to match the reference recording instead of stacking more noise.</p>
    <label>Noise level<span class="input-unit"><input id="match-noise-gain" type="number" min="0" max="1000" step="10" value="100"><span>%</span></span></label>
    <button id="match-neighbours" class="button full">${icon('wave')}Match neighbouring data</button><button id="match-captured" class="button full">Match captured noise</button>
    <p class="section-description">Matching replaces the existing high-frequency variation and blends the selection edges.</p>
    <div id="noise-match-report" class="noise-match-report" hidden><h4>Last noise match</h4><div><span>Source noise</span><strong id="noise-match-source"></strong></div><div><span>Before matching</span><strong id="noise-match-before"></strong></div><div><span>After matching</span><strong id="noise-match-after"></strong></div></div>
  </section>`;
}

function signalControls() {
  return `<div id="inspector-signal" class="inspector-content" role="tabpanel" hidden>
    ${recordedNoiseControls()}${matchingControls()}
    <section><h3>Add noise</h3><p class="section-description">Seeded measurement variation, relative to the peak in your edit scope.</p>
      <label class="checkbox-row live-effect-toggle"><span>Random noise</span><input id="random-noise-enabled" type="checkbox"></label>
      <label>Amplitude<span class="input-unit"><input id="noise-amount" type="number" min="0" max="100" value="3" step="0.1"><span>%</span></span></label>
      <label>Random seed<input id="noise-seed" type="number" min="0" max="4294967295" value="84" step="1"></label>
    </section>
    <section><h3>Remove noise</h3><p class="section-description">Smooth the working curve with a centered moving average.</p>
      <label class="checkbox-row live-effect-toggle"><span>Smoothing</span><input id="smoothing-enabled" type="checkbox"></label>
      <label>Window size<select id="smooth-window"><option value="3">3 samples · subtle</option><option value="5">5 samples</option><option value="9" selected>9 samples · balanced</option><option value="15">15 samples</option><option value="25">25 samples</option><option value="51">51 samples · strong</option></select></label>
    </section>
  </div>`;
}

function theoryControls() {
  return `<div id="inspector-theory" class="inspector-content" role="tabpanel" hidden>
    <section class="theory-source-section"><h3>Theoretical reference</h3><p id="tf-reference-status" class="section-description">Load a theory profile to begin.</p>
      <details id="theory-source-options" class="theory-source-options" open><summary>Reference & overlay</summary>
        <div class="theory-source-actions"><button class="button full" id="import-theory">${icon('upload')}Import theoretical CSV</button><button class="button full" id="generate-theory">${icon('spark')}Use generator preview as theory</button><button class="button quiet full" id="capture-theory">Use working curve as theory</button></div>
        <div class="theory-alignment-panel"><h4>Theory alignment</h4>
          <label><span class="sr-only">Theory alignment</span><select id="theory-alignment"><option value="source">Original timestamps</option><option value="start">Align timeline starts</option><option value="ignition">Align ignition (5% peak)</option></select></label>
          <label>Manual offset<span class="input-unit"><input id="theory-offset" type="number" min="-1000000000" max="1000000000" step="any" value="0"><span>s</span></span></label>
          <button id="align-theory-start" class="button full">${icon('target')}Align starts</button><p class="section-description">Align theory ignition to the working profile using a 5% peak threshold.</p><p id="alignment-shift" class="alignment-shift"></p>
        </div>
        <label class="range-label">Overlay opacity <output id="opacity-value">70%</output><input id="theory-opacity" type="range" min="10" max="100" value="70"></label>
        <label class="checkbox-row"><span>Show theoretical curve</span><input id="theory-visible" type="checkbox" checked></label><label class="checkbox-row"><span>Show original curve</span><input id="original-visible" type="checkbox"></label>
        <button class="inline-button danger" id="remove-theory">Remove theoretical curve</button>
      </details>
    </section>
    ${renderTheoryFit()}
  </div>`;
}

export function inspectorControls() {
  return `<aside class="inspector panel">
    <div class="panel-heading"><h2>Inspector</h2>${icon('sliders')}</div>
    <div class="scope-switch" role="group" aria-label="Edit scope"><button id="scope-all" class="active">Entire profile</button><button id="scope-selection">Selection <span id="selection-dot"></span></button></div>
    <div class="selection-fields"><label>IN <span class="input-unit"><input id="range-start" type="number" step="0.001" aria-label="Selection start"><span>s</span></span></label><label>OUT <span class="input-unit"><input id="range-end" type="number" step="0.001" aria-label="Selection end"><span>s</span></span></label></div>
    <div class="range-actions"><span id="scope-stats"></span></div>
    <div class="inspector-tabs" role="tablist" aria-label="Inspector tools"><button data-inspector="transform" role="tab" aria-selected="true" class="active">Transform</button><button data-inspector="curve" role="tab" aria-selected="false">Curve</button><button data-inspector="signal" role="tab" aria-selected="false">Signal</button><button data-inspector="theory" role="tab" aria-selected="false">Theory</button></div>
    <p id="inspector-error" class="inspector-error" role="alert" hidden></p>
    ${transformControls()}${curveControls()}${signalControls()}${theoryControls()}
    <div class="inspector-footer">${icon('history')}Every edit can be undone.</div>
  </aside>`;
}
