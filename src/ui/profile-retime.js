/** Duration matching keeps the recording grid and treats impulse and peak as coupled targets. */
export function renderProfileRetime() {
  return `<section class="profile-retime-panel">
    <h3>Burn duration and output</h3>
    <p class="section-description">Stretch the current curve on its original timestamps. Impulse is preserved by default; peak thrust adjusts automatically.</p>
    <p id="retime-scope-note" class="profile-retime-scope">This adjustment uses the entire profile.</p>
    <label class="checkbox-row live-effect-toggle"><span>Live duration matching</span><input id="retime-enabled" type="checkbox"></label>
    <div class="profile-retime-fields">
      <label>Burn duration<span class="input-unit"><input id="retime-duration" type="number" min="0.000001" step="any" value="2.5" aria-label="Matched burn duration"><span>s</span></span></label>
      <p class="section-description">Start and duration use the 5% peak burn window.</p>
    </div>
    <details id="retime-targets" class="profile-retime-targets"><summary>Impulse and peak targets</summary>
      <div class="profile-retime-fields">
        <label>Impulse target<select id="retime-impulse-mode"><option value="preserve">Keep current impulse</option><option value="custom">Custom impulse</option></select></label>
        <label>Total impulse<span class="input-unit"><input id="retime-impulse" type="number" min="0.000001" step="any" value="120" aria-label="Matched total impulse" readonly><span>N·s</span></span></label>
        <label>Peak target<select id="retime-peak-mode"><option value="auto">Automatic · keep shape</option><option value="custom">Custom peak thrust</option></select></label>
        <label>Peak thrust<span class="input-unit"><input id="retime-peak" type="number" min="0.000001" step="any" value="100" aria-label="Matched peak thrust" readonly><span>N</span></span></label>
      </div>
      <p class="profile-retime-guidance">Automatic peak preserves the normalized curve shape. Setting both peak and impulse can change its proportions.</p>
    </details>
    <p id="retime-status" class="profile-retime-status" role="status">Adjust duration or targets to update the current profile.</p>
    <p id="retime-error" class="profile-retime-error" role="alert" hidden></p>
    <div id="retime-results" class="profile-retime-results" hidden>
      <table class="profile-retime-comparison"><caption class="sr-only">Profile duration matching results</caption><thead><tr><th scope="col">Metric</th><th scope="col">Before</th><th scope="col">Result</th></tr></thead><tbody>
        <tr><th scope="row">Burn duration</th><td><output id="retime-before-duration">—</output></td><td><output id="retime-after-duration">—</output></td></tr>
        <tr><th scope="row">Impulse</th><td><output id="retime-before-impulse">—</output></td><td><output id="retime-after-impulse">—</output></td></tr>
        <tr><th scope="row">Peak thrust</th><td><output id="retime-before-peak">—</output></td><td><output id="retime-after-peak">—</output></td></tr>
      </tbody></table>
    </div>
  </section>`;
}
