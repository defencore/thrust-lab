import { applyCapturedNoise, captureNoise } from './noise.js';
import { blendSelection } from './feather.js';

const MIN_SAMPLES = 7;
const MAX_NEIGHBOUR_SAMPLES = 200;

function validatePoints(points, label, signed = false) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  let previous = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || (!signed && point.thrust < 0) || point.time <= previous) {
      throw new Error(`${label} must contain finite values and strictly increasing timestamps.`);
    }
    previous = point.time;
  }
}

function validRange(points, range) {
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[1] <= range[0] || !Number.isFinite(range[1] - range[0])) {
    throw new Error('Choose an increasing target time range for noise matching.');
  }
  if (range[0] < points[0].time || range[1] > points.at(-1).time) throw new Error('The noise matching range must stay within the profile timeline.');
  return range;
}

function timeMean(points) {
  const duration = points.at(-1).time - points[0].time;
  let mean = 0;
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    mean += (right.time - left.time) / duration * (left.thrust / 2 + right.thrust / 2);
  }
  if (!Number.isFinite(mean)) throw new Error('The noise values are too large to match safely.');
  return mean;
}

function timeRms(points) {
  const maximum = points.reduce((peak, point) => Math.max(peak, Math.abs(point.thrust)), 0);
  if (!maximum) return 0;
  const duration = points.at(-1).time - points[0].time;
  let squareMean = 0;
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    squareMean += (right.time - left.time) / duration * ((left.thrust / maximum) ** 2 / 2 + (right.thrust / maximum) ** 2 / 2);
  }
  const rms = Math.sqrt(Math.max(0, squareMean)) * maximum;
  if (!Number.isFinite(rms)) throw new Error('The noise values are too large to match safely.');
  return rms;
}

/**
 * Replace a target's high-frequency residual with a recorded noise pattern.
 * The existing local trend, measurement times, and untouched samples are kept.
 */
export function matchNoise(points, reference, { range = null, window = 15, gain = 1, mode = 'repeat', transition = .15 } = {}) {
  validatePoints(points, 'Working profile');
  const target = validRange(points, range == null ? [points[0].time, points.at(-1).time] : range);
  if (!Number.isFinite(gain) || gain < 0) throw new Error('Noise matching gain must be a finite, nonnegative number.');
  if (!Number.isFinite(transition) || transition < 0 || transition > .5) throw new Error('Noise matching transition must be between 0 and 50 percent.');
  if (!['repeat', 'stretch'].includes(mode)) throw new Error('Choose repeat or stretch for noise matching.');
  if (!reference || !Array.isArray(reference.points)) throw new Error('Capture a noise source before matching the target.');
  validatePoints(reference.points, 'Noise reference', true);
  if (!Number.isFinite(reference.duration) || reference.duration <= 0 || reference.points[0].time !== 0 || reference.points.at(-1).time !== reference.duration) {
    throw new Error('The noise reference needs relative timestamps starting at zero and a positive duration.');
  }
  const indices = [];
  for (let index = 0; index < points.length; index += 1) if (points[index].time >= target[0] && points[index].time <= target[1]) indices.push(index);
  if (indices.length < MIN_SAMPLES) throw new Error('Select at least 7 measurements to match noise.');

  const before = captureNoise(points, points, target, { window });
  const trend = points.map(point => ({ ...point }));
  for (let selected = 0; selected < indices.length; selected += 1) {
    const index = indices[selected];
    trend[index].thrust -= before.points[selected].thrust;
  }
  // A second low-pass pass suppresses the small high-frequency response left
  // by a finite moving-average window before the reference noise is replayed.
  const lowestTrend = trend.reduce((minimum, point) => Math.min(minimum, point.thrust), 0);
  const trendCarrier = -lowestTrend;
  const positiveTrend = trend.map(point => ({ time: point.time, thrust: point.thrust + trendCarrier }));
  const remaining = captureNoise(positiveTrend, positiveTrend, target, { window });
  for (let selected = 0; selected < indices.length; selected += 1) trend[indices[selected]].thrust -= remaining.points[selected].thrust;
  const referenceMean = timeMean(reference.points);
  const centered = {
    ...reference,
    points: reference.points.map(point => ({ time: point.time, thrust: point.thrust - referenceMean })),
  };
  if (centered.points.some(point => !Number.isFinite(point.thrust))) throw new Error('The noise values are too large to match safely.');
  const sourceRms = timeRms(centered.points);
  const carrier = centered.points.reduce((peak, point) => Math.max(peak, Math.abs(point.thrust)), 0) * gain;
  if (!Number.isFinite(carrier)) throw new Error('Noise matching gain is too large for this source.');
  // A nonnegative carrier lets the shared replay helper retain signed noise.
  // Removing it afterward avoids prematurely clipping a low target trend.
  const replay = applyCapturedNoise(points.map(point => ({ time: point.time, thrust: carrier })), centered, { range: target, gain, mode });
  const sampledNoise = indices.map(index => ({ time: points[index].time, thrust: replay[index].thrust - carrier }));
  const sampledMean = timeMean(sampledNoise);
  const edited = points.map(point => ({ ...point }));
  for (let selected = 0; selected < indices.length; selected += 1) {
    const index = indices[selected];
    const thrust = Math.max(0, trend[index].thrust + sampledNoise[selected].thrust - sampledMean);
    if (!Number.isFinite(thrust)) throw new Error('The matched thrust values are outside the supported numeric range.');
    edited[index].thrust = thrust;
  }
  const result = blendSelection(points, edited, range, transition);
  const after = captureNoise(result, result, target, { window });
  return {
    points: result,
    report: { sourceRms, beforeRms: before.rms, afterRms: after.rms, gain, samples: indices.length },
  };
}

/** Find the closest unchanged recording interval before or after an edit. */
export function findAdjacentNoiseRange(points, original, targetRange, side = 'auto') {
  validatePoints(points, 'Working profile');
  if (!Array.isArray(original) || original.length < 2) return null;
  validatePoints(original, 'Original profile');
  const target = validRange(points, targetRange);
  if (!['auto', 'before', 'after'].includes(side)) throw new Error('Choose before, after, or automatic noise source selection.');
  if (points.length !== original.length || points.some((point, index) => point.time !== original[index].time)) return null;
  const candidates = [];
  let first = -1;
  function finish(last) {
    if (first < 0) return;
    if (last - first + 1 >= MIN_SAMPLES) {
      const before = points[last].time < target[0];
      const position = before ? 'before' : 'after';
      if (side === 'auto' || side === position) {
        const start = before ? Math.max(first, last - MAX_NEIGHBOUR_SAMPLES + 1) : first;
        const end = before ? last : Math.min(last, first + MAX_NEIGHBOUR_SAMPLES - 1);
        const distance = before ? target[0] - points[end].time : points[start].time - target[1];
        candidates.push({ range: [points[start].time, points[end].time], distance, count: end - start + 1, before });
      }
    }
    first = -1;
  }
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const outside = point.time < target[0] || point.time > target[1];
    if (outside && point.thrust === original[index].thrust) {
      // A range without sampled interior still splits before and after runs.
      if (first >= 0 && points[index - 1].time < target[0] && point.time > target[1]) finish(index - 1);
      if (first < 0) first = index;
    } else finish(index - 1);
  }
  finish(points.length - 1);
  candidates.sort((a, b) => a.distance - b.distance || b.count - a.count || Number(b.before) - Number(a.before));
  return candidates[0]?.range || null;
}
