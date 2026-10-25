function lowerBound(points, time, afterEqual = false) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].time < time || (afterEqual && points[middle].time === time)) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Extract a visible interval plus its immediate neighbors, then retain each
 * bucket's minimum and maximum so narrow peaks survive chart simplification.
 * Input samples must already be ordered by strictly increasing time.
 */
export function visibleEnvelope(points, start, end, maxPoints = 2500) {
  if (!Array.isArray(points)) throw new Error('Chart data must be a list of samples.');
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) throw new Error('Chart bounds must be finite and increasing.');
  if (!Number.isInteger(maxPoints) || maxPoints < 4) throw new Error('A chart envelope needs a limit of at least four samples.');
  if (!points.length) return [];
  const first = Math.max(0, lowerBound(points, start) - 1);
  const afterLast = Math.min(points.length, lowerBound(points, end, true) + 1);
  const visible = points.slice(first, afterLast);
  if (visible.length <= maxPoints) return visible;

  const result = [visible[0]];
  const buckets = Math.floor((maxPoints - 2) / 2);
  const interior = visible.length - 2;
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = 1 + Math.floor(bucket * interior / buckets);
    const to = 1 + Math.floor((bucket + 1) * interior / buckets);
    let minimum = from;
    let maximum = from;
    for (let index = from + 1; index < to; index += 1) {
      if (visible[index].thrust < visible[minimum].thrust) minimum = index;
      if (visible[index].thrust > visible[maximum].thrust) maximum = index;
    }
    if (minimum === maximum) result.push(visible[minimum]);
    else if (minimum < maximum) result.push(visible[minimum], visible[maximum]);
    else result.push(visible[maximum], visible[minimum]);
  }
  result.push(visible.at(-1));
  return result;
}
