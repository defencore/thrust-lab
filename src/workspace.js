import { generateProfile } from './profile.js';
import { MOTOR_PRESETS } from './catalog.js';
import { normalizeCSVFormat } from './csv-format.js';

function copy(value) {
  return structuredClone(value);
}

function copyPoints(points, label) {
  if (!Array.isArray(points) || points.length < 2) throw new Error(`${label} needs at least two samples.`);
  let previous = -Infinity;
  return points.map(point => {
    if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.thrust) || point.thrust < 0 || point.time <= previous) {
      throw new Error(`${label} must contain finite, nonnegative thrust and strictly increasing timestamps.`);
    }
    previous = point.time;
    return { time: point.time, thrust: point.thrust };
  });
}

/** Pair an original CSV timeline with current measurements by row, without resampling. */
export function combineProfileTimings(editor, source) {
  const measured = copyPoints(editor.points, 'Working profile');
  const timing = copyPoints(source.points, 'Timestamp source');
  if (measured.length !== timing.length) throw new Error('The time source must contain the same number of measurements as the current profile.');
  const csvFormat = normalizeCSVFormat(source.csvFormat, timing);
  const points = measured.map((point, index) => ({ time: timing[index].time, thrust: point.thrust }));
  const original = editor.original?.length === points.length
    ? editor.original.map((point, index) => ({ time: timing[index].time, thrust: point.thrust }))
    : copy(editor.original ?? points);
  return { ...editor, points, original, csvFormat, selection: null, scope: 'all', curveEdit: null };
}

/** A generator preview owns its data and cannot replace the working profile. */
export function createGeneratorDraft(generator, generateFn = generateProfile) {
  if (!generator || typeof generator !== 'object' || Array.isArray(generator)) throw new Error('Choose valid generator settings first.');
  if (typeof generateFn !== 'function') throw new Error('A profile generator function is required.');
  const settings = copy(generator);
  const preset = MOTOR_PRESETS.find(item => item.id === settings.presetId);
  const options = copy(settings);
  if (preset) options.template = copy(preset.template);
  const result = generateFn(options);
  if (!result || typeof result !== 'object') throw new Error('The generator did not return a profile.');
  const points = copyPoints(result.points, 'Generated profile');
  const theory = result.theory == null ? null : copyPoints(result.theory, 'Theoretical profile');
  const start = points[0].time;
  const end = points.at(-1).time;
  return {
    name: preset ? `${preset.manufacturer} ${preset.name} — synthetic study` : 'Custom burn profile',
    points,
    original: copyPoints(points, 'Generated profile'),
    theory,
    selection: null,
    scope: 'all',
    showTheory: true,
    showOriginal: false,
    theoryAlignment: { mode: 'source', offset: 0 },
    curveEdit: null,
    tool: 'pan',
    view: [start, end],
    playhead: start,
    generator: settings,
    notes: Array.isArray(result.notes) ? result.notes.map(String) : [],
  };
}

/** Explicit adoption creates a detached editor profile; preview changes stay isolated. */
export function applyDraftToEditor(editor, draft) {
  if (!editor || typeof editor !== 'object' || !draft || typeof draft !== 'object') throw new Error('A working profile and generated preview are required.');
  const points = copyPoints(draft.points, 'Generated preview');
  const start = points[0].time;
  const end = points.at(-1).time;
  const result = {
    ...editor,
    name: String(draft.name || 'Custom burn profile'),
    points,
    original: copyPoints(draft.original || draft.points, 'Original preview'),
    theory: draft.theory == null ? null : copyPoints(draft.theory, 'Theoretical preview'),
    selection: null,
    scope: 'all',
    showTheory: true,
    showOriginal: false,
    theoryAlignment: { mode: 'source', offset: 0 },
    curveEdit: null,
    tool: 'select',
    view: [start, end],
    playhead: start,
    generator: copy(draft.generator || {}),
    generatorPending: false,
  };
  delete result.csvFormat;
  return result;
}
