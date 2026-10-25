import { interpolate } from './profile.js';

const MIN_SAMPLES = 7;

function validateOriginal(points) {
  if (!Array.isArray(points)) throw new Error('Background detection needs an array of measurements.');
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || (index && point.time <= points[index - 1].time)) throw new Error('Background measurements must contain finite, nonnegative thrust and strictly increasing timestamps.');
  }
  if (points.length && !Number.isFinite(points.at(-1).time - points[0].time)) throw new Error('The background timeline is outside the supported numeric range.');
}

function statistics(points, duration) {
  const maximum = points.reduce((peak, point) => Math.max(peak, point.thrust), 0);
  if (!maximum) return { mean: 0, rms: 0 };
  if (points.every(point => point.thrust === maximum)) return { mean: maximum, rms: 0 };
  let normalizedMean = 0;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1], right = points[index];
    normalizedMean += (right.time - left.time) / duration * (left.thrust / maximum + right.thrust / maximum) / 2;
  }
  normalizedMean = Math.min(1, Math.max(0, normalizedMean));
  let squareMean = 0;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1], right = points[index];
    const a = left.thrust / maximum - normalizedMean, b = right.thrust / maximum - normalizedMean;
    // Integrate the squared linearly interpolated deviation on the physical grid.
    squareMean += (right.time - left.time) / duration * (a * a + a * b + b * b) / 3;
  }
  return { mean: normalizedMean * maximum, rms: Math.sqrt(Math.min(1, Math.max(0, squareMean))) * maximum };
}

/** Find the longest quiet interval outside the first and last 5%-peak burn samples. */
export function findBackgroundNoise(original) {
  validateOriginal(original);
  if (original.length < MIN_SAMPLES) return null;
  const peak = original.reduce((maximum, point) => Math.max(maximum, point.thrust), 0);
  const threshold = peak * .05;
  let firstActive = -1, lastActive = -1;
  if (peak) for (let index = 0; index < original.length; index++) {
    if (original[index].thrust / peak >= .05) { if (firstActive < 0) firstActive = index; lastActive = index; }
  }
  let best = null, start = null;
  function finish(end) {
    if (start == null || end - start + 1 < MIN_SAMPLES) { start = null; return; }
    const duration = original[end].time - original[start].time;
    const samples = end - start + 1;
    if (!best || duration > best.duration || (duration === best.duration && samples > best.samples)) best = { start, end, duration, samples };
    start = null;
  }
  for (let index = 0; index < original.length; index++) {
    const outsideBurn = firstActive < 0 || index < firstActive || index > lastActive;
    const quiet = peak === 0 || original[index].thrust / peak < .05;
    if (outsideBurn && quiet) { if (start == null) start = index; }
    else finish(index - 1);
  }
  finish(original.length - 1);
  if (!best) return null;
  const origin = original[best.start].time;
  const points = original.slice(best.start, best.end + 1).map(point => ({ time: point.time - origin, thrust: point.thrust }));
  return { points, range: [origin, original[best.end].time], duration: best.duration, samples: best.samples, threshold, ...statistics(points, best.duration) };
}

/** Validate a raw, nonnegative background recording with relative timestamps. */
export function validateBackgroundNoise(background) {
  if (!background || !Array.isArray(background.points) || background.points.length < MIN_SAMPLES) throw new Error('Choose a background source with at least 7 measurements.');
  const { points, duration } = background;
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || (index && point.time <= points[index - 1].time)) throw new Error('Background samples must have finite, nonnegative thrust and strictly increasing relative timestamps.');
  }
  if (points[0].time !== 0 || !Number.isFinite(duration) || duration <= 0 || points.at(-1).time !== duration) throw new Error('The background source needs relative timestamps starting at zero and a positive duration.');
  const range = background.range;
  if ((background.samples != null && background.samples !== points.length) || ['rms', 'mean', 'threshold'].some(key => background[key] != null && (!Number.isFinite(background[key]) || background[key] < 0)) || (range != null && (!Array.isArray(range) || range.length !== 2 || !Array.from(range).every(Number.isFinite) || !(range[1] > range[0]) || range[1] - range[0] !== duration))) throw new Error('Background source metadata must match its measurement interval.');
  return background;
}

/** Replay measured baseline values in a continuous mirrored loop, in elapsed seconds. */
export function createBackgroundNoiseSampler(background, { gain = 1 } = {}) {
  validateBackgroundNoise(background);
  if (!Number.isFinite(gain) || gain < 0) throw new Error('Background noise gain must be finite and nonnegative.');
  const { points, duration } = background;
  const maximum = points.reduce((peak, point) => Math.max(peak, point.thrust), 0);
  if (!Number.isFinite(maximum * gain)) throw new Error('Background noise gain is too large for this source.');
  const period = duration * 2;
  return elapsed => {
    if (!Number.isFinite(elapsed)) throw new Error('Background replay time must be finite.');
    const phase = Number.isFinite(period) ? Math.abs(elapsed) % period : Math.abs(elapsed);
    const time = phase > duration ? duration - (phase - duration) : phase;
    return interpolate(points, time) * gain;
  };
}
