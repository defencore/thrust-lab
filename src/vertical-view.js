import { unitFactor } from './units.js';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const capped = value => Math.min(Number.MAX_VALUE, value);

function validateView(view, label = 'Vertical view') {
  if (!Array.isArray(view) || view.length !== 2 || !view.every(Number.isFinite) || view[0] < 0 || !(view[1] > view[0]) || !Number.isFinite(view[1] - view[0])) throw new Error(`${label} needs a finite nonnegative minimum below its maximum.`);
  return view[1] - view[0];
}

function niceStep(raw) {
  const value = Math.max(Number.MIN_VALUE, raw);
  const power = 10 ** Math.floor(Math.log10(value)) || Number.MIN_VALUE;
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    const step = capped(multiple * power);
    if (step >= value) return step;
  }
  return Number.MAX_VALUE;
}

/** Choose the familiar automatic force scale in the selected display unit. */
export function defaultThrustView(peak, units) {
  if (!Number.isFinite(peak) || peak < 0) throw new Error('The visible peak thrust must be finite and nonnegative.');
  const factor = unitFactor('thrust', units);
  const target = capped((peak || 1) * 1.12) / factor;
  const step = niceStep(target / 5);
  const rounded = Math.min(Number.MAX_VALUE / factor, Math.ceil(target / step) * step);
  const maximum = Math.max(peak, capped(rounded * factor));
  if (!(maximum > 0) || !Number.isFinite(maximum)) throw new Error('The automatic thrust view is outside the supported numeric range.');
  return [0, maximum];
}

/** Make a bounded set of nice force ticks while retaining their canonical SI values. */
export function axisTicks(view, units, count = 5) {
  const span = validateView(view);
  if (!Number.isInteger(count) || count < 1) throw new Error('Choose a positive whole number of axis intervals.');
  const factor = unitFactor('thrust', units);
  const stepDisplay = niceStep(span / factor / Math.min(10, count));
  const stepSI = capped(stepDisplay * factor);
  const precision = clamp(Math.ceil(-Math.log10(stepDisplay)) + 2, 0, 12);
  const firstIndex = Math.ceil(view[0] / stepSI);
  const first = firstIndex * stepSI;
  const tolerance = Math.min(span / 1e8, Math.max(Math.abs(view[0]), Math.abs(view[1])) * Number.EPSILON * 8);
  const valuesSI = [];
  for (let index = 0; index < 12; index++) {
    const value = first + index * stepSI;
    if (!Number.isFinite(value) || value > view[1] + tolerance) break;
    if (value >= view[0] - tolerance && (!valuesSI.length || value > valuesSI.at(-1))) valuesSI.push(value === 0 ? 0 : value);
  }
  return { valuesSI, stepSI, precision };
}

function limits(extent) {
  const span = validateView(extent, 'Automatic thrust extent');
  const maximumSpan = capped(span * 20);
  return { minimumSpan: Math.max(Number.MIN_VALUE, span / 1000), maximumSpan, ceiling: Math.max(extent[1], maximumSpan) };
}

function fit(start, span, ceiling) {
  const minimum = clamp(start, 0, Math.max(0, ceiling - span));
  const maximum = minimum + span;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !(maximum > minimum)) throw new Error('The vertical view spacing is outside the supported numeric range.');
  return [minimum, maximum];
}

/** Zoom only the force viewport; a zero anchor keeps the usual thrust baseline fixed. */
export function zoomVerticalView(view, factor, { anchor = 0, extent = view } = {}) {
  const previousSpan = validateView(view);
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('Vertical zoom needs a finite positive factor.');
  if (anchor === null) anchor = view[0] + previousSpan / 2;
  if (!Number.isFinite(anchor)) throw new Error('The vertical zoom anchor must be finite.');
  const { minimumSpan, maximumSpan, ceiling } = limits(extent);
  const span = clamp(previousSpan * factor, minimumSpan, maximumSpan);
  const scale = span / previousSpan;
  const start = anchor === view[0] ? view[0] : anchor + (view[0] - anchor) * scale;
  return fit(start, span, ceiling);
}

/** Shift a force viewport without changing its width or recording samples. */
export function panVerticalView(view, shift, { extent = view } = {}) {
  const span = validateView(view);
  if (!Number.isFinite(shift)) throw new Error('Vertical pan needs a finite force shift.');
  const { ceiling } = limits(extent);
  if (span > ceiling) throw new Error('The vertical view is wider than the supported thrust extent.');
  return fit(view[0] + shift, span, ceiling);
}
