import { metrics, interpolate } from '../profile.js';
import { theoryShift } from '../alignment.js';
import { toDisplay } from '../units.js';
import { escape } from './dom.js';
import { icon } from './icons.js';

/** Render project facts independently of editing commands and numerical methods. */
export function createStudioView(ctx) {
  const { $, $$, ui, store, units } = ctx;
  function savedStatus() {
    const status = store.status();
    $('#save-status').textContent = { saved: 'Saved in this browser', pending: 'Saving changes…', unavailable: 'Export to keep your work · storage unavailable' }[status.saveStatus];
    $('.saved-dot').classList.toggle('unsaved', status.saveStatus !== 'saved');
    $('.saved-dot').title = $('#save-status').textContent;
  }
  function selection() {
    const p = store.get();
    const selected = p.scope === 'selection' && !!p.selection;
    $('#scope-all').classList.toggle('active', !selected);
    $('#scope-selection').classList.toggle('active', selected);
    $('#scope-all').setAttribute('aria-pressed', String(!selected));
    $('#scope-selection').setAttribute('aria-pressed', String(selected));
    $('#scope-selection').disabled = !p.selection;
    $('#selection-dot').hidden = !p.selection;
    $('#clear-selection').hidden = false;
    $('#clear-selection').disabled = !(ui.mode === 'edit' && (p.selection || ctx.curve.isActive || ui.selectedSample != null)) && !ui.measurementTimes?.length;
    $('#selection-summary').textContent = ui.mode === 'create' ? 'This preview is separate from your working profile.' : p.selection ? `${units.format(p.selection[0], 'time', 3)} — ${units.format(p.selection[1], 'time', 3)} ${units.symbol('time')} · ${units.format(p.selection[1] - p.selection[0], 'time', 3)} ${units.symbol('time')} selected` : 'Full profile';
    $('.timestamp-lock').hidden = ui.mode === 'create';
    const bounds = p.selection || [p.points[0].time, p.points.at(-1).time];
    units.set('range-start', bounds[0]); units.set('range-end', bounds[1]);
    $('#trim').disabled = !p.selection;
    const range = ctx.getRange() || [p.points[0].time, p.points.at(-1).time];
    $('#scope-stats').textContent = `${p.points.filter(point => point.time >= range[0] && point.time <= range[1]).length.toLocaleString('en-US')} samples in edit scope`;
    $('#fit-scope-note').textContent = selected ? 'Targets apply within the selected time range.' : 'Targets apply to the entire profile.';
    $('#impulse-target-label').childNodes[0].textContent = selected ? 'Selected impulse' : 'Impulse';
    $('#edit-feather').disabled = !selected;
    $('#feather-field').classList.toggle('muted-field', !selected);
  }
  function history() {
    if (ui.bottomTab !== 'history') return;
    const status = store.status();
    $('#history-panel').innerHTML = `<div class="history-heading"><span>${status.undoCount} undoable edits · ${status.redoCount} redoable</span><button class="button small" id="history-undo" ${status.canUndo ? '' : 'disabled'}>${icon('undo')}Undo last edit</button></div><ol class="history-list">${status.activity.map((event, index) => `<li><span class="history-dot ${index === 0 ? 'current' : ''}"></span><span>${escape(event.label)}</span><time>${new Date(event.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></li>`).join('')}</ol>`;
    $('#history-undo').onclick = ctx.undo;
  }
  function render() {
    ctx.measurement.reconcile();
    const p = store.get(), profile = ctx.activeProfile();
    const m = metrics(profile.points);
    for (const [id, key, dimension, digits] of [['impulse', 'impulse', 'impulse', 2], ['peak', 'peak', 'thrust', 2], ['burn', 'burnDuration', 'time', 3], ['average', 'burnAverage', 'thrust', 2]]) $(`#metric-${id}`).textContent = units.format(m[key], dimension, digits);
    $('#metric-class').textContent = `${m.samples.toLocaleString('en-US')} measurement points`;
    const peak = profile.points.reduce((a, b) => a.thrust > b.thrust ? a : b);
    $('#metric-peak-time').textContent = `at ${units.format(peak.time, 'time', 3)} ${units.symbol('time')}`;
    $('#chart-name').textContent = profile.name;
    $('#project-name').readOnly = ui.mode === 'create';
    if (document.activeElement !== $('#project-name')) $('#project-name').value = profile.name;
    const status = store.status();
    for (const id of ['undo', 'mobile-undo']) $(`#${id}`).disabled = ui.mode !== 'edit' || !status.canUndo;
    for (const id of ['redo', 'mobile-redo']) $(`#${id}`).disabled = ui.mode !== 'edit' || !status.canRedo;
    $('#sample-count').textContent = p.points.length.toLocaleString('en-US');
    $('#data-status').textContent = `${m.samples.toLocaleString('en-US')} samples · ${units.format(m.duration, 'time', 3)} ${units.symbol('time')} timeline · ${units.symbol('thrust')} / ${units.symbol('time')}`;
    $('#timeline-start').textContent = `${units.format(m.start, 'time', 3)} ${units.symbol('time')}`;
    $('#timeline-end').textContent = `${units.format(m.end, 'time', 3)} ${units.symbol('time')}`;
    for (const [id, property, data] of [['layer-theory', 'showTheory', 'theory'], ['theory-visible', 'showTheory', 'theory'], ['layer-original', 'showOriginal', 'original'], ['original-visible', 'showOriginal', 'original']]) {
      $(`#${id}`).checked = !!p[property]; $(`#${id}`).disabled = !p[data];
    }
    $('#theory-legend').hidden = !profile.theory || !profile.showTheory;
    $('#theory-legend').lastChild.textContent = ctx.fit.isActive ? 'Matched reference' : 'Theoretical';
    $('#theory-source').textContent = p.theory ? `${p.theory.length.toLocaleString('en-US')} points · reference overlay` : 'No reference loaded';
    for (const id of ['remove-theory', 'align-theory-start']) $(`#${id}`).disabled = !p.theory;
    $('#alignment-shift').textContent = `Applied theory shift: ${units.format(theoryShift(p.theory, profile.points, p.theoryAlignment), 'time', 3)} ${units.symbol('time')}`;
    units.set('theory-offset', p.theoryAlignment.offset);
    $('#theory-alignment').value = p.theoryAlignment.mode;
    $('#active-profile-name').textContent = p.name;
    $('#active-profile-meta').textContent = `${p.points.length.toLocaleString('en-US')} measurement points`;
    units.set('cursor-time', ui.playhead);
    $('#cursor-thrust').textContent = `${units.format(interpolate(profile.points, ui.playhead), 'thrust')} ${units.symbol('thrust')}`;
    $('#view-label').textContent = `${units.format(ui.view[0], 'time')} — ${units.format(ui.view[1], 'time')} ${units.symbol('time')}`;
    if (ui.thrustView) {
      const span = toDisplay(ui.thrustView[1] - ui.thrustView[0], 'thrust', units.get());
      const digits = Math.min(12, Math.max(0, Math.ceil(-Math.log10(span)) + 2));
      $('#thrust-scale-status').textContent = `${units.format(ui.thrustView[0], 'thrust', digits)} — ${units.format(ui.thrustView[1], 'thrust', digits)} ${units.symbol('thrust')}`;
      $('#thrust-scale-status').title = $('#thrust-scale-status').textContent;
    } else {
      $('#thrust-scale-status').textContent = 'Auto'; $('#thrust-scale-status').title = 'Visible thrust range';
    }
    $('#thrust-scale-status').classList.toggle('manual', !!ui.thrustView);
    $('#thrust-zoom-fit').disabled = ui.thrustView == null;
    $$('button[data-tool]').forEach(button => { button.classList.toggle('active', button.dataset.tool === profile.tool); button.setAttribute('aria-pressed', String(button.dataset.tool === profile.tool)); });
    $('#tool-caption').textContent = ui.tool === 'measure' ? 'Click two points or drag to measure time and thrust.' : ui.mode === 'create' ? 'Preview only · drag to pan' : { select: 'Drag to select a range', draw: 'Draw thrust · time marks stay fixed', curve: 'Click to add points · drag to shape the curve', shift: 'Drag left or right to shift thrust values along the fixed timeline.', pan: 'Drag to pan · scroll to zoom' }[ui.tool];
    selection(); savedStatus(); history();
    ctx.curve.reconcile(); ctx.shift.render(); ctx.signal.render(); ctx.fit.render(); ctx.generator.render(); ctx.samples.render(); ctx.measurement.render();
    ctx.chart.setState(ctx.chartState());
  }
  return { render, savedStatus };
}
