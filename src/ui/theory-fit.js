/** The fitting workbench separates geometry, coupled targets, texture, and results. */
export function renderTheoryFit() {
  return `<section class="theory-fit-panel">
    <div class="theory-fit-intro"><h3>Match theory</h3><p class="section-description">Match the reference shape, set achievable targets, then restore recorded texture.</p><p class="theory-fit-scope">Matches the whole recording; manual tools can still use a selection.</p></div>
    <label class="checkbox-row live-effect-toggle theory-fit-toggle"><span>Live matching</span><input id="tf-enabled" type="checkbox" disabled></label>
    <p id="tf-status" class="theory-fit-status" role="status">Load a theory profile to begin.</p>
    <p id="tf-error" class="theory-fit-error" role="alert" hidden></p>
    <fieldset id="tf-fit-body" class="theory-fit-body" disabled>
      <legend class="sr-only">Theory matching controls</legend>
      <div class="theory-fit-actions"><button id="tf-use-theory" class="button small" type="button">Use theory values</button><button id="tf-use-current" class="button small" type="button">Use current values</button></div>
      <div class="theory-fit-step">
        <div class="theory-step-heading"><span>1</span><h4>Shape & targets</h4></div>
        <p class="section-description">Start and duration use the 5% peak burn window.</p>
        <div class="theory-fit-fields">
          <label>Burn start<span class="input-unit"><input id="tf-start" type="number" step="any" value="0" aria-label="Target burn start"><span>s</span></span></label>
          <label>Burn duration<span class="input-unit"><input id="tf-duration" type="number" min="0.000001" step="any" value="2" aria-label="Target burn duration"><span>s</span></span></label>
          <label class="checkbox-row theory-fit-wide"><span>Custom final fall-off</span><input id="tf-tail-enabled" type="checkbox"></label>
          <label class="theory-fit-wide">Tail starts after ignition<span class="input-unit"><input id="tf-tail-start" type="number" min="0" step="any" value="1.6" aria-label="Theory fit final fall-off time"><span>s</span></span></label>
          <p class="section-description theory-fit-wide">Time from ignition until the final fall-off begins.</p>
          <label class="theory-fit-wide">Peak thrust<span class="input-unit"><input id="tf-peak" type="number" min="0.000001" step="any" value="100" aria-label="Target peak thrust"><span>N</span></span></label>
          <label class="theory-fit-wide">Set the total using<select id="tf-area-mode" aria-label="Independent total target"><option value="impulse">Impulse</option><option value="average">Mean over burn</option></select></label>
          <label>Impulse<span class="input-unit"><input id="tf-impulse" type="number" min="0.000001" step="any" value="120" aria-label="Target total impulse"><span>N·s</span></span></label>
          <label>Mean over burn<span class="input-unit"><input id="tf-average" type="number" min="0.000001" step="any" value="60" aria-label="Target mean over burn" readonly><span>N</span></span></label>
        </div>
        <p class="theory-fit-formula">Impulse = mean over burn × burn duration.</p>
        <label class="theory-fit-shape">Theory shape<span class="input-unit"><input id="tf-shape-blend" type="number" min="0" max="100" step="1" value="100" aria-label="Theory shape blend"><span>%</span></span></label>
        <p class="section-description">0% keeps the recording shape; 100% follows the theory shape.</p>
      </div>
      <div class="theory-fit-step">
        <div class="theory-step-heading"><span>2</span><h4>Recording texture</h4></div>
        <label>Noise source<select id="tf-noise-source"><option value="original">Original recording</option><option value="captured" disabled>Captured sample</option><option value="none">None</option></select></label>
        <p id="tf-noise-hint" class="section-description">Capture a source in Signal to use a captured sample.</p>
        <div class="theory-fit-fields">
          <label>Noise level<span class="input-unit"><input id="tf-noise-level" type="number" min="0" max="1000" step="10" value="100" aria-label="Matched noise level"><span>%</span></span></label>
          <label>Baseline window<span class="input-unit"><input id="tf-noise-window" type="number" min="3" max="101" step="2" value="15" aria-label="Theory fit baseline window"><span>samples</span></span></label>
        </div>
        <p id="tf-noise-report" class="theory-fit-noise-report" role="status"></p>
      </div>
    </fieldset>
    <div class="theory-fit-step theory-fit-results">
      <div class="theory-step-heading"><span>3</span><h4>Result</h4></div>
      <div class="theory-fit-table-scroll"><table class="theory-fit-comparison"><caption class="sr-only">Before, theory, and result comparison</caption><thead><tr><th scope="col">Metric</th><th scope="col">Before</th><th scope="col">Theory</th><th scope="col">Result</th></tr></thead><tbody id="tf-comparison"><tr><td colspan="4">Enable matching to compare the result.</td></tr></tbody></table></div>
      <p class="section-description">Peak, impulse and burn timing stay constrained while texture is added.</p>
    </div>
  </section>`;
}
