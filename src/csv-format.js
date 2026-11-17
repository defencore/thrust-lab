import { readCSVRecords, replaceCSVField, replaceCSVSpans } from './csv-records.js';

export const CSV_TIME_FACTORS = Object.freeze({ s: 1, ms: .001, us: .000001 });
export const CSV_THRUST_FACTORS = Object.freeze({ N: 1, kN: 1000, kgf: 9.80665, lbf: 4.4482216152605 });

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const MAX_ROWS = 30_000;
const MAX_TOKEN = 4096;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
let lastLayout = null;

function sourceRecords(text, delimiter) {
  if (lastLayout?.text !== text || lastLayout.delimiter !== delimiter) lastLayout = { text, delimiter, records: readCSVRecords(text, delimiter).records.filter(record => !record.blank) };
  return lastLayout.records;
}

/** CSV quoting already separates fields; a comma inside one numeric field is decimal. */
export function csvNumber(value) {
  if (typeof value !== 'string') return NaN;
  let normalized = value.trim();
  if (normalized.includes(',') && !normalized.includes('.')) normalized = normalized.replace(',', '.');
  return NUMBER.test(normalized) ? Number(normalized) : NaN;
}

function normalizeLayout(layout, format) {
  if (!plain(layout) || typeof layout.text !== 'string' || layout.text.length > 20_000_000 || !Number.isInteger(layout.timeColumn) || !Number.isInteger(layout.thrustColumn) || layout.timeColumn < 0 || layout.thrustColumn < 0 || layout.timeColumn === layout.thrustColumn) throw new Error('CSV source format contains an invalid source layout.');
  let records;
  try { records = sourceRecords(layout.text, format.delimiter).slice(); }
  catch { throw new Error('CSV source format contains an invalid source layout.'); }
  if (format.hasHeader) {
    const header = records.shift();
    if (header?.fields[layout.timeColumn]?.value !== format.timeHeader || header?.fields[layout.thrustColumn]?.value !== format.thrustHeader) throw new Error('CSV source format header does not match its source layout.');
  }
  if (records.length !== format.rows.length || records.some((record, index) => record.fields[layout.timeColumn]?.value !== format.rows[index][0] || record.fields[layout.thrustColumn]?.value !== format.rows[index][1])) throw new Error('CSV source format measurements do not match their source layout.');
  return { text: layout.text, timeColumn: layout.timeColumn, thrustColumn: layout.thrustColumn };
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
  const format = { version: 1, delimiter: value.delimiter, hasHeader: value.hasHeader, timeUnit: value.timeUnit, thrustUnit: value.thrustUnit, timeHeader: value.timeHeader, thrustHeader: value.thrustHeader, rows };
  if (Object.hasOwn(value, 'layout')) format.layout = normalizeLayout(value.layout, format);
  return format;
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

const TIME_POWERS = Object.freeze({ s: 0, ms: -3, us: -6 });

/** Shift source decimal digits exactly instead of converting a binary seconds value back. */
function convertedClock(raw, sourceUnit, targetUnit, decimal) {
  if (sourceUnit === targetUnit) return raw;
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(raw.replace(',', '.'));
  const [, sign, integer, fraction = '', exponent = '0'] = match;
  let digits = (integer + fraction).replace(/^0+/, '');
  if (!digits) return sign + '0';
  let power = BigInt(exponent) - BigInt(fraction.length) + BigInt(TIME_POWERS[sourceUnit] - TIME_POWERS[targetUnit]);
  const trimmed = digits.replace(/0+$/, '');
  power += BigInt(digits.length - trimmed.length); digits = trimmed;
  const position = BigInt(digits.length) + power;
  let output;
  if (position <= 0n && BigInt(digits.length + 2) - position <= BigInt(MAX_TOKEN)) output = `0.${'0'.repeat(Number(-position))}${digits}`;
  else if (position >= BigInt(digits.length) && position <= BigInt(MAX_TOKEN)) output = digits + '0'.repeat(Number(position) - digits.length);
  else if (position > 0n && position < BigInt(digits.length)) output = `${digits.slice(0, Number(position))}.${digits.slice(Number(position))}`;
  else output = digits[0] + (digits.length > 1 ? `.${digits.slice(1)}` : '') + `e${power + BigInt(digits.length - 1)}`;
  if (output.length + sign.length > MAX_TOKEN) throw new Error('Converted timestamps exceed the supported CSV number length.');
  return sign + output.replace('.', decimal);
}

function convertedThrust(value, unit, precision, decimal) {
  return fixed(value / CSV_THRUST_FACTORS[unit], precision).replace('.', decimal);
}

function replacedCell(raw, value, delimiter) {
  if (raw.trim().startsWith('"') || !(value.includes(delimiter) || /["\r\n]/.test(value))) return replaceCSVField(raw, value);
  const leading = raw.length - raw.trimStart().length;
  const trailing = Math.min(raw.length - leading, raw.length - raw.trimEnd().length);
  return raw.slice(0, leading) + field(value, delimiter) + raw.slice(raw.length - trailing);
}

function unitHeader(header, dimension, unit) {
  const recognized = dimension === 'time'
    ? /^(?:s|ms|us|[µμ]s|seconds?|milliseconds?|microseconds?|ns|nanoseconds?|min|mins|minutes?|h|hr|hours?)$/i
    : /^(?:N|kN|kgf|lbf|newtons?|kilonewtons?|kilogram[- ]?force|pound[- ]?force|mN|[µμ]N|MN|dyn|dynes?)$/i;
  const bracket = /^(.*[([])\s*([^()[\]]+)([)\]])(\s*)$/.exec(header);
  if (bracket && recognized.test(bracket[2].trim())) return `${bracket[1]}${unit}${bracket[3]}${bracket[4]}`;
  const suffix = /^(.*[_/])([^_/]+)$/.exec(header);
  if (suffix && recognized.test(suffix[2].trim())) return suffix[1] + unit;
  const separated = /^(.*\s)(\S+)$/.exec(header);
  if (separated && recognized.test(separated[2])) return separated[1] + unit;
  return `${header} (${unit})`;
}

function exportLayoutCSV(format, rowIndices, outputRows, markerRows, includeHeader, headers) {
  const { text, timeColumn, thrustColumn } = format.layout;
  const records = sourceRecords(text, format.delimiter).slice();
  const header = format.hasHeader ? records.shift() : null;
  const replacements = [];
  if (header && !includeHeader) replacements.push({ start: header.start, end: header.end + header.ending.length, text: '' });
  else if (header) for (const [column, value] of [[timeColumn, headers[0]], [thrustColumn, headers[1]]]) {
    const selected = header.fields[column];
    if (value !== selected.value) replacements.push({ start: selected.start, end: selected.end, text: replacedCell(text.slice(selected.start, selected.end), value, format.delimiter) });
  }
  const selectedRows = new Set(rowIndices);
  for (let index = 0; index < records.length; index++) if (!selectedRows.has(index)) {
    const record = records[index];
    replacements.push({ start: record.start, end: record.end + record.ending.length, text: '' });
  }
  for (let position = 0; position < rowIndices.length; position++) {
    const index = rowIndices[position];
    for (const [column, value] of [[timeColumn, outputRows[position][0]], [thrustColumn, outputRows[position][1]]]) {
      const selected = records[index].fields[column];
      if (value === selected.value) continue;
      replacements.push({ start: selected.start, end: selected.end, text: replacedCell(text.slice(selected.start, selected.end), value, format.delimiter) });
    }
  }
  if (markerRows.length) {
    const template = records[rowIndices[0]];
    const width = Math.max(template.fields.length, header?.fields.length ?? 0);
    const ending = template.ending || records.find(record => record.ending)?.ending || '\r\n';
    const prefix = markerRows.map(([time, thrust]) => Array.from({ length: width }, (_, index) => {
      const value = index === timeColumn ? time : index === thrustColumn ? thrust : '';
      const source = template.fields[index];
      return source ? replacedCell(text.slice(source.start, source.end), value, format.delimiter) : field(value, format.delimiter);
    }).join(format.delimiter) + ending).join('');
    replacements.push({ start: template.start, end: template.start, text: prefix });
  }
  return replaceCSVSpans(text, replacements);
}

/** Export selected original records, preserving source layout unless explicit conversion is requested. */
export function exportSourceCSV(points, source, markerPoints = [], options = {}) {
  const { includeHeader = true, formatMode = 'source', precision = 6 } = options;
  if (typeof includeHeader !== 'boolean') throw new Error('CSV header export must be true or false.');
  if (!['source', 'custom'].includes(formatMode)) throw new Error('Choose original or custom CSV formatting.');
  const format = normalizeCSVFormat(source, points);
  const rowIndices = options.rowIndices ?? points.map((_, index) => index);
  if (!Array.isArray(rowIndices) || rowIndices.length < 2 || rowIndices.some((index, position) => !Number.isInteger(index) || index < 0 || index >= points.length || position && index <= rowIndices[position - 1])) throw new Error('CSV export needs at least two ordered original measurements.');
  const timeUnit = formatMode === 'custom' ? options.timeUnit ?? 's' : format.timeUnit;
  const thrustUnit = formatMode === 'custom' ? options.thrustUnit ?? 'N' : format.thrustUnit;
  if (!Object.hasOwn(CSV_TIME_FACTORS, timeUnit) || !Object.hasOwn(CSV_THRUST_FACTORS, thrustUnit)) throw new Error('Unsupported export unit.');
  if (formatMode === 'custom' && (!Number.isInteger(precision) || precision < 0 || precision > 15)) throw new Error('Export precision must be an integer from 0 to 15.');
  const { delimiter, rows } = format;
  const timeDecimal = decimalFor(rows, 0), thrustDecimal = decimalFor(rows, 1);
  const precise = (value, decimal) => String(value).replace('.', decimal);
  const first = rowIndices[0];
  const outputRows = rowIndices.map(index => {
    const point = points[index], [time, sourceThrust] = rows[index];
    if (formatMode === 'custom') return [convertedClock(time, format.timeUnit, timeUnit, timeDecimal), convertedThrust(point.thrust, thrustUnit, precision, thrustDecimal)];
    const thrust = point.thrust === csvNumber(sourceThrust) * CSV_THRUST_FACTORS[thrustUnit] ? sourceThrust : formatCSVNumber(point.thrust / CSV_THRUST_FACTORS[thrustUnit], sourceThrust);
    return [time, thrust];
  });
  // Service precision stays independent of user rounding. Only unchanged source clocks reuse its style.
  const preferredMarkerTimes = markerPoints.map(point => formatCSVNumber(point.time / CSV_TIME_FACTORS[timeUnit], rows[first][0]));
  let previousPreferred = -Infinity, previousPreferredSI = -Infinity;
  const preferredTimesFit = formatMode === 'source' || timeUnit === format.timeUnit;
  const usePreferredTimes = preferredTimesFit && preferredMarkerTimes.every(token => {
    const time = csvNumber(token), timeSI = time * CSV_TIME_FACTORS[timeUnit];
    const valid = Number.isFinite(time) && Number.isFinite(timeSI) && time > previousPreferred && timeSI > previousPreferredSI && time < csvNumber(outputRows[0][0]) && timeSI < points[first].time;
    previousPreferred = time; previousPreferredSI = timeSI;
    return valid;
  });
  const markerRows = markerPoints.map((point, index) => [usePreferredTimes ? preferredMarkerTimes[index] : precise(point.time / CSV_TIME_FACTORS[timeUnit], timeDecimal), precise(point.thrust / CSV_THRUST_FACTORS[thrustUnit], thrustDecimal)]);
  let previous = -Infinity;
  for (const [time, thrust] of [...markerRows, ...outputRows]) {
    const value = csvNumber(time);
    if (!Number.isFinite(value) || value <= previous) throw new Error('Export units cannot represent these timestamps as finite, strictly increasing values.');
    if (!Number.isFinite(csvNumber(thrust))) throw new Error('Export units cannot represent these thrust values as finite numbers.');
    previous = value;
  }
  const headers = [format.timeHeader, format.thrustHeader];
  if (formatMode === 'custom') {
    headers[0] = unitHeader(headers[0], 'time', timeUnit);
    headers[1] = unitHeader(headers[1], 'thrust', thrustUnit);
  }
  if (format.layout) return exportLayoutCSV(format, rowIndices, outputRows, markerRows, includeHeader, headers);
  const header = format.hasHeader && includeHeader ? [headers] : [];
  return [...header, ...markerRows, ...outputRows].map(row => row.map(token => field(token, delimiter)).join(delimiter)).join('\r\n') + '\r\n';
}
