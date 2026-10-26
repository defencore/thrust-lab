export const CSV_TIME_FACTORS = Object.freeze({ s: 1, ms: .001, us: .000001 });
export const CSV_THRUST_FACTORS = Object.freeze({ N: 1, kN: 1000, kgf: 9.80665, lbf: 4.4482216152605 });

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const MAX_ROWS = 30_000;
const MAX_TOKEN = 4096;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** CSV quoting already separates fields; a comma inside one numeric field is decimal. */
export function csvNumber(value) {
  if (typeof value !== 'string') return NaN;
  let normalized = value.trim();
  if (normalized.includes(',') && !normalized.includes('.')) normalized = normalized.replace(',', '.');
  return NUMBER.test(normalized) ? Number(normalized) : NaN;
}

/** Keep source spelling compactly; numerical styles are inferred only when exporting. */
export function normalizeCSVFormat(value, points = null) {
  if (!plain(value) || value.version !== 1 || ![',', ';', '\t'].includes(value.delimiter) || typeof value.hasHeader !== 'boolean' || typeof value.timeUnit !== 'string' || typeof value.thrustUnit !== 'string' || !Object.hasOwn(CSV_TIME_FACTORS, value.timeUnit) || !Object.hasOwn(CSV_THRUST_FACTORS, value.thrustUnit) || !['timeHeader', 'thrustHeader'].every(key => typeof value[key] === 'string' && value[key].length <= 5000) || !Array.isArray(value.rows) || value.rows.length < 2 || value.rows.length > MAX_ROWS) throw new Error('CSV source format is invalid.');
  if (points && (!Array.isArray(points) || points.length !== value.rows.length)) throw new Error('CSV source format must match the measurement timestamp sequence.');
  let previous = -Infinity;
  const rows = value.rows.map((row, index) => {
    if (!Array.isArray(row) || row.length !== 2 || row.some(token => typeof token !== 'string' || token.length > MAX_TOKEN || token !== token.trim())) throw new Error('CSV source format contains an invalid numeric record.');
    const time = csvNumber(row[0]) * CSV_TIME_FACTORS[value.timeUnit];
    const thrust = csvNumber(row[1]) * CSV_THRUST_FACTORS[value.thrustUnit];
    if (!Number.isFinite(time) || !Number.isFinite(thrust) || thrust < 0 || time <= previous) throw new Error('CSV source format contains an invalid numeric record.');
    if (points && time !== points[index].time) throw new Error('CSV source format must match the measurement timestamp sequence.');
    previous = time;
    return [...row];
  });
  return { version: 1, delimiter: value.delimiter, hasHeader: value.hasHeader, timeUnit: value.timeUnit, thrustUnit: value.thrustUnit, timeHeader: value.timeHeader, thrustHeader: value.thrustHeader, rows };
}

function style(raw) {
  const match = /^([+-]?)(\d*)([.,]?)(\d*)(?:([eE])([+-]?)(\d+))?$/.exec(raw);
  const [, sign, integer, decimal, fraction, exponent, exponentSign, exponentDigits] = match;
  return { plus: sign === '+', width: integer.length, integerDigits: integer === '' ? 0 : integer.replace(/^0+/, '').length || 1, decimal: decimal || '.', hasDecimal: !!decimal, digits: fraction.length, exponent, exponentSign, exponentDigits, originalExponent: exponent ? Number(`${exponentSign}${exponentDigits}`) : 0 };
}

/** Round the shortest decimal spelling, including very large or very small values. */
function fixed(value, digits) {
  const [coefficient, exponentText = '0'] = Math.abs(value).toString().split('e');
  const [integer, fraction = ''] = coefficient.split('.');
  const shift = Number(exponentText) - fraction.length + digits;
  let scaled = BigInt(integer + fraction);
  if (shift >= 0) scaled *= 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift), remainder = scaled % divisor;
    scaled /= divisor;
    if (remainder * 2n >= divisor) scaled++;
  }
  const raw = scaled.toString().padStart(digits + 1, '0');
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}

function decorate(value, appearance) {
  let [integer, fraction] = value.split('.');
  integer = integer.padStart(appearance.width, '0');
  if (appearance.width === 0 && integer === '0') integer = '';
  return integer + (appearance.hasDecimal || appearance.digits ? appearance.decimal + (fraction || '') : '');
}

/** Edited values follow their original row's decimal count, zero padding, and exponent style. */
export function formatCSVNumber(value, source) {
  if (!Number.isFinite(value) || typeof source !== 'string' || source.length > MAX_TOKEN || !Number.isFinite(csvNumber(source))) throw new Error('Cannot format a nonfinite CSV value.');
  if (value === csvNumber(source)) return source;
  const appearance = style(source), sign = value < 0 || Object.is(value, -0) ? '-' : appearance.plus ? '+' : '';
  if (!appearance.exponent) return sign + decorate(fixed(value, appearance.digits), appearance);
  const absolute = Math.abs(value);
  let exponent = absolute ? Number(absolute.toExponential().split('e')[1]) - appearance.integerDigits + 1 : appearance.originalExponent;
  const mantissa = exp => {
    const [coefficient, power] = absolute.toExponential().split('e');
    return Number(`${coefficient}e${Number(power) - exp}`);
  };
  let rounded = fixed(absolute ? mantissa(exponent) : 0, appearance.digits);
  if (absolute && Number(rounded) >= 10 ** appearance.integerDigits) { exponent++; rounded = fixed(mantissa(exponent), appearance.digits); }
  const exponentSign = exponent < 0 ? '-' : appearance.exponentSign === '+' ? '+' : '';
  const exponentDigits = String(Math.abs(exponent)).padStart(appearance.exponentDigits.length, '0');
  return sign + decorate(rounded, appearance) + appearance.exponent + exponentSign + exponentDigits;
}

function field(raw, delimiter) {
  return raw.includes(delimiter) || /["\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

function decimalFor(rows, column) {
  for (const row of rows) {
    const token = row[column].split(/[eE]/)[0];
    if (token.includes(',')) return ',';
    if (token.includes('.')) return '.';
  }
  return '.';
}

/** Source rows retain their numerical spelling; marker precision is never rounded away. */
export function exportSourceCSV(points, source, markerPoints = []) {
  const format = normalizeCSVFormat(source, points);
  const { delimiter, timeUnit, thrustUnit, rows } = format;
  const timeDecimal = decimalFor(rows, 0), thrustDecimal = decimalFor(rows, 1);
  const precise = (value, decimal) => String(value).replace('.', decimal);
  // Use the source clock style only when it can represent every service timestamp distinctly.
  const preferredMarkerTimes = markerPoints.map(point => formatCSVNumber(point.time / CSV_TIME_FACTORS[timeUnit], rows[0][0]));
  let previousPreferred = -Infinity, previousPreferredSI = -Infinity;
  const preferredTimesFit = preferredMarkerTimes.every(token => {
    const time = csvNumber(token), timeSI = time * CSV_TIME_FACTORS[timeUnit];
    const valid = Number.isFinite(time) && Number.isFinite(timeSI) && time > previousPreferred && timeSI > previousPreferredSI && time < csvNumber(rows[0][0]) && timeSI < points[0].time;
    previousPreferred = time; previousPreferredSI = timeSI;
    return valid;
  });
  const output = [];
  if (format.hasHeader) output.push([format.timeHeader, format.thrustHeader]);
  let previous = -Infinity;
  for (let index = 0; index < markerPoints.length; index++) {
    const point = markerPoints[index];
    const time = point.time / CSV_TIME_FACTORS[timeUnit];
    const token = preferredTimesFit ? preferredMarkerTimes[index] : precise(time, timeDecimal);
    const emittedTime = csvNumber(token);
    if (!Number.isFinite(emittedTime) || emittedTime <= previous) throw new Error('Export units cannot represent these timestamps as finite, strictly increasing values.');
    output.push([token, precise(point.thrust / CSV_THRUST_FACTORS[thrustUnit], thrustDecimal)]);
    previous = emittedTime;
  }
  for (let index = 0; index < points.length; index++) {
    const point = points[index], [time, sourceThrust] = rows[index];
    const originalTime = csvNumber(time);
    if (originalTime <= previous) throw new Error('Export units cannot represent these timestamps as finite, strictly increasing values.');
    previous = originalTime;
    const thrust = point.thrust === csvNumber(sourceThrust) * CSV_THRUST_FACTORS[thrustUnit] ? sourceThrust : formatCSVNumber(point.thrust / CSV_THRUST_FACTORS[thrustUnit], sourceThrust);
    output.push([time, thrust]);
  }
  return output.map(row => row.map(token => field(token, delimiter)).join(delimiter)).join('\r\n') + '\r\n';
}
