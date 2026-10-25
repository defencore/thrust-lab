const MAX_POINTS = 30_000;
const MAX_FILE_SIZE = 20_000_000;
const TIME_FACTORS = { s: 1, ms: 0.001, us: 0.000001 };
const THRUST_FACTORS = { N: 1, kN: 1000, kgf: 9.80665, lbf: 4.4482216152605 };
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

function cleanText(text) {
  if (typeof text !== 'string') throw new Error('CSV content must be text.');
  if (text.length > MAX_FILE_SIZE) throw new Error('This file exceeds the 20 MB limit.');
  const cleaned = text.replace(/^\uFEFF/, '');
  if (!cleaned.trim()) throw new Error('The CSV file is empty.');
  return cleaned;
}

function detectDelimiter(text) {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (char === '\n' || char === '\r') {
        if (Object.values(counts).some(Boolean)) break;
      } else if (char in counts) counts[char]++;
    }
  }
  // A semicolon can separate decimal-comma values, so prefer it when present.
  if (counts[';'] > 0) return ';';
  if (counts['\t'] > 0) return '\t';
  return ',';
}

function readRows(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  let explicitRow = false;
  function finishField() {
    row.push(field.trim());
    field = '';
    closedQuote = false;
  }
  function finishRow() {
    finishField();
    // Ignore blank physical lines, but retain separator-only measurement rows.
    if (explicitRow || row.length > 1 || row.some(value => value !== '')) rows.push(row);
    row = [];
    explicitRow = false;
    if (rows.length > MAX_POINTS + 1) throw new Error('CSV files are limited to 30,000 measurements.');
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else field += char;
    } else if (char === delimiter) finishField();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      finishRow();
    } else if (char === '"') {
      if (field.trim() || closedQuote) throw new Error('Unexpected quote in the CSV file.');
      field = '';
      quoted = true;
      explicitRow = true;
    } else if (closedQuote && char.trim()) {
      throw new Error('Unexpected text after a quoted CSV field.');
    } else field += char;
  }
  if (quoted) throw new Error('A quoted CSV field is not closed.');
  if (field || row.length || explicitRow) finishRow();
  if (!rows.length) throw new Error('The CSV file contains no measurements.');
  return rows;
}

function numberValue(value, delimiter) {
  if (typeof value !== 'string') return NaN;
  let normalized = value.trim();
  if (delimiter !== ',' && normalized.includes(',') && !normalized.includes('.')) normalized = normalized.replace(',', '.');
  return NUMBER.test(normalized) ? Number(normalized) : NaN;
}

function inspect(text, forcedDelimiter, headerOption) {
  const content = cleanText(text);
  const delimiter = forcedDelimiter ?? detectDelimiter(content);
  if (![',', ';', '\t'].includes(delimiter)) throw new Error('Choose comma, semicolon, or tab as the delimiter.');
  const rows = readRows(content, delimiter);
  if (rows[0].length < 2) throw new Error('The CSV needs at least two columns: time and thrust.');
  if (headerOption !== undefined && typeof headerOption !== 'boolean') throw new Error('Header presence must be true or false.');
  // A numeric field identifies a measurement row even when other columns contain labels.
  const hasHeader = headerOption ?? (rows[0].some(value => value !== '') && rows[0].every(value => !Number.isFinite(numberValue(value, delimiter))));
  const headers = hasHeader ? rows[0] : rows[0].map((_, index) => `Column ${index + 1}`);
  return { headers, rows: hasHeader ? rows.slice(1) : rows, delimiter, hasHeader };
}

export function inspectCSV(text, options = {}) {
  const { headers, rows, delimiter, hasHeader } = inspect(text, options.delimiter, options.hasHeader);
  return { headers, preview: rows.slice(0, 5), delimiter, hasHeader };
}

function resolveColumn(value, headers, pattern, fallback) {
  if (value !== undefined && value !== null && value !== '') {
    const index = typeof value === 'number' ? value : headers.indexOf(value);
    if (!Number.isInteger(index) || index < 0 || index >= headers.length) throw new Error('The selected CSV column does not exist.');
    return { index, inferred: false };
  }
  const index = headers.findIndex(header => pattern.test(header.trim()));
  return { index: index < 0 ? fallback : index, inferred: index < 0 };
}

function unitLabel(header, kind) {
  const text = header.trim();
  const bracket = text.match(/[\[(]([^()[\]]+)[\])]\s*$/);
  if (bracket) return bracket[1].trim();
  const suffix = text.match(/^(.+?)[_/]([^_/]+)$/);
  const columnName = kind === 'time' ? /^(?:time|timestamp|elapsed|elapsed_time|t)$/i : /^(?:thrust|force|load|f)$/i;
  if (suffix && columnName.test(suffix[1])) return suffix[2].trim();
  const normalized = text.replaceAll('_', ' ');
  const units = kind === 'time'
    ? /(?:^|\s)(s|ms|us|[µμ]s|seconds?|milliseconds?|microseconds?|ns|nanoseconds?|min|mins|minutes?|h|hr|hours?)\s*$/i
    : /(?:^|\s)(N|kN|kgf|lbf|newtons?|kilonewtons?|kilogram[- ]?force|pound[- ]?force|mN|[µμ]N|MN|dyn|dynes?)\s*$/i;
  return normalized.match(units)?.[1] ?? null;
}

function detectedTimeUnit(header) {
  const label = unitLabel(header, 'time');
  if (label == null) return 's';
  if (/^(?:us|[µμ]s|microseconds?)$/i.test(label)) return 'us';
  if (/^(?:ms|milliseconds?)$/i.test(label)) return 'ms';
  if (/^(?:s|seconds?)$/i.test(label)) return 's';
  throw new Error(`Unsupported time unit "${label}" in the CSV header. Select s, ms, or us explicitly to override it.`);
}

function detectedThrustUnit(header) {
  const label = unitLabel(header, 'thrust');
  if (label == null) return 'N';
  if (/^(?:kgf|kilogram[- ]?force)$/i.test(label)) return 'kgf';
  if (/^(?:lbf|pound[- ]?force)$/i.test(label)) return 'lbf';
  if (/^(?:kn|kilonewtons?)$/i.test(label)) return 'kN';
  if (/^(?:n|newtons?)$/i.test(label)) return 'N';
  throw new Error(`Unsupported thrust unit "${label}" in the CSV header. Select N, kN, kgf, or lbf explicitly to override it.`);
}

function validatePoints(points, label = 'Profile') {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two measurements.`);
  if (points.length > MAX_POINTS) throw new Error(`${label} exceeds the 30,000 measurement limit.`);
  return points.map((point, index) => {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust)) throw new Error(`${label} measurement ${index + 1} must contain finite time and thrust values.`);
    if (point.thrust < 0) throw new Error(`${label} measurement ${index + 1} has negative thrust.`);
    if (index && point.time <= points[index - 1].time) throw new Error(`${label} time must increase strictly; measurement ${index + 1} has a duplicate or reversed timestamp.`);
    return { time: point.time, thrust: point.thrust };
  });
}

export function parseCSV(text, options = {}) {
  const { headers, rows, delimiter, hasHeader } = inspect(text, options.delimiter, options.hasHeader);
  const warnings = [];
  const time = resolveColumn(options.timeColumn, headers, /^(?:time|timestamp|elapsed|seconds?|milliseconds?|microseconds?|t\b)/i, 0);
  const thrust = resolveColumn(options.thrustColumn, headers, /^(?:thrust|force|load|f\b)/i, 1);
  if (time.index === thrust.index) throw new Error('Time and thrust must use different columns.');
  if (time.inferred || thrust.inferred) warnings.push('Column names were not recognized. Check the selected time and thrust columns.');
  if (hasHeader && options.hasHeader === undefined && !/^(?:time|timestamp|elapsed|seconds?|milliseconds?|microseconds?|t(?:\b|_))/i.test(headers[time.index]) && !/^(?:thrust|force|load|f(?:\b|_))/i.test(headers[thrust.index])) {
    warnings.push('The first row was interpreted as custom column headers. Confirm the file has a header row before using these measurements.');
  }
  const timeUnit = !options.timeUnit || options.timeUnit === 'auto' ? detectedTimeUnit(headers[time.index]) : options.timeUnit;
  const thrustUnit = !options.thrustUnit || options.thrustUnit === 'auto' ? detectedThrustUnit(headers[thrust.index]) : options.thrustUnit;
  if (!(timeUnit in TIME_FACTORS)) throw new Error('Unsupported time unit. Use s, ms, or us.');
  if (!(thrustUnit in THRUST_FACTORS)) throw new Error('Unsupported thrust unit. Use N, kN, kgf, or lbf.');
  const points = rows.map((row, index) => {
    const rowNumber = index + (hasHeader ? 2 : 1);
    const timeValue = numberValue(row[time.index], delimiter);
    const thrustValue = numberValue(row[thrust.index], delimiter);
    if (!Number.isFinite(timeValue) || !Number.isFinite(thrustValue)) throw new Error(`CSV row ${rowNumber} has a missing or invalid time or thrust value.`);
    return { time: timeValue * TIME_FACTORS[timeUnit], thrust: thrustValue * THRUST_FACTORS[thrustUnit] };
  });
  return { points: validatePoints(points), headers, timeColumn: time.index, thrustColumn: thrust.index, warnings };
}

export function exportCSV(points, { timeUnit = 's', thrustUnit = 'N', delimiter = ',', precision = 6 } = {}) {
  const validated = validatePoints(points);
  if (!(timeUnit in TIME_FACTORS) || !(thrustUnit in THRUST_FACTORS)) throw new Error('Unsupported export unit.');
  if (![',', ';', '\t'].includes(delimiter)) throw new Error('Unsupported export delimiter.');
  if (!Number.isInteger(precision) || precision < 0 || precision > 15) throw new Error('Export precision must be an integer from 0 to 15.');
  // Preserve timestamp precision so export never merges distinct measurements.
  const rows = validated.map(point => `${point.time / TIME_FACTORS[timeUnit]}${delimiter}${Number((point.thrust / THRUST_FACTORS[thrustUnit]).toFixed(precision))}`);
  return [`Time (${timeUnit})${delimiter}Thrust (${thrustUnit})`, ...rows].join('\r\n') + '\r\n';
}

export function downloadFile(filename, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function validateGenerator(value, depth = 0) {
  if (depth > 8) throw new Error('Project generator settings are too deeply nested.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length <= MAX_POINTS) return value.map(item => validateGenerator(item, depth + 1));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Project contains an invalid setting name.');
      result[key] = validateGenerator(item, depth + 1);
    }
    return result;
  }
  throw new Error('Project contains invalid generator settings.');
}

function validateCurveEdit(value, points) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.nodes) || value.nodes.length < 2 || value.nodes.length > 128 || !['smooth', 'linear'].includes(value.interpolation)) throw new Error('Project curve edit needs 2 to 128 control points and smooth or linear interpolation.');
  let range = null;
  if (value.range != null) {
    if (!Array.isArray(value.range) || value.range.length !== 2 || !value.range.every(Number.isFinite) || value.range[0] >= value.range[1] || value.range[0] < points[0].time || value.range[1] > points.at(-1).time) throw new Error('Project curve edit range must be a valid time range inside the profile.');
    range = [...value.range];
  }
  const nodes = validatePoints(value.nodes, 'Project curve control points');
  const timestamps = new Set(points.map(point => point.time));
  const bounds = range || [points[0].time, points.at(-1).time];
  if (nodes.some(node => !timestamps.has(node.time) || node.time < bounds[0] || node.time > bounds[1])) throw new Error('Project curve control points must use existing timestamps inside the edit range.');
  return { nodes, range, interpolation: value.interpolation };
}

export function parseProject(text) {
  if (typeof text !== 'string' || text.length > MAX_FILE_SIZE) throw new Error('Project files must be text smaller than 20 MB.');
  let project;
  try { project = JSON.parse(text); }
  catch { throw new Error('This is not a valid Thrust Lab project file.'); }
  if (!project || project.version !== 1) throw new Error('Unsupported project version. This studio opens version 1 projects.');
  const points = validatePoints(project.points);
  const name = typeof project.name === 'string' && project.name.trim() ? project.name.trim().slice(0, 200) : 'Untitled profile';
  let selection = null;
  if (project.selection != null) {
    if (!Array.isArray(project.selection) || project.selection.length !== 2 || !project.selection.every(Number.isFinite) || project.selection[0] >= project.selection[1] || project.selection[0] < points[0].time || project.selection[1] > points.at(-1).time) throw new Error('Project selection must be a valid time range inside the profile.');
    selection = [...project.selection];
  }
  const scope = project.scope === undefined ? (selection ? 'selection' : 'all') : project.scope;
  if (!['all', 'selection'].includes(scope) || (scope === 'selection' && !selection)) throw new Error('Project edit scope must be all, or selection with an existing selected range.');
  const showTheory = project.showTheory === undefined ? true : project.showTheory;
  const showOriginal = project.showOriginal === undefined ? false : project.showOriginal;
  if (typeof showTheory !== 'boolean' || typeof showOriginal !== 'boolean') throw new Error('Project curve visibility settings must be true or false.');
  const generatorPending = project.generatorPending === undefined ? false : project.generatorPending;
  if (typeof generatorPending !== 'boolean') throw new Error('Project pending generator state must be true or false.');
  const alignment = project.theoryAlignment === undefined ? { mode: 'source', offset: 0 } : project.theoryAlignment;
  if (!alignment || typeof alignment !== 'object' || Array.isArray(alignment) || !['source', 'start', 'ignition'].includes(alignment.mode) || !Number.isFinite(alignment.offset) || Math.abs(alignment.offset) > 1e9) throw new Error('Project theory alignment needs source, start, or ignition mode and a finite offset within ±1,000,000,000 seconds.');
  const theoryAlignment = { mode: alignment.mode, offset: alignment.offset };
  const curveEdit = validateCurveEdit(project.curveEdit, points);
  const result = { version: 1, name, points, theory: project.theory == null ? null : validatePoints(project.theory, 'Theory'), selection, scope, showTheory, showOriginal, generatorPending, theoryAlignment, curveEdit };
  if (project.original != null) result.original = validatePoints(project.original, 'Original profile');
  if (project.generator != null) result.generator = validateGenerator(project.generator);
  return result;
}

export function serializeProject(state) {
  const project = { version: 1, name: state.name, points: state.points, theory: state.theory, selection: state.selection, scope: state.scope, showTheory: state.showTheory, showOriginal: state.showOriginal, original: state.original, generator: state.generator, generatorPending: state.generatorPending, theoryAlignment: state.theoryAlignment, curveEdit: state.curveEdit };
  return JSON.stringify(parseProject(JSON.stringify(project)), null, 2) + '\n';
}
