import { inspectCSV, parseCSV, exportCSV, downloadFile, serializeProject, parseProject } from '../csv.js';
import { resolveImportPreferences } from '../preferences.js';
import { applyDraftToEditor, combineProfileTimings } from '../workspace.js';
import { escape } from '../ui/dom.js';

export function createFilesController(ctx) {
  const { $, preferences, store, ui } = ctx;
  let target = 'working';
  let imported = null;
  const settingsKey = kind => kind === 'theory' ? 'theory' : 'working';
  const headerOptions = () => $('#csv-header').value === 'auto' ? {} : { hasHeader: $('#csv-header').value === 'yes' };
  function remember() {
    if (!imported?.headers) return;
    const column = id => { const index = Number($(id).value); return imported.headers[index] === undefined ? null : { name: imported.headers[index], index }; };
    preferences.update({ imports: { [settingsKey(imported.target)]: { header: $('#csv-header').value, timeUnit: $('#csv-time-unit').value, thrustUnit: $('#csv-thrust-unit').value, timeColumn: column('#csv-time-column'), thrustColumn: column('#csv-thrust-column') } } });
  }
  function preview(inspected) {
    imported.headers = inspected.headers;
    const restored = resolveImportPreferences(inspected.headers, preferences.get().imports[settingsKey(imported.target)]);
    for (const id of ['#csv-time-column', '#csv-thrust-column']) $(id).innerHTML = inspected.headers.map((header, index) => `<option value="${index}">${escape(header)}</option>`).join('');
    $('#csv-time-column').value = restored.timeColumn; $('#csv-thrust-column').value = restored.thrustColumn;
    $('#csv-time-unit').value = restored.timeUnit; $('#csv-thrust-unit').value = restored.thrustUnit;
    $('#csv-preview').innerHTML = `<table class="data-table"><thead><tr>${inspected.headers.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${inspected.preview.map(row => `<tr>${row.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  $('#import').onclick = () => { target = 'working'; $('#csv-file').click(); };
  $('#import-another').onclick = () => $('#import').click();
  $('#import-theory').onclick = () => { target = 'theory'; $('#csv-file').click(); };
  function chooseTimings() {
    if (ui.mode !== 'edit' || ui.screen === 'analyzer') return;
    target = 'timing'; $('#csv-file').click();
  }
  $('#export-read-source').onclick = chooseTimings;
  $('#combine-timings').onclick = chooseTimings;
  $('#csv-file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 20_000_000) throw new Error('CSV files must be smaller than 20 MB.');
      const text = await file.text();
      const saved = preferences.get().imports[settingsKey(target)];
      $('#csv-header').value = saved.header;
      const inspected = inspectCSV(text, headerOptions());
      imported = { text, name: file.name, target };
      $('#import-heading').textContent = target === 'timing' ? 'Import timestamp source' : target === 'theory' ? 'Import theoretical profile' : 'Import working profile';
      $('#import-form button[type="submit"]').childNodes[0].textContent = target === 'timing' ? 'Use these timestamps' : 'Import profile';
      $('#import-filename').textContent = `${file.name} · ${inspected.headers.length} columns`;
      $('#timing-import-note').hidden = target !== 'timing';
      preview(inspected);
      $('#import-settings-note').hidden = !saved.timeColumn && !saved.thrustColumn && saved.timeUnit === 'auto' && saved.thrustUnit === 'auto' && saved.header === 'auto';
      $('#export-dialog').close(); $('#import-error').hidden = true; $('#import-dialog').showModal();
    } catch (error) { ctx.error(error); }
    event.target.value = '';
  };
  $('#csv-header').onchange = () => {
    try {
      preferences.update({ imports: { [settingsKey(imported.target)]: { header: $('#csv-header').value } } });
      preview(inspectCSV(imported.text, headerOptions())); $('#import-error').hidden = true;
    } catch (error) { $('#import-error').textContent = error.message; $('#import-error').hidden = false; }
  };
  $('#import-form').addEventListener('change', remember);
  $('#import-form').onsubmit = event => {
    event.preventDefault();
    if (!imported) return;
    try {
      const result = parseCSV(imported.text, { ...headerOptions(), timeColumn: Number($('#csv-time-column').value), thrustColumn: Number($('#csv-thrust-column').value), timeUnit: $('#csv-time-unit').value, thrustUnit: $('#csv-thrust-unit').value });
      if (imported.target === 'timing') {
        const combined = combineProfileTimings(store.get(), result);
        remember(); ctx.beforeEdit('import'); ctx.setMode('edit');
        store.replace('Timings and original CSV format restored', combined);
        ctx.signal.resetSource(); ctx.samples.reset(); ctx.fitView();
        $('#import-dialog').close(); openExport();
        ctx.notify('Timings and original CSV format restored');
        return;
      }
      remember(); ctx.beforeEdit('import'); ctx.setMode('edit');
      store.edit(imported.target === 'theory' ? 'Import theoretical CSV' : 'Import working CSV', project => {
        if (imported.target === 'theory') { project.theory = result.points; project.showTheory = true; }
        else {
          project.points = result.points; project.original = structuredClone(result.points); project.curveEdit = null;
          project.csvFormat = result.csvFormat;
          project.selection = null; project.scope = 'all'; project.name = imported.name.replace(/\.[^.]+$/, '');
        }
      });
      if (imported.target === 'working') { ctx.signal.resetSource(); ctx.samples.reset(); ctx.fitView(); }
      $('#import-dialog').close();
      if (result.warnings.length) ctx.notify(result.warnings.join(' '));
    } catch (error) { $('#import-error').textContent = error.message; $('#import-error').hidden = false; }
  };
  function openExport() {
    if (ui.screen === 'analyzer') return;
    const profile = ctx.activeProfile();
    const source = profile.csvFormat;
    $('#export-read-source-section').hidden = ui.mode !== 'edit';
    $('#export-source-format').hidden = !source;
    $('#export-custom-format').hidden = !!source;
    if (source) {
      $('#export-source-time-example').textContent = source.rows[0][0];
      $('#export-source-thrust-example').textContent = source.rows[0][1];
    }
    $('#export-dialog .modal-heading h2').textContent = ui.mode === 'create' ? 'Export preview' : 'Export profile';
    $('#export-name').value = profile.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'thrust-profile';
    $('#export-summary').textContent = `Exports all ${profile.points.length.toLocaleString('en-US')} measurements. Your entire timestamp sequence is retained.`;
    $('#export-error').hidden = true;
    $('#export-dialog').showModal();
  }
  $('#export').onclick = openExport;
  $('#export-form').onsubmit = event => {
    event.preventDefault();
    try {
      const profile = ctx.activeProfile();
      const content = exportCSV(profile.points, { csvFormat: profile.csvFormat, timeUnit: $('#export-time').value, thrustUnit: $('#export-thrust').value, delimiter: $('#export-delimiter').value === 'tab' ? '\t' : $('#export-delimiter').value, precision: Number($('#export-precision').value) });
      downloadFile(`${$('#export-name').value.replace(/\.csv$/i, '')}.csv`, content, 'text/csv;charset=utf-8');
      $('#export-dialog').close(); ctx.notify('CSV exported with all measurement timestamps.');
    } catch (error) { $('#export-error').textContent = error.message; $('#export-error').hidden = false; }
  };
  $('#save-project').onclick = () => {
    try {
      const project = ui.mode === 'create' ? applyDraftToEditor(store.get(), ctx.generator.getDraft()) : store.get();
      downloadFile(`${$('#export-name').value || 'thrust-profile'}.thrustlab.json`, serializeProject(project, { syntheticMarker: true }), 'application/json');
      $('#export-dialog').close(); ctx.notify('Project saved.');
    } catch (error) { $('#export-error').textContent = error.message; $('#export-error').hidden = false; }
  };
  $('#open-project').onclick = () => $('#project-file').click();
  $('#project-file').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 20_000_000) throw new Error('Projects must be smaller than 20 MB.');
      const project = parseProject(await file.text());
      project.original ||= structuredClone(project.points);
      ctx.beforeEdit('open'); ctx.setMode('edit'); store.replace('Open project', project);
      ctx.signal.resetSource(); ctx.samples.reset(); ctx.fitView();
    } catch (error) { ctx.error(error); }
    event.target.value = '';
  };
  return { openExport };
}
