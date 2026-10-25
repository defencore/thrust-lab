import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_OPTIONS, DEFAULT_DISPLAY_UNITS, normalizeDisplayUnits, toDisplay, fromDisplay, unitFactor, unitSymbol, displayNumber, parseDisplayInput } from '../src/units.js';
import { metrics } from '../src/profile.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 5e-15, Number.MIN_VALUE), `${actual} ≠ ${expected}`);

test('force display conversions use exact SI definitions for supported engineering units', () => {
  assert.equal(toDisplay(1000, 'thrust', { thrust: 'kN' }), 1);
  assert.equal(fromDisplay(1, 'thrust', { thrust: 'kgf' }), 9.80665);
  assert.equal(fromDisplay(1, 'thrust', { thrust: 'lbf' }), 4.4482216152605);
  assert.equal(toDisplay(9.80665, 'thrust', { thrust: 'kgf' }), 1);
  assert.equal(toDisplay(-4.4482216152605, 'thrust', { thrust: 'lbf' }), -1);
});

test('time and impulse display units remain independent and preserve physical meaning', () => {
  const units = { thrust: 'kgf', time: 'ms', impulse: 'lbf·s' };
  assert.equal(toDisplay(.01, 'time', units), 10);
  assert.equal(toDisplay(4.4482216152605, 'impulse', units), 1);
  assert.equal(toDisplay(120, 'time', { time: 'min' }), 2);
  assert.equal(fromDisplay(3, 'time', { time: 'us' }), .000003);
  assert.equal(unitSymbol('time', { time: 'us' }), 'µs');
  assert.equal(unitFactor('impulse', { impulse: 'kgf·s' }), 9.80665);
});

test('every supported unit roundtrips signed, microsecond, and large finite values', () => {
  for (const [dimension, options] of Object.entries(UNIT_OPTIONS)) {
    for (const option of options) {
      const units = { [dimension]: option.value };
      for (const value of [0, -13.278, .00000123456789, 1e-20, 19.948657345, 1e120]) close(fromDisplay(toDisplay(value, dimension, units), dimension, units), value);
    }
  }
});

test('unit preferences normalize known dimensions without aliases or mutation', () => {
  const selected = { thrust: 'kgf', time: 'bad', impulse: 'kN·s', other: 'discard' };
  const snapshot = structuredClone(selected);
  assert.deepEqual(normalizeDisplayUnits(selected), { thrust: 'kgf', time: 's', impulse: 'kN·s' });
  assert.deepEqual(selected, snapshot);
  assert.deepEqual(normalizeDisplayUnits(null), DEFAULT_DISPLAY_UNITS);
  assert.deepEqual(normalizeDisplayUnits(Object.create({ thrust: 'kgf' })), DEFAULT_DISPLAY_UNITS);
  assert.equal(Object.isFrozen(UNIT_OPTIONS.thrust[0]), true);
  assert.equal(Object.isFrozen(DEFAULT_DISPLAY_UNITS), true);
});

test('displaying metrics never rewrites canonical samples or changes integrated impulse', () => {
  const points = [{ time: 0, thrust: 0 }, { time: .01, thrust: 9.80665 }, { time: .025, thrust: 9.80665 }, { time: .05, thrust: 0 }];
  const before = structuredClone(points);
  const raw = metrics(points);
  const units = { thrust: 'kgf', time: 'ms', impulse: 'kgf·s' };
  assert.equal(toDisplay(raw.peak, 'thrust', units), 1);
  assert.equal(toDisplay(raw.duration, 'time', units), 50);
  close(toDisplay(raw.impulse, 'impulse', units), .0325);
  assert.deepEqual(points, before);
  assert.deepEqual(metrics(points), raw);
});

test('form parsing preserves full conversion precision and rejects incomplete inputs', () => {
  assert.equal(parseDisplayInput(' 1.25 ', 'thrust', { thrust: 'kgf' }), 1.25 * 9.80665);
  assert.equal(parseDisplayInput('2.5e-3', 'time', { time: 'ms' }), .0000025);
  assert.equal(parseDisplayInput('-.5', 'impulse', { impulse: 'kN·s' }), -500);
  for (const value of ['', ' ', 'Infinity', '12 N', '0x10', '1,2', '--1', 1]) assert.throws(() => parseDisplayInput(value, 'thrust'), /finite numeric/);
});

test('readouts retain tiny nonzero values, group ordinary large numbers, and honor locales', () => {
  assert.equal(displayNumber(11766.02), '11,766.02');
  assert.equal(displayNumber(.003), '0.003');
  assert.match(displayNumber(1.23e-20), /1\.23E-20/);
  assert.equal(displayNumber(-0), '0.00');
  assert.equal(displayNumber(12.5, { locale: 'uk-UA' }), '12,50');
  assert.notEqual(displayNumber(.0000001), displayNumber(0));
});

test('invalid dimensions, nonfinite conversions, and numeric range loss fail clearly', () => {
  assert.throws(() => toDisplay(1, 'pressure'), /thrust, time, or impulse/);
  assert.throws(() => unitFactor('constructor'), /thrust, time, or impulse/);
  assert.throws(() => fromDisplay(Infinity, 'thrust'), /finite number/);
  assert.throws(() => toDisplay(NaN, 'time'), /finite number/);
  assert.throws(() => toDisplay(Number.MAX_VALUE, 'time', { time: 'us' }), /numeric range/);
  assert.throws(() => toDisplay(Number.MIN_VALUE, 'thrust', { thrust: 'kN' }), /numeric range/);
  assert.throws(() => displayNumber(Infinity), /finite number/);
  assert.throws(() => displayNumber(1, { digits: 13 }), /precision/);
});
