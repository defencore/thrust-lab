import { calibrateProfile } from './theory-fit.js';
import { applyRecordingTexture } from './profile-texture.js';
import { metrics, transform } from './profile.js';

/** Refit one stable recording baseline before adding its reusable recorded texture. */
export function fitRecordingToTheory(base, theory, original, settings, { captured = null } = {}) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Theory fitting settings must be an object.');
  if (!['impulse', 'average'].includes(settings.areaMode)) throw new Error('Choose impulse or mean thrust as the fitting target.');
  if (!['original', 'captured', 'none'].includes(settings.noiseSource)) throw new Error('Choose original, captured, or no recorded texture.');
  if (!Number.isFinite(settings.noiseLevel) || settings.noiseLevel < 0) throw new Error('Recorded texture level must be finite and nonnegative.');
  const options = { start: settings.start, duration: settings.duration, peak: settings.peak, shapeBlend: settings.shapeBlend };
  if (settings.tailStart != null) options.tailStart = settings.tailStart;
  options[settings.areaMode] = settings[settings.areaMode];
  const workingTrend = settings.noiseSource !== 'none' && settings.shapeBlend < 1 ? transform(base, { type: 'smooth', window: settings.window }) : base;
  const clean = calibrateProfile(workingTrend, theory, options);
  let points = clean.points, textureReport = null;
  if (settings.noiseSource !== 'none' && settings.noiseLevel > 0) {
    if (settings.noiseSource === 'captured' && !captured) throw new Error('Capture a noise sample before choosing captured texture.');
    const textured = applyRecordingTexture(clean.points, original || base, { reference: settings.noiseSource === 'captured' ? captured : null, window: settings.window, gain: settings.noiseLevel, mode: 'repeat', preserveMetrics: true });
    points = textured.points;
    textureReport = textured.report;
  }
  const achieved = metrics(points);
  const report = {
    ...clean.report,
    achieved: { ...clean.report.achieved, start: achieved.burnStart, duration: achieved.burnDuration, peak: achieved.peak, impulse: achieved.impulse, average: achieved.burnAverage },
    notes: [...clean.report.notes, ...(textureReport?.notes ?? [])],
  };
  return { points, reference: clean.reference, report, textureReport };
}
