import { clamp } from '../ui/dom.js';

export function bindNavigation(ctx) {
  const { $, $$, ui, store, units } = ctx;
  for (const id of ['new-profile', 'mode-create']) $(`#${id}`).onclick = () => ctx.setMode('create');
  for (const id of ['mode-edit', 'return-editor']) $(`#${id}`).onclick = () => ctx.setMode('edit');
  $$('button[data-tool]').forEach(button => button.onclick = () => ctx.setTool(button.dataset.tool));
  $$('[data-bottom]').forEach(button => button.onclick = () => ctx.setBottom(button.dataset.bottom));
  $$('[data-inspector]').forEach(button => button.onclick = () => {
    ctx.setInspector(button.dataset.inspector);
    if (button.dataset.inspector === 'curve') ctx.curve.activate();
  });
  $('#scope-all').onclick = () => ctx.edit('Edit entire profile', project => { project.scope = 'all'; });
  $('#scope-selection').onclick = () => { if (store.get().selection) ctx.edit('Edit selected range', project => { project.scope = 'selection'; }); };
  $('#clear-selection').onclick = ctx.clearSelection;
  $('#open-theory-fit').onclick = () => { ctx.setInspector('theory'); $('#tf-start').focus(); };
  for (const id of ['range-start', 'range-end']) $(`#${id}`).oninput = () => {
    const start = units.read('range-start'), end = units.read('range-end'), p = store.get();
    const valid = Number.isFinite(start) && Number.isFinite(end) && start < end && start >= p.points[0].time && end <= p.points.at(-1).time;
    $(`#${id}`).classList.toggle('input-error', !valid);
    if (valid) ctx.edit('Select time range', project => { project.selection = [start, end]; project.scope = 'selection'; }, { key: 'selection' });
  };
  $('#cursor-time').oninput = () => {
    const profile = ctx.activeProfile(), time = units.read('cursor-time');
    if (!Number.isFinite(time)) return;
    ui.playhead = clamp(time, profile.points[0].time, profile.points.at(-1).time); ctx.render();
  };
  $('#project-name').oninput = event => {
    if (ui.mode === 'edit' && event.target.value.trim()) ctx.edit('Rename profile', project => { project.name = event.target.value.trim(); }, { key: 'name' });
  };
  $('#undo').onclick = ctx.undo;
  $('#redo').onclick = ctx.redo;
  $('#mobile-undo').onclick = ctx.undo;
  $('#mobile-redo').onclick = ctx.redo;
  $('#zoom-in').onclick = () => ctx.chart.zoom(1 / 1.5);
  $('#zoom-out').onclick = () => ctx.chart.zoom(1.5);
  $('#zoom-fit').onclick = ctx.fitView;
  $('#thrust-zoom-in').onclick = () => ctx.chart.zoomThrust(1 / 1.5);
  $('#thrust-zoom-out').onclick = () => ctx.chart.zoomThrust(1.5);
  $('#thrust-zoom-fit').onclick = () => ctx.chart.fitThrust();
  $('#focus-editor').onclick = () => {
    ctx.preferences.update({ focus: !document.body.classList.contains('focus-mode') }); ctx.setMode(ui.mode);
  };
  $('#guide').onclick = $('#catalog-info').onclick = $('#mobile-guide').onclick = () => $('#guide-dialog').showModal();
  $$('[data-close]').forEach(button => button.onclick = () => $(`#${button.dataset.close}`).close());
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }));
  document.addEventListener('keydown', event => {
    const command = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
    if ($$('dialog').some(dialog => dialog.open)) return;
    const editing = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable;
    if (command && key === 's') { event.preventDefault(); ctx.files.openExport(); return; }
    if (key === 'escape') { event.preventDefault(); if (editing) event.target.blur(); ctx.clearSelection(); return; }
    if (editing) return;
    if (command && key === 'z') { event.preventDefault(); event.shiftKey ? ctx.redo() : ctx.undo(); }
    else if (command && key === 'y') { event.preventDefault(); ctx.redo(); }
    else if (!command && ['v', 'd', 'c', 'h', 'm', 'g'].includes(key)) { event.preventDefault(); ctx.setTool({ v: 'select', d: 'draw', c: 'curve', h: 'pan', m: 'measure', g: 'shift' }[key]); }
    else if (key === 'f') { event.preventDefault(); ctx.fitView(); }
    else if (['delete', 'backspace'].includes(key) && ctx.curve.isActive) { event.preventDefault(); $('#curve-remove').click(); }
    else if (['arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault(); const p = ctx.activeProfile();
      const dt = (p.points.at(-1).time - p.points[0].time) / (p.points.length - 1);
      ui.playhead = clamp(ui.playhead + (key === 'arrowleft' ? -1 : 1) * dt * (event.shiftKey ? 10 : 1), p.points[0].time, p.points.at(-1).time); ctx.render();
    }
  });
}
