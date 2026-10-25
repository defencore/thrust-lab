function validatePoints(points, label) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0) {
      throw new Error(`${label} must contain finite timestamps and nonnegative thrust.`);
    }
    if (index && point.time <= points[index - 1].time) throw new Error(`${label} timestamps must be strictly increasing.`);
  }
}

/** Blend a selected edit into untouched samples without moving measurement times. */
export function blendSelection(original, edited, range, feather = 0.15) {
  validatePoints(original, 'Original profile');
  validatePoints(edited, 'Edited profile');
  if (original.length !== edited.length || original.some((point, index) => point.time !== edited[index].time)) {
    throw new Error('Edge blending requires the same measurement timestamp sequence.');
  }
  if (!Number.isFinite(feather) || feather < 0 || feather > 0.5) throw new Error('Edge transition must be a finite fraction from 0 to 0.5.');
  if (range == null) return edited.map(point => ({ time: point.time, thrust: point.thrust }));
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[1] <= range[0] || !Number.isFinite(range[1] - range[0])) {
    throw new Error('The blending range must have a finite start before its end.');
  }
  const [start, end] = range;
  if (start < original[0].time || end > original.at(-1).time) throw new Error('The blending range must stay within the profile timeline.');
  const width = (end - start) * feather;
  return original.map((point, index) => {
    if (point.time < start || point.time > end) return { time: point.time, thrust: point.thrust };
    if (feather === 0) return { time: point.time, thrust: edited[index].thrust };
    // Exact endpoints remain untouched, including on very small time grids.
    if (point.time === start || point.time === end) return { time: point.time, thrust: point.thrust };
    const position = width === 0 ? 1 : Math.min(1, (point.time - start) / width, (end - point.time) / width);
    const alpha = position * position * (3 - 2 * position);
    const thrust = point.thrust + alpha * (edited[index].thrust - point.thrust);
    if (!Number.isFinite(thrust) || thrust < 0) throw new Error('The blended thrust must remain finite and nonnegative.');
    return { time: point.time, thrust };
  });
}
import { interpolate, transform } from './profile.js';


function areaInRange(points, start, end) {
  let previousTime = start;
  let previousThrust = interpolate(points, start);
  let area = 0;
  for (const point of points) {
    if (point.time <= start) continue;
    if (point.time >= end) break;
    area += (point.time - previousTime) * (previousThrust / 2 + point.thrust / 2);
    previousTime = point.time;
    previousThrust = point.thrust;
  }
  return area + (end - previousTime) * (previousThrust / 2 + interpolate(points, end) / 2);
}

/** Fit one proportional gain while preserving the selected edge transitions. */
export function fitWithFeather(points, { type, target, range = null, feather = 0.15 } = {}) {
  validatePoints(points, 'Working profile');
  if (!['fit-peak', 'fit-impulse'].includes(type)) throw new Error('Choose peak or impulse fitting for smooth edges.');
  if (!Number.isFinite(target) || target < 0) throw new Error('The fitting target must be finite and nonnegative.');
  if (!Number.isFinite(feather) || feather < 0 || feather > 0.5) throw new Error('Edge transition must be a finite fraction from 0 to 0.5.');
  if (range == null || feather === 0) return transform(points, { type, target, range });

  const minimum = blendSelection(points, transform(points, { type: 'scale', factor: 0, range }), range, feather);
  const selected = points.map((point, index) => point.time >= range[0] && point.time <= range[1] ? index : -1).filter(index => index >= 0);
  const measure = profile => type === 'fit-impulse'
    ? areaInRange(profile, range[0], range[1])
    : selected.reduce((peak, index) => Math.max(peak, profile[index].thrust), 0);
  const baseline = measure(minimum);
  const current = measure(points);
  if (!Number.isFinite(baseline) || !Number.isFinite(current)) throw new Error('The profile values are too large for a finite smooth fit.');
  const tolerance = Math.max(Number.MIN_VALUE, 64 * Number.EPSILON * Math.max(baseline, current, target));
  if (Math.abs(target - current) <= tolerance) return points.map(point => ({ time: point.time, thrust: point.thrust }));
  const impossible = type === 'fit-peak'
    ? 'The peak target cannot be reached while keeping the selection edges unchanged. Reduce the edge transition, widen the selection, or choose another target.'
    : 'The impulse target cannot be reached while keeping the selection edges unchanged. Reduce the edge transition, widen the selection, or choose another target.';
  if (target < baseline - tolerance) throw new Error(impossible);

  let factor;
  if (type === 'fit-impulse') {
    const adjustable = current - baseline;
    if (adjustable <= 0) {
      if (Math.abs(target - baseline) > tolerance) throw new Error(impossible);
      factor = 0;
    } else factor = Math.max(0, (target - baseline) / adjustable);
  } else {
    factor = Infinity;
    for (const index of selected) {
      const adjustable = points[index].thrust - minimum[index].thrust;
      if (adjustable > 0) factor = Math.min(factor, Math.max(0, (target - minimum[index].thrust) / adjustable));
    }
    if (factor === Infinity && Math.abs(target - baseline) <= tolerance) factor = 0;
  }
  if (!Number.isFinite(factor) || factor < 0) throw new Error(impossible);
  return points.map((point, index) => {
    const thrust = minimum[index].thrust + factor * (point.thrust - minimum[index].thrust);
    if (!Number.isFinite(thrust) || thrust < 0) throw new Error('The fitted thrust must remain finite and nonnegative.');
    return { time: point.time, thrust };
  });
}
