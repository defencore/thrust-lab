import { createCurveNodes, snapCurveNode } from '../control-curve.js';
import { deformControlCurve } from '../curve-deformation.js';
import { toDisplay } from '../units.js';

const clone = value => structuredClone(value);
const equalPoints = (left, right) => left === right || (left?.length === right?.length && left.every((point, index) => point.time === right[index].time && point.thrust === right[index].thrust));
const metadataText = value => JSON.stringify(value ?? null);
let sessionSequence = 0;

/** Own live anchor editing and its history groups without owning project state. */
export function createCurveController(ctx) {
  const { store, ui, units } = ctx;
  const element = name => ctx.$(`#curve-${name}`);
  let session = null;
  let gesture = null;
  let writing = false;

  function metadata() { return { nodes: clone(session.nodes), range: session.range ? [...session.range] : null, interpolation: session.interpolation }; }
  function currentRange() { const range = ctx.getRange(); return range ? [...range] : null; }
  function isActive() { return !!session && ui.mode === 'edit' && ui.tool === 'curve'; }
  function boundary(index = session?.selected) { return !!session && (index === 0 || index === session.nodes.length - 1); }
  function forceLocked(index = session?.selected) { return !!session?.range && boundary(index); }

  function initialize() {
    const project = store.get();
    const range = currentRange();
    const selected = session && metadataText(session.range) === metadataText(range) ? session.selected : 1;
    const saved = project.curveEdit && metadataText(project.curveEdit.range) === metadataText(range) ? project.curveEdit : null;
    const initialCount = session && metadataText(session.range) === metadataText(range) ? session.initialCount : saved?.nodes.length || Number(element('node-count').value) || 5;
    const measurements = new Map(project.points.map(point => [point.time, point]));
    const nodes = saved ? saved.nodes.map(node => ({ ...measurements.get(node.time) })) : createCurveNodes(project.points, range, initialCount);
    session = { id: ++sessionSequence, initialCount, base: clone(project.points), nodes, range, interpolation: saved?.interpolation || element('interpolation').value || 'smooth', selected: Math.max(0, Math.min(selected, nodes.length - 1)), expected: project.points, storedMetadata: metadataText(project.curveEdit) };
  }

  function syncRows() {
    const list = element('node-list');
    let rows = list.querySelectorAll ? [...list.querySelectorAll('[data-curve-select]')] : [];
    if (rows.length !== session.nodes.length) {
      const focused = list.ownerDocument?.activeElement;
      const hadFocus = focused?.closest?.('[data-curve-select]') && list.contains?.(focused);
      list.innerHTML = session.nodes.map((node, index) => `<button type="button" class="curve-node-row ${index === session.selected ? 'selected' : ''}" data-curve-select="${index}" aria-label="Curve point ${index + 1}" aria-pressed="${index === session.selected}"><span>${index + 1}</span><span class="curve-node-time">${units.format(node.time, 'time', 3)} ${units.symbol('time')}</span><strong class="curve-node-thrust">${units.format(node.thrust, 'thrust', 3)} ${units.symbol('thrust')}</strong><span class="curve-row-lock" aria-hidden="true" ${boundary(index) ? '' : 'hidden'}>●</span></button>`).join('');
      rows = list.querySelectorAll ? [...list.querySelectorAll('[data-curve-select]')] : [];
      if (hadFocus) rows[session.selected]?.focus?.({ preventScroll: true });
    }
    rows.forEach((row, index) => {
      row.classList.toggle('selected', index === session.selected);
      row.setAttribute('aria-pressed', String(index === session.selected));
      row.querySelector('.curve-node-time').textContent = `${units.format(session.nodes[index].time, 'time', 3)} ${units.symbol('time')}`;
      row.querySelector('.curve-node-thrust').textContent = `${units.format(session.nodes[index].thrust, 'thrust', 3)} ${units.symbol('thrust')}`;
      row.querySelector('.curve-row-lock').hidden = !boundary(index);
    });
  }

  function syncDom() {
    const active = isActive();
    element('start').hidden = active;
    element('edit-controls').hidden = !active;
    if (!active) return;
    session.selected = Math.max(0, Math.min(session.nodes.length - 1, session.selected));
    const selected = session.nodes[session.selected];
    const count = element('node-count');
    if (count.options && ![...count.options].some(option => Number(option.value) === session.nodes.length)) count.insertAdjacentHTML('beforeend', `<option value="${session.nodes.length}">${session.nodes.length}</option>`);
    count.value = String(session.nodes.length);
    syncRows();
    element('time').disabled = boundary();
    element('thrust').disabled = forceLocked();
    element('remove').disabled = boundary();
    element('add').disabled = session.nodes.length >= 128;
    for (const [name, value] of [['time', selected.time], ['thrust', selected.thrust]]) {
      const input = element(name);
      if (input.ownerDocument?.activeElement !== input) units.set(`curve-${name}`, value);
    }
    element('time').min = String(toDisplay(session.nodes[0].time, 'time', units.get()));
    element('time').max = String(toDisplay(session.nodes.at(-1).time, 'time', units.get()));
    element('interpolation').value = session.interpolation;
    element('point-status').textContent = forceLocked() ? 'Pinned boundary' : boundary() ? 'Pinned time' : `Selected control point ${session.selected + 1} of ${session.nodes.length}`;
    const influence = element('influence-status');
    if (influence) {
      const [start, end] = influenceRange();
      influence.textContent = `Influence: ${units.format(start, 'time', 3)} — ${units.format(end, 'time', 3)} ${units.symbol('time')}`;
    }
    const note = ctx.$('.curve-boundary-note');
    if (note) note.textContent = session.range ? 'Boundary points keep the edited range connected to its surroundings.' : 'Endpoint times stay fixed; their thrust can be edited.';
  }

  function reconcile() {
    if (ui.mode !== 'edit' || ui.tool !== 'curve') {
      if (gesture) {
        gesture = null;
        writing = true;
        try { store.end(); } finally { writing = false; }
      }
      session = null;
    } else if (!writing) {
      const project = store.get();
      if (!session || metadataText(session.range) !== metadataText(currentRange()) || !equalPoints(project.points, session.expected) || session.storedMetadata !== metadataText(project.curveEdit)) initialize();
    }
    syncDom();
  }

  function activate() {
    if (ui.mode !== 'edit') return;
    try {
      ctx.beforeEdit('curve');
      ui.tool = 'curve';
      if (!session) initialize();
      ctx.setInspector?.('curve');
      ctx.render();
      syncDom();
    } catch (error) { session = null; ui.tool = 'select'; ctx.error(error); }
  }

  function deactivate() {
    if (ui.tool === 'curve') ui.tool = 'select';
    if (gesture) pointerEnd(false);
    session = null;
    syncDom();
  }

  function write(label, key) {
    const points = deformControlCurve(session.base, session.nodes, { range: session.range, interpolation: session.interpolation });
    writing = true;
    try {
      ctx.beforeEdit('curve');
      session.expected = points;
      store.edit(label, project => { project.points = points; project.curveEdit = metadata(); }, { key });
      session.expected = store.get().points;
      session.storedMetadata = metadataText(store.get().curveEdit);
    } finally { writing = false; }
    ctx.render();
    syncDom();
  }

  function change(label, mutate, key) {
    if (!isActive()) return false;
    const previous = { base: session.base, nodes: clone(session.nodes), selected: session.selected, interpolation: session.interpolation, expected: session.expected, storedMetadata: session.storedMetadata };
    try { mutate(); write(label, key); return true; }
    catch (error) { Object.assign(session, previous); syncDom(); ctx.error(error); return false; }
  }

  function select(index) {
    if (!isActive() || !Number.isInteger(index) || !session.nodes[index]) return;
    session.selected = index;
    ui.playhead = session.nodes[index].time;
    ctx.render();
    syncDom();
  }

  function influenceRange() {
    return [session.nodes[Math.max(0, session.selected - 1)].time, session.nodes[Math.min(session.nodes.length - 1, session.selected + 1)].time];
  }

  function rebaseCurrent() {
    session.base = clone(store.get().points);
    const measurements = new Map(session.base.map(point => [point.time, point]));
    session.nodes = session.nodes.map(node => ({ ...measurements.get(node.time) }));
  }

  function add(time, thrust) {
    if (session.nodes.length >= 128) throw new Error('A control curve supports at most 128 points.');
    if (!Number.isFinite(time) || (thrust !== undefined && (!Number.isFinite(thrust) || thrust < 0))) throw new Error('Control points need finite time and nonnegative thrust.');
    if (time <= session.nodes[0].time || time >= session.nodes.at(-1).time) throw new Error('Choose a point inside the active curve range.');
    const occupied = new Set(session.nodes.map(node => node.time));
    let nearest = null;
    for (const point of session.base) {
      if (point.time <= session.nodes[0].time || point.time >= session.nodes.at(-1).time || occupied.has(point.time)) continue;
      if (!nearest || Math.abs(point.time - time) < Math.abs(nearest.time - time)) nearest = point;
    }
    if (!nearest) throw new Error('There are no unused measurement times for another control point.');
    const node = { time: nearest.time, thrust: thrust ?? nearest.thrust };
    const index = session.nodes.findIndex(existing => existing.time > node.time);
    session.nodes.splice(index, 0, node);
    session.selected = index;
    return index;
  }

  function pointerStart(index, time, thrust) {
    if (!isActive()) return null;
    if (index != null && (!Number.isInteger(index) || !session.nodes[index])) return null;
    if (gesture) pointerEnd(false);
    gesture = { base: session.base, nodes: clone(session.nodes), selected: session.selected, interpolation: session.interpolation };
    store.begin('Edit control points');
    if (index == null && !change('Add control point', () => { rebaseCurrent(); add(time, Math.max(0, thrust)); }, `curve:${session.id}:drag`)) { pointerEnd(true); return null; }
    else select(index);
    return session.selected;
  }

  function pointerMove(index, time, thrust) {
    if (!gesture || !isActive() || !Number.isInteger(index) || !session.nodes[index] || forceLocked(index)) return;
    change('Move control point', () => {
      session.nodes = snapCurveNode(session.base, session.nodes, index, time, Math.max(0, thrust), { range: session.range });
      session.selected = index;
      ui.playhead = session.nodes[index].time;
    }, `curve:${session.id}:drag`);
  }

  function pointerEnd(cancelled = false) {
    if (!gesture) return;
    const previous = gesture;
    gesture = null;
    writing = true;
    try {
      if (cancelled) {
        store.cancel();
        if (session) Object.assign(session, previous);
      } else store.end();
      if (session) { session.expected = store.get().points; session.storedMetadata = metadataText(store.get().curveEdit); }
    } finally { writing = false; }
    ctx.render();
    syncDom();
  }

  function editInputs() {
    if (!isActive() || forceLocked()) return;
    const editable = [element('thrust'), ...(boundary() ? [] : [element('time')])];
    if (editable.some(input => !input.value.trim() || !Number.isFinite(Number(input.value)) || (input.checkValidity && !input.checkValidity()))) return;
    change('Edit control point', () => {
      const time = boundary() ? session.nodes[session.selected].time : units.read('curve-time');
      session.nodes = snapCurveNode(session.base, session.nodes, session.selected, time, units.read('curve-thrust'), { range: session.range });
      ui.playhead = session.nodes[session.selected].time;
    }, `curve:${session.id}:point:${session.selected}`);
  }

  element('start').onclick = activate;
  element('node-list').addEventListener('click', event => {
    const row = event.target.closest('[data-curve-select]');
    if (row && element('node-list').contains(row)) select(Number(row.dataset.curveSelect));
  });
  for (const name of ['time', 'thrust']) {
    element(name).addEventListener('input', editInputs);
    element(name).addEventListener('blur', syncDom);
  }
  element('interpolation').onchange = () => change('Change curve interpolation', () => { session.interpolation = element('interpolation').value; }, `curve:${session?.id}:interpolation`);
  function redistribute() {
    const selectedTime = session.nodes[session.selected].time;
    rebaseCurrent();
    session.nodes = createCurveNodes(session.base, session.range, Number(element('node-count').value));
    session.selected = session.nodes.reduce((nearest, node, index) => Math.abs(node.time - selectedTime) < Math.abs(session.nodes[nearest].time - selectedTime) ? index : nearest, 0);
  }
  element('node-count').onchange = () => change('Change curve point count', redistribute, `curve:${session?.id}:count`);
  element('reset').onclick = () => change('Redistribute control points', redistribute);
  element('add').onclick = () => change('Add control point', () => { rebaseCurrent(); add(ui.playhead); });
  element('remove').onclick = () => {
    if (!isActive() || boundary()) return;
    change('Remove control point', () => { rebaseCurrent(); session.nodes.splice(session.selected, 1); session.selected = Math.min(session.selected, session.nodes.length - 2); });
  };

  return {
    activate, deactivate, reconcile, pointerStart, pointerMove, pointerEnd, select,
    chartState() { return isActive() ? { curveNodes: session.nodes, curveSelected: session.selected, curveBase: session.base, curveInfluence: influenceRange() } : { curveNodes: null, curveSelected: null, curveBase: null, curveInfluence: null }; },
    get isActive() { return isActive(); },
  };
}
