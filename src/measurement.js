function validatePoints(points) {
  if (!Array.isArray(points) || !points.length) throw new Error('A measurement needs at least one profile sample.');
  let previous = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0) throw new Error('Measurements need finite timestamps and nonnegative thrust.');
    if (point.time <= previous) throw new Error('Measurement timestamps must be strictly increasing.');
    previous = point.time;
  }
}

function nearest(points, time) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].time < time) low = middle + 1;
    else high = middle;
  }
  const index = low === 0 ? 0 : low === points.length ? low - 1 : time - points[low - 1].time <= points[low].time - time ? low - 1 : low;
  return { time: points[index].time, thrust: points[index].thrust };
}

/** Snap a measuring cursor to a real recording sample; equal distances prefer earlier time. */
export function measurementAt(points, time) {
  validatePoints(points);
  if (!Number.isFinite(time)) throw new Error('A measuring cursor needs a finite time.');
  return nearest(points, time);
}

/** Read two non-destructive measuring cursors and their signed B-minus-A differences. */
export function measureProfile(points, markerTimes = []) {
  validatePoints(points);
  if (!Array.isArray(markerTimes) || markerTimes.length > 2 || !Array.from(markerTimes).every(Number.isFinite)) throw new Error('Choose up to two finite measuring cursor times.');
  const a = markerTimes.length ? nearest(points, markerTimes[0]) : null;
  const b = markerTimes.length > 1 ? nearest(points, markerTimes[1]) : null;
  const deltaTime = b ? b.time - a.time : null;
  const deltaThrust = b ? b.thrust - a.thrust : null;
  if (b && (!Number.isFinite(deltaTime) || !Number.isFinite(deltaThrust))) throw new Error('The measurement difference is outside the supported numeric range.');
  return { a, b, deltaTime, deltaThrust };
}
