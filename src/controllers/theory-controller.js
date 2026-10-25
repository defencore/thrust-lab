import { alignTheory } from '../alignment.js';

export function createTheoryController(ctx) {
  const { $, store, units } = ctx;
  function alignment() {
    const offset = units.read('theory-offset');
    if (!Number.isFinite(offset) || Math.abs(offset) > 1e9) return;
    const settings = { mode: $('#theory-alignment').value, offset };
    try {
      alignTheory(store.get().theory, store.get().points, settings);
      ctx.edit('Theory alignment', project => { project.theoryAlignment = settings; }, { key: 'theory-alignment' });
    } catch (error) { ctx.error(error); }
  }
  $('#theory-alignment').oninput = alignment;
  $('#theory-offset').oninput = alignment;
  $('#align-theory-start').onclick = () => { $('#theory-alignment').value = 'ignition'; units.set('theory-offset', 0, { force: true }); alignment(); };
  $('#capture-theory').onclick = () => ctx.edit('Capture theoretical reference', project => {
    project.theory = structuredClone(project.points); project.showTheory = true;
    project.theoryAlignment = { mode: 'source', offset: 0 };
  });
  $('#generate-theory').onclick = () => {
    const draft = ctx.generator.getDraft();
    if (!draft) return;
    ctx.edit('Generated theoretical reference', project => { project.theory = structuredClone(draft.theory || draft.points); project.showTheory = true; });
  };
  $('#remove-theory').onclick = () => ctx.edit('Remove theoretical curve', project => { project.theory = null; });
  $('#theory-opacity').oninput = event => {
    $('#opacity-value').value = `${event.target.value}%`;
    document.documentElement.style.setProperty('--theory-opacity', Number(event.target.value) / 100);
  };
  for (const [id, field] of [['layer-theory', 'showTheory'], ['theory-visible', 'showTheory'], ['layer-original', 'showOriginal'], ['original-visible', 'showOriginal']]) {
    $(`#${id}`).onchange = event => store.edit('Curve visibility', project => { project[field] = event.target.checked; }, { key: field });
  }
  return { alignment };
}
