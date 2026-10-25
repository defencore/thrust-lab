const MAX_NODES = 128;

function validatePoints(points, label) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  let previous = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0) throw new Error(`${label} must contain finite timestamps and nonnegative thrust.`);
    if (point.time <= previous) throw new Error(`${label} timestamps must be strictly increasing.`);
    previous = point.time;
  }
}

function validateRange(points, range) {
  if (range == null) return [points[0].time, points.at(-1).time];
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] >= range[1]) throw new Error('The control curve range must have a finite start before its end.');
  if (range[0] < points[0].time || range[1] > points.at(-1).time) throw new Error('The control curve range must stay within the profile timeline.');
  return range;
}

/** Add local anchor corrections to the recording while retaining its measured detail. */
export function deformControlCurve(points, nodes, { range = null, interpolation = 'smooth' } = {}) {
  validatePoints(points, 'Profile');
  const bounds = validateRange(points, range);
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > MAX_NODES) throw new Error('A control curve needs between 2 and 128 control points.');
  validatePoints(nodes, 'Control points');
  if (!['smooth', 'linear'].includes(interpolation)) throw new Error('Choose smooth or linear control curve interpolation.');
  const samples = new Map(points.map(point => [point.time, point]));
  const deltas = nodes.map(node => {
    if (!samples.has(node.time)) throw new Error('Control points must use existing measurement timestamps.');
    if (node.time < bounds[0] || node.time > bounds[1]) throw new Error('Control points must stay within the edit range.');
    return node.thrust - samples.get(node.time).thrust;
  });
  let segment = 0;
  return points.map(point => {
    if (point.time < nodes[0].time || point.time > nodes.at(-1).time) return { ...point };
    while (segment < nodes.length - 2 && point.time > nodes[segment + 1].time) segment++;
    const left = nodes[segment];
    const right = nodes[segment + 1];
    const low = deltas[segment];
    const high = deltas[segment + 1];
    if (low === 0 && high === 0) return { ...point };
    if (point.time === left.time) return { ...point, thrust: left.thrust };
    if (point.time === right.time) return { ...point, thrust: right.thrust };
    const width = right.time - left.time;
    if (!Number.isFinite(width) || !(width > 0)) throw new Error('The control point spacing is outside the supported numeric range.');
    const fraction = (point.time - left.time) / width;
    const weight = interpolation === 'smooth' ? fraction * fraction * (3 - 2 * fraction) : fraction;
    const correction = low * (1 - weight) + high * weight;
    const thrust = Math.max(0, point.thrust + correction);
    if (!Number.isFinite(thrust)) throw new Error('The deformed control curve must remain finite and nonnegative.');
    return { ...point, thrust };
  });
}
