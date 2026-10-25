import { toDisplay, unitSymbol, displayNumber } from './units.js';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const coordinate = value => Number(value.toFixed(2));
const colors = ['#168b88', '#8766b3'];
const textWidth = text => text.length * 7;

/** Render measuring cursors as SVG without modifying chart or recording state. */
export function renderMeasurements({ measurement, x, y, box, units }) {
  if (!measurement?.a) return '';
  const format = (value, dimension, signed = false) => `${signed && value > 0 ? '+' : ''}${displayNumber(toDisplay(value, dimension, units), { digits: 3 })} ${unitSymbol(dimension, units)}`;
  const width = Math.max(1, box.right - box.left);
  const font = 'font-family="ui-monospace,SFMono-Regular,monospace" font-size="12"';
  const markers = [measurement.a, measurement.b].filter(Boolean).map((point, index) => ({ point, index, px: x(point.time), py: y(point.thrust), color: colors[index] }));
  const badges = [];
  function badge(text, center, top, color, { centered = false } = {}) {
    const estimated = textWidth(text) + 16;
    const badgeWidth = Math.min(estimated, Math.max(1, width - 8));
    const left = clamp(centered ? center - badgeWidth / 2 : center, box.left + 4, box.right - badgeWidth - 4);
    const badgeTop = clamp(top, box.top + 3, Math.max(box.top + 3, box.bottom - 27));
    const compressed = estimated > badgeWidth ? ` textLength="${coordinate(Math.max(1, badgeWidth - 16))}" lengthAdjust="spacingAndGlyphs"` : '';
    return { left, top: badgeTop, width: badgeWidth, height: 24, markup: `<g pointer-events="none"><rect x="${coordinate(left)}" y="${coordinate(badgeTop)}" width="${coordinate(badgeWidth)}" height="24" rx="4" fill="#ffffff" fill-opacity=".94" stroke="${color}" stroke-opacity=".45"/><text x="${coordinate(left + 8)}" y="${coordinate(badgeTop + 16)}" fill="${color}" ${font}${compressed}>${text}</text></g>` };
  }
  let markup = '<g class="chart-measurements">';
  for (const marker of markers) {
    const { px, py, index, color, point } = marker;
    markup += `<g pointer-events="none" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" opacity=".7"><path d="M${coordinate(px)},${coordinate(box.top)}V${coordinate(box.bottom)}M${coordinate(box.left)},${coordinate(py)}H${coordinate(box.right)}"/></g>`;
    const text = `${index ? 'B' : 'A'} ${format(point.time, 'time')} · ${format(point.thrust, 'thrust')}`;
    let label = badge(text, px + 12, py + (index ? 19 : -35), color);
    if (badges.some(other => label.left < other.left + other.width && label.left + label.width > other.left && label.top < other.top + other.height + 4 && label.top + label.height + 4 > other.top)) label = badge(text, px + 12, badges[0].top + (badges[0].top + 56 < box.bottom ? 30 : -30), color);
    badges.push(label);
    markup += label.markup;
    markup += `<circle class="measurement-marker" data-measure-marker="${index}" cx="${coordinate(px)}" cy="${coordinate(py)}" r="6" fill="${color}" stroke="#ffffff" stroke-width="2" pointer-events="all" style="cursor:ew-resize"><title>${text}</title></circle>`;
  }
  if (markers.length > 1) {
    const [a, b] = markers;
    const ax = clamp(a.px, box.left + 4, box.right - 4), bx = clamp(b.px, box.left + 4, box.right - 4);
    const ay = clamp(a.py, box.top + 4, box.bottom - 4), by = clamp(b.py, box.top + 4, box.bottom - 4);
    const rulerY = box.top + 10, rulerX = box.right - 10;
    markup += `<g class="measurement-brackets" fill="none" stroke="#64748b" stroke-width="1" pointer-events="none"><path d="M${coordinate(ax)},${coordinate(rulerY - 4)}v8M${coordinate(ax)},${coordinate(rulerY)}H${coordinate(bx)}M${coordinate(bx)},${coordinate(rulerY - 4)}v8M${coordinate(rulerX - 4)},${coordinate(ay)}h8M${coordinate(rulerX)},${coordinate(ay)}V${coordinate(by)}M${coordinate(rulerX - 4)},${coordinate(by)}h8"/></g>`;
    if (Number.isFinite(measurement.deltaTime)) markup += badge(`Δt ${format(measurement.deltaTime, 'time', true)}`, (ax + bx) / 2, box.top + 17, '#475569', { centered: true }).markup;
    if (Number.isFinite(measurement.deltaThrust)) {
      const text = `ΔF ${format(measurement.deltaThrust, 'thrust', true)}`;
      markup += badge(text, rulerX - textWidth(text) - 24, (ay + by) / 2 - 10, '#475569').markup;
    }
  }
  return `${markup}</g>`;
}
