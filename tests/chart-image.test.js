import test from 'node:test';
import assert from 'node:assert/strict';
import { captureChartSVG, buildChartImageSVG, renderChartPNG, downloadChartPNG } from '../src/chart-image.js';

const summary = [
  { label: 'TOTAL IMPULSE', value: '921.569', unit: 'N·s', detail: '352 measurement points' },
  { label: 'PEAK THRUST', value: '455.200', unit: 'N', detail: 'at 2.500 s' },
  { label: 'BURN DURATION', value: '3.500', unit: 's', detail: '5% peak threshold' },
  { label: 'MEAN BURN THRUST', value: '263.305', unit: 'N', detail: 'Impulse / 5% burn duration' },
];
const report = overrides => buildChartImageSVG({
  plot: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><path d="M0 400L400 0L800 400"/></svg>',
  width: 800, height: 400, title: 'Measured profile', metrics: summary,
  legend: [{ label: 'Working', color: '#3978b8' }, { label: 'Theoretical', color: '#ba8c43', dashed: true }],
  footer: 'Time window: 1.000 — 4.500 s', ...overrides,
});

test('the report includes the exact profile facts, original plot and visible-reference legend', () => {
  const built = report({ showDetails: true, showLegend: true });
  for (const text of ['Measured profile', '921.569 N·s', '455.200 N', '3.500 s', '263.305 N', '352 measurement points', 'Working', 'Theoretical', 'Time window: 1.000 — 4.500 s']) assert.ok(built.svg.includes(text), text);
  assert.match(built.svg, /stroke-dasharray="5 3"/);
  assert.match(built.svg, /M0 400L400 0L800 400/);
  assert.match(built.svg, /<rect width="100%" height="100%" fill="#fff"/);
  assert.ok(!built.svg.includes('foreignObject'));
  assert.equal(built.width, 848);
  assert.ok(built.height > 400);
});

test('small plots keep their aspect ratio with two readable metric columns', () => {
  const built = report({ width: 300, height: 500, plot: '<svg width="300" height="500"></svg>' });
  assert.equal(built.width, 528);
  assert.match(built.svg, /scale\(1\.6\)/);
  const cards = [...built.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="84"/g)];
  assert.equal(cards.length, 4);
  assert.equal(new Set(cards.map(match => match[1])).size, 2);
  assert.equal(new Set(cards.map(match => match[2])).size, 2);
  assert.ok(built.height > 800);
});

test('profile names, metadata and legend text cannot create SVG elements or attributes', () => {
  const built = report({ showDetails: true, showLegend: true, title: '<script>alert("x")</script> & profile', metrics: summary.map(metric => ({ ...metric, detail: '" <image href="https://example.test/x"/> & data' })), legend: [{ label: '<img> & reference', color: '#fff" onload="bad' }] });
  assert.ok(built.svg.includes('&lt;script&gt;'));
  assert.ok(built.svg.includes('&amp; profile'));
  assert.ok(!built.svg.includes('<script>'));
  assert.ok(!built.svg.includes('<image href='));
  assert.ok(built.svg.includes('#fff&quot; onload=&quot;bad'));
  for (const dimensions of [[0, 10], [10, Infinity], [-1, 100]]) assert.throws(() => report({ width: dimensions[0], height: dimensions[1] }), /dimensions/);
  assert.throws(() => report({ metrics: summary.slice(1) }), /four summary metrics/);
});

test('default images omit metric details, legend and branding without removing the numeric summaries', () => {
  const built = report();
  for (const value of ['921.569 N·s', '455.200 N', '3.500 s', '263.305 N']) assert.ok(built.svg.includes(value));
  for (const absent of ['352 measurement points', 'at 2.500 s', '5% peak threshold', 'Impulse / 5% burn duration', 'Working', 'Theoretical', 'Thrust Lab Studio', 'Full profile metrics']) assert.ok(!built.svg.includes(absent), absent);
  assert.ok(built.svg.includes('Time window: 1.000 — 4.500 s'));
  const withDetails = report({ showDetails: true, showLegend: true });
  assert.ok(!withDetails.svg.includes('Thrust Lab Studio'));
  assert.ok(withDetails.height > built.height);
});

class SVGNode {
  constructor(tag, attributes = {}, children = []) { this.tag = tag; this.attributes = { ...attributes }; this.children = children; for (const child of children) child.parent = this; }
  cloneNode() { return new SVGNode(this.tag, this.attributes, this.children.map(child => child.cloneNode(true))); }
  querySelectorAll(selector) {
    const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    return selector === '*' ? descendants : descendants.filter(node => ['chart-transient', 'thrust-axis-hit'].some(name => node.attributes.class?.split(' ').includes(name)));
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  getBoundingClientRect() { return { width: 640, height: 340 }; }
  serialize() { return `<${this.tag} ${Object.entries(this.attributes).map(([key, value]) => `${key}="${value}"`).join(' ')}>${this.children.map(child => child.serialize()).join('')}</${this.tag}>`; }
}

test('SVG capture resolves drawing styles and local references without exporting editing handles', () => {
  const source = new SVGNode('svg', {}, [new SVGNode('path', { class: 'current-path' }), new SVGNode('g', { class: 'chart-transient' }, [new SVGNode('circle')]), new SVGNode('rect', { class: 'thrust-axis-hit' }), new SVGNode('g', { class: 'measurement-markers' })]);
  const style = { fill: 'url("http://localhost:8082/#curve-fill")', 'clip-path': 'url("https://example.test/profile#plot-clip")', stroke: 'rgb(57, 120, 184)', 'stroke-width': '2px', 'font-size': '12px' };
  const captured = captureChartSVG(source, { getStyle: () => ({ getPropertyValue: key => style[key] || '' }), serialize: node => node.serialize() });
  assert.equal(captured.width, 640); assert.equal(captured.height, 340);
  assert.ok(captured.plot.includes('fill:url(#curve-fill)'));
  assert.ok(captured.plot.includes('clip-path:url(#plot-clip)'));
  assert.ok(captured.plot.includes('stroke:rgb(57, 120, 184)'));
  assert.ok(captured.plot.includes('measurement-markers'));
  assert.ok(!captured.plot.includes('chart-transient'));
  assert.ok(!captured.plot.includes('thrust-axis-hit'));
  assert.ok(!captured.plot.includes('localhost'));
  assert.ok(!captured.plot.includes('example.test'));
  assert.ok(source.children.some(child => child.attributes.class === 'chart-transient'));
});

function rasterEnvironment({ failImage = false, nullBlob = false } = {}) {
  const revoked = [], calls = [];
  const blob = new Blob(['encoded png'], { type: 'image/png' });
  const canvas = { width: 0, height: 0, getContext: () => ({ fillRect(...args) { calls.push(['fill', ...args]); }, drawImage(...args) { calls.push(['draw', ...args]); } }), toBlob(callback, type) { calls.push(['encode', type]); callback(nullBlob ? null : blob); } };
  class Image { set src(value) { this.source = value; queueMicrotask(() => failImage ? this.onerror() : this.onload()); } }
  return { canvas, blob, calls, revoked, environment: { document: { createElement: tag => { assert.equal(tag, 'canvas'); return canvas; } }, Image, URL: { createObjectURL: () => 'blob:chart-svg', revokeObjectURL: value => revoked.push(value) } } };
}

test('PNG encoding uses a white 2x canvas and releases its SVG object URL', async () => {
  const built = report(), f = rasterEnvironment();
  assert.equal(await renderChartPNG(built, f.environment), f.blob);
  assert.equal(f.canvas.width, Math.ceil(built.width * 2));
  assert.equal(f.canvas.height, Math.ceil(built.height * 2));
  assert.deepEqual(f.calls[0], ['fill', 0, 0, f.canvas.width, f.canvas.height]);
  assert.deepEqual(f.calls.at(-1), ['encode', 'image/png']);
  assert.deepEqual(f.revoked, ['blob:chart-svg']);
});

test('image-load and canvas-encoding failures release resources instead of producing a blank download', async () => {
  for (const options of [{ failImage: true }, { nullBlob: true }]) {
    const f = rasterEnvironment(options);
    await assert.rejects(renderChartPNG(report(), f.environment), /could not/);
    assert.deepEqual(f.revoked, ['blob:chart-svg']);
  }
});

test('downloads retain their PNG blob URL until after the anchor click', () => {
  const events = [];
  const anchor = { href: '', download: '', click() { events.push(['click', this.href, this.download]); }, remove() { events.push(['remove']); } };
  let delayed;
  downloadChartPNG(new Blob(['png']), 'Measured-profile.png', { document: { createElement: () => anchor, body: { append() { events.push(['append']); } } }, URL: { createObjectURL: () => 'blob:png', revokeObjectURL: value => events.push(['revoke', value]) }, delay(callback) { delayed = callback; } });
  assert.deepEqual(events, [['append'], ['click', 'blob:png', 'Measured-profile.png'], ['remove']]);
  delayed(); assert.deepEqual(events.at(-1), ['revoke', 'blob:png']);
});
