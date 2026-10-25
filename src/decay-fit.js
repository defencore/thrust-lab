import { metrics, transform } from './profile.js';
import { calibrateProfile } from './theory-fit.js';
import { applyRecordingTexture } from './profile-texture.js';

/** Move the final fall-off while retaining the measured duration, peak and texture. */
export function fitDecayStart(points, tailStart) {
  const measured = metrics(points);
  if (!(measured.peak > 0) || !(measured.burnDuration > 0)) throw new Error('Load a recording with positive thrust before adjusting the decay.');
  const trend = transform(points, { type: 'smooth', window: 15 });
  const fitted = calibrateProfile(points, trend, { start: measured.burnStart, duration: measured.burnDuration, peak: measured.peak, tailStart });
  return applyRecordingTexture(fitted.points, points, { gain: 1, window: 15, preserveMetrics: true }).points;
}
