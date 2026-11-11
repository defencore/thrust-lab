import { icon } from './icons.js';

/** Export presentation keeps source-format downloads separate from generated CSV settings. */
export function renderExportDialog() {
  return `<dialog id="export-dialog" class="modal export-modal"><form id="export-form">
    <div class="modal-heading"><div><span class="eyebrow">SAVE YOUR WORK</span><h2>Export profile</h2></div><button type="button" class="icon-button" data-close="export-dialog" aria-label="Close export">${icon('close')}</button></div>
    <label>File name<input id="export-name" required maxlength="120"></label>
    <div id="export-read-source-section" class="export-read-source"><button id="export-read-source" class="button small" type="button">${icon('file')}Use timings from another CSV</button><p class="modal-note">Pair the CSV timestamps with current thrust measurements in row order.</p></div>
    <section id="export-source-format" class="export-source-format" hidden>
      <h3>Original CSV format</h3><p id="export-source-description">All original columns, timestamps and number formatting are retained. Column headers are omitted.</p>
      <dl><div><dt>Time format</dt><dd id="export-source-time-example" data-i18n="ignore"></dd></div><div><dt>Thrust format</dt><dd id="export-source-thrust-example" data-i18n="ignore"></dd></div></dl>
      <p class="export-format-persistence">Imported formatting is retained in saved projects.</p>
      <p id="export-source-layout-note" hidden>This saved profile has no original CSV layout. Choose the original CSV to restore all columns and exact formatting without changing thrust.</p>
    </section>
    <div id="export-custom-format" class="mapping-grid">
      <label>Time unit<select id="export-time"><option value="s">Seconds (s) · exact timestamps</option><option value="ms">Milliseconds (ms)</option><option value="us">Microseconds (µs)</option></select></label>
      <label>Thrust unit<select id="export-thrust"><option value="N">Newtons (N)</option><option value="kN">Kilonewtons (kN)</option><option value="kgf">Kilogram-force (kgf)</option><option value="lbf">Pound-force (lbf)</option></select></label>
      <label>Delimiter<select id="export-delimiter"><option value=",">Comma (,)</option><option value=";">Semicolon (;)</option><option value="tab">Tab</option></select></label>
      <label>Thrust decimals<select id="export-precision">${Array.from({ length: 16 }, (_, digits) => `<option value="${digits}"${digits === 6 ? ' selected' : ''}>${digits} decimal ${digits === 1 ? 'place' : 'places'}</option>`).join('')}</select></label>
    </div>
    <p class="modal-note export-header-note">CSV files are exported without column names.</p>
    <p class="modal-note" id="export-summary"></p>
    <label class="checkbox-row export-marker-option"><span>Include synthetic marker</span><input id="export-synthetic-marker" type="checkbox" aria-describedby="export-marker-note"></label>
    <p class="modal-note export-marker-note" id="export-marker-note">Adds 10 near-zero records before the measurements.</p>
    <p id="export-error" class="error-message" role="alert" hidden></p>
    <div class="project-save-option">${icon('layers')}<div><strong>Keep the whole workspace</strong><p>Working curve, original, theory, selection, and generator settings.</p></div><button type="button" class="button small" id="save-project">Save project</button></div>
    <div class="modal-actions"><button type="button" class="button" data-close="export-dialog">Cancel</button><button class="button primary" type="submit">${icon('download')}Download CSV</button></div>
  </form></dialog>`;
}
