import { UNIT_OPTIONS, normalizeDisplayUnits, toDisplay, fromDisplay, unitSymbol, displayNumber } from '../units.js';

export const INPUT_DIMENSIONS = {
  'edit-offset': 'thrust', 'edit-shift': 'time', 'target-peak': 'thrust', 'target-impulse': 'impulse', 'target-tail-start': 'time',
  'theory-offset': 'time', 'gen-peak': 'thrust', 'gen-duration': 'time', 'gen-impulse': 'impulse',
  'gen-interval': 'time', 'range-start': 'time', 'range-end': 'time', 'cursor-time': 'time',
  'curve-time': 'time', 'curve-thrust': 'thrust',
  'measure-time-a': 'time', 'measure-time-b': 'time',
  'tf-start': 'time', 'tf-duration': 'time', 'tf-tail-start': 'time', 'tf-peak': 'thrust', 'tf-impulse': 'impulse', 'tf-average': 'thrust',
};
const bounds = {
  'gen-peak': [.001, 1e7], 'gen-duration': [.001, 1e5], 'gen-impulse': [.000001, 1e12],
  'gen-interval': [.000001, 1000], 'target-peak': [0], 'target-impulse': [0],
  'theory-offset': [-1e9, 1e9], 'curve-thrust': [0],
};

/** Display conversions never modify canonical project data or export settings. */
export function createUnitsController({ $, preferences, onChange, onError }) {
  let current = normalizeDisplayUnits(preferences.get().displayUnits);
  const canonical = new Map();
  const rendered = new Map();
  const precisions = new Map();
  const symbol = dimension => unitSymbol(dimension, current);
  function set(id, value, { force = false, precision = null } = {}) {
    const input = $(`#${id}`);
    if (!input || (!force && document.activeElement === input)) return;
    canonical.set(id, value);
    if (precision != null) precisions.set(id, precision);
    const displayed = INPUT_DIMENSIONS[id] ? toDisplay(value, INPUT_DIMENSIONS[id], current) : value;
    const digits = precision ?? precisions.get(id);
    input.value = String(digits && typeof displayed === 'number' ? Number(displayed.toPrecision(digits)) : displayed);
    rendered.set(id, input.value);
  }
  function read(id) {
    const input = $(`#${id}`);
    if (!input?.value.trim() || !Number.isFinite(Number(input.value))) return NaN;
    if (!INPUT_DIMENSIONS[id]) return Number(input.value);
    if (rendered.get(id) === input.value && canonical.has(id)) return canonical.get(id);
    try {
      const value = fromDisplay(Number(input.value), INPUT_DIMENSIONS[id], current);
      canonical.set(id, value); rendered.set(id, input.value);
      return value;
    } catch {
      input.classList.add('input-error'); input.setAttribute('aria-invalid', 'true');
      return NaN;
    }
  }
  function syncLabels() {
    for (const [id, dimension] of Object.entries(INPUT_DIMENSIONS)) {
      const input = $(`#${id}`);
      if (!input) continue;
      const suffix = input.closest('.input-unit')?.lastElementChild;
      if (suffix?.tagName === 'SPAN') suffix.textContent = symbol(dimension);
      for (const [index, attr] of ['min', 'max'].entries()) {
        if (bounds[id]?.[index] !== undefined) input.setAttribute(attr, toDisplay(bounds[id][index], dimension, current));
      }
      input.step = ['range-start', 'range-end', 'cursor-time'].includes(id) ? toDisplay(.001, 'time', current) : 'any';
    }
    $('#cursor-time-unit').textContent = symbol('time');
    for (const [id, dimension] of Object.entries({ 'metric-peak': 'thrust', 'metric-average': 'thrust', 'metric-impulse': 'impulse', 'metric-burn': 'time' })) $(`#${id}`).nextElementSibling.textContent = symbol(dimension);
    for (const dimension of Object.keys(UNIT_OPTIONS)) $(`#display-${dimension}`).value = current[dimension];
  }
  function change(next) {
    const previous = current;
    const previousCanonical = new Map(canonical), previousRendered = new Map(rendered);
    const previousValues = new Map(Object.keys(INPUT_DIMENSIONS).map(id => [id, $(`#${id}`).value]));
    try {
      const values = Object.keys(INPUT_DIMENSIONS).map(id => [id, read(id)]).filter(([, value]) => Number.isFinite(value));
      const normalized = normalizeDisplayUnits(next);
      for (const [id, value] of values) toDisplay(value, INPUT_DIMENSIONS[id], normalized);
      current = normalized;
      for (const [id, value] of values) set(id, value, { force: true });
      syncLabels(); onChange(); preferences.update({ displayUnits: current });
    } catch (error) {
      current = previous; canonical.clear(); rendered.clear();
      for (const [id, value] of previousCanonical) canonical.set(id, value);
      for (const [id, value] of previousRendered) rendered.set(id, value);
      for (const [id, value] of previousValues) $(`#${id}`).value = value;
      syncLabels(); onError(error);
    }
  }
  for (const dimension of Object.keys(UNIT_OPTIONS)) $(`#display-${dimension}`).addEventListener('change', event => change({ ...current, [dimension]: event.target.value }));
  syncLabels();
  return {
    get: () => current, set, read, symbol, syncLabels, change,
    format: (value, dimension, digits = 2) => {
      const displayed = toDisplay(value, dimension, current);
      const absolute = Math.abs(displayed);
      const precision = absolute > 0 && absolute < 1 ? Math.min(12, Math.max(digits, 2 - Math.floor(Math.log10(absolute)))) : digits;
      return displayNumber(displayed, { digits: precision });
    },
  };
}
