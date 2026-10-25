import { measurementAt, measureProfile } from '../measurement.js';

/** Keep chart rulers in UI state without changing the working profile or its history. */
export function createMeasurementController(ctx) {
  const { $, ui, units } = ctx;
  ui.measurementTimes = [];
  let gesture = null;
  const input = index => $(`#measure-time-${index === 0 ? 'a' : 'b'}`);
  const points = () => ctx.activeProfile().points;
  const snap = time => measurementAt(points(), time).time;
  const normalize = times => times.slice(0, 2).filter(Number.isFinite).map(snap);
  const focused = element => element.ownerDocument?.activeElement === element;

  function chartState() { return measureProfile(points(), ui.measurementTimes); }

  function reconcile() {
    ui.measurementTimes = normalize(Array.isArray(ui.measurementTimes) ? ui.measurementTimes : []);
    if (gesture) gesture.before = normalize(gesture.before);
  }

  function refresh() { ctx.render(); }

  function pointerStart(index, time) {
    if (!Number.isFinite(time)) return null;
    try {
      reconcile();
      if (index != null && (!Number.isInteger(index) || index < 0 || index > 1 || ui.measurementTimes[index] === undefined)) return null;
      if (gesture) pointerEnd(false);
      const before = [...ui.measurementTimes];
      if (index != null) {
        gesture = { kind: 'marker', index, before };
      } else if (ui.measurementTimes.length === 1) {
        ui.measurementTimes = [ui.measurementTimes[0], snap(time)];
        index = 1;
        gesture = { kind: 'marker', index, before };
      } else {
        ui.measurementTimes = [snap(time)];
        index = 0;
        gesture = { kind: 'new-pair', before, hasB: false };
      }
      refresh();
      return index;
    } catch (error) { ctx.error(error); return null; }
  }

  function pointerMove(_index, time) {
    if (!gesture || !Number.isFinite(time)) return;
    try {
      const next = snap(time);
      if (gesture.kind === 'new-pair') {
        if (next !== ui.measurementTimes[0]) gesture.hasB = true;
        if (gesture.hasB) ui.measurementTimes = [ui.measurementTimes[0], next];
      } else ui.measurementTimes[gesture.index] = next;
      refresh();
    } catch (error) { ctx.error(error); }
  }

  function pointerEnd(cancelled = false) {
    if (!gesture) return;
    if (cancelled) ui.measurementTimes = [...gesture.before];
    gesture = null;
    refresh();
  }

  function clear() {
    gesture = null;
    ui.measurementTimes = [];
    for (const index of [0, 1]) { input(index).value = ''; valid(input(index), true); }
    refresh();
  }

  function valid(element, value) {
    element.classList?.toggle('input-error', !value);
    element.setAttribute?.('aria-invalid', String(!value));
  }

  function render() {
    const state = chartState();
    $('#measurement-panel').hidden = !state.a && ui.tool !== 'measure';
    $('#measurement-empty').hidden = !!state.a;
    const force = point => point ? `${units.format(point.thrust, 'thrust', 3)} ${units.symbol('thrust')}` : '—';
    $('#measure-a-thrust').textContent = force(state.a);
    $('#measure-b-thrust').textContent = force(state.b);
    $('#measure-delta-time').textContent = state.deltaTime == null ? '—' : `${units.format(state.deltaTime, 'time', 3)} ${units.symbol('time')}`;
    $('#measure-delta-thrust').textContent = state.deltaThrust == null ? '—' : `${units.format(state.deltaThrust, 'thrust', 3)} ${units.symbol('thrust')}`;
    $('#clear-measurement').disabled = !state.a;
    for (const [index, marker] of [state.a, state.b].entries()) {
      const field = input(index);
      field.disabled = index === 1 && !state.a;
      if (!focused(field)) {
        if (marker) units.set(`measure-time-${index === 0 ? 'a' : 'b'}`, marker.time, { precision: 15 });
        else field.value = '';
        valid(field, true);
      }
    }
  }

  for (const index of [0, 1]) {
    const field = input(index);
    field.addEventListener('input', () => {
      if (index === 1 && !ui.measurementTimes.length) return;
      try {
        const value = field.value.trim() ? units.read(`measure-time-${index === 0 ? 'a' : 'b'}`) : NaN;
        valid(field, Number.isFinite(value));
        if (!Number.isFinite(value)) return;
        gesture = null;
        const time = snap(value);
        if (index === 0 && !ui.measurementTimes.length) ui.measurementTimes = [time];
        else ui.measurementTimes[index] = time;
        refresh();
      } catch (error) { valid(field, false); ctx.error(error); }
    });
    field.addEventListener('blur', render);
  }
  $('#clear-measurement').onclick = clear;

  return { pointerStart, pointerMove, pointerEnd, clear, render, reconcile, chartState };
}
