import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, inspectCSV, exportCSV, serializeProject, parseProject } from '../src/csv.js';
import { createSyntheticMarker, inspectSyntheticMarker } from '../src/synthetic-marker.js';

test('detects quoted headers, BOM, units, and Windows newlines', () => {
  const result = parseCSV('\uFEFF"Time (ms)","Thrust (kgf)",Comment\r\n0,0,"Ready, set"\r\n10,2,"Burn"\r\n20,0,End\r\n');
  assert.deepEqual(result.points.map(point => point.time), [0, .01, .02]);
  assert.equal(result.points[1].thrust, 19.6133);
  assert.equal(result.timeColumn, 0);
  assert.equal(result.thrustColumn, 1);
  assert.deepEqual(result.warnings, []);
});

test('reads semicolon decimal-comma values and explicit column mapping', () => {
  const text = 'Sensor;Elapsed (s);Force (N)\nA;0,0;0\nB;0,25;12,5\nC;0,5;0';
  const inspected = inspectCSV(text);
  assert.equal(inspected.delimiter, ';');
  assert.deepEqual(inspected.preview[1], ['B', '0,25', '12,5']);
  const { points } = parseCSV(text, { timeColumn: 'Elapsed (s)', thrustColumn: 2 });
  assert.deepEqual(points, [{ time: 0, thrust: 0 }, { time: .25, thrust: 12.5 }, { time: .5, thrust: 0 }]);
});

test('supports headerless TSV and microsecond units', () => {
  const text = '0\t0\n1000\t5\n2000\t0';
  assert.equal(inspectCSV(text).hasHeader, false);
  assert.deepEqual(parseCSV(text, { timeUnit: 'us' }).points.map(point => point.time), [0, .001, .002]);
  assert.equal(parseCSV('Time (µs),Thrust (kN)\n0,0\n1000,1').points[1].thrust, 1000);
});

test('recognizes underscore-separated column units', () => {
  assert.deepEqual(parseCSV('time_ms,thrust_kN\n0,0\n10,2').points, [{ time: 0, thrust: 0 }, { time: .01, thrust: 2000 }]);
  assert.ok(Math.abs(parseCSV('elapsed_time_us,force_kgf\n0,0\n10,2').points[1].time - .00001) < 1e-18);
});

test('rejects unsupported explicit header units unless overridden', () => {
  const text = 'Time(min),Thrust(mN)\n0,0\n1,2';
  assert.throws(() => parseCSV(text), /Unsupported time unit "min"/);
  assert.throws(() => parseCSV(text, { timeUnit: 's' }), /Unsupported thrust unit "mN"/);
  assert.deepEqual(parseCSV(text, { timeUnit: 's', thrustUnit: 'N' }).points, [{ time: 0, thrust: 0 }, { time: 1, thrust: 2 }]);
  assert.throws(() => parseCSV('time_min,thrust_N\n0,0\n1,2'), /Unsupported time unit/);
  assert.throws(() => parseCSV('Time [seconds],Thrust [dyn]\n0,0\n1,2'), /Unsupported thrust unit/);
});

test('allows blank physical lines but rejects separator-only measurement rows', () => {
  assert.equal(parseCSV('Time,Thrust\n0,1\n\n  \n2,0').points.length, 2);
  assert.throws(() => parseCSV('Time,Thrust\n0,1\n,\n2,0'), /missing or invalid/);
  assert.throws(() => parseCSV('Time;Thrust\n0;1\n ; \n2;0'), /missing or invalid/);
  assert.throws(() => parseCSV(',\n0,1\n2,0'), /row 1/);
  assert.throws(() => parseCSV('Time,Thrust\n0,1\n""\n2,0'), /missing or invalid/);
});

test('retains a headerless first measurement when other columns contain text', () => {
  const result = parseCSV('Start,0,0\nBurn,1,4\nEnd,2,0', { timeColumn: 1, thrustColumn: 2 });
  assert.deepEqual(result.points.map(point => point.time), [0, 1, 2]);
  assert.throws(() => parseCSV('0,bad\n1,3\n2,0'), /row 1/);
});

test('warns about inferred custom headers and supports an explicit header decision', () => {
  const text = 'bad,bad\n1,4\n2,0';
  assert.match(parseCSV(text).warnings.join(' '), /interpreted as custom column headers/);
  assert.match(parseCSV(text, { timeColumn: 0, thrustColumn: 1 }).warnings.join(' '), /header row/);
  assert.throws(() => parseCSV(text, { hasHeader: false }), /row 1/);
  const custom = 'Clock,Sensor\n0,0\n1,3';
  assert.deepEqual(parseCSV(custom, { hasHeader: true, timeColumn: 'Clock', thrustColumn: 'Sensor' }).warnings, []);
  assert.deepEqual(inspectCSV('0,1\n2,0', { hasHeader: false }).preview, [['0', '1'], ['2', '0']]);
  assert.throws(() => inspectCSV(custom, { hasHeader: 'yes' }), /true or false/);
});

test('rejects invalid measurements without silently discarding rows', () => {
  for (const data of ['Time,Thrust\n0,1\n0,2', 'Time,Thrust\n1,1\n0,2', 'Time,Thrust\n0,1\n1,nope', 'Time,Thrust\n0,1\n1,', 'Time,Thrust\n0,1\n1,-2', 'Time,Thrust\n0,1\n1,Infinity']) assert.throws(() => parseCSV(data));
  assert.throws(() => parseCSV('Time,Thrust\n0,1'), /at least two/);
  assert.throws(() => parseCSV('Time,Thrust\n0,1\n1,2', { timeColumn: 0, thrustColumn: 0 }), /different columns/);
  assert.throws(() => parseCSV('Time,Thrust\n0,1\n1,2', { timeUnit: 'minutes' }), /Unsupported time/);
});

test('CSV roundtrip preserves exact timestamps and exported units', () => {
  const points = [{ time: 0, thrust: 0 }, { time: 1e-8, thrust: 12.123456789 }, { time: 2e-8, thrust: 0 }];
  const result = parseCSV(exportCSV(points));
  assert.deepEqual(result.points.map(point => point.time), points.map(point => point.time));
  assert.equal(result.points[1].thrust, 12.123457);
  const inKilo = parseCSV(exportCSV(points, { timeUnit: 'ms', thrustUnit: 'kN', delimiter: ';', precision: 12 }));
  assert.deepEqual(inKilo.points, points);
});

test('quoted multiline fields and escaped quotes do not break parsing', () => {
  const result = parseCSV('Time,Thrust,Notes\n0,0,"line one\nline two"\n1,5,"a ""quoted"" word"\n2,0,');
  assert.equal(result.points.length, 3);
  assert.throws(() => parseCSV('Time,Thrust\n0,"1\n1,2'), /not closed/);
  assert.throws(() => parseCSV('Time,Thrust\n0,"1"bad\n1,2'), /Unexpected/);
});

test('project roundtrip preserves profile, original, theory, selection, settings', () => {
  const points = [{ time: 0, thrust: 0 }, { time: .01, thrust: 10 }, { time: .03, thrust: 0 }];
  const project = { name: 'Motor profile', points, original: points, theory: points, selection: [0, .01], generator: { seed: 42, peak: 10, shape: 'neutral' } };
  assert.deepEqual(parseProject(serializeProject(project)), { version: 1, scope: 'selection', showTheory: true, showOriginal: false, generatorPending: false, theoryAlignment: { mode: 'source', offset: 0 }, curveEdit: null, ...project });
  assert.throws(() => parseProject('{'), /not a valid/);
  assert.throws(() => parseProject('{"version":2}'), /Unsupported project version/);
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points, selection: [-1, 1] })), /valid time range/);
});

test('project snapshots preserve edit scope and layer visibility', () => {
  const points = [{ time: 0, thrust: 0 }, { time: 1, thrust: 4 }, { time: 2, thrust: 0 }];
  const state = { name: 'Selected full-profile edit', points, theory: points, selection: [0, 1], scope: 'all', showTheory: false, showOriginal: true };
  assert.deepEqual(parseProject(serializeProject(state)), { version: 1, generatorPending: false, theoryAlignment: { mode: 'source', offset: 0 }, curveEdit: null, ...state });
  const withoutSelection = parseProject(JSON.stringify({ version: 1, points }));
  assert.equal(withoutSelection.scope, 'all');
  assert.equal(withoutSelection.showTheory, true);
  assert.equal(withoutSelection.showOriginal, false);
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points, scope: 'selection' })), /existing selected range/);
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points, scope: 'invalid' })), /edit scope/);
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points, showTheory: 'yes' })), /true or false/);
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points, showOriginal: null })), /true or false/);
});

test('project snapshots preserve pending generation state and validate its type', () => {
  const points = [{ time: 0, thrust: 0 }, { time: 1, thrust: 4 }];
  const project = parseProject(serializeProject({ points, generatorPending: true }));
  assert.equal(project.generatorPending, true);
  assert.equal(parseProject(JSON.stringify({ version: 1, points })).generatorPending, false);
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points, generatorPending: 'yes' })), /pending generator state/);
});

test('project snapshots retain theory alignment without changing source or working times', () => {
  const points = [{ time: 4, thrust: 0 }, { time: 5, thrust: 4 }, { time: 6, thrust: 0 }];
  const theory = [{ time: 0, thrust: 0 }, { time: 1, thrust: 5 }, { time: 2, thrust: 0 }];
  for (const mode of ['source', 'start', 'ignition']) {
    const state = { points, theory, theoryAlignment: { mode, offset: -.125 } };
    const loaded = parseProject(serializeProject(state));
    assert.deepEqual(loaded.theoryAlignment, state.theoryAlignment);
    assert.deepEqual(loaded.points, points);
    assert.deepEqual(loaded.theory, theory);
  }
  assert.deepEqual(parseProject(JSON.stringify({ version: 1, points })).theoryAlignment, { mode: 'source', offset: 0 });
  assert.equal(parseProject(serializeProject({ points, theoryAlignment: { mode: 'start', offset: 1e9 } })).theoryAlignment.offset, 1e9);
  for (const theoryAlignment of [null, [], 'source', {}, { mode: 'unknown', offset: 0 }, { mode: 'source', offset: '0' }, { mode: 'source', offset: null }, { mode: 'source', offset: 1e9 + 1 }]) {
    assert.throws(() => parseProject(JSON.stringify({ version: 1, points, theoryAlignment })), /theory alignment/);
  }
  assert.throws(() => serializeProject({ points, theoryAlignment: { mode: 'source', offset: Infinity } }), /theory alignment/);
});

test('project snapshots retain applied curve anchors in SI without changing measurement data', () => {
  const points = [{ time: .001, thrust: 0 }, { time: .013, thrust: 5 }, { time: .024, thrust: 8 }, { time: .05, thrust: 0 }];
  const curveEdit = { nodes: [{ time: .013, thrust: 6.5 }, { time: .024, thrust: 9 }], range: [.005, .04], interpolation: 'smooth' };
  const state = { points, theory: points, selection: [.013, .05], curveEdit };
  const loaded = parseProject(serializeProject(state));
  assert.deepEqual(loaded.curveEdit, curveEdit);
  assert.deepEqual(loaded.points, points);
  assert.deepEqual(loaded.theory, points);
  loaded.curveEdit.nodes[0].thrust = 100;
  loaded.curveEdit.range[0] = 0;
  assert.equal(curveEdit.nodes[0].thrust, 6.5);
  assert.equal(curveEdit.range[0], .005);
  assert.equal(parseProject(JSON.stringify({ version: 1, points })).curveEdit, null);
  assert.equal(parseProject(serializeProject({ points, curveEdit: null })).curveEdit, null);
  const whole = { nodes: [{ time: .001, thrust: 0 }, { time: .05, thrust: 0 }], range: null, interpolation: 'linear' };
  assert.deepEqual(parseProject(serializeProject({ points, curveEdit: whole })).curveEdit, whole);
});

test('project curve anchors reject invalid grids, ranges, values, modes and oversized metadata', () => {
  const points = [{ time: 0, thrust: 0 }, { time: 1, thrust: 5 }, { time: 2, thrust: 0 }];
  const valid = { nodes: points, range: null, interpolation: 'smooth' };
  for (const curveEdit of [false, [], {}, { ...valid, interpolation: 'cubic' }, { ...valid, nodes: [points[0]] }, { ...valid, nodes: Array.from({ length: 129 }, (_, time) => ({ time, thrust: 1 })) }, { ...valid, nodes: [{ time: 0, thrust: 0 }, { time: .5, thrust: 2 }] }, { ...valid, nodes: [{ time: 1, thrust: 1 }, { time: 0, thrust: 1 }] }, { ...valid, nodes: [{ time: 0, thrust: -1 }, points[1]] }, { ...valid, range: [0, 1] }, { ...valid, range: [-1, 2] }, { ...valid, range: [1, 0] }, { ...valid, range: ['0', 2] }]) {
    assert.throws(() => parseProject(JSON.stringify({ version: 1, points, curveEdit })), /curve/i);
  }
  assert.throws(() => serializeProject({ points, curveEdit: { ...valid, nodes: [{ time: 0, thrust: 0 }, { time: 1, thrust: Infinity }] } }), /curve/i);
});

test('enforces measurement limit for imports and project loads', () => {
  const points = Array.from({ length: 30001 }, (_, time) => ({ time, thrust: 1 }));
  assert.throws(() => parseProject(JSON.stringify({ version: 1, points })), /30,000/);
  assert.throws(() => parseCSV('Time,Thrust\n' + points.map(point => `${point.time},1`).join('\n')), /30,000/);
});

test('every CSV export adds ten tiny marker records while retaining all actual data and times', () => {
  const points = [{ time: 0, thrust: 81.123456789 }, { time: .0017, thrust: 111 }, { time: .097, thrust: .23 }], before = structuredClone(points);
  const text = exportCSV(points), rows = text.trim().split('\r\n').slice(1).map(row => row.split(',').map(Number));
  assert.equal(rows.length, points.length + 10);
  assert.ok(rows.slice(0, 10).every(row => row[0] < 0 && row[1] > 0 && row[1] < 1e-7));
  assert.deepEqual(rows.slice(10).map(row => row[0]), points.map(point => point.time));
  assert.equal(rows[10][1], 81.123457);
  assert.deepEqual(points, before);
  const parsed = parseCSV(text);
  assert.equal(parsed.syntheticMarker.detected, true);
  assert.equal(parsed.syntheticMarker.scheme, 'thrust-lab-v1');
  assert.equal(parsed.syntheticMarker.markerCount, 10);
  assert.equal(parsed.points.length, points.length);
  assert.match(parsed.warnings.join(' '), /10 marker records were excluded/);
  assert.equal(parseCSV(exportCSV(parsed.points)).points.length, points.length);
  assert.equal(exportCSV(parsed.points).trim().split('\r\n').length, points.length + 11);
});

test('marker detection survives every export unit, delimiter and selected thrust precision', () => {
  const points = [{ time: 1.25, thrust: 20 }, { time: 1.5, thrust: 80 }, { time: 2.375, thrust: 0 }];
  for (const timeUnit of ['s', 'ms', 'us']) for (const thrustUnit of ['N', 'kN', 'kgf', 'lbf']) for (const delimiter of [',', ';', '\t']) for (const precision of [0, 3, 6, 9, 15]) {
    const text = exportCSV(points, { timeUnit, thrustUnit, delimiter, precision });
    const parsed = parseCSV(text);
    assert.equal(parsed.syntheticMarker.detected, true, `${timeUnit}/${thrustUnit}/${delimiter}/${precision}`);
    assert.equal(parsed.points.length, points.length);
    assert.deepEqual(parsed.points.map(point => point.time), points.map(point => point.time));
  }
});

test('marked files retain column mappings, headerless input and decimal-comma parsing', () => {
  const points = [{ time: 0, thrust: 4 }, { time: 1, thrust: 2 }];
  const rows = exportCSV(points, { delimiter: ';' }).trim().split('\r\n');
  const custom = ['Notes;Clock;Load', ...rows.slice(1).map(row => `record;${row}`)].join('\n');
  assert.deepEqual(parseCSV(custom, { timeColumn: 'Clock', thrustColumn: 'Load' }).points, points);
  assert.equal(parseCSV(rows.slice(1).join('\n'), { hasHeader: false }).syntheticMarker.detected, true);
  const decimalComma = rows.map((row, index) => index ? row.split(';').map(value => value.replace('.', ',')).join(';') : row).join('\n');
  assert.deepEqual(parseCSV(decimalComma).points, points);
});

test('missing or damaged marker samples are never silently hidden from imported data', () => {
  const points = [{ time: 0, thrust: 80 }, { time: 1, thrust: 0 }];
  const raw = [...createSyntheticMarker(points), ...points];
  raw[4].thrust *= 1.001;
  const text = 'Time,Thrust\n' + raw.map(point => `${point.time},${point.thrust}`).join('\n');
  const result = parseCSV(text);
  assert.equal(result.syntheticMarker.detected, false);
  assert.deepEqual(result.points, raw);
  assert.deepEqual(result.warnings, []);
  assert.equal(parseCSV(exportCSV(points, { syntheticMarker: false })).syntheticMarker.detected, false);
  assert.throws(() => exportCSV(points, { syntheticMarker: 'yes' }), /true or false/);
});

test('the full measurement limit permits a recognized marker but never extra unmarked measurements', () => {
  const points = Array.from({ length: 30000 }, (_, index) => ({ time: index / 100, thrust: index % 100 }));
  const marked = parseCSV(exportCSV(points));
  assert.equal(marked.syntheticMarker.detected, true);
  assert.deepEqual(marked.points, points);
  const raw = [...createSyntheticMarker(points), ...points];
  raw[0].thrust = 0;
  assert.throws(() => parseCSV('Time,Thrust\n' + raw.map(point => `${point.time},${point.thrust}`).join('\n')), /30,000/);
  const longer = [...points, { time: 301, thrust: 0 }];
  assert.throws(() => exportCSV(longer), /30,000/);
});

test('native project saves can carry a marker while canonical snapshots remain clean', () => {
  const points = [{ time: 0, thrust: 80 }, { time: .13, thrust: 100 }, { time: 1, thrust: 0 }];
  const state = { name: 'Marked project', points, original: points, theory: points, selection: [0, .13], scope: 'selection', curveEdit: { nodes: points, range: null, interpolation: 'smooth' } };
  const expected = parseProject(serializeProject(state));
  const text = serializeProject(state, { syntheticMarker: true }), raw = JSON.parse(text);
  assert.equal(raw.points.length, points.length + 10);
  assert.equal(inspectSyntheticMarker(raw.points).detected, true);
  assert.deepEqual(raw.original, points);
  assert.deepEqual(raw.theory, points);
  assert.deepEqual(raw.selection, state.selection);
  assert.deepEqual(raw.curveEdit, state.curveEdit);
  assert.deepEqual(parseProject(text), expected);
  const internal = JSON.parse(serializeProject(parseProject(text)));
  assert.deepEqual(internal.points, points);
  assert.equal(inspectSyntheticMarker(internal.points).detected, false);
  assert.equal(JSON.parse(serializeProject(parseProject(text), { syntheticMarker: true })).points.length, points.length + 10);
  assert.throws(() => serializeProject(state, { syntheticMarker: 1 }), /true or false/);
});

test('native project marker handling preserves the full 30,000 actual measurements', () => {
  const points = Array.from({ length: 30000 }, (_, time) => ({ time, thrust: 1 }));
  const text = serializeProject({ points }, { syntheticMarker: true });
  assert.equal(JSON.parse(text).points.length, 30010);
  assert.deepEqual(parseProject(text).points, points);
});

test('unrepresentable export units fail before emitting nonfinite or merged timestamps', () => {
  const points = [{ time: 1e303, thrust: 1 }, { time: 1.1e303, thrust: 0 }];
  assert.throws(() => exportCSV(points, { timeUnit: 'us' }), /cannot represent these timestamps/);
  assert.equal(parseCSV(exportCSV(points)).syntheticMarker.detected, true);
});
