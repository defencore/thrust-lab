const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Paint a continuous stroke onto existing measurement times, inside the edit scope. */
export function drawStroke(points, { time, thrust, previous = null }, range = null) {
  if (!Number.isFinite(time) || !Number.isFinite(thrust) || thrust < 0) throw new Error('Draw coordinates must be finite and nonnegative.');
  if (previous && (!Number.isFinite(previous.time) || !Number.isFinite(previous.thrust) || previous.thrust < 0)) throw new Error('Draw coordinates must be finite and nonnegative.');
  let nearest = 0;
  for (let index = 1; index < points.length; index++) if (Math.abs(points[index].time - time) < Math.abs(points[nearest].time - time)) nearest = index;
  const from = previous ? Math.min(previous.time, time) : points[nearest].time;
  const to = previous ? Math.max(previous.time, time) : points[nearest].time;
  let indexes = points.map((point, index) => point.time >= from && point.time <= to ? index : -1).filter(index => index >= 0);
  if (!indexes.length) indexes = [nearest];
  const touched = new Set(indexes);
  return points.map((point, index) => {
    if (!touched.has(index) || (range && (point.time < range[0] || point.time > range[1]))) return { ...point };
    const next = previous && time !== previous.time ? previous.thrust + clamp((point.time - previous.time) / (time - previous.time), 0, 1) * (thrust - previous.thrust) : thrust;
    return { time: point.time, thrust: Math.max(0, next) };
  });
}
