import { captureChartSVG, buildChartImageSVG, renderChartPNG, downloadChartPNG } from '../chart-image.js';
import { t } from '../i18n.js';
import { relativeTime } from '../time-axis.js';

const text = node => node?.textContent?.trim() || '';

/** Image facts follow the requested visibility, independently of the PNG renderer. */
export function chartImageModel(ctx, { getStyle = globalThis.getComputedStyle } = {}) {
  const { $, units, ui } = ctx;
  const settings = ctx.imageSettings.getState();
  const showDetails = settings.showDetails === true, showLegend = settings.showLegend === true;
  const metrics = ['impulse', 'peak', 'burn', 'average'].map(name => {
    const value = $(`#metric-${name}`), card = value.closest('.metric');
    return { key: name, label: text(card.querySelector('span')), value: text(value), unit: text(value.nextElementSibling), detail: showDetails ? text(card.querySelector('p')) : '' };
  });
  const profile = ctx.activeProfile(), container = $('#chart-report .chart-legend');
  const visible = node => {
    if (node.hidden) return false;
    const style = getStyle(node);
    return style.display !== 'none' && !['hidden', 'collapse'].includes(style.visibility) && style.opacity !== '0';
  };
  const items = showLegend && container && visible(container) ? [...container.querySelectorAll(':scope > span')] : [];
  const legend = items.filter(item => visible(item)
    && (item.id !== 'theory-legend' || profile.showTheory && !!profile.theory)
    && (item.id !== 'original-legend' || profile.showOriginal && !!profile.original)).map(item => {
    const swatch = item.querySelector('i'), style = getStyle(swatch);
    return { label: text(item), color: style.borderTopColor, dashed: style.borderTopStyle === 'dashed' };
  });
  const timeLabel = ui.timeOriginSI == null ? 'Time window' : 'Time from fitted region start';
  const footer = `${showDetails ? `${t('Full profile metrics')} · ` : ''}${t(timeLabel)}: ${units.format(relativeTime(ui.view[0], ui.timeOriginSI), 'time', 3)} — ${units.format(relativeTime(ui.view[1], ui.timeOriginSI), 'time', 3)} ${units.symbol('time')}`;
  return { title: text($('#chart-name')), metrics, legend, footer, showDetails, showLegend };
}

function imageReport(ctx) {
  return buildChartImageSVG({ ...captureChartSVG(ctx.chart.svg), ...chartImageModel(ctx) });
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
