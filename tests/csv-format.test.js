import test from 'node:test';
import assert from 'node:assert/strict';
import { csvNumber, formatCSVNumber, normalizeCSVFormat } from '../src/csv-format.js';
import { parseCSV, exportCSV, parseProject, serializeProject } from '../src/csv.js';

const withoutMarker = (points, csvFormat, extra = {}) => exportCSV(points, { csvFormat, syntheticMarker: false, ...extra });

test('source milliseconds stay verbatim and edited thrust retains one decimal place', () => {
  const imported = parseCSV('Time (ms);Thrust (N)\n4084;943.0\n4085;944.0');
  const points = structuredClone(imported.points);
  points[0].thrust = 943.062;
  assert.equal(withoutMarker(points, imported.csvFormat), 'Time (ms);Thrust (N)\n4084;943.1\n4085;944.0');
  assert.equal(imported.points[0].time, 4.0840000000000005);
  assert.equal(imported.csvFormat.rows[0][0], '4084');
});

test('fixed source decimals, decimal commas and trailing zeroes survive unchanged and edited values', () => {
  for (const decimal of ['.', ',']) {
    const text = `Time (s);Thrust (N)\r\n0${decimal}0000;00${decimal}00\r\n0${decimal}0100;12${decimal}50\r\n0${decimal}0200;0${decimal}00\r\n`;
    const imported = parseCSV(text);
    assert.equal(withoutMarker(imported.points, imported.csvFormat), text);
    const edited = structuredClone(imported.points);
    edited[0].thrust = 3.2; edited[1].thrust = 13.236;
    assert.equal(withoutMarker(edited, imported.csvFormat), `Time (s);Thrust (N)\r\n0${decimal}0000;03${decimal}20\r\n0${decimal}0100;13${decimal}24\r\n0${decimal}0200;0${decimal}00\r\n`);
  }
});

test('individual row styles preserve mixed decimal counts instead of inventing one column precision', () => {
  const imported = parseCSV('Time (s),Thrust (N)\n0.000,0\n0.0100,1.00\n0.020000,+002.500');
  const edited = imported.points.map(point => ({ ...point, thrust: 3.45678 }));
  assert.equal(withoutMarker(edited, imported.csvFormat), 'Time (s),Thrust (N)\n0.000,3\n0.0100,3.46\n0.020000,+003.457');
});

test('scientific notation retains decimal count, exponent case, sign and padding', () => {
  for (const [value, source, expected] of [
    [2500, '1.2300E+003', '2.5000E+003'],
    [2500, '12.30e+02', '25.00e+02'],
    [25, '.1230e+02', '.2500e+02'],
    [.00001234, '1,230E-003', '1,234E-005'],
    [200, '+0001.20E+002', '+0002.00E+002'],
    [999.99, '1.0e+00', '1.0e+03'],
    [0, '1.000E+003', '0.000E+003'],
    [5e-324, '1.00e-003', '5.00e-324'],
  ]) assert.equal(formatCSVNumber(value, source), expected);
});

test('fixed format handles tiny and huge values without switching to exponent notation', () => {
  assert.equal(formatCSVNumber(1e21, '0.00'), '1000000000000000000000.00');
  assert.equal(formatCSVNumber(1e-120, `0.${'0'.repeat(125)}`), `0.${'0'.repeat(119)}1${'0'.repeat(5)}`);
  assert.equal(formatCSVNumber(.005, '.000'), '.005');
  assert.equal(formatCSVNumber(1.5, '+000.'), '+002.');
});

test('quoted decimal-comma CSV fields remain decimal values and are quoted correctly on export', () => {
  const imported = parseCSV('Time (s),Thrust (N)\n"0,000","0,00"\n"0,010","12,50"');
  assert.deepEqual(imported.points, [{ time: 0, thrust: 0 }, { time: .01, thrust: 12.5 }]);
  const points = [{ ...imported.points[0], thrust: 3.25 }, imported.points[1]];
  const exported = withoutMarker(points, imported.csvFormat);
  assert.equal(exported, 'Time (s),Thrust (N)\n"0,000","3,25"\n"0,010","12,50"');
  assert.deepEqual(parseCSV(exported).points, points);
  assert.ok(Number.isNaN(csvNumber('1,2,3')));
  assert.ok(Number.isNaN(csvNumber('1,234.56')));
});

test('source units, separator and header presence remain authoritative over custom export settings', () => {
  const imported = parseCSV('0,000\t0,00\n10,000\t1,50', { timeUnit: 'ms', thrustUnit: 'kgf' });
  const changed = structuredClone(imported.points); changed[1].thrust = 2 * 9.80665;
  assert.equal(withoutMarker(changed, imported.csvFormat, { timeUnit: 'us', thrustUnit: 'N', delimiter: ',', precision: 9 }), '0,000\t0,00\n10,000\t2,00');
});

test('complete marker prefixes do not contaminate source precision and stay detectable after export', () => {
  const imported = parseCSV('Time (ms);Thrust (N)\n4084;943,0\n4085;944,0');
  const changed = structuredClone(imported.points); changed[0].thrust = 943.062;
  const marked = exportCSV(changed, { csvFormat: imported.csvFormat });
  const again = parseCSV(marked);
  assert.equal(again.syntheticMarker.detected, true);
  assert.equal(again.csvFormat.rows.length, 2);
  assert.deepEqual(again.csvFormat.rows, [['4084', '943,1'], ['4085', '944,0']]);
  assert.equal(again.points[0].thrust, 943.1);
  assert.equal(marked.trim().split(/\r?\n/).length, 13);
  assert.equal(parseCSV(exportCSV(again.points, { csvFormat: again.csvFormat })).csvFormat.rows.length, 2);
});

test('service timestamps follow source clock formatting when ten distinct prefix records fit', () => {
  for (const [input, expected] of [
    ['Time (ms);Thrust (N)\n4084;943.0\n4085;944.0', Array.from({ length: 10 }, (_, index) => String(4074 + index))],
    ['Time (s);Thrust (N)\n0.0000;1.0\n0.0010;2.0', Array.from({ length: 10 }, (_, index) => `-${((10 - index) / 1000).toFixed(4)}`)],
    ['Time (s);Thrust (N)\n0,0000;1,0\n0,0010;2,0', Array.from({ length: 10 }, (_, index) => `-${((10 - index) / 1000).toFixed(4)}`.replace('.', ','))],
  ]) {
    const imported = parseCSV(input), exported = exportCSV(imported.points, { csvFormat: imported.csvFormat });
    const rows = exported.trim().split(/\r?\n/).slice(1).map(row => row.split(';'));
    assert.deepEqual(rows.slice(0, 10).map(row => row[0]), expected);
    assert.equal(rows[10][0], imported.csvFormat.rows[0][0]);
    const decoded = parseCSV(exported);
    assert.equal(decoded.syntheticMarker.detected, true);
    assert.deepEqual(decoded.points, imported.points);
  }
});

test('service timestamps retain precision when the source clock format would merge prefix records', () => {
  const imported = parseCSV('Time (s);Thrust (N)\n0;1.0\n1;2.0');
  const exported = exportCSV(imported.points, { csvFormat: imported.csvFormat });
  const rows = exported.trim().split(/\r?\n/).slice(1).map(row => row.split(';'));
  const serviceTimes = rows.slice(0, 10).map(row => Number(row[0]));
  assert.equal(new Set(serviceTimes).size, 10);
  assert.ok(serviceTimes.every((time, index) => time < 0 && (!index || time > serviceTimes[index - 1])));
  assert.equal(rows[10][0], '0');
  assert.equal(rows[11][0], '1');
  const decoded = parseCSV(exported);
  assert.equal(decoded.syntheticMarker.detected, true);
  assert.deepEqual(decoded.points, imported.points);
});

test('source timestamps preserve precision beyond display decimals and reject a changed measurement grid', () => {
  const imported = parseCSV('Time (s);Thrust (N)\n0.000000000000000001;1.0\n0.000000000000000002;2.0');
  const exported = withoutMarker(imported.points, imported.csvFormat);
  assert.ok(exported.includes('0.000000000000000001;1.0'));
  assert.ok(exported.includes('0.000000000000000002;2.0'));
  const moved = structuredClone(imported.points); moved[0].time /= 2;
  assert.throws(() => withoutMarker(moved, imported.csvFormat), /timestamp sequence/);
});

test('native projects and canonical snapshots retain compact source formatting after edits', () => {
  const imported = parseCSV('Time (ms);Thrust (kgf)\n4084;0,00\n4085;12,50');
  const points = structuredClone(imported.points); points[1].thrust = 15.23 * 9.80665;
  const state = { name: 'Import', points, csvFormat: imported.csvFormat };
  for (const syntheticMarker of [false, true]) {
    const restored = parseProject(serializeProject(state, { syntheticMarker }));
    assert.deepEqual(restored.csvFormat, imported.csvFormat);
    assert.equal(withoutMarker(restored.points, restored.csvFormat), 'Time (ms);Thrust (kgf)\n4084;0,00\n4085;15,23');
    restored.csvFormat.rows[0][0] = 'modified';
    assert.equal(imported.csvFormat.rows[0][0], '4084');
  }
  assert.ok(!Object.hasOwn(parseProject(serializeProject({ points, csvFormat: null })), 'csvFormat'));
});

test('invalid and stale source format metadata is rejected before exporting or loading a project', () => {
  const imported = parseCSV('Time,Thrust\n0,1\n1,2');
  for (const patch of [{ version: 2 }, { delimiter: '|' }, { hasHeader: 'yes' }, { timeUnit: 'min' }, { timeUnit: ['s'] }, { thrustUnit: ['N'] }, { thrustUnit: 'kg' }, { rows: [['0', '1']] }, { rows: [['0', '1'], ['0', '2']] }, { rows: [['0', '1'], ['1', '-1']] }, { rows: [['0', '1'], ['1', 'Infinity']] }, { rows: [['0', '1'], ['1', '2', 'extra']] }, { rows: [['0', '1'], ['1', ' 2']] }]) {
    const csvFormat = { ...imported.csvFormat, ...patch };
    assert.throws(() => normalizeCSVFormat(csvFormat, imported.points), /CSV source format/);
    assert.throws(() => parseProject(JSON.stringify({ version: 1, points: imported.points, csvFormat })), /CSV source format/);
  }
  assert.throws(() => formatCSVNumber(Infinity, '0.0'), /nonfinite CSV/);
});

test('lossless source layout retains every column, quote, space, blank record and line ending', () => {
  const header = '"Notes";"pressure";"Time (ms)";"Thrust (kgf)"\r\n';
  const text = '\uFEFF \r\n' + header + '  " multiline\r\n note ""A"" " ; 03,50 ; 004084 ; " 009,40 " \n"unchanged" ;0;004085; "0,00"\r \t';
  const imported = parseCSV(text);
  assert.equal(withoutMarker(imported.points, imported.csvFormat), text);
  const points = structuredClone(imported.points);
  points[0].thrust = 10.2 * 9.80665;
  assert.equal(withoutMarker(points, imported.csvFormat), text.replace('009,40', '010,20'));
  assert.equal(withoutMarker(points, imported.csvFormat, { includeHeader: false }), text.replace(header, '').replace('009,40', '010,20'));
  assert.deepEqual(imported.csvFormat.rows, [['004084', '009,40'], ['004085', '0,00']]);
});

test('reordered and variable auxiliary columns remain untouched after editing a selected thrust cell', () => {
  const text = 'pressure,thrust_N,time_ms,notes\n001.00,01.20,004084,"a,b"\n002.00,00.00,004085,"second\nline ""q""",overflow';
  const imported = parseCSV(text);
  assert.equal(imported.timeColumn, 2);
  assert.equal(imported.thrustColumn, 1);
  assert.equal(withoutMarker(imported.points, imported.csvFormat), text);
  const points = structuredClone(imported.points);
  points[1].thrust = 3.456;
  const expected = text.replace('002.00,00.00,004085', '002.00,03.46,004085');
  assert.equal(withoutMarker(points, imported.csvFormat), expected);
  assert.equal(withoutMarker(points, imported.csvFormat, { includeHeader: false }), expected.slice(expected.indexOf('\n') + 1));
});

test('headerless layouts remain byte-identical whether headers are requested or omitted', () => {
  for (const text of ['\uFEFF"004084"\t"01,20"\tlabel\r\n004085\t00,00\t"last"', '004084;01.20;001.00\r004085;00.00;002.00\r']) {
    const imported = parseCSV(text, { timeUnit: 'ms' });
    assert.equal(imported.csvFormat.hasHeader, false);
    assert.equal(withoutMarker(imported.points, imported.csvFormat), text);
    assert.equal(withoutMarker(imported.points, imported.csvFormat, { includeHeader: false }), text);
  }
});

test('optional synthetic records preserve reordered source schema and do not accumulate', () => {
  const text = '\uFEFFpressure;Thrust (N);Time (ms);notes\n003;001.20;4084;"a;b"\n004;000.00;4085;"last"';
  const imported = parseCSV(text);
  const marked = exportCSV(imported.points, { csvFormat: imported.csvFormat });
  const decoded = parseCSV(marked);
  assert.equal(decoded.syntheticMarker.detected, true);
  assert.deepEqual(decoded.points, imported.points);
  assert.equal(withoutMarker(decoded.points, decoded.csvFormat), text);
  const records = marked.slice(1).split('\n');
  assert.equal(records.length, 13);
  assert.equal(records[0], 'pressure;Thrust (N);Time (ms);notes');
  for (const record of records.slice(1, 11)) {
    const fields = record.split(';');
    assert.equal(fields.length, 4);
    assert.equal(fields[0], '');
    assert.equal(fields[3], '""');
  }
  const noHeader = exportCSV(imported.points, { csvFormat: imported.csvFormat, includeHeader: false });
  const again = parseCSV(noHeader, { timeColumn: 2, thrustColumn: 1, timeUnit: 'ms', hasHeader: false });
  assert.equal(again.syntheticMarker.detected, true);
  assert.equal(withoutMarker(again.points, again.csvFormat), text.replace('pressure;Thrust (N);Time (ms);notes\n', ''));
});

test('native projects retain lossless layouts while older two-column metadata remains usable', () => {
  const text = '\uFEFFnote;time_ms;thrust_N;pressure\n"one";4084;001.20;003.00\n"two";4085;000.00;004.00';
  const imported = parseCSV(text);
  const points = structuredClone(imported.points); points[1].thrust = 3.456;
  for (const syntheticMarker of [false, true]) {
    const restored = parseProject(serializeProject({ points, csvFormat: imported.csvFormat }, { syntheticMarker }));
    assert.deepEqual(restored.csvFormat.layout, imported.csvFormat.layout);
    assert.equal(withoutMarker(restored.points, restored.csvFormat), text.replace('4085;000.00', '4085;003.46'));
  }
  const legacy = structuredClone(imported.csvFormat); delete legacy.layout;
  assert.equal(withoutMarker(points, legacy, { includeHeader: false }), '4084;001.20\r\n4085;003.46\r\n');
});

test('stored layout must agree with mappings, headers and every original numeric token', () => {
  const imported = parseCSV('time_ms;thrust_N;pressure\n4084;001.20;3\n4085;000.00;4');
  for (const layout of [
    null, [], { text: 42, timeColumn: 0, thrustColumn: 1 },
    { ...imported.csvFormat.layout, timeColumn: -1 },
    { ...imported.csvFormat.layout, timeColumn: 1 },
    { ...imported.csvFormat.layout, thrustColumn: 20 },
    { ...imported.csvFormat.layout, text: imported.csvFormat.layout.text.replace('time_ms', 'wrong') },
    { ...imported.csvFormat.layout, text: imported.csvFormat.layout.text.replace('4084', '04084') },
    { ...imported.csvFormat.layout, text: imported.csvFormat.layout.text.replace('001.20', '1.20') },
    { ...imported.csvFormat.layout, text: imported.csvFormat.layout.text + '\n4086;0;5' },
    { ...imported.csvFormat.layout, text: '"not closed' },
  ]) {
    const csvFormat = { ...imported.csvFormat, layout };
    assert.throws(() => normalizeCSVFormat(csvFormat, imported.points), /CSV source format/);
    assert.throws(() => parseProject(JSON.stringify({ version: 1, points: imported.points, csvFormat })), /CSV source format/);
  }
});

test('explicit custom units convert selected columns and retain the original layout and auxiliary values', () => {
  const text = '\uFEFFtime_s;pressure;thrust_N\n 0.1000 ; 005.60 ; " 98.0665 " \r\n0.2000;006.70;49.03325';
  const imported = parseCSV(text), before = structuredClone(imported);
  const converted = withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', timeUnit: 'ms', thrustUnit: 'kgf', precision: 2, delimiter: '\t' });
  assert.equal(converted, '\uFEFFtime_ms;pressure;thrust_kgf\n 100 ; 005.60 ; " 10.00 " \r\n200;006.70;5.00');
  const again = parseCSV(converted);
  for (let index = 0; index < imported.points.length; index++) {
    assert.equal(again.points[index].time, imported.points[index].time);
    assert.ok(Math.abs(again.points[index].thrust - imported.points[index].thrust) < 1e-12);
  }
  assert.deepEqual(imported, before);
  assert.equal(withoutMarker(imported.points, imported.csvFormat, { formatMode: 'source', timeUnit: 'ms', thrustUnit: 'kgf', precision: 2 }), text);
});

test('source clock conversion uses lexical decimal shifts without binary float artifacts', () => {
  const imported = parseCSV('Time (ms),Thrust (N),notes\r\n4084,0,"a,b"\r\n4085,98.0665,"c"');
  assert.equal(imported.points[0].time, 4.0840000000000005);
  assert.equal(withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', timeUnit: 's', thrustUnit: 'kgf', precision: 1 }), 'Time (s),Thrust (kgf),notes\r\n4.084,0.0,"a,b"\r\n4.085,10.0,"c"');
  const fine = parseCSV('time_s,thrust_N\n1.234567890123450,1\n1.234567890123451,2');
  const converted = withoutMarker(fine.points, fine.csvFormat, { formatMode: 'custom', timeUnit: 'ms', precision: 0 });
  assert.equal(converted, 'time_ms,thrust_N\n1234.56789012345,1\n1234.567890123451,2');
  assert.ok(parseCSV(converted).points[0].time < parseCSV(converted).points[1].time);
  const scientific = parseCSV('Time [ms],Force [N]\n1.2340E+003,4.4482216152605\n1.2350E+003,8.896443230521');
  assert.equal(withoutMarker(scientific.points, scientific.csvFormat, { formatMode: 'custom', timeUnit: 's', thrustUnit: 'lbf', precision: 3 }), 'Time [s],Force [lbf]\n1.234,1.000\n1.235,2.000');
});

test('custom decimal-comma output quotes newly fractional cells without damaging other columns', () => {
  const imported = parseCSV('Time (ms),Thrust (N),pressure\n0,0,1\n"100,0","98,0665",2\n200,49.03325,3');
  const converted = withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', timeUnit: 's', thrustUnit: 'kgf', precision: 2 });
  assert.equal(converted, 'Time (s),Thrust (kgf),pressure\n0,"0,00",1\n"0,1","10,00",2\n"0,2","5,00",3');
  const again = parseCSV(converted);
  assert.deepEqual(again.points.map(point => point.time), [0, .1, .2]);
  assert.ok(Math.abs(again.points[1].thrust - 98.0665) < 1e-12);
});

test('custom thrust formatting keeps unchanged-unit clock tokens exact and headerless files headerless', () => {
  const text = '\uFEFF"0,0000"\t0,00\tfirst\n"0,0100"\t98,0665\tsecond';
  const imported = parseCSV(text);
  assert.equal(withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', timeUnit: 's', thrustUnit: 'kgf', precision: 1, includeHeader: true }), '\uFEFF"0,0000"\t0,0\tfirst\n"0,0100"\t10,0\tsecond');
  const plain = parseCSV('time,thrust,pressure\n0,0,3\n.1,98.0665,4');
  const converted = withoutMarker(plain.points, plain.csvFormat, { formatMode: 'custom', timeUnit: 'ms', thrustUnit: 'kgf', precision: 2 });
  assert.equal(converted, 'time (ms),thrust (kgf),pressure\n0,0.00,3\n100,10.00,4');
  assert.equal(parseCSV(converted).points[1].time, .1);
});

test('source and custom range exports keep only original rows without resampling or rebasing time', () => {
  const text = 'time_ms,force_N,pressure\n0,00.0,P0\n1000,01.0,P1\n2000,02.0,P2\n3000,03.00,P3\n4000,04.0,P4';
  const imported = parseCSV(text), before = structuredClone(imported);
  assert.equal(withoutMarker(imported.points, imported.csvFormat, { range: [1.5, 3.5] }), 'time_ms,force_N,pressure\n2000,02.0,P2\n3000,03.00,P3\n');
  assert.equal(withoutMarker(imported.points, imported.csvFormat, { range: [2, 3], includeHeader: false }), '2000,02.0,P2\n3000,03.00,P3\n');
  assert.equal(withoutMarker(imported.points, imported.csvFormat, { range: [1.5, 3.5], formatMode: 'custom', timeUnit: 's', thrustUnit: 'kN', precision: 4 }), 'time_s,force_kN,pressure\n2,0.0020,P2\n3,0.0030,P3\n');
  const marked = exportCSV(imported.points, { csvFormat: imported.csvFormat, range: [1.5, 3.5], includeHeader: false });
  const parsed = parseCSV(marked, { hasHeader: false, timeUnit: 'ms' });
  assert.equal(parsed.syntheticMarker.detected, true);
  assert.deepEqual(parsed.points, imported.points.slice(2, 4));
  assert.deepEqual(imported, before);
});

test('invalid conversion modes, crop ranges and stale metadata fail without modifying a profile', () => {
  const imported = parseCSV('time_ms,thrust_N,pressure\n0,0,1\n1000,1,2\n2000,2,3\n3000,0,4');
  const before = structuredClone(imported);
  for (const range of [[0, 0], [-1, 1], [1, 4], [NaN, 1], ['0', 1], [.1, .2]]) assert.throws(() => withoutMarker(imported.points, imported.csvFormat, { range }), /CSV export/);
  assert.throws(() => withoutMarker(imported.points, imported.csvFormat, { formatMode: 'other' }), /original or custom/);
  assert.throws(() => exportCSV(imported.points, { formatMode: 'source' }), /unavailable/);
  assert.throws(() => withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', timeUnit: 'min' }), /Unsupported export unit/);
  assert.throws(() => withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', precision: -1 }), /precision/);
  const stale = structuredClone(imported.csvFormat); stale.rows[0][0] = '1';
  assert.throws(() => withoutMarker(imported.points, stale, { range: [1, 3] }), /timestamp sequence/);
  const corrupt = structuredClone(imported.csvFormat); corrupt.layout.thrustColumn = 2;
  assert.throws(() => withoutMarker(imported.points, corrupt, { range: [1, 3], formatMode: 'custom' }), /source format/);
  assert.deepEqual(imported, before);
});

test('custom headers state the chosen units even when original labels were overridden during import', () => {
  const imported = parseCSV('Time [ms],Force (lbf),pressure\n0,0,3\n1,9.80665,4', { timeUnit: 's', thrustUnit: 'N' });
  const converted = withoutMarker(imported.points, imported.csvFormat, { formatMode: 'custom', timeUnit: 's', thrustUnit: 'N', precision: 5 });
  assert.equal(converted, 'Time [s],Force (N),pressure\n0,0.00000,3\n1,9.80665,4');
  assert.deepEqual(parseCSV(converted).points, imported.points);
});

test('converted original clocks fail rather than collapsing distinct timestamps or emitting infinity', () => {
  const dense = parseCSV('time_s,thrust_N\n1000000000000002.625,0\n1000000000000002.750,1');
  assert.ok(dense.points[0].time < dense.points[1].time);
  assert.throws(() => withoutMarker(dense.points, dense.csvFormat, { formatMode: 'custom', timeUnit: 'ms' }), /finite, strictly increasing/);
  const huge = parseCSV('time_s,thrust_N\n1e308,0\n1.5e308,1');
  assert.throws(() => withoutMarker(huge.points, huge.csvFormat, { formatMode: 'custom', timeUnit: 'us' }), /finite, strictly increasing/);
});

test('optional markers remain detectable after custom source conversions and cropping', () => {
  const imported = parseCSV('pressure,time_ms,thrust_N\n5,1000,0\n6,1001,9.80665\n7,1002,19.6133\n8,1003,0');
  const range = [imported.points[1].time, imported.points[2].time];
  for (const timeUnit of ['s', 'ms', 'us']) for (const thrustUnit of ['N', 'kN', 'kgf', 'lbf']) {
    const converted = exportCSV(imported.points, { csvFormat: imported.csvFormat, formatMode: 'custom', range, timeUnit, thrustUnit, precision: 6 });
    const parsed = parseCSV(converted);
    assert.equal(parsed.syntheticMarker.detected, true, `${timeUnit}/${thrustUnit}`);
    assert.equal(parsed.points.length, 2);
    for (let index = 0; index < 2; index++) assert.ok(Math.abs(parsed.points[index].time - imported.points[index + 1].time) < 1e-12);
    const records = converted.split('\n');
    const clocks = timeUnit === 's' ? ['1.001', '1.002'] : timeUnit === 'ms' ? ['1001', '1002'] : ['1001000', '1002000'];
    assert.deepEqual(records.slice(-3, -1).map(record => record.split(',').slice(0, 2)), [['6', clocks[0]], ['7', clocks[1]]]);
    assert.equal(records.at(-1), '');
  }
});
