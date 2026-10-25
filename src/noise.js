import { interpolate } from './profile.js';

const MIN_SOURCE_SAMPLES = 7;

function validatePoints(points, label, signed = false) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || (!signed && point.thrust < 0)) {
      throw new Error(`${label} must contain finite timestamps and ${signed ? '' : 'nonnegative '}values.`);
    }
    if (index && point.time <= points[index - 1].time) throw new Error(`${label} timestamps must be strictly increasing.`);
  }
}

function matchingTimeline(points, original) {
  return points.length === original.length && points.every((point, index) => point.time === original[index].time);
}

function validRange(points, range, label) {
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[1] <= range[0]) {
    throw new Error(`${label} must be a time range with a start before its end.`);
  }
  if (range[0] < points[0].time || range[1] > points.at(-1).time) throw new Error(`${label} must stay within the profile timeline.`);
  return range;
}

/** Find the longest unchanged time interval outside an optional target range. */
export function findUneditedRange(points, original, excludeRange = null, minSamples = MIN_SOURCE_SAMPLES) {
  if (!Array.isArray(original) || original.length < 2 || !Array.isArray(points) || points.length < 2) return null;
  validatePoints(points, 'Working profile');
  validatePoints(original, 'Original profile');
  if (!Number.isInteger(minSamples) || minSamples < 2) throw new Error('The source sample minimum must be a whole number of at least two.');
  if (excludeRange) validRange(points, excludeRange, 'Excluded range');
  if (!matchingTimeline(points, original)) return null;
  let first = -1;
  let best = null;
  let bestCount = 0;
  function finish(last) {
    if (first < 0) return;
    const count = last - first + 1;
    const range = [points[first].time, points[last].time];
    if (count >= minSamples && (!best || range[1] - range[0] > best[1] - best[0] || (range[1] - range[0] === best[1] - best[0] && count > bestCount))) {
      best = range;
      bestCount = count;
    }
    first = -1;
  }
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const excluded = excludeRange && point.time >= excludeRange[0] && point.time <= excludeRange[1];
    if (!excluded && point.thrust === original[index].thrust) {
      if (first < 0) first = index;
    } else finish(index - 1);
  }
  finish(points.length - 1);
  return best;
}

function integrate(points, squared = false) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    const a = squared ? left.thrust ** 2 : left.thrust;
    const b = squared ? right.thrust ** 2 : right.thrust;
    total += (right.time - left.time) * (a / 2 + b / 2);
  }
  return total;
}

/**
 * Extract high-frequency residuals from unchanged measurements. A centered
 * local linear moving average avoids inventing noise on slopes and at edges,
 * including on irregular timestamp grids. The residual has zero time mean.
 */
export function captureNoise(points, original, range, { window = 9 } = {}) {
  validatePoints(points, 'Working profile');
  validatePoints(original, 'Original profile');
  if (!matchingTimeline(points, original)) throw new Error('Noise capture requires the original measurement timestamp sequence.');
  validRange(points, range, 'Noise source');
  if (!Number.isInteger(window) || window < 3 || window > 1001 || window % 2 !== 1) throw new Error('The noise extraction window must be an odd whole number from 3 to 1001.');
  const source = points.filter(point => point.time >= range[0] && point.time <= range[1]);
  if (source.length < MIN_SOURCE_SAMPLES) throw new Error(`Select at least ${MIN_SOURCE_SAMPLES} unchanged measurements to capture noise.`);
  for (let index = 0; index < points.length; index += 1) {
    if (points[index].time >= range[0] && points[index].time <= range[1] && points[index].thrust !== original[index].thrust) {
      throw new Error('The noise source contains edited measurements. Select an unchanged range or use automatic source detection.');
    }
  }
  const radius = Math.floor(window / 2);
  const start = source[0].time;
  const duration = source.at(-1).time - start;
  const residuals = source.map((point, index) => {
    const from = Math.max(0, index - radius);
    const to = Math.min(source.length - 1, index + radius);
    const span = source[to].time - source[from].time;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;
    for (let neighbor = from; neighbor <= to; neighbor += 1) {
      const x = (source[neighbor].time - point.time) / span;
      const y = source[neighbor].thrust;
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumXY += x * y;
    }
    const count = to - from + 1;
    const denominator = count * sumXX - sumX * sumX;
    const baseline = denominator > Number.EPSILON ? (sumY * sumXX - sumX * sumXY) / denominator : sumY / count;
    return { time: point.time - start, thrust: point.thrust - baseline };
  });
  const mean = integrate(residuals) / duration;
  for (const point of residuals) point.thrust -= mean;
  const rms = Math.sqrt(Math.max(0, integrate(residuals, true) / duration));
  const peak = residuals.reduce((maximum, point) => Math.max(maximum, Math.abs(point.thrust)), 0);
  if (!Number.isFinite(rms) || !Number.isFinite(peak)) throw new Error('The selected values are too large to extract a finite noise signal.');
  return { points: residuals, range: [start, source.at(-1).time], rms, peak, samples: source.length, duration };
}

/** Add a captured signal to existing samples without changing any timestamps. */
export function applyCapturedNoise(points, noise, { range = null, gain = 1, mode = 'repeat' } = {}) {
  validatePoints(points, 'Working profile');
  if (!noise || !Array.isArray(noise.points)) throw new Error('Capture noise from an unchanged source range first.');
  validatePoints(noise.points, 'Captured noise', true);
  if (!Number.isFinite(noise.duration) || noise.duration <= 0 || noise.points[0].time !== 0 || noise.points.at(-1).time !== noise.duration) {
    throw new Error('Captured noise must have a positive duration and relative timestamps starting at zero.');
  }
  if (!Number.isFinite(gain) || gain < 0) throw new Error('Noise gain must be a finite, nonnegative number.');
  if (!['repeat', 'stretch'].includes(mode)) throw new Error('Choose repeat or stretch for captured noise.');
  const target = range ? validRange(points, range, 'Noise target') : [points[0].time, points.at(-1).time];
  if (!points.some(point => point.time >= target[0] && point.time <= target[1])) throw new Error('The target range contains no measurement samples.');
  const steps = noise.points.slice(1).map((point, index) => point.time - noise.points[index].time).sort((a, b) => a - b);
  const typicalStep = steps[Math.floor(steps.length / 2)];
  const seamWidth = Math.min(noise.duration * 0.1, typicalStep * 2);
  const seamValue = (noise.points[0].thrust + noise.points.at(-1).thrust) / 2;
  const repeatValue = (time) => {
    const phase = ((time % noise.duration) + noise.duration) % noise.duration;
    const value = interpolate(noise.points, phase);
    if (phase < seamWidth) return seamValue + (value - seamValue) * phase / seamWidth;
    if (phase > noise.duration - seamWidth) return seamValue + (value - seamValue) * (noise.duration - phase) / seamWidth;
    return value;
  };
  return points.map(point => {
    if (point.time < target[0] || point.time > target[1]) return { ...point };
    const relative = point.time - target[0];
    const residual = mode === 'repeat' ? repeatValue(relative) : interpolate(noise.points, relative / (target[1] - target[0]) * noise.duration);
    const thrust = Math.max(0, point.thrust + residual * gain);
    if (!Number.isFinite(thrust)) throw new Error('Noise gain is too large for these measurements.');
    return { time: point.time, thrust };
  });
}
