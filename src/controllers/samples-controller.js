import { interpolate } from '../profile.js';
import { alignTheory } from '../alignment.js';
import { toDisplay, fromDisplay } from '../units.js';
import { icon } from '../ui/icons.js';
import { escape, clamp } from '../ui/dom.js';

export function createSamplesController(ctx) {
  const { $, $$, store, ui, units } = ctx;
  let page = 0;
  const size = 50;
  function render({ force = false } = {}) {
    if (ui.bottomTab !== 'samples') return;
    // Keep the active numeric editor and its caret alive during live renders.
    if (!force && $('#samples-panel').contains(document.activeElement)) return;
    const p = store.get();
    const pages = Math.ceil(p.points.length / size);
    page = clamp(page, 0, pages - 1);
    const start = page * size;
    const reference = alignTheory(p.theory, p.points, p.theoryAlignment);
    $('#samples-panel').innerHTML = `<div class="sample-toolbar"><span>${icon('lock')}Time marks are read-only. Edit thrust values directly.</span><button id="reveal-cursor" class="button small">Reveal cursor</button><div><button class="button small" id="sample-prev" ${page ? '' : 'disabled'}>Previous</button><label class="page-jump"><span class="sr-only">Go to page</span><input id="sample-page" type="number" min="1" max="${pages}" value="${page + 1}" aria-label="Go to page"></label><span>/ ${pages}</span><button class="button small" id="sample-next" ${page + 1 < pages ? '' : 'disabled'}>Next</button></div></div><div class="sample-table-scroll"><table class="data-table"><thead><tr><th>#</th><th>Time (${units.symbol('time')})</th><th>Thrust (${units.symbol('thrust')})</th><th>Theory (${units.symbol('thrust')})</th></tr></thead><tbody>${p.points.slice(start, start + size).map((point, index) => `<tr class="${p.selection && point.time >= p.selection[0] && point.time <= p.selection[1] ? 'selected-row' : ''}"><td>${start + index + 1}</td><td class="mono">${escape(p.csvFormat?.timeUnit === units.get().time ? p.csvFormat.rows[start + index][0] : toDisplay(point.time, 'time', units.get()))}</td><td><input data-sample="${start + index}" type="number" min="0" step="any" aria-label="Thrust at ${units.format(point.time, 'time', 4)} ${units.symbol('time')}" value="${toDisplay(point.thrust, 'thrust', units.get())}"></td><td class="mono muted">${reference ? units.format(interpolate(reference, point.time), 'thrust', 4) : '—'}</td></tr>`).join('')}</tbody></table></div>`;
    $('#sample-prev').onclick = () => { page--; render({ force: true }); };
    $('#sample-next').onclick = () => { page++; render({ force: true }); };
    $('#sample-page').onchange = event => { page = clamp(Math.round(Number(event.target.value) || 1) - 1, 0, pages - 1); render({ force: true }); };
    $('#reveal-cursor').onclick = () => {
      let index = p.points.findIndex(point => point.time >= ui.playhead);
      if (index < 0) index = p.points.length - 1;
      page = Math.floor(index / size); render({ force: true }); $(`[data-sample="${index}"]`)?.focus();
    };
  }
  $('#samples-panel').addEventListener('input', event => {
    const input = event.target.closest('[data-sample]');
    if (!input) return;
    const value = Number(input.value), index = Number(input.dataset.sample);
    const valid = input.value.trim() && Number.isFinite(value) && value >= 0;
    input.classList.toggle('input-error', !valid); input.setAttribute('aria-invalid', String(!valid));
    if (!valid) return;
    try {
      const thrust = fromDisplay(value, 'thrust', units.get());
      ctx.beforeEdit('sample');
      ui.selectedSample = index;
      ui.playhead = store.get().points[index].time;
      store.edit(`Edit sample ${index + 1}`, project => { project.points[index].thrust = thrust; project.curveEdit = null; }, { key: `sample:${index}` });
    } catch (error) { ctx.error(error); }
  });
  $('#samples-panel').addEventListener('focusin', event => {
    const input = event.target.closest('[data-sample]');
    if (!input) return;
    ui.selectedSample = Number(input.dataset.sample);
    ui.playhead = store.get().points[ui.selectedSample].time;
    ctx.render();
  });
  $('#samples-panel').addEventListener('focusout', () => queueMicrotask(() => { if (!$('#samples-panel').contains(document.activeElement)) render(); }));
  return { render, reset() { page = 0; } };
}
