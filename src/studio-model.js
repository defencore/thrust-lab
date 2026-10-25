import { MOTOR_PRESETS } from './catalog.js';
import { generateProfile } from './profile.js';

export const DEFAULT_PRESET = MOTOR_PRESETS.at(-1);
export const GENERATOR_DEFAULTS = Object.freeze({
  peak: DEFAULT_PRESET.peak, duration: DEFAULT_PRESET.duration, impulse: DEFAULT_PRESET.impulse,
  interval: .01, sampling: 'uniform', jitter: .15, noise: .018, seed: 4281,
  shape: DEFAULT_PRESET.shape, presetId: DEFAULT_PRESET.id,
});

export function createInitialProject() {
  const initial = generateProfile({ ...GENERATOR_DEFAULTS, template: DEFAULT_PRESET.template });
  return {
    name: `${DEFAULT_PRESET.manufacturer} ${DEFAULT_PRESET.name} — study 01`,
    points: initial.points, original: structuredClone(initial.points), theory: initial.theory,
    selection: null, scope: 'all', generator: { ...GENERATOR_DEFAULTS }, showTheory: true,
    showOriginal: false, generatorPending: false, theoryAlignment: { mode: 'source', offset: 0 }, curveEdit: null,
  };
}

export function createUIState(project) {
  return { screen: 'studio', mode: 'edit', tool: 'select', view: [project.points[0].time, project.points.at(-1).time], thrustView: null, playhead: project.points[0].time, bottomTab: 'samples', inspectorTab: 'transform' };
}
