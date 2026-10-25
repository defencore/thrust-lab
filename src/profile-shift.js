import { interpolate } from './profile.js';
import { blendSelection } from './feather.js';
import { createBackgroundNoiseSampler } from './background-noise.js';

function validate(points) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('Shifting a profile needs at least two measurements.');
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || (index && point.time <= points[index - 1].time)) throw new Error('Profile shifting needs finite, nonnegative measurements and strictly increasing timestamps.');
  }
  if (!Number.isFinite(points.at(-1).time - points[0].time)) throw new Error('The profile timeline is outside the supported numeric range.');
}

/** Shift measured amplitudes on their fixed grid; positive offsets delay the profile. */
export function shiftProfile(points, offset, { range = null, transition = 0, background = null, noiseGain = 1 } = {}) {
  validate(points);
  if (!Number.isFinite(offset)) throw new Error('Profile shift must be a finite time offset.');
  if (!Number.isFinite(transition) || transition < 0 || transition > .5) throw new Error('The shift edge transition must be between zero and 50 percent.');
  if (!Number.isFinite(noiseGain) || noiseGain < 0) throw new Error('Background noise gain must be finite and nonnegative.');
  const sampleBackground = background == null ? null : createBackgroundNoiseSampler(background, { gain: noiseGain });
  const bounds = range ?? [points[0].time, points.at(-1).time];
  if (!Array.isArray(bounds) || bounds.length !== 2 || !Array.from(bounds).every(Number.isFinite) || !(bounds[1] > bounds[0]) || bounds[0] < points[0].time || bounds[1] > points.at(-1).time) throw new Error('The shift range must stay within the profile timeline.');
  if (offset === 0) return points.map(point => ({ ...point }));
  const shifted = points.map(point => {
    if (point.time < bounds[0] || point.time > bounds[1]) return { ...point };
    let source = point.time - offset;
    // Avoid dropping an exact boundary sample because subtraction rounded by one ulp.
    if (Number.isFinite(source) && source < bounds[0] && point.time === bounds[0] + offset) source = bounds[0];
    if (Number.isFinite(source) && source > bounds[1] && point.time === bounds[1] + offset) source = bounds[1];
    const thrust = source >= bounds[0] && source <= bounds[1] ? interpolate(points, source) : sampleBackground?.(point.time - bounds[0]) ?? 0;
    if (!Number.isFinite(thrust) || thrust < 0) throw new Error('The shifted thrust must remain finite and nonnegative.');
    return { ...point, thrust };
  });
  return range && transition ? blendSelection(points, shifted, range, transition) : shifted;
}
