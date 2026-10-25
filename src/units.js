const frozenOptions = options => Object.freeze(options.map(option => Object.freeze(option)));

/** Factors convert a displayed value back to the studio's canonical SI units. */
export const UNIT_OPTIONS = Object.freeze({
  thrust: frozenOptions([
    { value: 'N', label: 'Newtons (N)', symbol: 'N', factor: 1 },
    { value: 'kN', label: 'Kilonewtons (kN)', symbol: 'kN', factor: 1000 },
    { value: 'kgf', label: 'Kilogram-force (kgf)', symbol: 'kgf', factor: 9.80665 },
    { value: 'lbf', label: 'Pound-force (lbf)', symbol: 'lbf', factor: 4.4482216152605 },
  ]),
  time: frozenOptions([
    { value: 's', label: 'Seconds (s)', symbol: 's', factor: 1 },
    { value: 'ms', label: 'Milliseconds (ms)', symbol: 'ms', factor: .001 },
    { value: 'us', label: 'Microseconds (µs)', symbol: 'µs', factor: .000001 },
    { value: 'min', label: 'Minutes (min)', symbol: 'min', factor: 60 },
  ]),
  impulse: frozenOptions([
    { value: 'N·s', label: 'Newton-seconds (N·s)', symbol: 'N·s', factor: 1 },
    { value: 'kN·s', label: 'Kilonewton-seconds (kN·s)', symbol: 'kN·s', factor: 1000 },
    { value: 'kgf·s', label: 'Kilogram-force seconds (kgf·s)', symbol: 'kgf·s', factor: 9.80665 },
    { value: 'lbf·s', label: 'Pound-force seconds (lbf·s)', symbol: 'lbf·s', factor: 4.4482216152605 },
  ]),
});

export const DEFAULT_DISPLAY_UNITS = Object.freeze({ thrust: 'N', time: 's', impulse: 'N·s' });

/** Invalid or missing display preferences use SI without changing profile data. */
export function normalizeDisplayUnits(value) {
  const result = { ...DEFAULT_DISPLAY_UNITS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const dimension of Object.keys(DEFAULT_DISPLAY_UNITS)) {
    if (Object.hasOwn(value, dimension) && UNIT_OPTIONS[dimension].some(option => option.value === value[dimension])) result[dimension] = value[dimension];
  }
  return result;
}

function selectedUnit(dimension, displayUnits) {
  if (!Object.hasOwn(UNIT_OPTIONS, dimension)) throw new Error('Choose thrust, time, or impulse as the unit dimension.');
  const units = normalizeDisplayUnits(displayUnits);
  return UNIT_OPTIONS[dimension].find(option => option.value === units[dimension]);
}

export function unitFactor(dimension, displayUnits = DEFAULT_DISPLAY_UNITS) { return selectedUnit(dimension, displayUnits).factor; }
export function unitSymbol(dimension, displayUnits = DEFAULT_DISPLAY_UNITS) { return selectedUnit(dimension, displayUnits).symbol; }

function convert(value, factor, divide) {
  if (!Number.isFinite(value)) throw new Error('Unit conversion requires a finite number.');
  const converted = divide ? value / factor : value * factor;
  if (!Number.isFinite(converted) || (value !== 0 && converted === 0)) throw new Error('The converted value is outside the supported numeric range.');
  return converted;
}

export function toDisplay(value, dimension, displayUnits = DEFAULT_DISPLAY_UNITS) { return convert(value, unitFactor(dimension, displayUnits), true); }
export function fromDisplay(value, dimension, displayUnits = DEFAULT_DISPLAY_UNITS) { return convert(value, unitFactor(dimension, displayUnits), false); }

/** Numeric form fields use full-precision conversions, never formatted labels. */
export function parseDisplayInput(value, dimension, displayUnits = DEFAULT_DISPLAY_UNITS) {
  if (typeof value !== 'string' || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) throw new Error('Enter a finite numeric value.');
  return fromDisplay(Number(value.trim()), dimension, displayUnits);
}

/** Keep small nonzero readings visible and avoid excessively wide numeric labels. */
export function displayNumber(value, { digits = 2, locale = 'en-US' } = {}) {
  if (!Number.isFinite(value)) throw new Error('Unit conversion requires a finite number.');
  if (!Number.isInteger(digits) || digits < 0 || digits > 12) throw new Error('Display precision must be a whole number from 0 to 12.');
  const absolute = Math.abs(value);
  if (absolute > 0 && (absolute < 1e-6 || absolute >= 1e15)) {
    return new Intl.NumberFormat(locale, { notation: 'scientific', maximumFractionDigits: digits }).format(value);
  }
  const adaptiveDigits = absolute > 0 && absolute < 1 ? Math.max(digits, Math.ceil(-Math.log10(absolute)) + Math.max(1, digits) - 1) : digits;
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: Math.min(12, adaptiveDigits) }).format(value === 0 ? 0 : value);
}
