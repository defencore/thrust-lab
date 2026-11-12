import { captureChartSVG, buildChartImageSVG, renderChartPNG, downloadChartPNG } from '../chart-image.js';
import { t } from '../i18n.js';

const text = node => node?.textContent?.trim() || '';

function imageReport(ctx) {
  const { $, chart, units, ui } = ctx;
  const captured = captureChartSVG(chart.svg);
  const metrics = ['impulse', 'peak', 'burn', 'average'].map(name => {
    const value = $(`#metric-${name}`), card = value.closest('.metric');
    return { label: text(card.querySelector('span')), value: text(value), unit: text(value.nextElementSibling), detail: text(card.querySelector('p')) };
  });
  const legend = [...$('#chart-report .chart-legend').querySelectorAll(':scope > span')].filter(item => !item.hidden).map(item => {
    const swatch = item.querySelector('i'), style = getComputedStyle(swatch);
    return { label: text(item), color: style.borderTopColor, dashed: style.borderTopStyle === 'dashed' };
  });
  const footer = `${t('Full profile metrics')} · ${t('Time window')}: ${units.format(ui.view[0], 'time', 3)} — ${units.format(ui.view[1], 'time', 3)} ${units.symbol('time')}`;
  return buildChartImageSVG({ ...captured, title: text($('#chart-name')), metrics, legend, footer });
}

/** Clipboard writes begin inside the click gesture; PNG encoding resolves their promised image later. */
export function createChartImageController(ctx, {
  makeImage = () => renderChartPNG(imageReport(ctx)),
  clipboard = globalThis.navigator?.clipboard,
  ClipboardItem: Item = globalThis.ClipboardItem,
  download = downloadChartPNG,
} = {}) {
  const buttons = [ctx.$('#copy-chart-image'), ctx.$('#save-chart-image')];
  let busy = false;
  const setBusy = value => { busy = value; for (const button of buttons) { button.disabled = value; button.setAttribute('aria-busy', String(value)); } };
  const notify = (message, error = false) => ctx.notify(message, error);

  async function copy() {
    if (busy) return;
    if (!clipboard || typeof clipboard.write !== 'function' || typeof Item !== 'function') { notify('Image copying is unavailable in this browser. Use Save PNG.', true); return; }
    setBusy(true);
    let imageFailed = false;
    const image = Promise.resolve().then(makeImage).catch(error => { imageFailed = true; throw error; });
    // A rejected clipboard request can finish before image encoding does.
    image.catch(() => {});
    try {
      await clipboard.write([new Item({ 'image/png': image })]);
      await image;
      notify('Chart image copied');
    } catch {
      notify(imageFailed ? 'The chart image could not be created. Try again.' : 'The chart image could not be copied. Use Save PNG.', true);
    } finally { setBusy(false); }
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const name = ctx.activeProfile().name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-|-$/g, '') || 'thrust-profile';
      const image = await makeImage();
      download(image, `${name}-profile.png`);
      notify('Chart image saved');
    } catch { notify('The chart image could not be saved. Try again.', true); }
    finally { setBusy(false); }
  }

  buttons[0].onclick = copy; buttons[1].onclick = save;
  return { copy, save, get isBusy() { return busy; } };
}
