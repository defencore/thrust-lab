import { icon } from './icons.js';

/** A separate local inspection workspace never writes into the open profile. */
export function renderAnalyzer() {
  return `<main id="analyzer-workspace" class="analyzer-workspace" hidden>
    <section class="analyzer-heading"><div><span class="eyebrow">FILE INSPECTION</span><h1>Synthetic data analyzer</h1><p>Check a saved CSV or Thrust Lab project for its synthetic marker.</p></div><span class="analyzer-local">${icon('lock')}Files stay on this device</span></section>
    <div class="analyzer-layout">
      <section class="panel analyzer-source"><div class="analyzer-source-icon">${icon('search')}</div><h2>Inspect a file</h2><p>The analyzer reads the saved file independently of your working profile.</p><button id="analyzer-open" class="button primary" type="button">${icon('upload')}Choose CSV or project</button><input id="analyzer-file" type="file" accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json" hidden><p class="analyzer-file-name" id="analyzer-file-name">No file selected</p>
        <div id="analyzer-csv-options" class="analyzer-csv-options" hidden><h3>CSV interpretation</h3><p>Adjust columns and units if the file uses a different format.</p><div class="analyzer-mapping-grid">
          <label>Time column<select id="analyzer-time-column" data-i18n="ignore"></select></label><label>Thrust column<select id="analyzer-thrust-column" data-i18n="ignore"></select></label>
          <label>Time unit<select id="analyzer-time-unit"><option value="auto">Detect from header · default s</option><option value="s">Seconds (s)</option><option value="ms">Milliseconds (ms)</option><option value="us">Microseconds (µs)</option></select></label>
          <label>Thrust unit<select id="analyzer-thrust-unit"><option value="auto">Detect from header · default N</option><option value="N">Newtons (N)</option><option value="kN">Kilonewtons (kN)</option><option value="kgf">Kilogram-force (kgf)</option><option value="lbf">Pound-force (lbf)</option></select></label>
          <label class="analyzer-wide">First row<select id="analyzer-header"><option value="auto">Detect header automatically</option><option value="yes">Column names (header)</option><option value="no">Measurement data (no header)</option></select></label>
        </div></div>
      </section>
      <section class="panel analyzer-result" aria-labelledby="analyzer-result-heading"><div class="analyzer-result-top"><span class="eyebrow">ANALYSIS RESULT</span><span id="analyzer-format" class="analyzer-format" hidden></span></div><div id="analyzer-result-icon" class="analyzer-result-icon" aria-hidden="true">${icon('search')}</div><h2 id="analyzer-result-heading" aria-live="polite">Ready to inspect</h2><p id="analyzer-result-description">Choose an exported file to check the first ten records.</p><p id="analyzer-error" class="analyzer-error" role="alert" hidden></p>
        <dl id="analyzer-facts" class="analyzer-facts" hidden><div><dt>Marker scheme</dt><dd id="analyzer-scheme"></dd></div><div><dt>Marker records</dt><dd id="analyzer-marker-count"></dd></div><div><dt>Profile measurements</dt><dd id="analyzer-sample-count"></dd></div><div><dt>Profile timeline</dt><dd id="analyzer-timeline"></dd></div></dl>
        <p id="analyzer-marker-note" class="analyzer-marker-note" hidden>Marker records are excluded from profile charts and measurements.</p>
        <div class="analyzer-interpretation"><h3>How to interpret the result</h3><p>A matching pattern identifies the Thrust Lab synthetic marker. A missing marker does not prove that measurements are real.</p><p>The marker is an identification pattern, not a cryptographic authenticity check.</p></div>
      </section>
    </div>
  </main>`;
}
