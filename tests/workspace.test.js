import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeneratorDraft, applyDraftToEditor } from '../src/workspace.js';
import { MOTOR_PRESETS } from '../src/catalog.js';

const settings = { peak: 100, duration: 2, impulse: 120, interval: 0.01, noise: 0.03, jitter: 0.2, sampling: 'uniform', shape: 'neutral', seed: 42, presetId: null };
const imported = () => ({
  name: 'Imported test',
  points: [{ time: 12.1, thrust: 1 }, { time: 12.31, thrust: 8 }, { time: 12.7, thrust: 2 }],
  original: [{ time: 12.1, thrust: 1 }, { time: 12.31, thrust: 10 }, { time: 12.7, thrust: 2 }],
  theory: [{ time: 12.1, thrust: 0 }, { time: 12.7, thrust: 0 }],
  selection: [12.2, 12.5], scope: 'selection', view: [12.2, 12.5], playhead: 12.3,
  showTheory: false, showOriginal: true, tool: 'draw', generatorPending: true,
  theoryAlignment: { mode: 'ignition', offset: -12.4 },
  inspectorTab: 'signal', customDisplaySetting: 7,
});

test('generating and regenerating previews leave an imported working profile intact', () => {
  const editor = imported();
  const before = structuredClone(editor);
  const first = createGeneratorDraft(settings);
  const second = createGeneratorDraft({ ...settings, seed: 43 });
  assert.deepEqual(editor, before);
  assert.notDeepEqual(first.points, second.points);
  assert.equal(first.points[0].time, 0);
  assert.equal(first.points.at(-1).time, 2);
  assert.equal(first.tool, 'pan');
  assert.equal(first.scope, 'all');
  assert.equal(first.selection, null);
  assert.deepEqual(first.theoryAlignment, { mode: 'source', offset: 0 });
});

test('draft data and generator options never share mutable arrays with their inputs', () => {
  const generator = { ...settings, metadata: { values: [1, 2] } };
  const output = { points: [{ time: 0, thrust: 0 }, { time: 1, thrust: 5 }], theory: [{ time: 0, thrust: 0 }, { time: 1, thrust: 4 }], notes: ['A constraint note'] };
  const draft = createGeneratorDraft(generator, options => {
    options.metadata.values[0] = 99;
    return output;
  });
  assert.deepEqual(generator.metadata.values, [1, 2]);
  assert.deepEqual(draft.generator.metadata.values, [1, 2]);
  output.points[0].thrust = 9;
  output.theory[0].thrust = 8;
  output.notes[0] = 'Changed';
  assert.equal(draft.points[0].thrust, 0);
  assert.equal(draft.theory[0].thrust, 0);
  assert.equal(draft.notes[0], 'A constraint note');
  draft.points[1].thrust = 20;
  assert.equal(draft.original[1].thrust, 5);
});

test('preset template selection keeps SI options unchanged and does not expose catalog arrays', () => {
  const preset = MOTOR_PRESETS.at(-1);
  let received;
  const draft = createGeneratorDraft({ ...settings, presetId: preset.id }, options => {
    received = options;
    return { points: [{ time: 0, thrust: 0 }, { time: 2, thrust: 0 }], theory: null, notes: [] };
  });
  assert.equal(received.interval, 0.01);
  assert.equal(received.noise, 0.03);
  assert.equal(received.jitter, 0.2);
  assert.deepEqual(received.template, preset.template);
  assert.notEqual(received.template, preset.template);
  received.template[0].thrust = 1000;
  assert.equal(preset.template[0].thrust, 0);
  assert.match(draft.name, new RegExp(`${preset.manufacturer} ${preset.name}`));
});

test('adopting a preview resets edit scope while preserving unrelated editor controls', () => {
  const editor = imported();
  const draft = createGeneratorDraft(settings);
  const beforeEditor = structuredClone(editor);
  const beforeDraft = structuredClone(draft);
  const adopted = applyDraftToEditor(editor, draft);
  assert.deepEqual(editor, beforeEditor);
  assert.deepEqual(draft, beforeDraft);
  assert.notEqual(adopted, editor);
  assert.deepEqual(adopted.points, draft.points);
  assert.deepEqual(adopted.original, draft.original);
  assert.equal(adopted.inspectorTab, 'signal');
  assert.equal(adopted.customDisplaySetting, 7);
  assert.equal(adopted.selection, null);
  assert.equal(adopted.scope, 'all');
  assert.equal(adopted.tool, 'select');
  assert.equal(adopted.generatorPending, false);
  assert.deepEqual(adopted.theoryAlignment, { mode: 'source', offset: 0 });
  assert.notEqual(adopted.theoryAlignment, draft.theoryAlignment);
  assert.deepEqual(adopted.view, [0, 2]);
  assert.equal(adopted.playhead, 0);
  adopted.points[1].thrust = 999;
  adopted.original[1].thrust = 888;
  adopted.theory[1].thrust = 777;
  adopted.generator.seed = 100;
  assert.deepEqual(draft, beforeDraft);
  assert.deepEqual(editor, beforeEditor);
});

test('invalid generated data fails before it can become a working profile', () => {
  assert.throws(() => createGeneratorDraft(null), /settings/);
  assert.throws(() => createGeneratorDraft(settings, null), /function/);
  assert.throws(() => createGeneratorDraft(settings, () => ({ points: [] })), /two samples/);
  assert.throws(() => createGeneratorDraft(settings, () => ({ points: [{ time: 0, thrust: 1 }, { time: 0, thrust: 2 }] })), /increasing/);
  assert.throws(() => applyDraftToEditor(imported(), { points: [{ time: 0, thrust: -1 }, { time: 1, thrust: 0 }] }), /nonnegative/);
});
