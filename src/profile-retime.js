import { metrics } from './profile.js';
import { calibrateProfile } from './theory-fit.js';

function failure(message, code, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function positive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw failure(`${label} must be finite and greater than zero.`, 'INVALID_TARGET');
  return value;
}

function sourceMetrics(points) {
  if (!Array.isArray(points) || points.length < 3) throw failure('Load at least three measurements to change the burn duration.', 'INSUFFICIENT_SAMPLES');
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || (index && point.time <= points[index - 1].time)) {
      throw failure('The profile needs strictly increasing finite timestamps and nonnegative finite thrust.', 'INVALID_PROFILE');
    }
  }
  const measured = metrics(points);
  if (!Number.isFinite(measured.duration) || !Number.isFinite(measured.impulse)) throw failure('The profile impulse is outside the supported numeric range.', 'NUMERIC_RANGE');
  if (!(measured.peak > 0) || !(measured.burnDuration > 0) || !(measured.impulse > 0)) throw failure('The profile needs a positive peak and a nonzero 5% burn duration.', 'EMPTY_PROFILE');
  return measured;
}

/** Stretch the recorded shape on fixed timestamps, conserving total impulse by default. */
export function retimeProfile(points, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw failure('Burn timing options must be an object.', 'INVALID_TARGET');
  const before = sourceMetrics(points);
  const duration = positive(options.duration ?? before.burnDuration, 'Burn duration');
  const impulse = options.impulse == null ? before.impulse : positive(options.impulse, 'Total impulse');
  const peak = options.peak == null ? null : positive(options.peak, 'Peak thrust');
  const requested = { start: before.burnStart, duration, impulse, peak, preserveImpulse: options.impulse == null, automaticPeak: peak == null };
  if (duration === before.burnDuration && impulse === before.impulse && (peak == null || peak === before.peak)) {
    return {
      points: points.map(point => ({ time: point.time, thrust: point.thrust })),
      report: { before, achieved: { ...before }, requested, notes: [], feasible: null, shapeError: 0, shapeExponent: 1 },
    };
  }
  const fitted = calibrateProfile(points, points, { start: requested.start, duration, impulse, peak, shapeBlend: 1 });
  return {
    points: fitted.points,
    report: {
      before, achieved: metrics(fitted.points), requested,
      notes: [...fitted.report.notes], feasible: fitted.report.feasible,
      shapeError: fitted.report.shapeError, shapeExponent: fitted.report.shapeExponent,
    },
  };
}
