export const THEORY_FIT_DEFAULTS = Object.freeze({
  start: 0, duration: 1, tailStart: null, peak: 100, areaMode: 'impulse', impulse: 60, average: 60,
  shapeBlend: 1, noiseSource: 'original', noiseLevel: 1, window: 15,
});

/** Cache valid fit settings in SI; the live-edit enabled state is never restored. */
export function normalizeTheoryFitSettings(value, previous = null) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return previous ? { ...previous } : null;
  const result = { ...THEORY_FIT_DEFAULTS, ...previous };
  const finite = key => typeof value[key] === 'number' && Number.isFinite(value[key]);
  if (finite('start')) result.start = value.start;
  if (value.tailStart === null || finite('tailStart') && value.tailStart > 0) result.tailStart = value.tailStart;
  for (const key of ['duration', 'peak', 'impulse', 'average']) if (finite(key) && value[key] > 0) result[key] = value[key];
  if (['impulse', 'average'].includes(value.areaMode)) result.areaMode = value.areaMode;
  if (finite('shapeBlend') && value.shapeBlend >= 0 && value.shapeBlend <= 1) result.shapeBlend = value.shapeBlend;
  if (['original', 'captured', 'none'].includes(value.noiseSource)) result.noiseSource = value.noiseSource;
  if (finite('noiseLevel') && value.noiseLevel >= 0 && value.noiseLevel <= 10) result.noiseLevel = value.noiseLevel;
  if (Number.isInteger(value.window) && value.window >= 3 && value.window <= 101 && value.window % 2 === 1) result.window = value.window;
  return result;
}
