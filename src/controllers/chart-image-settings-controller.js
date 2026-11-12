/** Image presentation settings are cached independently of profile measurements. */
export function createChartImageSettingsController(ctx) {
  const fields = { showDetails: ctx.$('#chart-image-details'), showLegend: ctx.$('#chart-image-legend') };
  let settings;

  function restorePreferences() {
    settings = ctx.preferences.get().chartImage;
    for (const [name, field] of Object.entries(fields)) field.checked = settings[name];
  }

  for (const [name, field] of Object.entries(fields)) {
    field.addEventListener('change', () => {
      settings = { ...settings, [name]: field.checked };
      ctx.preferences.update({ chartImage: settings });
    });
  }

  restorePreferences();
  return { restorePreferences, getState: () => ({ ...settings }) };
}
