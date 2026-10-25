import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../src/csv.js';
import { metrics } from '../src/profile.js';
import { captureNoise } from '../src/noise.js';
import { textureFromOriginal } from '../src/profile-texture.js';
import { fitRecordingToTheory } from '../src/theory-fit-workflow.js';

function recording() {
  const rows = Array.from({ length: 1201 }, (_, index) => {
    const milliseconds = index * 10 - 2000, time = milliseconds / 1000;
    const phase = (time - .2) / 3;
    const trend = phase <= 0 || phase >= 1 ? 0 : phase < .1 ? phase * 550 : phase > .88 ? (1 - phase) / .12 * 35 : 55 - 20 * phase;
    const thrust = trend ? Math.max(0, trend + 1.6 * Math.sin(index * 2.31) + .8 * Math.cos(index * .93)) : 0;
    return `${milliseconds},${thrust},24`;
  });
  return parseCSV(`Time (ms),Thrust (N),Temperature (C)\n${rows.join('\n')}`).points;
}

const theory = () => [{ time: 4, thrust: 0 }, { time: 4.1, thrust: 40 }, { time: 4.25, thrust: 100 }, { time: 4.8, thrust: 80 }, { time: 5.2, thrust: 30 }, { time: 5.5, thrust: 0 }];
const settings = overrides => ({ start: 1.273, duration: 1.4, peak: 100, areaMode: 'impulse', impulse: 90, average: 999, shapeBlend: 1, noiseSource: 'original', noiseLevel: 1, window: 15, ...overrides });
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} should equal ${expected}`);

test('a long CSV recording fits a different theoretical burn and keeps all targets after original texture', () => {
  const original = recording(), source = theory();
  const before = JSON.stringify({ original, source });
  const result = fitRecordingToTheory(original, source, original, settings());
  assert.deepEqual(result.points.map(point => point.time), original.map(point => point.time));
  close(result.report.achieved.start, 1.273);
  close(result.report.achieved.duration, 1.4);
  close(result.report.achieved.peak, 100);
  close(result.report.achieved.impulse, 90);
  close(result.report.achieved.average, 90 / 1.4);
  assert.ok(result.textureReport.appliedRms > .1);
  assert.ok(result.textureReport.activeBurnRms > result.textureReport.appliedRms * 2);
  assert.notDeepEqual(result.points, result.reference);
  const measured = metrics(result.points);
  close(measured.burnDuration, 1.4);
  close(measured.burnAverage, 90 / 1.4);
  close(measured.average, 90 / 12);
  assert.equal(JSON.stringify({ original, source }), before);
});

test('mean mode derives impulse and ignores the cached inactive impulse target', () => {
  const original = recording();
  const result = fitRecordingToTheory(original, theory(), original, settings({ areaMode: 'average', average: 60, impulse: NaN }));
  close(result.report.achieved.average, 60);
  close(result.report.achieved.impulse, 84);
  close(result.report.achieved.duration, 1.4);
  close(result.report.achieved.peak, 100);
  assert.ok(result.textureReport.appliedRms > .1);
});

test('gain changes always refit the clean baseline and returning to 100 percent is reproducible', () => {
  const original = recording(), source = theory();
  const first = fitRecordingToTheory(original, source, original, settings({ average: NaN }));
  const louder = fitRecordingToTheory(original, source, original, settings({ noiseLevel: 3 }));
  assert.notDeepEqual(louder.points, first.points);
  assert.deepEqual(louder.reference, first.reference);
  const repeated = fitRecordingToTheory(original, source, original, settings());
  assert.deepEqual(repeated.points, first.points);
  assert.deepEqual(repeated.reference, first.reference);
  const clean = fitRecordingToTheory(original, source, original, settings({ noiseLevel: 0, noiseSource: 'captured' }));
  assert.equal(clean.textureReport, null);
  assert.deepEqual(clean.points, first.reference);
  assert.ok(clean.reference.every((point, index) => point !== clean.points[index]));
});

test('captured texture requires a valid source and retains coordinated targets', () => {
  const original = recording(), source = theory();
  assert.throws(() => fitRecordingToTheory(original, source, original, settings({ noiseSource: 'captured' })), /Capture a noise sample/);
  assert.throws(() => fitRecordingToTheory(original, source, original, settings({ noiseSource: 'captured' }), { captured: { points: [], duration: 0, range: [] } }));
  const captured = textureFromOriginal(original, { range: [1, 2] });
  const capturedBefore = structuredClone(captured);
  const result = fitRecordingToTheory(original, source, original, settings({ noiseSource: 'captured' }), { captured });
  close(result.report.achieved.duration, 1.4);
  close(result.report.achieved.peak, 100);
  close(result.report.achieved.impulse, 90);
  assert.ok(result.textureReport.appliedRms > 0);
  assert.deepEqual(captured, capturedBefore);
});

test('none and zero texture levels bypass texture extraction while absent original uses the baseline', () => {
  const original = recording(), source = theory();
  const noTexture = fitRecordingToTheory(original, source, [], settings({ noiseSource: 'none' }));
  assert.equal(noTexture.textureReport, null);
  assert.deepEqual(noTexture.points, noTexture.reference);
  const fromBaseline = fitRecordingToTheory(original, source, null, settings());
  assert.ok(fromBaseline.textureReport.appliedRms > 0);
});

test('coarse original samples retain a clean feasible fit and explain unavailable texture', () => {
  const original = [{ time: 0, thrust: 0 }, { time: 1, thrust: 10 }, { time: 2, thrust: 0 }];
  const result = fitRecordingToTheory(original, original, original, settings({ start: .05, duration: 1.9, peak: 10, impulse: 10 }));
  assert.deepEqual(result.points, result.reference);
  assert.equal(result.textureReport.limited, true);
  assert.match(result.report.notes.join(' '), /too few active measurements/);
  close(result.report.achieved.duration, 1.9);
  close(result.report.achieved.impulse, 10);
});

test('invalid active targets and source settings fail without modifying inputs', () => {
  const original = recording(), source = theory(), before = JSON.stringify({ original, source });
  assert.throws(() => fitRecordingToTheory(original, source, original, settings({ impulse: 10000 })), error => error.code === 'IMPULSE_LIMIT');
  assert.throws(() => fitRecordingToTheory(original, source, original, settings({ start: 9.5, duration: 1.4 })), error => error.code === 'TIME_LIMIT');
  for (const overrides of [{ noiseSource: 'random' }, { noiseLevel: Infinity }, { areaMode: 'both' }, { window: 4 }]) assert.throws(() => fitRecordingToTheory(original, source, original, settings(overrides)));
  assert.equal(JSON.stringify({ original, source }), before);
});

test('working-contour texture separates the smooth trend from noise instead of counting recorded noise twice', () => {
  const original = recording(), source = theory();
  const clean = fitRecordingToTheory(original, source, original, settings({ shapeBlend: 0, noiseLevel: 0 }));
  const retainedDetail = fitRecordingToTheory(original, source, original, settings({ shapeBlend: 0, noiseSource: 'none', noiseLevel: 0 }));
  const active = [1.5, 2.4];
  const cleanRms = captureNoise(clean.points, clean.points, active, { window: 15 }).rms;
  const recordedRms = captureNoise(retainedDetail.points, retainedDetail.points, active, { window: 15 }).rms;
  assert.ok(cleanRms < recordedRms / 3, `${cleanRms} should be much quieter than ${recordedRms}`);
  const textured = fitRecordingToTheory(original, source, original, settings({ shapeBlend: 0, noiseLevel: 1 }));
  assert.deepEqual(textured.reference, clean.points);
  assert.ok(textured.textureReport.activeBurnRms > cleanRms * 3);
  close(textured.report.achieved.impulse, 90);
  close(textured.report.achieved.duration, 1.4);
  close(textured.report.achieved.peak, 100);
});

test('an explicit final-tail onset survives recorded texture and preserves all burn targets', () => {
  const original = recording(), source = theory();
  const first = fitRecordingToTheory(original, source, original, settings({ tailStart: .8 }));
  close(first.report.requested.tailStart, .8);
  assert.ok(first.report.achieved.tailStart >= .8 && first.report.achieved.tailStart <= .81);
  close(first.report.achieved.start, 1.273);
  close(first.report.achieved.duration, 1.4);
  close(first.report.achieved.peak, 100);
  close(first.report.achieved.impulse, 90);
  assert.ok(first.textureReport.activeBurnRms > 0);
  const tail = first.reference.filter(point => point.time >= 1.273 + first.report.achieved.tailStart && point.time <= 1.273 + 1.4);
  assert.ok(tail.length > 10);
  assert.ok(tail.every((point, index) => !index || point.thrust <= tail[index - 1].thrust));
  const changed = fitRecordingToTheory(original, source, original, settings({ tailStart: 1.1 }));
  assert.notDeepEqual(changed.reference, first.reference);
  assert.deepEqual(fitRecordingToTheory(original, source, original, settings({ tailStart: .8 })).points, first.points);
  assert.deepEqual(fitRecordingToTheory(original, source, original, settings({ tailStart: null })).points, fitRecordingToTheory(original, source, original, settings()).points);
});
