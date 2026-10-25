import { ProfileChart } from '../chart.js';
import { drawStroke } from '../draw-stroke.js';

export function createChartController(ctx) {
  const { $, ui, store } = ctx;
  let selecting = false;
  return new ProfileChart($('#profile-chart'), $('#overview'), {
    onView(view) { ui.view = view; ctx.render(); },
    onThrustView(view) { ui.thrustView = view; ctx.render(); },
    onCursor(time) {
      const points = ctx.activeProfile().points;
      let nearest = 0;
      for (let index = 1; index < points.length; index++) if (Math.abs(points[index].time - time) < Math.abs(points[nearest].time - time)) nearest = index;
      ui.playhead = points[nearest].time; ui.selectedSample = nearest; ctx.render();
    },
    onSelection(range, transient = false) {
      if (ui.mode !== 'edit') return;
      if (!selecting) { ctx.beforeEdit('selection'); store.begin('Select time range'); selecting = true; }
      store.edit('Select time range', project => { project.selection = range; project.scope = range ? 'selection' : 'all'; });
      if (!transient) { selecting = false; store.end(); }
    },
    onSelectionCancel() { selecting = false; store.cancel(); },
    onDrawStart() { if (ui.mode === 'edit') { ctx.beforeEdit('draw'); store.begin('Draw thrust'); } },
    onDraw(coords) {
      if (ui.mode !== 'edit') return;
      ui.playhead = coords.time;
      try { store.edit('Draw thrust', project => { project.points = drawStroke(project.points, coords, ctx.getRange()); project.curveEdit = null; }); }
      catch (error) { ctx.error(error); }
    },
    onDrawEnd(canceled) { if (ui.mode === 'edit') { canceled ? store.cancel() : store.end(); ctx.render(); } },
    onCurveStart({ index, time, thrust }) { return ctx.curve.pointerStart(index >= 0 ? index : null, time, thrust); },
    onCurveMove({ index, time, thrust }) { ctx.curve.pointerMove(index, time, thrust); },
    onCurveEnd(canceled) { ctx.curve.pointerEnd(canceled); },
    onMeasureStart({ index, time }) { return ctx.measurement.pointerStart(index >= 0 ? index : null, time); },
    onMeasureMove({ index, time }) { ctx.measurement.pointerMove(index, time); },
    onMeasureEnd(canceled) { ctx.measurement.pointerEnd(canceled); },
    onShiftStart({ time }) { ctx.shift.pointerStart(time); },
    onShiftMove({ time }) { ctx.shift.pointerMove(time); },
    onShiftEnd(canceled) { ctx.shift.pointerEnd(canceled); },
  });
}
