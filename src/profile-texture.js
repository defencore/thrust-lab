import { captureNoise, applyCapturedNoise } from './noise.js';
import { metrics } from './profile.js';

const clonePoints = points => points.map(point => ({ time: point.time, thrust: point.thrust }));
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function validate(points, label) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  let previous = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || point.time <= previous) throw new Error(`${label} needs finite, nonnegative measurements and increasing timestamps.`);
    previous = point.time;
  }
  if (!Number.isFinite(points.at(-1).time - points[0].time)) throw new Error(`${label} duration is outside the supported numeric range.`);
}

function windowSize(window) {
  if (!Number.isInteger(window) || window < 3 || window > 1001 || window % 2 !== 1) throw new Error('The texture window must be an odd whole number from 3 to 1001.');
}

function bounds(points, range) {
  const result = range ?? [points[0].time, points.at(-1).time];
  if (!Array.isArray(result) || result.length !== 2 || !result.every(Number.isFinite) || result[0] >= result[1] || !Number.isFinite(result[1] - result[0]) || result[0] < points[0].time || result[1] > points.at(-1).time) throw new Error('The texture range must stay within the recording timeline.');
  return result;
}

function burn(points) {
  const result = metrics(points);
  const threshold = result.peak * .05;
  const first = result.peak ? points.findIndex(point => point.thrust >= threshold) : 0;
  let last = result.peak ? points.length - 1 : 0;
  if (result.peak) while (points[last].thrust < threshold) last--;
  return { first, last, threshold, stats: result };
}

/** Extract reusable texture directly from the immutable recording, including after edits. */
export function textureFromOriginal(original, { range = null, window = 15 } = {}) {
  validate(original, 'Original recording'); windowSize(window);
  if (original.length < 7) throw new Error('At least 7 original measurements are needed for recorded texture.');
  let source = range;
  if (source == null) {
    const { first, last, stats } = burn(original);
    const span = stats.burnEnd - stats.burnStart;
    const central = [stats.burnStart + span * .15, stats.burnEnd - span * .15];
    const active = [original[first].time, original[last].time];
    const candidates = [central, active, [original[0].time, original.at(-1).time]];
    source = candidates.find(candidate => candidate[1] > candidate[0] && original.filter(point => point.time >= candidate[0] && point.time <= candidate[1]).length >= 7);
  }
  return captureNoise(original, original, bounds(original, source), { window });
}

function weights(points) {
  const duration = points.at(-1).time - points[0].time;
  return points.map((point, index) => ((index ? (point.time - points[index - 1].time) / duration : 0) + (index < points.length - 1 ? (points[index + 1].time - point.time) / duration : 0)) / 2);
}

function weightedSum(values, timeWeights) {
  let sum = 0, compensation = 0;
  for (let index = 0; index < values.length; index++) {
    const term = values[index] * timeWeights[index] - compensation;
    const next = sum + term;
    compensation = (next - sum) - term;
    sum = next;
  }
  return sum;
}

function rms(values, timeWeights) {
  const peak = values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  if (!peak) return 0;
  return Math.sqrt(Math.max(0, weightedSum(values.map(value => (value / peak) ** 2), timeWeights))) * peak;
}

function activeRms(points, values, start, end) {
  const duration = end - start;
  const scale = values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  if (!scale || !(duration > 0)) return 0;
  let squareMean = 0;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1].time, right = points[index].time;
    const from = Math.max(left, start), to = Math.min(right, end);
    if (to <= from) continue;
    const a = values[index - 1] / scale, b = values[index] / scale;
    const first = a * (1 - (from - left) / (right - left)) + b * ((from - left) / (right - left));
    const last = a * (1 - (to - left) / (right - left)) + b * ((to - left) / (right - left));
    squareMean += (to - from) / duration * (first ** 2 / 2 + last ** 2 / 2);
  }
  return Math.sqrt(Math.max(0, squareMean)) * scale;
}

function projectImpulse(candidate, base, alpha, caps, timeWeights) {
  const target = weightedSum(base, timeWeights);
  const at = offset => candidate.map((value, index) => alpha[index] ? clamp(value + offset * alpha[index], 0, caps[index]) : base[index]);
  const area = offset => weightedSum(at(offset), timeWeights);
  const initial = area(0);
  const tolerance = Number.EPSILON * 16 * Math.max(1, target);
  if (Math.abs(initial - target) <= tolerance) return at(0);
  let low = initial > target ? -1 : 0, high = initial < target ? 1 : 0;
  for (let iteration = 0; iteration < 1024 && area(low) > target + tolerance; iteration++) low *= 2;
  for (let iteration = 0; iteration < 1024 && area(high) < target - tolerance; iteration++) high *= 2;
  if (!Number.isFinite(low) || !Number.isFinite(high)) throw new Error('The texture constraints are outside the supported numeric range.');
  for (let iteration = 0; iteration < 96; iteration++) {
    const middle = low / 2 + high / 2;
    if (area(middle) < target) low = middle;
    else high = middle;
  }
  const result = at(low / 2 + high / 2);
  if (Math.abs(weightedSum(result, timeWeights) - target) > tolerance * 2) throw new Error('Recorded texture cannot preserve the fitted impulse on this sampling grid.');
  return result;
}

/** Add recording texture to a clean fitted trend while retaining its calibrated metrics. */
export function applyRecordingTexture(fitted, original, { reference = null, sourceRange = null, window = 15, gain = 1, mode = 'repeat', range = null, transition = .1, preserveMetrics = true } = {}) {
  validate(fitted, 'Fitted profile'); validate(original, 'Original recording'); windowSize(window);
  if (!Number.isFinite(gain) || gain < 0) throw new Error('Texture gain must be finite and nonnegative.');
  if (!['repeat', 'stretch'].includes(mode)) throw new Error('Choose repeat or stretch for recorded texture.');
  if (!Number.isFinite(transition) || transition < 0 || transition > .5) throw new Error('Texture transition must be between 0 and 50 percent.');
  if (typeof preserveMetrics !== 'boolean') throw new Error('Choose whether to preserve fitted metrics.');
  const target = bounds(fitted, range);
  const before = burn(fitted);
  const peak = before.stats.peak;
  const originalPeak = original.reduce((maximum, point) => Math.max(maximum, point.thrust), 0);
  const originalRange = sourceRange == null ? null : bounds(original, sourceRange);
  const activeSamples = originalPeak ? original.filter(point => point.thrust >= originalPeak * .05).length : 0;
  const sourceSamples = originalRange ? original.filter(point => point.time >= originalRange[0] && point.time <= originalRange[1]).length : original.length;
  if (!reference && (sourceSamples < 7 || activeSamples < 7)) {
    const points = clonePoints(fitted);
    return { points, report: { recordedRms: 0, sourceRms: 0, appliedRms: 0, activeBurnRms: 0, taperedRms: 0, gain, sourceRange: originalRange, samples: fitted.length, clippedSamples: 0, limited: true, before: before.stats, after: { ...before.stats }, notes: ['The original recording has too few active measurements for reliable texture; the clean fitted profile was kept.'] } };
  }
  const source = reference ?? textureFromOriginal(original, { range: originalRange, window });
  const timeWeights = weights(fitted);
  const carrier = source?.points?.reduce((maximum, point) => Math.max(maximum, Math.abs(point.thrust)), 0) ?? 0;
  if (!Number.isFinite(carrier)) throw new Error('The recorded texture must contain finite residuals.');
  const replay = applyCapturedNoise(fitted.map(point => ({ time: point.time, thrust: carrier })), source, { range: target, mode });
  const recordedRms = rms(source.points.map(point => point.thrust), weights(source.points));
  const sourceRms = originalPeak ? recordedRms / originalPeak * gain * peak : 0;
  if (!Number.isFinite(sourceRms)) throw new Error('The texture gain is outside the supported numeric range.');
  const reportBase = { recordedRms, sourceRms, gain, sourceRange: [...source.range], samples: fitted.length, before: before.stats };
  if (!peak || !originalPeak || !gain || !carrier) {
    const points = clonePoints(fitted);
    return { points, report: { ...reportBase, appliedRms: 0, activeBurnRms: 0, taperedRms: 0, clippedSamples: 0, limited: sourceRms > 0, after: before.stats, notes: [] } };
  }

  const peakIndex = fitted.findIndex(point => point.thrust === peak);
  const locked = new Set(preserveMetrics ? [peakIndex, before.first, before.first - 1, before.last, before.last + 1] : []);
  const belowThreshold = Math.max(0, before.threshold - Math.max(Number.MIN_VALUE, before.threshold * Number.EPSILON));
  const base = fitted.map(point => point.thrust / peak);
  const caps = fitted.map((point, index) => !preserveMetrics ? Infinity : (index < before.first || index > before.last) ? belowThreshold / peak : 1);
  const width = (target[1] - target[0]) * transition;
  const alpha = fitted.map((point, index) => {
    if (!point.thrust || locked.has(index) || point.time < target[0] || point.time > target[1]) return 0;
    const position = width ? clamp(Math.min((point.time - target[0]) / width, (target[1] - point.time) / width), 0, 1) : 1;
    return position * position * (3 - 2 * position) * Math.min(1, base[index] / .1);
  });
  const noise = replay.map((point, index) => (point.thrust - carrier) / originalPeak * gain);
  if (noise.some(value => !Number.isFinite(value))) throw new Error('The texture gain is outside the supported numeric range.');
  const envelopeWeight = weightedSum(alpha, timeWeights);
  const center = envelopeWeight ? weightedSum(noise.map((value, index) => value * alpha[index]), timeWeights) / envelopeWeight : 0;
  const residual = noise.map((value, index) => alpha[index] * (value - center));
  let clippedSamples = 0;
  const candidate = base.map((value, index) => {
    if (!alpha[index]) return value;
    const requested = value + residual[index];
    const bounded = clamp(requested, 0, caps[index]);
    if (bounded !== requested) clippedSamples++;
    return bounded;
  });
  const projected = preserveMetrics ? projectImpulse(candidate, base, alpha, caps, timeWeights) : candidate;
  const points = fitted.map((point, index) => {
    if (!alpha[index]) return { ...point };
    const cap = preserveMetrics ? (index < before.first || index > before.last) ? belowThreshold : peak : Infinity;
    const thrust = Math.min(cap, Math.max(0, projected[index] * peak));
    if (!Number.isFinite(thrust)) throw new Error('The textured profile is outside the supported numeric range.');
    return { time: point.time, thrust };
  });
  const appliedRms = rms(points.map((point, index) => (point.thrust - fitted[index].thrust) / peak), timeWeights) * peak;
  const activeBurnRms = activeRms(points, points.map((point, index) => (point.thrust - fitted[index].thrust) / peak), before.stats.burnStart, before.stats.burnEnd) * peak;
  const taperedRms = rms(residual, timeWeights) * peak;
  const limited = clippedSamples > 0 || (taperedRms > 0 && appliedRms < taperedRms * (1 - 1e-6)) || (sourceRms > 0 && appliedRms === 0);
  return { points, report: { ...reportBase, appliedRms, activeBurnRms, taperedRms, clippedSamples, limited, after: burn(points).stats, notes: limited ? [preserveMetrics ? 'Recorded texture was reduced to preserve the fitted peak, impulse and burn timing.' : 'Recorded texture was clipped to keep thrust nonnegative.'] : [] } };
}
