function validatePoints(points, label) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  let previous = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0) {
      throw new Error(`${label} must contain finite timestamps and nonnegative thrust.`);
    }
    if (point.time <= previous) throw new Error(`${label} timestamps must be strictly increasing.`);
    previous = point.time;
  }
}

function ignitionTime(points) {
  let peak = 0;
  for (const point of points) peak = Math.max(peak, point.thrust);
  if (peak === 0) return points[0].time;
  const threshold = peak * 0.05;
  const first = points.findIndex(point => point.thrust >= threshold);
  if (first === 0) return points[0].time;
  const left = points[first - 1];
  const right = points[first];
  const fraction = (threshold - left.thrust) / (right.thrust - left.thrust);
  // Weighted endpoints avoid overflow when the interval crosses very large times.
  return left.time * (1 - fraction) + right.time * fraction;
}

/** Calculate an alignment offset without changing either source timeline. */
export function theoryShift(theory, working, { mode = 'source', offset = 0 } = {}) {
  if (!['source', 'start', 'ignition'].includes(mode)) throw new Error('Choose source, start, or ignition for theoretical alignment.');
  if (!Number.isFinite(offset)) throw new Error('The theoretical time offset must be finite.');
  if (theory == null) return 0;
  validatePoints(theory, 'Theoretical profile');
  let shift = offset;
  if (mode !== 'source') {
    validatePoints(working, 'Working profile');
    const sourceTime = mode === 'start' ? theory[0].time : ignitionTime(theory);
    const targetTime = mode === 'start' ? working[0].time : ignitionTime(working);
    shift += targetTime - sourceTime;
  }
  if (!Number.isFinite(shift)) throw new Error('The theoretical alignment shift is too large.');
  return shift;
}

/** Translate theory only; amplitudes, spacing, and working measurements stay fixed. */
export function alignTheory(theory, working, options = {}) {
  const shift = theoryShift(theory, working, options);
  if (theory == null) return null;
  let previous = -Infinity;
  return theory.map(point => {
    const time = point.time + shift;
    if (!Number.isFinite(time)) throw new Error('The theoretical alignment produces a timestamp outside the finite range.');
    if (time <= previous) throw new Error('The theoretical offset is too large to preserve distinct timestamps.');
    previous = time;
    return { time, thrust: point.thrust };
  });
}
