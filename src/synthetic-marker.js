export const SYNTHETIC_MARKER_ID = 'thrust-lab-v1';
export const SYNTHETIC_MARKER_COUNT = 10;

const CODE = Object.freeze([13, 71, 29, 83, 47, 19, 61, 37, 97, 53]);
const QUANTUM = 1e-9;
const RELATIVE_TOLERANCE = 64 * Number.EPSILON;

function copy(points) {
  return points.map(point => ({ ...point }));
}

function nextDown(value) {
  if (value === 0) return -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  view.setBigUint64(0, value > 0 ? bits - 1n : bits + 1n);
  return view.getFloat64(0);
}

function validPoint(point) {
  return point && Number.isFinite(point.time) && Number.isFinite(point.thrust) && point.thrust >= 0;
}

/** Add a tiny provenance prefix before existing data without changing any measurement. */
export function createSyntheticMarker(points) {
  if (!Array.isArray(points) || points.length < 2 || Array.from(points).some((point, index) => !validPoint(point) || (index && point.time <= points[index - 1].time))) throw new Error('Synthetic marking needs at least two valid measurements with strictly increasing timestamps.');
  const start = points[0].time;
  const step = Math.min(.001, points[1].time - start);
  const prefix = [];
  let previous = start;
  for (let index = 0; index < SYNTHETIC_MARKER_COUNT; index++) {
    let time = start - step * (index + 1);
    // Adjacent float values retain ordering when a large origin absorbs millisecond spacing.
    if (!Number.isFinite(time) || !(time < previous)) time = nextDown(previous);
    if (!Number.isFinite(time)) throw new Error('The timeline has no room for a synthetic marker before its first measurement.');
    prefix.push({ time, thrust: CODE[SYNTHETIC_MARKER_COUNT - index - 1] * QUANTUM });
    previous = time;
  }
  return prefix.reverse();
}

/** Detect the complete SI pattern only; an absent marker never proves measured origin. */
export function inspectSyntheticMarker(points) {
  if (!Array.isArray(points)) throw new Error('Synthetic marker analysis needs an array of measurements.');
  let detected = points.length >= SYNTHETIC_MARKER_COUNT + 2;
  for (let index = 0; detected && index <= SYNTHETIC_MARKER_COUNT; index++) {
    const point = points[index];
    if (!validPoint(point) || (index && point.time <= points[index - 1].time)) detected = false;
    if (index < SYNTHETIC_MARKER_COUNT) {
      const expected = CODE[index] * QUANTUM;
      if (!point || Math.abs(point.thrust - expected) > expected * RELATIVE_TOLERANCE) detected = false;
    }
  }
  return {
    detected,
    scheme: detected ? SYNTHETIC_MARKER_ID : null,
    markerCount: detected ? SYNTHETIC_MARKER_COUNT : 0,
    markerPoints: detected ? copy(points.slice(0, SYNTHETIC_MARKER_COUNT)) : [],
    profilePoints: copy(detected ? points.slice(SYNTHETIC_MARKER_COUNT) : points),
  };
}
