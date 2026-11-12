const maximumTicks = 500;

/** Offset labels only; profile timestamps remain in their original coordinates. */
export function relativeTime(valueSI, originSI = 0) {
  const origin = originSI ?? 0;
  if (!Number.isFinite(valueSI) || !Number.isFinite(origin)) throw new Error('Time labels need finite timestamps and a finite origin.');
  const value = valueSI - origin;
  if (!Number.isFinite(value)) throw new Error('The relative time is outside the supported numeric range.');
  return value === 0 ? 0 : value;
}

function niceStep(raw) {
  const value = Math.max(Number.MIN_VALUE, raw);
  const power = 10 ** Math.floor(Math.log10(value)) || Number.MIN_VALUE;
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    const step = Math.min(Number.MAX_VALUE, multiple * power);
    if (step >= value) return step;
  }
  return Number.MAX_VALUE;
}

/** Keep custom time lines aligned to the label origin, with bounded rendering work. */
export function timeTicks(view, { originSI = 0, stepSI: requestedStep = null, count = 8, width = 640, strict = true } = {}) {
  if (!Array.isArray(view) || view.length !== 2 || !view.every(Number.isFinite) || !(view[1] > view[0]) || !Number.isFinite(view[1] - view[0])) throw new Error('Time view needs a finite minimum below its maximum.');
  if (!Number.isInteger(count) || count < 1) throw new Error('Choose a positive whole number of axis intervals.');
  if (!Number.isFinite(width) || width <= 0) throw new Error('Time axis width must be finite and greater than zero.');
  const origin = originSI ?? 0;
  const start = relativeTime(view[0], origin), end = relativeTime(view[1], origin);
  const span = view[1] - view[0];
  const custom = requestedStep !== null;
  if (custom && (!Number.isFinite(requestedStep) || requestedStep <= 0)) throw new Error('Grid step must be finite and greater than zero.');
  const requestedCount = custom ? Math.ceil(span / requestedStep) + 1 : 0;
  const densityLimited = custom && requestedCount > maximumTicks;
  if (densityLimited && strict) {
    const error = new Error('Grid step is too small for this view. Zoom in or choose a larger step.');
    error.code = 'GRID_DENSITY'; error.minimumStepSI = span / (maximumTicks - 1);
    throw error;
  }
  const stride = densityLimited ? Math.ceil(requestedCount / maximumTicks) : 1;
  const intervals = Math.max(1, Math.min(maximumTicks - 1, count, Math.floor(span / Number.MIN_VALUE)));
  const stepSI = custom ? Number.isFinite(stride) ? Math.min(Number.MAX_VALUE, requestedStep * stride) : niceStep(span / (maximumTicks - 1)) : span / intervals;
  const valuesSI = [];
  if (custom) {
    const tolerance = Math.min(span / 1e8, Math.max(Math.abs(start), Math.abs(end), stepSI) * Number.EPSILON * 8);
    const remainder = start % stepSI;
    const advance = Math.abs(remainder) <= tolerance || Math.abs(Math.abs(remainder) - stepSI) <= tolerance ? 0 : remainder > 0 ? stepSI - remainder : -remainder;
    const first = start + advance;
    for (let index = 0; index < maximumTicks; index++) {
      const relative = first + index * stepSI;
      if (!Number.isFinite(relative) || relative > end + tolerance) break;
      const value = origin + relative;
      if (Number.isFinite(value) && value >= view[0] - tolerance && value <= view[1] + tolerance) {
        const bounded = Math.max(view[0], Math.min(view[1], value));
        if (!valuesSI.length || bounded > valuesSI.at(-1)) valuesSI.push(bounded === 0 ? 0 : bounded);
      }
    }
  } else {
    for (let index = 0; index <= intervals; index++) valuesSI.push(index === intervals ? view[1] : view[0] + span * (index / intervals));
  }
  const labelEvery = Math.max(1, Math.min(valuesSI.length, Math.ceil(Math.max(0, valuesSI.length - 1) * 64 / width)));
  return { valuesSI, stepSI, requestedStepSI: custom ? requestedStep : stepSI, originSI: origin, custom, densityLimited, labelEvery, labelStepSI: Math.min(Number.MAX_VALUE, stepSI * labelEvery) };
}
