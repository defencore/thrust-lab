import { normalizeTheoryFitSettings } from './theory-fit-settings.js';

const STORAGE_KEY = 'thrust-lab-preferences-v1';
const importDefaults = () => ({ header: 'auto', timeUnit: 'auto', thrustUnit: 'auto', timeColumn: null, thrustColumn: null });

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export const PREFERENCE_DEFAULTS = freeze({
  version: 1,
  imports: { working: importDefaults(), theory: importDefaults() },
  displayUnits: { thrust: 'N', time: 's', impulse: 'N·s' },
  controls: {
    'edit-width': '100', 'edit-anchor': 'start', 'edit-gain': '100', 'edit-offset': '0', 'edit-shift': '0', 'edit-shift-fill': 'zero', 'edit-shift-noise-gain': '100', 'edit-feather': '15',
    'target-peak': '100', 'target-impulse': '120', 'target-tail-start': '1', 'noise-amount': '3', 'noise-seed': '84',
    'smooth-window': '9', 'capture-window': '15', 'captured-gain': '100', 'captured-mode': 'repeat',
    'curve-interpolation': 'smooth', 'curve-node-count': '5', 'match-noise-gain': '100',
    'theory-opacity': '70', 'theory-alignment': 'source', 'theory-offset': '0', 'export-time': 's', 'export-thrust': 'N',
    'export-delimiter': ',', 'export-precision': '6',
  },
  generator: null,
  theoryFit: null,
  inspectorTab: 'transform',
  editorTab: 'samples',
  focus: false,
});

const controlOptions = {
  'edit-anchor': ['start', 'center', 'end'],
  'edit-shift-fill': ['zero', 'background'],
  'smooth-window': ['3', '5', '9', '15', '25', '51'],
  'capture-window': ['9', '15', '25', '51'],
  'captured-mode': ['repeat', 'stretch'],
  'curve-interpolation': ['smooth', 'linear'],
  'theory-alignment': ['source', 'start', 'ignition'],
  'export-time': ['s', 'ms', 'us'],
  'export-thrust': ['N', 'kN', 'kgf', 'lbf'],
  'export-delimiter': [',', ';', 'tab'],
  'export-precision': Array.from({ length: 16 }, (_, digits) => String(digits)),
};
const displayUnitOptions = {
  thrust: ['N', 'kN', 'kgf', 'lbf'],
  time: ['s', 'ms', 'us', 'min'],
  impulse: ['N·s', 'kN·s', 'kgf·s', 'lbf·s'],
};
const controlBounds = {
  'edit-width': [1, 10000], 'edit-gain': [0, 10000], 'edit-offset': [-Number.MAX_VALUE, Number.MAX_VALUE], 'edit-shift': [-Number.MAX_VALUE, Number.MAX_VALUE], 'edit-feather': [0, 50],
  'edit-shift-noise-gain': [0, 1000],
  'target-peak': [0, Number.MAX_VALUE], 'target-impulse': [0, Number.MAX_VALUE], 'target-tail-start': [Number.MIN_VALUE, Number.MAX_VALUE],
  'noise-amount': [0, 100], 'noise-seed': [0, 4294967295, true],
  'captured-gain': [0, 10000], 'theory-opacity': [10, 100], 'theory-offset': [-1e9, 1e9],
  'curve-node-count': [3, 12, true], 'match-noise-gain': [0, 1000],
};
const generatorDefaults = { peak: 100, duration: 2, impulse: 120, interval: .01, sampling: 'uniform', jitter: .15, noise: .018, seed: 4281, shape: 'neutral', presetId: null };
const generatorBounds = {
  peak: [.001, 1e7], duration: [.001, 1e5], impulse: [.000001, 1e12],
  interval: [.000001, 1000], jitter: [0, .8], noise: [0, 1], seed: [0, 4294967295, true],
};
const own = (object, key) => Object.hasOwn(object, key);
const clone = value => JSON.parse(JSON.stringify(value));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const choice = (value, choices, previous) => choices.includes(value) ? value : previous;

function numeric(value, [minimum, maximum, integer], previous) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return previous;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum && (!integer || Number.isInteger(number)) ? number : previous;
}

function column(value, previous) {
  if (value === null) return null;
  if (!plain(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 5000 || !Number.isInteger(value.index) || value.index < 0 || value.index > 29999) return previous;
  return { name: value.name, index: value.index };
}

function normalizeImport(patch, previous) {
  const result = { ...previous };
  if (!plain(patch)) return result;
  if (own(patch, 'header')) result.header = choice(patch.header, ['auto', 'yes', 'no'], previous.header);
  if (own(patch, 'timeUnit')) result.timeUnit = choice(patch.timeUnit, ['auto', 's', 'ms', 'us'], previous.timeUnit);
  if (own(patch, 'thrustUnit')) result.thrustUnit = choice(patch.thrustUnit, ['auto', 'N', 'kN', 'kgf', 'lbf'], previous.thrustUnit);
  for (const name of ['timeColumn', 'thrustColumn']) if (own(patch, name)) result[name] = column(patch[name], previous[name]);
  return result;
}

function normalizeGenerator(patch, previous) {
  if (patch === null) return null;
  if (!plain(patch)) return previous;
  const result = { ...generatorDefaults, ...previous };
  for (const [name, bounds] of Object.entries(generatorBounds)) if (own(patch, name)) result[name] = numeric(patch[name], bounds, result[name]);
  if (own(patch, 'sampling')) result.sampling = choice(patch.sampling, ['uniform', 'jitter', 'random'], result.sampling);
  if (own(patch, 'shape')) result.shape = choice(patch.shape, ['neutral', 'progressive', 'regressive', 'boost-sustain'], result.shape);
  if (own(patch, 'presetId') && (patch.presetId === null || (typeof patch.presetId === 'string' && /^[a-z0-9-]{1,100}$/.test(patch.presetId)))) result.presetId = patch.presetId;
  return result;
}

/** Apply only recognized, valid preferences; incomplete form values stay uncached. */
function normalize(patch, previous = PREFERENCE_DEFAULTS) {
  const result = clone(previous);
  if (!plain(patch)) return result;
  if (plain(patch.imports)) {
    for (const target of ['working', 'theory']) if (own(patch.imports, target)) result.imports[target] = normalizeImport(patch.imports[target], previous.imports[target]);
  }
  if (plain(patch.displayUnits)) {
    for (const [dimension, units] of Object.entries(displayUnitOptions)) {
      if (own(patch.displayUnits, dimension)) result.displayUnits[dimension] = choice(patch.displayUnits[dimension], units, previous.displayUnits[dimension]);
    }
  }
  if (plain(patch.controls)) {
    for (const name of Object.keys(PREFERENCE_DEFAULTS.controls)) {
      if (!own(patch.controls, name)) continue;
      const value = patch.controls[name];
      if (controlOptions[name]) {
        const text = ['string', 'number'].includes(typeof value) ? String(value) : null;
        result.controls[name] = choice(text, controlOptions[name], previous.controls[name]);
      } else result.controls[name] = String(numeric(value, controlBounds[name], Number(previous.controls[name])));
    }
  }
  if (own(patch, 'generator')) result.generator = normalizeGenerator(patch.generator, previous.generator);
  if (own(patch, 'theoryFit')) result.theoryFit = normalizeTheoryFitSettings(patch.theoryFit, previous.theoryFit);
  if (own(patch, 'inspectorTab')) result.inspectorTab = choice(patch.inspectorTab, ['transform', 'curve', 'signal', 'theory'], previous.inspectorTab);
  if (own(patch, 'editorTab')) result.editorTab = choice(patch.editorTab, ['samples', 'history'], previous.editorTab);
  if (typeof patch.focus === 'boolean') result.focus = patch.focus;
  return result;
}

/** Browser storage is optional. Profile data and language use different keys. */
export function createPreferences(storage) {
  let backend = storage;
  if (arguments.length === 0) {
    try { backend = globalThis.localStorage; } catch { backend = null; }
  }
  let available = !!backend && ['getItem', 'setItem', 'removeItem'].every(name => typeof backend[name] === 'function');
  let current = clone(PREFERENCE_DEFAULTS);
  if (available) {
    try {
      const raw = backend.getItem(STORAGE_KEY);
      if (raw !== null) {
        let saved;
        try { saved = JSON.parse(raw); } catch { saved = null; }
        if (plain(saved) && saved.version === 1) current = normalize(saved);
        else backend.removeItem(STORAGE_KEY);
      }
    } catch { available = false; }
  }
  return {
    get() { return clone(current); },
    update(patch) {
      current = normalize(patch, current);
      if (backend) {
        try { backend.setItem(STORAGE_KEY, JSON.stringify(current)); available = true; }
        catch { available = false; }
      }
      return clone(current);
    },
    reset() {
      current = clone(PREFERENCE_DEFAULTS);
      if (backend) {
        try { backend.removeItem(STORAGE_KEY); available = true; }
        catch { available = false; }
      }
      return clone(current);
    },
    get available() { return available; },
  };
}

function savedColumn(headers, descriptor) {
  if (!descriptor) return null;
  const exact = [];
  for (let index = 0; index < headers.length; index++) if (headers[index] === descriptor.name) exact.push(index);
  if (exact.length) return exact.includes(descriptor.index) ? descriptor.index : exact[0];
  const headerless = headers.every((header, index) => header === `Column ${index + 1}`);
  return headerless && descriptor.index < headers.length ? descriptor.index : null;
}

/** Reuse named mappings across reordered CSVs, never stale indices on new headers. */
export function resolveImportPreferences(headers, settings = {}) {
  if (!Array.isArray(headers) || headers.length < 2 || headers.some(header => typeof header !== 'string')) throw new Error('CSV mapping needs at least two column names.');
  const safe = normalizeImport(settings, importDefaults());
  const savedTime = savedColumn(headers, safe.timeColumn);
  const savedThrust = savedColumn(headers, safe.thrustColumn);
  const detectedTime = headers.findIndex(header => /^(?:time|timestamp|elapsed|seconds?|milliseconds?|microseconds?|t(?:\b|_))/i.test(header.trim()));
  const detectedThrust = headers.findIndex(header => /^(?:thrust|force|load|f(?:\b|_))/i.test(header.trim()));
  let timeColumn = savedTime ?? (detectedTime < 0 ? 0 : detectedTime);
  let thrustColumn = savedThrust ?? (detectedThrust < 0 ? 1 : detectedThrust);
  if (timeColumn === thrustColumn) {
    if (savedThrust !== null && savedTime === null) timeColumn = detectedTime >= 0 && detectedTime !== thrustColumn ? detectedTime : headers.findIndex((_, index) => index !== thrustColumn);
    else thrustColumn = detectedThrust >= 0 && detectedThrust !== timeColumn ? detectedThrust : headers.findIndex((_, index) => index !== timeColumn);
  }
  return { timeColumn, thrustColumn, timeUnit: safe.timeUnit, thrustUnit: safe.thrustUnit, header: safe.header };
}
