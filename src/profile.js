const MAX_SAMPLES = 30000;
const EPSILON = 1e-12;

function finite(value, label, minimum = -Infinity, maximum = Infinity) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a finite number between ${minimum} and ${maximum}.`);
  }
  return value;
}

function validate(points, label = 'Profile') {
  if (!Array.isArray(points)) throw new Error(`${label} must be a list of samples.`);
  for (let i = 0; i < points.length; i += 1) {
    finite(points[i].time, `${label} time`);
    finite(points[i].thrust, `${label} thrust`, 0);
    if (i && points[i].time <= points[i - 1].time) {
      throw new Error(`${label} timestamps must be strictly increasing.`);
    }
  }
}

function randomSource(seed) {
  let state = 2166136261;
  for (const character of String(seed)) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  const u = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** Linear interpolation on the original timeline; values outside it are zero. */
export function interpolate(points, time) {
  if (!points.length || !Number.isFinite(time)) return 0;
  if (time < points[0].time || time > points.at(-1).time) return 0;
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].time < time) low = middle + 1;
    else high = middle;
  }
  if (!low || points[low].time === time) return points[low].thrust;
  const previous = points[low - 1];
  const current = points[low];
  const fraction = (time - previous.time) / (current.time - previous.time);
  return previous.thrust + (current.thrust - previous.thrust) * fraction;
}

function areaBetween(points, start, end) {
  if (points.length < 2 || end <= start) return 0;
  const low = Math.max(start, points[0].time);
  const high = Math.min(end, points.at(-1).time);
  if (high <= low) return 0;
  let previous = { time: low, thrust: interpolate(points, low) };
  let area = 0;
  for (const point of points) {
    if (point.time <= low) continue;
    if (point.time >= high) break;
    area += (point.time - previous.time) * (point.thrust + previous.thrust) / 2;
    previous = point;
  }
  area += (high - previous.time) * (interpolate(points, high) + previous.thrust) / 2;
  return area;
}

/** Impulse uses trapezoidal integration; burn duration uses 5% peak crossings. */
export function metrics(points) {
  validate(points);
  if (!points.length) {
    return { peak: 0, average: 0, impulse: 0, duration: 0, start: 0, end: 0, samples: 0, burnStart: 0, burnEnd: 0, burnDuration: 0, burnAverage: 0 };
  }
  const start = points[0].time;
  const end = points.at(-1).time;
  const duration = end - start;
  let peak = 0;
  let impulse = 0;
  for (let i = 0; i < points.length; i += 1) {
    peak = Math.max(peak, points[i].thrust);
    if (i) impulse += (points[i].time - points[i - 1].time) * (points[i].thrust + points[i - 1].thrust) / 2;
  }
  let burnStart = start;
  let burnEnd = end;
  if (peak > 0) {
    const threshold = peak * 0.05;
    const first = points.findIndex((point) => point.thrust >= threshold);
    let last = points.length - 1;
    while (points[last].thrust < threshold) last -= 1;
    burnStart = points[first].time;
    burnEnd = points[last].time;
    if (first > 0) {
      const left = points[first - 1];
      const right = points[first];
      burnStart = left.time + (right.time - left.time) * (threshold - left.thrust) / (right.thrust - left.thrust);
    }
    if (last < points.length - 1) {
      const left = points[last];
      const right = points[last + 1];
      burnEnd = left.time + (right.time - left.time) * (threshold - left.thrust) / (right.thrust - left.thrust);
    }
  }
  const burnDuration = peak > 0 ? Math.max(0, burnEnd - burnStart) : 0;
  return { peak, average: duration > 0 ? impulse / duration : 0, impulse, duration, start, end, samples: points.length, burnStart, burnEnd, burnDuration, burnAverage: burnDuration > 0 ? impulse / burnDuration : 0 };
}

function sampleTimes(duration, interval, sampling, jitter, random) {
  const times = [0];
  if (sampling === 'random') {
    let time = 0;
    while (true) {
      time += interval * (1 + (random() * 2 - 1) * jitter);
      if (time >= duration - EPSILON * duration) break;
      times.push(time);
      if (times.length >= MAX_SAMPLES) throw new Error(`Sampling produces more than ${MAX_SAMPLES.toLocaleString('en-US')} samples. Increase the interval.`);
    }
  } else {
    const count = Math.ceil(duration / interval);
    if (count + 1 > MAX_SAMPLES) throw new Error(`Sampling produces more than ${MAX_SAMPLES.toLocaleString('en-US')} samples. Increase the interval.`);
    for (let i = 1; i < count; i += 1) {
      const time = i * interval + (sampling === 'jitter' ? (random() - 0.5) * jitter * interval : 0);
      if (time > times.at(-1) && time < duration) times.push(time);
    }
  }
  times.push(duration);
  if (times.length < 3) throw new Error('The sampling interval must be smaller than the burn duration.');
  return times;
}

function shapeValue(position, shape) {
  const ignition = Math.min(1, position / 0.055);
  const tail = Math.min(1, (1 - position) / 0.14);
  if (shape === 'neutral') return ignition * tail * (0.77 + 0.23 * Math.exp(-(((position - 0.13) / 0.09) ** 2)));
  if (shape === 'progressive') return ignition * tail * (0.35 + 0.65 * position);
  if (shape === 'regressive') return ignition * tail * (1 - 0.65 * position);
  return ignition * tail * (0.38 + 0.62 * Math.exp(-(((position - 0.1) / 0.075) ** 2)));
}

function fitAmplitudes(times, values, peak, targetImpulse) {
  let maximum = 0;
  for (const value of values) maximum = Math.max(maximum, value);
  if (maximum <= 0) throw new Error('The profile shape must contain positive thrust at a sampled time.');
  const logarithms = values.map((value) => value > 0 ? Math.log(value / maximum) : -Infinity);
  const at = (exponent) => logarithms.map((logarithm) => logarithm === -Infinity ? 0 : peak * Math.exp(logarithm * exponent));
  const area = (amplitudes) => {
    let total = 0;
    for (let i = 1; i < times.length; i += 1) total += (times[i] - times[i - 1]) * (amplitudes[i] + amplitudes[i - 1]) / 2;
    return total;
  };
  if (targetImpulse === undefined) return { amplitudes: at(1), limited: false };
  const lowerExponent = 0.000001;
  const upperExponent = 1e6;
  const maximumArea = area(at(lowerExponent));
  const minimumArea = area(at(upperExponent));
  const target = Math.min(maximumArea, Math.max(minimumArea, targetImpulse));
  let low = lowerExponent;
  let high = upperExponent;
  for (let iteration = 0; iteration < 65; iteration += 1) {
    const exponent = (low + high) / 2;
    if (area(at(exponent)) > target) low = exponent;
    else high = exponent;
  }
  return { amplitudes: at((low + high) / 2), limited: Math.abs(target - targetImpulse) > Math.max(1e-8, targetImpulse * 1e-6), minimumArea, maximumArea };
}

/** Generate a reproducible illustrative curve, with constraints fitted on its actual samples. */
export function generateProfile(options = {}) {
  const peak = finite(Number(options.peak ?? 100), 'Peak thrust', Number.MIN_VALUE);
  const duration = finite(Number(options.duration ?? 2), 'Burn duration', Number.MIN_VALUE);
  const interval = finite(Number(options.interval ?? 0.01), 'Sampling interval', Number.MIN_VALUE);
  const jitter = finite(Number(options.jitter ?? 0.25), 'Timing deviation', 0, 0.8);
  const noise = finite(Number(options.noise ?? 0.015), 'Noise amount', 0, 1);
  const impulse = options.impulse == null || options.impulse === '' ? undefined : finite(Number(options.impulse), 'Target impulse', Number.MIN_VALUE);
  const sampling = options.sampling ?? 'uniform';
  const shape = options.shape ?? 'neutral';
  if (!['uniform', 'jitter', 'random'].includes(sampling)) throw new Error('Unknown sampling mode.');
  if (!['neutral', 'progressive', 'regressive', 'boost-sustain'].includes(shape)) throw new Error('Unknown profile shape.');
  if (options.template) {
    validate(options.template, 'Template');
    if (options.template.length < 3 || options.template[0].time !== 0 || options.template.at(-1).time !== 1) {
      throw new Error('A normalized template must have at least three samples, starting at 0 and ending at 1.');
    }
  }
  const random = randomSource(options.seed ?? 'thrust-lab');
  const times = sampleTimes(duration, interval, sampling, jitter, random);
  const phase = random() * Math.PI * 2;
  const secondPhase = random() * Math.PI * 2;
  const variation = 0.04 + random() * 0.08;
  const base = times.map((time, index) => {
    if (index === 0 || index === times.length - 1) return 0;
    const position = time / duration;
    const value = options.template ? interpolate(options.template, position) : shapeValue(position, shape);
    const smoothVariation = 1 + variation * Math.sin(position * Math.PI * 2 + phase) + variation * 0.4 * Math.sin(position * Math.PI * 4 + secondPhase);
    return value * smoothVariation;
  });
  const ideal = fitAmplitudes(times, base, peak, impulse);
  const theory = times.map((time, index) => ({ time, thrust: ideal.amplitudes[index] }));
  const notes = [];
  const targetImpulse = impulse ?? metrics(theory).impulse;
  const measured = noise > 0 ? fitAmplitudes(times, ideal.amplitudes.map((value) => value * Math.max(0.02, 1 + gaussian(random) * noise)), peak, targetImpulse) : ideal;
  if (ideal.limited || measured.limited) {
    const bounds = measured.limited ? measured : ideal;
    notes.push(`The requested impulse cannot be reached with this peak, duration and sampling. The nearest feasible profile was generated (${bounds.minimumArea.toFixed(3)}–${bounds.maximumArea.toFixed(3)} N·s available).`);
  }
  return { points: times.map((time, index) => ({ time, thrust: measured.amplitudes[index] })), theory, notes };
}

function scopeFor(points, range) {
  if (!points.length) throw new Error('Load or generate a profile first.');
  const start = range ? finite(Number(range[0]), 'Selection start') : points[0].time;
  const end = range ? finite(Number(range[1]), 'Selection end') : points.at(-1).time;
  if (end < start) throw new Error('Selection end must be after selection start.');
  const low = Math.max(points[0].time, start);
  const high = Math.min(points.at(-1).time, end);
  const indexes = [];
  for (let i = 0; i < points.length; i += 1) if (points[i].time >= low && points[i].time <= high) indexes.push(i);
  if (!indexes.length) throw new Error('The selection contains no samples.');
  return { start: low, end: high, indexes, contains: (time) => time >= low && time <= high };
}

/** All edits replace amplitudes only. Every original timestamp is preserved exactly. */
export function transform(points, operation = {}) {
  validate(points);
  const scope = scopeFor(points, operation.range);
  const result = points.map((point) => ({ ...point }));
  const assign = (index, value) => { result[index].thrust = Math.max(0, value); };
  let selectedPeak = 0;
  for (const index of scope.indexes) selectedPeak = Math.max(selectedPeak, points[index].thrust);
  switch (operation.type) {
    case 'scale': {
      const factor = finite(Number(operation.factor), 'Thrust scale', 0);
      for (const index of scope.indexes) assign(index, points[index].thrust * factor);
      break;
    }
    case 'offset': {
      const amount = finite(Number(operation.amount), 'Thrust offset');
      for (const index of scope.indexes) assign(index, points[index].thrust + amount);
      break;
    }
    case 'retime': {
      const factor = finite(Number(operation.factor), 'Time scale', Number.MIN_VALUE);
      const anchor = operation.anchor ?? 'start';
      if (!['start', 'center', 'end'].includes(anchor)) throw new Error('Unknown time scale anchor.');
      const pivot = anchor === 'start' ? scope.start : anchor === 'end' ? scope.end : (scope.start + scope.end) / 2;
      for (const index of scope.indexes) {
        const sourceTime = pivot + (points[index].time - pivot) / factor;
        assign(index, sourceTime < scope.start || sourceTime > scope.end ? 0 : interpolate(points, sourceTime));
      }
      break;
    }
    case 'trim': {
      for (let index = 0; index < points.length; index += 1) if (!scope.contains(points[index].time)) assign(index, 0);
      break;
    }
    case 'noise': {
      const amount = finite(Number(operation.amount), 'Noise amount', 0, 1);
      const random = randomSource(operation.seed ?? 'thrust-lab-noise');
      for (const index of scope.indexes) assign(index, points[index].thrust + Math.max(-3, Math.min(3, gaussian(random))) * selectedPeak * amount / 3);
      break;
    }
    case 'smooth': {
      const window = finite(Number(operation.window ?? 7), 'Smoothing window', 1, 1001);
      if (!Number.isInteger(window) || window % 2 !== 1) throw new Error('The smoothing window must be an odd whole number.');
      const radius = (window - 1) / 2;
      const first = scope.indexes[0];
      const last = scope.indexes.at(-1);
      for (const index of scope.indexes) {
        let total = 0;
        let weightSum = 0;
        for (let neighbor = Math.max(first, index - radius); neighbor <= Math.min(last, index + radius); neighbor += 1) {
          const weight = radius + 1 - Math.abs(neighbor - index);
          total += points[neighbor].thrust * weight;
          weightSum += weight;
        }
        assign(index, total / weightSum);
      }
      break;
    }
    case 'fit-peak': {
      const target = finite(Number(operation.target), 'Target peak thrust', 0);
      if (!selectedPeak && target > 0) throw new Error('A zero-thrust selection cannot be scaled to a positive peak.');
      const factor = selectedPeak ? target / selectedPeak : 0;
      for (const index of scope.indexes) assign(index, points[index].thrust * factor);
      break;
    }
    case 'fit-impulse': {
      const target = finite(Number(operation.target), 'Target impulse', 0);
      const current = areaBetween(points, scope.start, scope.end);
      const baseline = points.map((point) => ({ time: point.time, thrust: scope.contains(point.time) ? 0 : point.thrust }));
      const fixed = areaBetween(baseline, scope.start, scope.end);
      const adjustable = current - fixed;
      if (scope.end <= scope.start) throw new Error('Impulse fitting requires a selection with positive duration.');
      if (target < fixed - EPSILON || (adjustable <= EPSILON && Math.abs(target - fixed) > EPSILON)) {
        throw new Error('This impulse cannot be reached by scaling the selected samples. Widen the selection or choose a different target.');
      }
      const factor = adjustable > EPSILON ? Math.max(0, (target - fixed) / adjustable) : 0;
      for (const index of scope.indexes) assign(index, points[index].thrust * factor);
      break;
    }
    case 'fit-theory': {
      validate(operation.theory, 'Theoretical profile');
      if (!operation.theory.length) throw new Error('Load or generate a theoretical profile first.');
      const blend = finite(Number(operation.blend ?? 1), 'Theory blend', 0, 1);
      for (const index of scope.indexes) assign(index, points[index].thrust * (1 - blend) + interpolate(operation.theory, points[index].time) * blend);
      break;
    }
    default:
      throw new Error('Unknown profile operation.');
  }
  validate(result);
  return result;
}
