import test from 'node:test';
import assert from 'node:assert/strict';
import { alignTheory, theoryShift } from '../src/alignment.js';
import { transform, interpolate } from '../src/profile.js';

const theory = [{ time: 0, thrust: 0 }, { time: 0.4, thrust: 10 }, { time: 0.9, thrust: 0 }];
const working = [{ time: 12.1, thrust: 0 }, { time: 12.5, thrust: 7 }, { time: 13, thrust: 0 }];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('source alignment retains source times and applies signed manual offsets only', () => {
  assert.deepEqual(alignTheory(theory, working), theory);
  assert.equal(theoryShift(theory, working), 0);
  assert.deepEqual(alignTheory(theory, working, { offset: 2 }).map(p => p.time), [2, 2.4, 2.9]);
  assert.deepEqual(alignTheory(theory, working, { mode: 'source', offset: -2 }).map(p => p.time), [-2, -1.6, -1.1]);
  assert.deepEqual(alignTheory(theory, null, { offset: 0 }), theory);
});

test('start alignment translates the first sample to the working timeline without retiming', () => {
  const originalTheory = structuredClone(theory);
  const originalWorking = structuredClone(working);
  const aligned = alignTheory(theory, working, { mode: 'start', offset: 0.3 });
  close(theoryShift(theory, working, { mode: 'start', offset: 0.3 }), 12.4);
  close(aligned[0].time, 12.4);
  close(aligned[1].time - aligned[0].time, 0.4);
  close(aligned[2].time - aligned[0].time, 0.9);
  assert.deepEqual(aligned.map(p => p.thrust), theory.map(p => p.thrust));
  assert.notEqual(aligned[0], theory[0]);
  assert.deepEqual(theory, originalTheory);
  assert.deepEqual(working, originalWorking);
});

test('ignition alignment uses interpolated 5%-peak crossings after irregular zero preludes', () => {
  const source = [{ time: -3, thrust: 0 }, { time: -1.2, thrust: 0 }, { time: -0.2, thrust: 10 }, { time: 0.7, thrust: 0 }];
  const measured = [{ time: 9, thrust: 0 }, { time: 10, thrust: 0 }, { time: 10.4, thrust: 20 }, { time: 11, thrust: 0 }];
  // Source threshold crossing: -1.15 s. Measured threshold crossing: 10.02 s.
  close(theoryShift(source, measured, { mode: 'ignition' }), 11.17);
  const aligned = alignTheory(source, measured, { mode: 'ignition' });
  close(interpolate(aligned, 10.02), 0.5);
  close(aligned[0].time, 8.17);
  close(theoryShift(source, measured, { mode: 'ignition', offset: -0.2 }), 10.97);
});

test('ignition alignment falls back to the first timestamp for zero thrust or an immediate burn', () => {
  const zero = [{ time: 4, thrust: 0 }, { time: 6, thrust: 0 }];
  const immediate = [{ time: 14, thrust: 5 }, { time: 15, thrust: 10 }];
  close(theoryShift(zero, immediate, { mode: 'ignition' }), 10);
  close(theoryShift(immediate, zero, { mode: 'ignition' }), -10);
});

test('fitting to aligned theory changes thrust at the unchanged working timestamps', () => {
  const source = [{ time: 0, thrust: 0 }, { time: 1, thrust: 10 }, { time: 2, thrust: 0 }];
  const measured = [{ time: 50, thrust: 0 }, { time: 50.25, thrust: 0 }, { time: 50.75, thrust: 0 }, { time: 51.5, thrust: 0 }, { time: 52, thrust: 0 }];
  const aligned = alignTheory(source, measured, { mode: 'start' });
  const result = transform(measured, { type: 'fit-theory', theory: aligned, blend: 1 });
  assert.deepEqual(result.map(p => p.time), measured.map(p => p.time));
  assert.deepEqual(result.map(p => p.thrust), [0, 2.5, 7.5, 5, 0]);
  assert.deepEqual(measured.map(p => p.thrust), [0, 0, 0, 0, 0]);
  assert.deepEqual(source.map(p => p.time), [0, 1, 2]);
});

test('absent theory remains absent and invalid alignment options fail clearly', () => {
  assert.equal(alignTheory(null, working, { mode: 'start' }), null);
  assert.equal(theoryShift(null, working, { mode: 'ignition' }), 0);
  assert.throws(() => alignTheory(theory, working, { mode: 'retime' }), /Choose source/);
  assert.throws(() => alignTheory(theory, working, { offset: Infinity }), /finite/);
  assert.throws(() => alignTheory(theory, null, { mode: 'start' }), /Working profile/);
  assert.throws(() => alignTheory([{ time: 0, thrust: -1 }, { time: 1, thrust: 0 }], working), /nonnegative/);
  assert.throws(() => alignTheory([{ time: 1, thrust: 1 }, { time: 1, thrust: 0 }], working), /increasing/);
});

test('alignment rejects overflowing or precision-collapsed translated timestamps', () => {
  assert.throws(() => alignTheory([{ time: 1e308, thrust: 0 }, { time: 1.1e308, thrust: 1 }], working, { offset: 1e308 }), /finite range/);
  assert.throws(() => alignTheory(theory, working, { offset: 1e30 }), /distinct timestamps/);
  assert.throws(() => theoryShift([{ time: -1e308, thrust: 0 }, { time: -0.9e308, thrust: 1 }], [{ time: 1e308, thrust: 0 }, { time: 1.1e308, thrust: 1 }], { mode: 'start' }), /shift is too large/);
});
