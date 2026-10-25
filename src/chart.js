import { interpolate } from './profile.js';
import { visibleEnvelope } from './chart-data.js';
import { toDisplay, unitSymbol, displayNumber } from './units.js';
import { renderMeasurements } from './chart-measurements.js';
import { defaultThrustView, axisTicks, zoomVerticalView, panVerticalView } from './vertical-view.js';

const svgNS = 'http://www.w3.org/2000/svg';
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const number = (n, digits = 2) => n !== 0 && Math.abs(n) < 1e-10 ? n.toExponential(2) : Number(n.toFixed(digits)).toString();

export class ProfileChart {
  constructor(container, overview, callbacks) {
    this.container = container;
    this.overview = overview;
    this.callbacks = callbacks;
    this.svg = document.createElementNS(svgNS, 'svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Editable thrust curve. Use the selection tool to select a time range, or the draw tool to edit thrust.');
    this.svg.classList.add('profile-svg');
    container.append(this.svg);
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'chart-tooltip';
    this.tooltip.hidden = true;
    container.append(this.tooltip);
    this.svg.addEventListener('pointerdown', e => this.down(e));
    this.svg.addEventListener('pointermove', e => this.move(e));
    this.svg.addEventListener('pointerup', e => this.up(e));
    this.svg.addEventListener('pointercancel', e => this.up(e));
    this.svg.addEventListener('pointerleave', () => { if (!this.drag) { this.hover = null; this.tooltip.hidden = true; this.draw(); } });
    this.svg.addEventListener('dblclick', event => {
      if (this.isThrustAxis(event)) this.fitThrust();
      else if (this.state.tool === 'select') callbacks.onSelection(null);
    });
    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.drag) return;
      const c = this.coords(e);
      const delta = e.deltaY || e.deltaX;
      if (!delta) return;
      if (e.shiftKey || this.isThrustAxis(e)) this.zoomThrust(delta > 0 ? 1.2 : 1 / 1.2, c.thrust);
      else this.zoom(delta > 0 ? 1.2 : 1 / 1.2, c.time);
    }, { passive: false });
    this.overview.addEventListener('pointerdown', e => {
      this.overview.setPointerCapture(e.pointerId);
      this.overviewDrag = true;
      this.overviewMove(e);
    });
    this.overview.addEventListener('pointermove', e => { if (this.overviewDrag) this.overviewMove(e); });
    this.overview.addEventListener('pointerup', () => { this.overviewDrag = false; });
    this.overview.addEventListener('pointercancel', () => { this.overviewDrag = false; });
    new ResizeObserver(() => this.draw()).observe(container);
  }

  setState(state) { this.state = state; this.draw(); }

  isThrustAxis(event) {
    if (!this.box) return false;
    const rect = this.svg.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    return localX >= 0 && localX < this.box.left && localY >= this.box.top && localY <= this.box.bottom;
  }

  autoThrustView() {
    const s = this.state;
    const [start, end] = s.view;
    let peak = 0;
    for (const points of [s.points, ...(s.curveBase ? [s.curveBase] : []), ...(s.showTheory && s.theory ? [s.theory] : []), ...(s.showOriginal && s.original ? [s.original] : [])]) {
      peak = Math.max(peak, interpolate(points, start), interpolate(points, end));
      for (const point of points) if (point.time >= start && point.time <= end) peak = Math.max(peak, point.thrust);
    }
    return defaultThrustView(peak, s.units);
  }

  effectiveThrustView() {
    if (['draw', 'curve', 'shift'].includes(this.drag?.tool)) return [...this.drag.thrustView];
    return this.state.thrustView ? [...this.state.thrustView] : this.autoThrustView();
  }

  setThrustView(view) { this.callbacks.onThrustView(view == null ? null : [...view]); }

  zoomThrust(factor, anchor = 0) {
    this.cancelDrag();
    this.setThrustView(zoomVerticalView(this.effectiveThrustView(), factor, { anchor, extent: this.autoThrustView() }));
  }

  fitThrust() { this.cancelDrag(); this.setThrustView(null); }

  coords(event) {
    const rect = this.svg.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, this.box.left, this.box.right);
    const y = clamp(event.clientY - rect.top, this.box.top, this.box.bottom);
    return { x, y, time: this.state.view[0] + (x - this.box.left) / this.box.width * (this.state.view[1] - this.state.view[0]), thrust: this.yMin + (this.box.bottom - y) / this.box.height * (this.yMax - this.yMin) };
  }

  down(e) {
    if (e.button !== 0 || !this.state) return;
    const onAxis = this.isThrustAxis(e);
    if (onAxis && this.axisClick && Date.now() - this.axisClick.at < 450 && Math.hypot(e.clientX - this.axisClick.x, e.clientY - this.axisClick.y) < 6) {
      this.axisClick = null; this.fitThrust(); this.tooltip.hidden = true; return;
    }
    const c = this.coords(e);
    this.svg.setPointerCapture(e.pointerId);
    this.drag = { start: c, previous: c, view: [...this.state.view], tool: onAxis ? 'thrust-axis' : this.state.tool, thrustView: [this.yMin, this.yMax], thrustExtent: this.autoThrustView(), thrustManual: this.state.thrustView != null, pointerId: e.pointerId, axisX: e.clientX, axisY: e.clientY, axisMoved: false };
    if (this.drag.tool === 'thrust-axis') { this.tooltip.hidden = true; return; }
    if (this.state.tool === 'shift') { this.callbacks.onShiftStart(c); this.tooltip.hidden = true; return; }
    if (this.state.tool === 'measure') {
      const [a, b] = this.state.view;
      let index = -1, closest = 13;
      for (const [i, point] of [this.state.measurement?.a, this.state.measurement?.b].entries()) {
        if (!point) continue;
        const px = this.box.left + (point.time - a) / (b - a) * this.box.width;
        const py = this.box.bottom - (point.thrust - this.yMin) / (this.yMax - this.yMin) * this.box.height;
        const distance = Math.hypot(px - c.x, py - c.y);
        if (distance < closest) { closest = distance; index = i; }
      }
      this.drag.measureIndex = this.callbacks.onMeasureStart({ ...c, index });
    }
    else if (this.state.tool === 'curve') {
      const [a, b] = this.state.view;
      let index = -1, closest = 13;
      for (let i = 0; i < (this.state.curveNodes || []).length; i++) {
        const point = this.state.curveNodes[i];
        const px = this.box.left + (point.time - a) / (b - a) * this.box.width;
        const py = this.box.bottom - (point.thrust - this.yMin) / (this.yMax - this.yMin) * this.box.height;
        const distance = Math.hypot(px - c.x, py - c.y);
        if (distance < closest) { closest = distance; index = i; }
      }
      this.drag.curveIndex = this.callbacks.onCurveStart({ ...c, index });
    }
    else if (this.state.tool === 'draw') { this.callbacks.onDrawStart(); this.callbacks.onDraw(c); }
    else if (this.state.tool === 'select') this.callbacks.onCursor(c.time);
    this.tooltip.hidden = true;
  }

  move(e) {
    if (!this.state || !this.box) return;
    const c = this.coords(e);
    if (this.drag) {
      const d = this.drag;
      if (d.tool === 'thrust-axis') {
        if (Math.abs(c.y - d.start.y) > 3) { d.axisMoved = true; this.axisClick = null; }
        const factor = Math.exp((c.y - d.start.y) / this.box.height * 2);
        this.setThrustView(zoomVerticalView(d.thrustView, factor, { anchor: d.thrustView[0], extent: d.thrustExtent }));
      }
      else if (d.tool === 'shift') this.callbacks.onShiftMove(c);
      else if (d.tool === 'measure') this.callbacks.onMeasureMove({ ...c, index: d.measureIndex });
      else if (d.tool === 'curve') this.callbacks.onCurveMove({ ...c, index: d.curveIndex });
      else if (d.tool === 'draw') this.callbacks.onDraw({ ...c, previous: d.previous });
      else if (d.tool === 'select' && Math.abs(c.x - d.start.x) > 3) { d.selected = true; this.callbacks.onSelection([Math.min(d.start.time, c.time), Math.max(d.start.time, c.time)], true); }
      else if (d.tool === 'pan') {
        const shift = (d.start.x - c.x) / this.box.width * (d.view[1] - d.view[0]);
        this.setView([d.view[0] + shift, d.view[1] + shift]);
        if (d.thrustManual) {
          const thrustShift = (c.y - d.start.y) / this.box.height * (d.thrustView[1] - d.thrustView[0]);
          this.setThrustView(panVerticalView(d.thrustView, thrustShift, { extent: d.thrustExtent }));
        }
      }
      d.previous = c;
    } else {
      if (this.isThrustAxis(e)) { this.hover = null; this.tooltip.hidden = true; this.draw(); return; }
      this.hover = c;
      this.tooltip.hidden = false;
      this.tooltip.style.left = `${Math.min(c.x + 15, this.container.clientWidth - 150)}px`;
      this.tooltip.style.top = `${Math.max(4, c.y - 60)}px`;
      this.tooltip.innerHTML = `<span>${displayNumber(toDisplay(c.time, 'time', this.state.units), { digits: 4 })} <small>${unitSymbol('time', this.state.units)}</small></span><strong>${displayNumber(toDisplay(interpolate(this.state.points, c.time), 'thrust', this.state.units), { digits: 3 })} <small>${unitSymbol('thrust', this.state.units)}</small></strong>`;
      this.draw();
    }
  }

  up(e) {
    if (!this.drag) return;
    const { tool, selected, thrustView, thrustManual, axisX, axisY, axisMoved } = this.drag;
    this.drag = null;
    if (tool === 'thrust-axis') {
      this.axisClick = e.type !== 'pointercancel' && !axisMoved ? { at: Date.now(), x: axisX, y: axisY } : null;
      if (e.type === 'pointercancel') this.setThrustView(thrustManual ? thrustView : null);
    }
    else if (tool === 'shift') this.callbacks.onShiftEnd(e.type === 'pointercancel');
    else if (tool === 'measure') this.callbacks.onMeasureEnd(e.type === 'pointercancel');
    else if (tool === 'curve') this.callbacks.onCurveEnd(e.type === 'pointercancel');
    else if (tool === 'draw') this.callbacks.onDrawEnd(e.type === 'pointercancel');
    else if (tool === 'select' && selected) {
      if (e.type === 'pointercancel') this.callbacks.onSelectionCancel?.();
      else this.callbacks.onSelection(this.state.selection);
    }
    if (this.svg.hasPointerCapture(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
    this.draw();
  }

  cancelDrag() {
    if (!this.drag) return false;
    const { tool, selected, pointerId, thrustView, thrustManual } = this.drag;
    this.drag = null;
    if (tool === 'thrust-axis') { this.axisClick = null; this.setThrustView(thrustManual ? thrustView : null); }
    else if (tool === 'shift') this.callbacks.onShiftEnd(true);
    else if (tool === 'measure') this.callbacks.onMeasureEnd(true);
    else if (tool === 'curve') this.callbacks.onCurveEnd(true);
    else if (tool === 'draw') this.callbacks.onDrawEnd(true);
    else if (tool === 'select' && selected) this.callbacks.onSelectionCancel?.();
    if (this.svg.hasPointerCapture(pointerId)) this.svg.releasePointerCapture(pointerId);
    this.draw();
    return true;
  }

  setView(view) {
    const points = this.state.points;
    const min = points[0].time;
    const max = points.at(-1).time;
    const length = Math.min(max - min, view[1] - view[0]);
    const start = clamp(view[0], min, max - length);
    this.callbacks.onView([start, start + length]);
  }

  zoom(factor, anchor) {
    const [a, b] = this.state.view;
    const full = this.state.points.at(-1).time - this.state.points[0].time;
    const length = clamp((b - a) * factor, full / 100, full);
    const pivot = anchor ?? (a + b) / 2;
    const ratio = (pivot - a) / (b - a);
    this.setView([pivot - length * ratio, pivot + length * (1 - ratio)]);
  }

  overviewMove(e) {
    const rect = this.overview.getBoundingClientRect();
    const points = this.state.points;
    const t = points[0].time + clamp((e.clientX - rect.left) / rect.width, 0, 1) * (points.at(-1).time - points[0].time);
    const half = (this.state.view[1] - this.state.view[0]) / 2;
    this.setView([t - half, t + half]);
  }

  draw() {
    if (!this.state || !this.state.points.length) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.box = { left: 62, right: width - 24, top: 28, bottom: height - 42, width: width - 86, height: height - 70 };
    const box = this.box;
    const s = this.state;
    const [start, end] = s.view;
    [this.yMin, this.yMax] = this.effectiveThrustView();
    const x = t => box.left + (t - start) / (end - start) * box.width;
    const y = v => box.bottom - (v - this.yMin) / (this.yMax - this.yMin) * box.height;
    const path = (points, close = false) => {
      const visible = visibleEnvelope(points, start, end);
      let d = '';
      for (let i = 0; i < visible.length; i++) d += `${i ? 'L' : 'M'}${x(visible[i].time).toFixed(2)},${y(visible[i].thrust).toFixed(2)}`;
      return close ? `${d}L${x(visible.at(-1).time)},${box.bottom}L${x(visible[0].time)},${box.bottom}Z` : d;
    };
    let content = `<defs><linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3978bf" stop-opacity=".16"/><stop offset="100%" stop-color="#3978bf" stop-opacity=".015"/></linearGradient><clipPath id="plot-clip"><rect x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}"/></clipPath></defs>`;
    const thrustTicks = axisTicks([this.yMin, this.yMax], s.units);
    for (const value of thrustTicks.valuesSI) content += `<line class="grid-line" x1="${box.left}" y1="${y(value)}" x2="${box.right}" y2="${y(value)}"/><text class="axis-label" x="${box.left - 13}" y="${y(value) + 4}" text-anchor="end">${number(toDisplay(value, 'thrust', s.units), thrustTicks.precision)}</text>`;
    const xTicks = width < 520 ? 5 : 8;
    const timePrecision = Math.max(0, Math.min(12, Math.ceil(-Math.log10(toDisplay(end - start, 'time', s.units) / xTicks)) + 1));
    for (let i = 0; i <= xTicks; i++) {
      const t = start + (end - start) * i / xTicks;
      content += `<line class="grid-line vertical" x1="${x(t)}" y1="${box.top}" x2="${x(t)}" y2="${box.bottom}"/><text class="axis-label" x="${x(t)}" y="${box.bottom + 23}" text-anchor="middle">${number(toDisplay(t, 'time', s.units), timePrecision)}</text>`;
    }
    content += `<text class="axis-title" x="20" y="16">THRUST / ${unitSymbol('thrust', s.units)}</text><text class="axis-title" x="${box.right}" y="${height - 2}" text-anchor="end">TIME / ${unitSymbol('time', s.units)}</text><g clip-path="url(#plot-clip)">`;
    if (s.selection) {
      content += `<rect class="selection-fill" x="${x(s.selection[0])}" y="${box.top}" width="${x(s.selection[1]) - x(s.selection[0])}" height="${box.height}"/>`;
      const feather = clamp(Number(s.feather) || 0, 0, .5);
      if (feather > 0) {
        const edge = (s.selection[1] - s.selection[0]) * feather;
        for (const t of [s.selection[0] + edge, s.selection[1] - edge]) content += `<line class="feather-guide" x1="${x(t)}" y1="${box.top}" x2="${x(t)}" y2="${box.bottom}"/>`;
      }
    }
    if (s.curveInfluence) {
      const [left, right] = s.curveInfluence;
      content += `<rect class="curve-influence-fill" x="${x(left)}" y="${box.top}" width="${x(right) - x(left)}" height="${box.height}"/>`;
      for (const time of s.curveInfluence) content += `<line class="curve-influence-edge" x1="${x(time)}" y1="${box.top}" x2="${x(time)}" y2="${box.bottom}"/>`;
    }
    if (s.showOriginal && s.original) content += `<path class="original-path" d="${path(s.original)}"/>`;
    if (s.curveBase) content += `<path class="curve-base-path" d="${path(s.curveBase)}"/>`;
    if (s.showTheory && s.theory) content += `<path class="theory-path" d="${path(s.theory)}"/>`;
    content += `<path fill="url(#curve-fill)" d="${path(s.points, true)}"/><path class="current-path" d="${path(s.points)}"/>`;
    if (s.selection) for (const t of s.selection) content += `<line class="selection-edge" x1="${x(t)}" y1="${box.top}" x2="${x(t)}" y2="${box.bottom}"/><rect class="selection-handle" x="${x(t) - 3}" y="${box.top}" width="6" height="16" rx="2"/>`;
    if (s.playhead >= start && s.playhead <= end) content += `<line class="cursor-line" x1="${x(s.playhead)}" y1="${box.top}" x2="${x(s.playhead)}" y2="${box.bottom}"/><path fill="#334155" d="M${x(s.playhead) - 5},${box.top - 7}h10l-5,7z"/>`;
    if (this.hover && !this.drag) {
      const forceY = y(interpolate(s.points, this.hover.time));
      content += `<line class="hover-line" x1="${this.hover.x}" y1="${box.top}" x2="${this.hover.x}" y2="${box.bottom}"/><line class="hover-line" x1="${box.left}" y1="${forceY}" x2="${box.right}" y2="${forceY}"/><circle cx="${this.hover.x}" cy="${forceY}" r="4" fill="#fff" stroke="#316eae" stroke-width="2"/>`;
    }
    if (s.curveNodes) for (let i = 0; i < s.curveNodes.length; i++) {
      const node = s.curveNodes[i];
      const selected = i === s.curveSelected;
      const boundary = i === 0 || i === s.curveNodes.length - 1;
      if (selected) content += `<line class="curve-node-guide" x1="${x(node.time)}" y1="${box.top}" x2="${x(node.time)}" y2="${box.bottom}"/><line class="curve-node-guide" x1="${box.left}" y1="${y(node.thrust)}" x2="${box.right}" y2="${y(node.thrust)}"/><circle class="curve-node-halo" cx="${x(node.time)}" cy="${y(node.thrust)}" r="16"/>`;
      content += `<circle data-curve-node="${i}" class="curve-control-node ${selected ? 'selected' : ''} ${boundary ? 'boundary' : ''}" cx="${x(node.time)}" cy="${y(node.thrust)}" r="${selected ? 8 : 5}"/><text class="curve-node-label" x="${x(node.time) + 12}" y="${y(node.thrust) - 12}">${i + 1}</text>`;
    }
    if (s.selectedSample != null && s.points[s.selectedSample]) {
      const sample = s.points[s.selectedSample];
      content += `<circle class="curve-node-halo" cx="${x(sample.time)}" cy="${y(sample.thrust)}" r="14"/><circle class="curve-control-node selected" cx="${x(sample.time)}" cy="${y(sample.thrust)}" r="7"/>`;
    }
    content += renderMeasurements({ measurement: s.measurement, x, y, box, units: s.units });
    content += `</g><rect class="thrust-axis-hit" x="0" y="${box.top}" width="${box.left - 4}" height="${box.height}" fill="transparent" style="cursor:ns-resize"><title>Drag to zoom thrust · Double-click to reset</title></rect>`;
    this.svg.innerHTML = content;
    this.container.dataset.tool = s.tool;
    this.drawOverview();
  }

  drawOverview() {
    const s = this.state;
    const points = s.points;
    const width = this.overview.clientWidth;
    const height = 47;
    const min = points[0].time;
    const max = points.at(-1).time;
    const sampled = visibleEnvelope(points, min, max, 700);
    const peak = Math.max(...sampled.map(p => p.thrust), 0) || 1;
    const x = t => (t - min) / (max - min) * width;
    const y = v => height - 5 - v / peak * (height - 14);
    const d = sampled.map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(1)},${y(p.thrust).toFixed(1)}`).join('');
    this.overview.innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="${d}L${width},${height}L0,${height}Z" fill="#dce7f2"/><path d="${d}" fill="none" stroke="#85a8ce" stroke-width="1"/>${s.selection ? `<rect x="${x(s.selection[0])}" width="${x(s.selection[1]) - x(s.selection[0])}" height="${height}" fill="#c79d36" opacity=".15"/>` : ''}<rect x="${x(s.view[0]) + 1}" y="1" width="${Math.max(1, x(s.view[1]) - x(s.view[0]) - 2)}" height="${height - 2}" rx="3" fill="#3978bf" fill-opacity=".03" stroke="#7d9fc3"/><line x1="${x(s.playhead)}" x2="${x(s.playhead)}" y1="0" y2="${height}" stroke="#54687e"/></svg>`;
  }
}
