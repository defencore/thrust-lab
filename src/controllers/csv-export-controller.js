import { exportCSV, downloadFile } from '../csv.js';
import { burnRegionView } from '../burn-region.js';
import { formatTime, unitSymbol } from '../units.js';

const customControls = ['export-time', 'export-thrust', 'export-delimiter', 'export-precision'];

/** Export choices affect downloaded files independently of the working profile. */
export function createCSVExportController(ctx) {
  const { $, preferences, ui } = ctx;
  const mode = $('#export-format-mode'), scope = $('#export-scope');

  function selection(profile) {
    if (!['source', 'custom'].includes(mode.value)) throw new Error('Choose an original or custom CSV format.');
    if (mode.value === 'source' && !profile.csvFormat) throw new Error('Original CSV format is unavailable for generated profiles.');
    if (!['all', 'burn'].includes(scope.value)) throw new Error('Choose all measurements or the burn region.');
    const range = scope.value === 'burn' ? burnRegionView(profile.points) : null;
    if (scope.value === 'burn' && !range) throw new Error('No measurable burn region was found. Choose all measurements to export this profile.');
    const points = range ? profile.points.filter(point => point.time >= range[0] && point.time <= range[1]) : profile.points;
    if (points.length < 2) throw new Error('The burn region contains fewer than two measurements. Choose all measurements.');
    return { range, points };
  }

  function remember() {
    preferences.update({
      csvExport: { scope: scope.value, ...(ctx.activeProfile().csvFormat ? { formatMode: mode.value } : {}) },
      controls: Object.fromEntries(customControls.map(id => [id, $(`#${id}`).value])),
    });
  }

  function render() {
    const profile = ctx.activeProfile(), source = profile.csvFormat, original = mode.value === 'source';
    $('#export-source-format').hidden = !source || !original;
    $('#export-custom-format').hidden = original;
    $('#export-delimiter-field').hidden = !!source;
    $('#export-delimiter').disabled = !!source || original;
    for (const id of ['export-time', 'export-thrust', 'export-precision']) $(`#${id}`).disabled = original;
    $('#export-format-note').textContent = original
      ? 'Original format preserves the imported CSV. Custom format uses the selected export units.'
      : source ? 'Converts time and thrust values while retaining the original CSV columns and layout.'
        : 'Choose units and precision for the exported CSV.';
    $('#export-header-note').textContent = !source ? 'Generated CSV files are exported without column names.'
      : !source.hasHeader ? 'Headerless files stay headerless.'
        : original ? 'Original column names are retained. Headerless files stay headerless.'
          : 'Unit labels in the exported headers follow the selected units.';
    $('#export-scope-note').hidden = scope.value !== 'burn';
    $('#export-error').hidden = true;
    try {
      const selected = selection(profile);
      const timeUnit = original ? source.timeUnit : $('#export-time').value;
      const displayUnits = { time: timeUnit };
      const first = formatTime(selected.points[0].time, displayUnits, { digits: 6 });
      const last = formatTime(selected.points.at(-1).time, displayUnits, { digits: 6 });
      const count = selected.points.length.toLocaleString('en-US');
      $('#export-scope-status').textContent = `${count} measurements · ${first} — ${last} ${unitSymbol('time', displayUnits)}`;
      $('#export-summary').textContent = scope.value === 'all'
        ? `Exports all ${count} measurements. Your entire timestamp sequence is retained.`
        : `Exports ${count} measurements inside the fitted burn region.`;
      $('#export-submit').disabled = false;
    } catch (error) {
      $('#export-scope-status').textContent = error.message;
      $('#export-summary').textContent = '';
      $('#export-submit').disabled = true;
    }
  }

  function openExport() {
    if (ui.screen === 'analyzer') return;
    const profile = ctx.activeProfile(), source = profile.csvFormat;
    const saved = preferences.get();
    mode.value = source ? saved.csvExport.formatMode : 'custom';
    scope.value = saved.csvExport.scope;
    $('#export-format-mode option[value="source"]').disabled = !source;
    for (const id of customControls) $(`#${id}`).value = saved.controls[id];
    $('#export-synthetic-marker').checked = !source;
    $('#export-read-source-section').hidden = ui.mode !== 'edit';
    if (source) {
      $('#export-source-time-example').textContent = source.rows[0][0];
      $('#export-source-thrust-example').textContent = source.rows[0][1];
    }
    $('#export-source-layout-note').hidden = !source || !!source.layout;
    $('#export-source-description').textContent = source?.layout
      ? 'All original columns, timestamps, headers and number formatting are retained.'
      : 'Time values are copied exactly from the imported file. Thrust keeps the original decimal format.';
    $('#export-read-source').lastChild.textContent = source && !source.layout ? 'Restore original CSV layout' : 'Use timings from another CSV';
    $('#export-dialog .modal-heading h2').textContent = ui.mode === 'create' ? 'Export preview' : 'Export profile';
    $('#export-name').value = profile.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'thrust-profile';
    render(); $('#export-dialog .export-modal-body').scrollTop = 0; $('#export-dialog').showModal();
  }

  for (const id of ['export-format-mode', 'export-scope', ...customControls]) {
    $(`#${id}`).addEventListener('change', () => { remember(); render(); });
  }
  $('#export').onclick = openExport;
  $('#export-form').onsubmit = event => {
    event.preventDefault();
    try {
      const profile = ctx.activeProfile(), { range } = selection(profile);
      const content = exportCSV(profile.points, {
        csvFormat: profile.csvFormat, formatMode: mode.value, range, includeHeader: !!profile.csvFormat,
        syntheticMarker: $('#export-synthetic-marker').checked,
        timeUnit: $('#export-time').value, thrustUnit: $('#export-thrust').value,
        delimiter: $('#export-delimiter').value === 'tab' ? '\t' : $('#export-delimiter').value,
        precision: Number($('#export-precision').value),
      });
      remember();
      downloadFile(`${$('#export-name').value.replace(/\.csv$/i, '')}.csv`, content, 'text/csv;charset=utf-8');
      $('#export-dialog').close(); ctx.notify('CSV exported.');
    } catch (error) { $('#export-error').textContent = error.message; $('#export-error').hidden = false; }
  };
  return { openExport };
}
