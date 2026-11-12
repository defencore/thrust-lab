const SVG_NS = 'http://www.w3.org/2000/svg';
const FONT = '-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif';
const MAX_PIXELS = 32_000_000;
const STYLE_PROPERTIES = [
  'color', 'display', 'visibility', 'opacity', 'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'vector-effect',
  'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing',
  'text-anchor', 'dominant-baseline', 'paint-order', 'clip-path', 'filter',
  'stop-color', 'stop-opacity',
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function dimension(value) {
  if (!Number.isFinite(value) || value <= 0 || value > 16_384) throw new Error('Chart image dimensions must be finite and positive.');
  return value;
}

function localReferences(value) {
  return value.replace(/url\(([^)]*)\)/g, (_, reference) => {
    const raw = reference.trim().replace(/^["']|["']$/g, '');
    const fragment = raw.indexOf('#');
    return fragment >= 0 ? `url(${raw.slice(fragment)})` : 'none';
  });
}

/** Copy the visible plot with resolved styles, without editor handles or external references. */
export function captureChartSVG(svg, { getStyle = globalThis.getComputedStyle, serialize = node => new XMLSerializer().serializeToString(node) } = {}) {
  if (!svg || typeof svg.cloneNode !== 'function' || typeof getStyle !== 'function') throw new Error('A visible chart is required to create an image.');
  const bounds = svg.getBoundingClientRect();
  const width = dimension(bounds.width), height = dimension(bounds.height);
  const clone = svg.cloneNode(true);
  const originalNodes = [svg, ...svg.querySelectorAll('*')], clonedNodes = [clone, ...clone.querySelectorAll('*')];
  for (let index = 0; index < originalNodes.length; index++) {
    const style = getStyle(originalNodes[index]);
    const declarations = STYLE_PROPERTIES.map(property => {
      const value = style.getPropertyValue(property);
      return value ? `${property}:${localReferences(value)}` : '';
    }).filter(Boolean);
    clonedNodes[index].setAttribute('style', declarations.join(';'));
  }
  for (const transient of clone.querySelectorAll('.chart-transient, .thrust-axis-hit')) transient.remove();
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(width)); clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return { plot: serialize(clone), width, height };
}

function lines(value, characters, maximum = Infinity) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return [];
  const output = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + word.length + 1 > characters) { output.push(line); line = ''; }
    if (word.length > characters) {
      if (line) { output.push(line); line = ''; }
      let rest = word;
      while (rest.length > characters) { output.push(rest.slice(0, characters)); rest = rest.slice(characters); }
      line = rest;
    } else line += `${line ? ' ' : ''}${word}`;
  }
  if (line) output.push(line);
  if (output.length > maximum) return [...output.slice(0, maximum - 1), `${output[maximum - 1].slice(0, Math.max(1, characters - 1))}…`];
  return output;
}

function textLines(values, x, y, { size = 12, height = size * 1.35, fill = '#65798f', weight = 400 } = {}) {
  return values.map((value, index) => `<text x="${x}" y="${y + index * height}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(value)}</text>`).join('');
}

/** Build a self-contained report so the saved image includes the same profile facts as the editor. */
export function buildChartImageSVG({ plot, width, height, title = '', metrics = [], legend = [], footer = '', showDetails = false, showLegend = false }) {
  dimension(width); dimension(height);
  if (typeof plot !== 'string' || !/^\s*<svg\b/i.test(plot) || !Array.isArray(metrics) || metrics.length !== 4 || !Array.isArray(legend)) throw new Error('Chart images need one SVG plot and four summary metrics.');
  const plotWidth = Math.max(480, width), scale = plotWidth / width, padding = 24, reportWidth = plotWidth + padding * 2;
  const columns = width < 700 ? 2 : 4, gap = 12, cardWidth = (plotWidth - gap * (columns - 1)) / columns;
  const heading = lines(title, Math.max(16, Math.floor(plotWidth / 11)), 3);
  let content = '<rect width="100%" height="100%" fill="#fff"/>';
  content += textLines(heading, padding, 34, { size: 20, height: 25, fill: '#253b52', weight: 650 });
  const cardsTop = 45 + Math.max(0, heading.length - 1) * 25, cardHeight = showDetails ? 112 : 84;
  for (const [index, metric] of metrics.entries()) {
    const x = padding + index % columns * (cardWidth + gap), y = cardsTop + Math.floor(index / columns) * (cardHeight + gap);
    const inner = cardWidth - 24;
    const value = `${metric.value ?? ''}${metric.unit ? ` ${metric.unit}` : ''}`;
    const valueSize = Math.min(22, Math.max(12, inner / Math.max(1, value.length) / .57));
    const labelOffset = metric.key === 'peak' ? 12 : 0;
    content += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="6" fill="#f7f9fc" stroke="#dce5ed"/>`;
    if (metric.key === 'peak') content += `<circle class="peak-metric-marker" cx="${x + 15}" cy="${y + 16}" r="3" fill="#dc4444" stroke="#fff" stroke-width="1.25"/>`;
    content += textLines(lines(metric.label, Math.max(10, Math.floor((inner - labelOffset) / 6)), 2), x + 12 + labelOffset, y + 20, { size: 10, height: 13, fill: '#657b91', weight: 600 });
    content += textLines([value], x + 12, y + 64, { size: valueSize, fill: '#29445f', weight: 550 });
    if (showDetails) content += textLines(lines(metric.detail, Math.max(10, Math.floor(inner / 5.7)), 2), x + 12, y + 86, { size: 10, height: 13, fill: '#75899e' });
  }
  const rows = Math.ceil(metrics.length / columns), cardsBottom = cardsTop + rows * cardHeight + (rows - 1) * gap;
  const shownLegend = showLegend ? legend : [];
  let legendY = cardsBottom + 24, legendX = padding;
  for (const item of shownLegend) {
    const itemWidth = Math.min(plotWidth, Math.max(65, String(item.label).length * 6.5 + 34));
    if (legendX > padding && legendX + itemWidth > reportWidth - padding) { legendX = padding; legendY += 23; }
    content += `<line x1="${legendX}" y1="${legendY - 4}" x2="${legendX + 18}" y2="${legendY - 4}" stroke="${escape(item.color || '#3978b8')}" stroke-width="2"${item.dashed ? ' stroke-dasharray="5 3"' : ''}/>`;
    content += textLines([item.label], legendX + 25, legendY, { size: 11, fill: '#6b8095' });
    legendX += itemWidth;
  }
  const plotTop = shownLegend.length ? legendY + 13 : cardsBottom + 12, plotHeight = height * scale;
  content += `<g transform="translate(${padding},${plotTop}) scale(${scale})">${plot}</g>`;
  const footerLines = lines(footer, Math.max(20, Math.floor(plotWidth / 6)), 3);
  const footerTop = plotTop + plotHeight + 20;
  content += textLines(footerLines, padding, footerTop, { size: 11, height: 15, fill: '#73879a' });
  const reportHeight = footerTop + Math.max(1, footerLines.length) * 15 + 13;
  const svg = `<svg xmlns="${SVG_NS}" width="${reportWidth}" height="${reportHeight}" viewBox="0 0 ${reportWidth} ${reportHeight}" font-family="${FONT}"><title>${escape(title)}</title>${content}</svg>`;
  return { svg, width: reportWidth, height: reportHeight };
}

/** Rasterize the standalone report with a white background and a bounded high-resolution canvas. */
export async function renderChartPNG(report, { scale = 2, document: dom = globalThis.document, Image: ImageType = globalThis.Image, URL: urls = globalThis.URL } = {}) {
  dimension(report?.width); dimension(report?.height);
  if (typeof report.svg !== 'string' || !Number.isFinite(scale) || scale <= 0 || !dom || typeof ImageType !== 'function') throw new Error('The browser cannot create a chart image.');
  const imageURL = urls.createObjectURL(new Blob([report.svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new ImageType();
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = () => reject(new Error('The chart image could not be rendered.'));
      image.src = imageURL;
    });
    const resolution = Math.min(scale, Math.sqrt(MAX_PIXELS / (report.width * report.height)));
    const canvas = dom.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(report.width * resolution)); canvas.height = Math.max(1, Math.ceil(report.height * resolution));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser cannot create a chart image.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The chart image could not be encoded.')), 'image/png'));
  } finally { urls.revokeObjectURL(imageURL); }
}

/** Download an already generated PNG without recreating or altering the profile. */
export function downloadChartPNG(blob, filename, { document: dom = globalThis.document, URL: urls = globalThis.URL, delay = globalThis.setTimeout } = {}) {
  const imageURL = urls.createObjectURL(blob);
  try {
    const anchor = dom.createElement('a');
    anchor.href = imageURL; anchor.download = filename;
    dom.body.append(anchor); anchor.click(); anchor.remove();
  } finally { delay(() => urls.revokeObjectURL(imageURL), 1000); }
}
