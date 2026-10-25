import { PREFERENCE_DEFAULTS } from '../preferences.js';
import { INPUT_DIMENSIONS } from './units-controller.js';
import { initI18n, getLanguage, setLanguage } from '../i18n.js';

export function createSettingsController(ctx) {
  const { $, preferences, units } = ctx;
  function restore() {
    const saved = preferences.get();
    for (const [id, value] of Object.entries(saved.controls)) {
      const input = $(`#${id}`); if (!input) continue;
      if (INPUT_DIMENSIONS[id]) units.set(id, Number(value), { force: true }); else input.value = value;
      input.classList.remove('input-error'); input.removeAttribute('aria-invalid');
    }
    $('#opacity-value').value = `${saved.controls['theory-opacity']}%`;
    document.documentElement.style.setProperty('--theory-opacity', Number(saved.controls['theory-opacity']) / 100);
    ctx.fit.restorePreferences();
    ctx.shift.deactivate();
    $('#preferences-status').textContent = preferences.available ? 'Settings are saved automatically.' : 'Settings are kept for this session; browser storage is unavailable.';
    ctx.setInspector(saved.inspectorTab); ctx.setBottom(saved.editorTab);
  }
  restore();
  for (const id of Object.keys(PREFERENCE_DEFAULTS.controls)) {
    const control = $(`#${id}`); if (!control) continue;
    for (const event of ['input', 'change']) control.addEventListener(event, () => {
      const value = INPUT_DIMENSIONS[id] ? units.read(id) : control.value;
      if (INPUT_DIMENSIONS[id] && !Number.isFinite(value)) return;
      preferences.update({ controls: { [id]: String(value) } });
    });
  }
  $('#settings-open').onclick = () => $('#settings-dialog').showModal();
  $('#reset-preferences').onclick = () => {
    ctx.beforeEdit('settings'); preferences.reset();
    units.change(preferences.get().displayUnits); restore(); ctx.generator.reset(); ctx.setMode(ctx.ui.mode);
    $('#settings-dialog').close(); ctx.notify('Settings reset');
  };
  initI18n({ onChange: language => { $('#language-select').value = language; } });
  $('#language-select').value = getLanguage();
  $('#language-select').onchange = event => setLanguage(event.target.value);
  return { restore };
}
