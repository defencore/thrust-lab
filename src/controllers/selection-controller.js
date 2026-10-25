/** Clear graph overlays without changing measurements or their timestamps. */
export function clearChartSelection(ctx) {
  ctx.chart.cancelDrag();
  ctx.fit?.deactivate();
  ctx.shift?.deactivate();
  ctx.signal.reset();
  ctx.curve.deactivate();
  ctx.measurement.clear();
  ctx.ui.selectedSample = null;
  ctx.ui.tool = 'select';
  if (ctx.ui.mode === 'edit' && ctx.store.get().selection) {
    ctx.store.edit('Clear selection', project => { project.selection = null; project.scope = 'all'; });
  }
  ctx.render();
}
