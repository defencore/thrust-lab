import { metrics } from './profile.js';

/** Share the padded 5% peak burn window without resampling or changing timestamps. */
export function burnRegionView(points) {
  const measured = metrics(points);
  if (!(measured.peak > 0) || !Number.isFinite(measured.burnDuration) || !(measured.burnDuration > 0)) return null;
  const padding = measured.burnDuration * .04;
  return [Math.max(measured.start, measured.burnStart - padding), Math.min(measured.end, measured.burnEnd + padding)];
}
