import { interpolate, metrics } from './profile.js';

const THRESHOLD = .05;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const copy = points => points.map(point => ({ time: point.time, thrust: point.thrust }));

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

function validate(points, label) {
  if (!Array.isArray(points) || points.length < 2) throw failure(`${label} needs at least two samples.`, 'INVALID_PROFILE');
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || (index && point.time <= points[index - 1].time)) throw failure(`${label} needs strictly increasing finite timestamps and nonnegative finite thrust.`, 'INVALID_PROFILE');
  }
  positive(points.at(-1).time - points[0].time, `${label} time span`);
}

function burnBounds(points) {
  const measured = metrics(points);
  if (!Number.isFinite(measured.impulse)) throw failure('The profile impulse is outside the supported numeric range.', 'NUMERIC_RANGE');
  return measured;
}

function normalizedTemplate(points, measured) {
  return points.map(point => ({ time: (point.time - measured.burnStart) / measured.burnDuration, thrust: point.thrust / measured.peak }));
}

function tailKnee(template) {
  // Uniform resampling prevents a single short, noisy source interval dominating the knee.
  const sampled = Array.from({ length: 101 }, (_, index) => interpolate(template, index / 100));
  const smoothed = sampled.map((_, index) => {
    const neighbours = sampled.slice(Math.max(0, index - 2), Math.min(sampled.length, index + 3));
    return neighbours.reduce((sum, value) => sum + value, 0) / neighbours.length;
  });
  let peakIndex = 0;
  for (let index = 1; index < sampled.length; index++) if (sampled[index] > sampled[peakIndex]) peakIndex = index;
  const first = Math.max(67, peakIndex);
  let steepest = -1, minimumSlope = -1e-6;
  for (let index = first; index < 100; index++) {
    const slope = smoothed[index + 1] - smoothed[index];
    if (slope < minimumSlope) { minimumSlope = slope; steepest = index; }
  }
  if (steepest < 0) return .8;
  let knee = steepest;
  while (knee > first && smoothed[knee] - smoothed[knee - 1] < minimumSlope * .2) knee--;
  return clamp(knee / 100, 2 / 3, .99);
}

function remappedValue(template, phase, tailPhase, knee) {
  if (tailPhase == null) return interpolate(template, phase);
  const sourcePhase = phase <= tailPhase ? phase / tailPhase * knee : knee + (phase - tailPhase) / (1 - tailPhase) * (1 - knee);
  const value = interpolate(template, sourcePhase);
  if (phase < tailPhase || phase > 1) return value;
  const initial = Math.max(THRESHOLD, interpolate(template, knee));
  const terminal = interpolate(template, 1);
  const position = (phase - tailPhase) / (1 - tailPhase);
  const progress = initial > terminal + 1e-6 ? clamp((initial - value) / (initial - terminal), 0, 1) : position * position * (3 - 2 * position);
  return initial + (THRESHOLD - initial) * progress;
}

function bracket(points, time) {
  let low = 0, high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return points[low]?.time === time ? [low, low] : [low - 1, low];
}

function boundaryConstraints(points, shape, start, end, peakIndex) {
  const fixed = new Map([[peakIndex, 1]]);
  for (const [time, rising] of [[start, true], [end, false]]) {
    const [left, right] = bracket(points, time);
    if (left === right) {
      if (left === peakIndex) return null;
      fixed.set(left, THRESHOLD);
      continue;
    }
    const inside = rising ? right : left;
    const outside = rising ? left : right;
    const width = points[right].time - points[left].time;
    const a = Math.abs(time - points[outside].time) / width;
    const b = Math.abs(time - points[inside].time) / width;
    let lower, upper;
    if (inside === peakIndex) {
      upper = 1;
      lower = THRESHOLD - a / b * (1 - THRESHOLD);
      if (lower < -64 * Number.EPSILON) return null;
      lower = Math.max(0, lower);
    } else {
      const maximumSlope = Math.min(THRESHOLD / a, (1 - THRESHOLD) / b);
      const preferred = (a * (THRESHOLD - shape[outside]) + b * (shape[inside] - THRESHOLD)) / (a * a + b * b);
      const slope = clamp(preferred, maximumSlope * 1e-6, maximumSlope);
      lower = Math.max(0, THRESHOLD - a * slope);
      upper = Math.min(1, THRESHOLD + b * slope);
    }
    fixed.set(outside, lower);
    fixed.set(inside, upper);
  }
  return fixed;
}

/** Fit theory on fixed samples. Average thrust means impulse divided by 5%-peak burn duration. */
export function calibrateProfile(points, theory, options = {}) {
  validate(points, 'Working profile');
  validate(theory, 'Theoretical profile');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw failure('Theory fitting options must be an object.', 'INVALID_TARGET');
  const { range = null, shapeBlend = 1 } = options;
  if (!Number.isFinite(shapeBlend) || shapeBlend < 0 || shapeBlend > 1) throw failure('Theory shape blend must be between zero and one.', 'INVALID_TARGET');
  if (range != null && (!Array.isArray(range) || range.length !== 2 || !Array.from(range).every(Number.isFinite) || !(range[1] > range[0]) || range[0] < points[0].time || range[1] > points.at(-1).time)) throw failure('The fitting range must stay within the recording timeline.', 'INVALID_RANGE');
  const first = range ? points.findIndex(point => point.time >= range[0]) : 0;
  let last = points.length - 1;
  if (range) while (last >= 0 && points[last].time > range[1]) last--;
  if (first < 0 || last - first < 2) throw failure('Select at least three measurements for coordinated theory fitting.', 'INSUFFICIENT_SAMPLES');
  const scoped = points.slice(first, last + 1);
  const current = burnBounds(scoped), theoretical = burnBounds(theory);
  if (!(theoretical.peak > 0) || !(theoretical.burnDuration > 0)) throw failure('The theoretical profile needs a positive peak and a nonzero 5% burn duration.', 'EMPTY_THEORY');
  const start = options.start ?? (current.peak ? current.burnStart : scoped[0].time);
  if (!Number.isFinite(start)) throw failure('Burn start must be finite.', 'INVALID_TARGET');
  const duration = positive(options.duration ?? theoretical.burnDuration, 'Burn duration');
  const tailStart = options.tailStart == null ? null : positive(options.tailStart, 'Final tail start');
  if (tailStart != null && !(tailStart < duration)) throw failure('Final tail start must be greater than zero and before the burn duration.', 'INVALID_TARGET');
  const tailPhase = tailStart == null ? null : tailStart / duration;
  const tailTime = tailStart == null ? null : start + tailStart;
  const end = start + duration;
  const timeline = { minimumStart: scoped[0].time, maximumEnd: scoped.at(-1).time };
  if (!Number.isFinite(end) || start < timeline.minimumStart || end > timeline.maximumEnd || !(end > start)) throw failure('The requested burn interval does not fit within the existing measurement timeline. Choose a shorter duration or an earlier start.', 'TIME_LIMIT', timeline);
  const suppliedPeak = options.peak == null ? null : positive(options.peak, 'Peak thrust');
  const suppliedImpulse = options.impulse == null ? null : positive(options.impulse, 'Total impulse');
  const suppliedAverage = options.average == null ? null : positive(options.average, 'Mean burn thrust');
  const averageImpulse = suppliedAverage == null ? null : positive(suppliedAverage * duration, 'Mean thrust multiplied by burn duration');
  if (suppliedImpulse != null && averageImpulse != null && Math.abs(suppliedImpulse - averageImpulse) > Math.max(suppliedImpulse, averageImpulse) * 1e-8) throw failure('Impulse and mean thrust are coupled: total impulse must equal mean burn thrust multiplied by burn duration.', 'INCONSISTENT_TARGETS', { impulse: suppliedImpulse, average: suppliedAverage, duration });
  const targetImpulse = suppliedImpulse ?? averageImpulse;
  const sourceTemplate = normalizedTemplate(theory, theoretical);
  const currentTemplate = current.peak && current.burnDuration ? normalizedTemplate(scoped, current) : sourceTemplate;
  const sourceKnee = tailStart == null ? null : tailKnee(sourceTemplate);
  const currentKnee = tailStart == null ? null : tailKnee(currentTemplate);
  let shape = scoped.map(point => {
    const phase = (point.time - start) / duration;
    return remappedValue(sourceTemplate, phase, tailPhase, sourceKnee) * shapeBlend + remappedValue(currentTemplate, phase, tailPhase, currentKnee) * (1 - shapeBlend);
  });
  const candidates = shape.map((value, index) => ({ value, index })).filter(({ value, index }) => value > 0 && scoped[index].time > start && scoped[index].time < end && (tailTime == null || scoped[index].time <= tailTime)).sort((left, right) => right.value - left.value || left.index - right.index);
  if (!candidates.length) throw failure(tailStart == null ? 'The burn interval needs an interior measurement with positive theoretical thrust. Increase its duration or choose another start.' : 'Final tail start needs a positive interior measurement before it. Choose a later tail start or a wider burn interval.', tailStart == null ? 'INSUFFICIENT_SAMPLES' : 'TAIL_LIMIT', timeline);
  let fixed = null;
  for (const candidate of candidates) {
    const normalized = shape.map(value => clamp(value / candidate.value, 0, 1));
    fixed = boundaryConstraints(scoped, normalized, start, end, candidate.index);
    if (fixed) { shape = normalized; break; }
  }
  if (!fixed) throw failure('The requested 5% burn boundaries cannot be represented with this measurement spacing and peak. Widen the burn interval or change its start.', 'BOUNDARY_LIMIT', timeline);
  const weights = scoped.map((point, index) => ((index ? point.time - scoped[index - 1].time : 0) + (index < scoped.length - 1 ? scoped[index + 1].time - point.time : 0)) / 2);
  const tailLimit = THRESHOLD * (1 - 16 * Number.EPSILON);
  let tailIndex = -1;
  if (tailTime != null) {
    tailIndex = scoped.findIndex(point => point.time >= tailTime);
    const values = shape.map((value, index) => fixed.has(index) ? fixed.get(index) : scoped[index].time > end ? Math.min(tailLimit, value) : value);
    let ceiling = 1;
    for (let index = tailIndex; index < values.length; index++) {
      if (fixed.has(index)) ceiling = values[index];
      else values[index] = Math.min(ceiling, values[index]);
    }
    let next = 0;
    for (let index = values.length - 1; index >= tailIndex; index--) {
      if (!fixed.has(index)) values[index] = Math.max(next, values[index]);
      fixed.set(index, values[index]);
      next = values[index];
    }
    if (tailIndex > 0 && !fixed.has(tailIndex - 1)) fixed.set(tailIndex - 1, shape[tailIndex - 1]);
  }
  const adjustable = scoped.map((point, index) => !fixed.has(index) && point.time > start && point.time < end);
  const baseline = shape.map((value, index) => fixed.has(index) ? fixed.get(index) : adjustable[index] ? value : Math.min(tailLimit, value));
  const logarithms = baseline.map(value => value > 0 ? Math.log(value) : -Infinity);
  const at = (index, exponent) => !adjustable[index] || baseline[index] === 0 || baseline[index] === 1 ? baseline[index] : exponent === 0 ? 1 : exponent === Infinity ? 0 : Math.exp(logarithms[index] * exponent);
  const area = exponent => weights.reduce((total, weight, index) => total + weight * at(index, exponent), 0);
  const minimumArea = area(Infinity), maximumArea = area(0), originalArea = area(1);
  if (!(originalArea > 0) || !Number.isFinite(maximumArea)) throw failure('The target shape is outside the supported numeric range.', 'NUMERIC_RANGE');
  const peak = suppliedPeak ?? (targetImpulse == null ? theoretical.peak : positive(targetImpulse / originalArea, 'The fitted peak thrust'));
  const feasible = { minImpulse: minimumArea * peak, maxImpulse: maximumArea * peak, ...timeline };
  if (!Number.isFinite(feasible.minImpulse) || !Number.isFinite(feasible.maxImpulse)) throw failure('The fitted impulse is outside the supported numeric range.', 'NUMERIC_RANGE');
  let exponent = 1;
  const notes = [];
  if (targetImpulse != null && suppliedPeak != null) {
    const targetArea = targetImpulse / peak;
    const tolerance = Math.max(maximumArea, targetArea) * 128 * Number.EPSILON;
    if (targetArea < minimumArea - tolerance || targetArea > maximumArea + tolerance) throw failure(`The requested impulse cannot be reached while retaining this theoretical shape, peak, and exact burn boundaries. Choose an impulse between ${feasible.minImpulse} and ${feasible.maxImpulse} N·s, or change the shape, peak, or duration.`, 'IMPULSE_LIMIT', feasible);
    if (Math.abs(targetArea - originalArea) <= tolerance) exponent = 1;
    else if (targetArea <= minimumArea + tolerance) { exponent = Infinity; notes.push('The impulse target uses the narrowest shape possible on these measurements.'); }
    else if (targetArea >= maximumArea - tolerance) { exponent = 0; notes.push('The impulse target uses the broadest shape possible on these measurements.'); }
    else {
      let low = 0, high = 1;
      while (area(high) > targetArea) high *= 2;
      for (let iteration = 0; iteration < 80; iteration++) {
        const middle = low + (high - low) / 2;
        if (area(middle) > targetArea) low = middle;
        else high = middle;
      }
      exponent = low + (high - low) / 2;
    }
  }
  const fittedScope = scoped.map((point, index) => {
    const thrust = peak * at(index, exponent);
    if (!Number.isFinite(thrust) || thrust < 0) throw failure('The fitted curve must remain finite and nonnegative.', 'NUMERIC_RANGE');
    return { time: point.time, thrust };
  });
  const measured = burnBounds(fittedScope);
  const timeTolerance = Math.max(duration * 1e-10, 128 * Number.EPSILON * Math.max(Math.abs(start), Math.abs(end), duration));
  if (Math.abs(measured.burnStart - start) > timeTolerance || Math.abs(measured.burnEnd - end) > timeTolerance) throw failure('The requested burn boundaries are too precise for these measurement values. Change the start or increase the burn duration.', 'BOUNDARY_LIMIT', timeline);
  if (targetImpulse != null && Math.abs(measured.impulse - targetImpulse) > Math.max(targetImpulse, measured.impulse) * 1e-9) throw failure('The requested impulse could not be represented accurately on these measurements.', 'NUMERIC_RANGE', feasible);
  const fitted = points.map((point, index) => index < first || index > last ? { time: point.time, thrust: point.thrust } : fittedScope[index - first]);
  if (range) notes.push('Reported metrics describe the selected fitting range; samples outside it are unchanged.');
  if (!current.peak && shapeBlend < 1) notes.push('The working profile has no positive thrust; the theoretical shape was used.');
  if (tailStart != null) notes.push('The final tail is remapped from the reference terminal decline and kept monotonic while fitting the total impulse.');
  if (tailIndex >= 0 && scoped[tailIndex].time !== tailTime) notes.push('Tail onset is represented by the next existing measurement time.');
  const shapeError = Math.sqrt(weights.reduce((total, weight, index) => total + weight * (at(index, exponent) - baseline[index]) ** 2, 0) / (scoped.at(-1).time - scoped[0].time));
  const report = {
    requested: { start, duration, tailStart, peak: suppliedPeak, impulse: targetImpulse, average: targetImpulse == null ? null : targetImpulse / duration },
    achieved: { start: measured.burnStart, duration: measured.burnDuration, tailStart: tailIndex < 0 ? null : scoped[tailIndex].time - start, peak: measured.peak, impulse: measured.impulse, average: measured.impulse / measured.burnDuration },
    feasible, sourceTailStart: sourceKnee == null ? null : sourceKnee * theoretical.burnDuration, shapeError, shapeExponent: Number.isFinite(exponent) ? exponent : null, notes,
  };
  return { points: fitted, reference: copy(fitted), report };
}
