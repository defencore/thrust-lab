const MAX_NODES = 128;

function validatePoints(points, label = 'Profile') {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  let previous = -Infinity;
  for (const point of points) {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0) throw new Error(`${label} must contain finite timestamps and nonnegative thrust.`);
    if (point.time <= previous) throw new Error(`${label} timestamps must be strictly increasing.`);
    previous = point.time;
  }
}

function scope(points, range) {
  if (range == null) return [points[0].time, points.at(-1).time];
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] >= range[1]) throw new Error('The control curve range must have a finite start before its end.');
  if (range[0] < points[0].time || range[1] > points.at(-1).time) throw new Error('The control curve range must stay within the profile timeline.');
  return range;
}

function lowerBound(points, time) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
}

function validateNodes(points, nodes, range) {
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > MAX_NODES) throw new Error('A control curve needs between 2 and 128 control points.');
  validatePoints(nodes, 'Control points');
  for (const node of nodes) {
    const index = lowerBound(points, node.time);
    if (index >= points.length || points[index].time !== node.time) throw new Error('Control points must use existing measurement timestamps.');
    if (node.time < range[0] || node.time > range[1]) throw new Error('Control points must stay within the edit range.');
  }
}

/** Choose evenly distributed measurement indices, retaining both scope boundaries. */
export function createCurveNodes(points, range = null, count = 5) {
  validatePoints(points);
  const bounds = scope(points, range);
  if (!Number.isInteger(count) || count < 2 || count > MAX_NODES) throw new Error('Choose between 2 and 128 initial control points.');
  const first = lowerBound(points, bounds[0]);
  let last = lowerBound(points, bounds[1]);
  if (last === points.length || points[last].time > bounds[1]) last--;
  const available = last - first + 1;
  if (available < 2) throw new Error('Select at least two measurements to edit a control curve.');
  const total = Math.min(count, available);
  return Array.from({ length: total }, (_, index) => ({ ...points[first + Math.round(index * (available - 1) / (total - 1))] }));
}

/** Move an anchor to its nearest free measurement time without crossing neighbors. */
export function snapCurveNode(points, nodes, index, time, thrust, { range = null } = {}) {
  validatePoints(points);
  const bounds = scope(points, range);
  validateNodes(points, nodes, bounds);
  if (!Number.isInteger(index) || index < 0 || index >= nodes.length) throw new Error('Choose an existing control point to move.');
  if (!Number.isFinite(time) || !Number.isFinite(thrust) || thrust < 0) throw new Error('Control points need finite time and nonnegative thrust.');
  const result = nodes.map(node => ({ ...node }));
  if (index === 0 || index === nodes.length - 1) {
    result[index].thrust = thrust;
    return result;
  }
  const first = lowerBound(points, nodes[index - 1].time) + 1;
  const last = lowerBound(points, nodes[index + 1].time) - 1;
  let candidate = Math.min(last, Math.max(first, lowerBound(points, time)));
  if (candidate > first && Math.abs(points[candidate - 1].time - time) <= Math.abs(points[candidate].time - time)) candidate--;
  result[index] = { time: points[candidate].time, thrust };
  return result;
}
