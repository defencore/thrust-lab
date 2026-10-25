import { shiftProfile } from '../profile-shift.js';
import { findBackgroundNoise } from '../background-noise.js';

const copy = value => structuredClone(value);
const samePoints = (a, b) => a === b || !!a && !!b && a.length === b.length && a.every((point, index) => point.time === b[index].time && point.thrust === b[index].thrust);
const sameRange = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
let shiftSequence = 0;

/** Shift amplitudes live from one stable baseline without moving measurement timestamps. */
export function createShiftController(ctx) {
  const { store, ui, units } = ctx;
  const input = ctx.$('#edit-shift');
  const feather = ctx.$('#edit-feather');
  const fillMode = ctx.$('#edit-shift-fill');
  const noiseGain = ctx.$('#edit-shift-noise-gain');
  const backgroundStatus = ctx.$('#shift-background-status');
  let session = null, gesture = null, writing = false;
  let sourceOriginal = null, sourceBackground = null;

  function background() {
    const original = session?.original ?? store.get().original;
    if (original !== sourceOriginal) {
      sourceOriginal = original;
      sourceBackground = original ? findBackgroundNoise(original) : null;
    }
    return sourceBackground;
  }

  function gapOptions(offset) {
    if (offset === 0 || !fillMode || fillMode.value === 'zero') {
      noiseGain?.classList.remove('input-error'); noiseGain?.removeAttribute('aria-invalid');
      return {};
    }
    if (fillMode.value !== 'background') throw new Error('Choose zeros or recorded background for empty intervals.');
    const gain = noiseGain?.value.trim() ? Number(noiseGain.value) : NaN;
    const valid = Number.isFinite(gain) && gain >= 0 && gain <= 1000;
    noiseGain?.classList.toggle('input-error', !valid);
    noiseGain?.setAttribute('aria-invalid', String(!valid));
    if (!valid) throw new Error('Background level must be between 0 and 1000 percent.');
    const source = background();
    if (!source) throw new Error('No recorded background is available. Choose zeros or import a recording with a quiet region.');
    return { background: source, noiseGain: gain / 100 };
  }

  function deactivate() {
    if (gesture) {
      gesture = null; writing = true;
      try { store.end(); } finally { writing = false; }
    }
    session = null;
    units.set('edit-shift', 0, { force: true });
    input.classList.remove('input-error'); input.removeAttribute('aria-invalid');
  }

  function beginSession() {
    ctx.beforeEdit('shift');
    const project = store.get();
    session = { base: copy(project.points), original: project.original, curveEdit: copy(project.curveEdit), range: copy(ctx.getRange()), key: `shift:${++shiftSequence}`, offset: 0, expected: project.points };
    ui.tool = 'shift';
  }

  function apply(offset) {
    if (ui.mode !== 'edit') return;
    if (!Number.isFinite(offset)) throw new Error('Enter a finite time offset to shift the profile.');
    const gap = gapOptions(offset);
    if (!session) beginSession();
    const transition = session.range && feather ? Number(feather.value) / 100 : 0;
    const points = shiftProfile(session.base, offset, { range: session.range, transition, ...gap });
    writing = true;
    try {
      session.expected = points;
      store.edit('Shift profile', project => { project.points = points; project.curveEdit = samePoints(points, session.base) ? copy(session.curveEdit) : null; }, { key: session.key });
      session.expected = store.get().points;
      session.offset = offset;
    } finally { writing = false; }
    input.classList.remove('input-error'); input.removeAttribute('aria-invalid');
    const error = ctx.$('#inspector-error'); if (error) error.hidden = true;
    ctx.render();
  }

  function render() {
    if (!writing && session && (ui.mode !== 'edit' || !samePoints(store.get().points, session.expected) || !sameRange(ctx.getRange(), session.range))) deactivate();
    units.set('edit-shift', session?.offset ?? 0);
    if (noiseGain) noiseGain.disabled = ui.mode !== 'edit' || fillMode.value !== 'background';
    if (backgroundStatus) {
      if (fillMode.value !== 'background') {
        backgroundStatus.textContent = 'Choose recorded background to fill gaps with noise from the original no-thrust regions.';
        backgroundStatus.removeAttribute('title');
      }
      else {
        const source = background();
        backgroundStatus.textContent = !source ? 'No quiet source found. At least 7 original measurements below 5% peak are needed before or after the burn.'
          : source.rms === 0 ? 'The original quiet region is flat; background fill remains constant.'
            : `${source.samples} source samples · RMS ${units.format(source.rms, 'thrust', 4)} ${units.symbol('thrust')}`;
        if (source) backgroundStatus.setAttribute('title', `${units.format(source.range[0], 'time', 4)} — ${units.format(source.range[1], 'time', 4)} ${units.symbol('time')}`);
        else backgroundStatus.removeAttribute('title');
      }
    }
  }

  function pointerStart(time) {
    if (ui.mode !== 'edit') return false;
    if (!Number.isFinite(time)) { ctx.error(new Error('A shift gesture needs a finite starting time.')); return false; }
    deactivate();
    beginSession();
    gesture = { time };
    store.begin('Shift profile');
    units.set('edit-shift', 0, { force: true });
    ctx.render();
    return true;
  }

  function pointerMove(time) {
    if (!gesture || !session || ui.mode !== 'edit') return;
    try { apply(time - gesture.time); }
    catch (error) { ctx.error(error); }
  }

  function pointerEnd(cancelled = false) {
    if (!gesture) return;
    gesture = null; writing = true;
    try {
      if (cancelled) { store.cancel(); session = null; units.set('edit-shift', 0, { force: true }); }
      else { store.end(); if (session) session.expected = store.get().points; }
    } finally { writing = false; }
    ctx.render();
  }

  input.addEventListener('input', () => {
    if (ui.mode !== 'edit') return;
    try {
      if (!input.value.trim()) return;
      const offset = units.read('edit-shift');
      if (!Number.isFinite(offset)) throw new Error('Enter a finite time offset to shift the profile.');
      apply(offset);
    } catch (error) { input.classList.add('input-error'); input.setAttribute('aria-invalid', 'true'); ctx.error(error); }
  });
  input.addEventListener('blur', render);
  feather?.addEventListener('input', () => { if (session && ui.mode === 'edit') { try { apply(session.offset); } catch (error) { ctx.error(error); } } });
  function updateFill() {
    if (ui.mode !== 'edit') return;
    try { if (session) apply(session.offset); }
    catch (error) { ctx.error(error); }
    ctx.render();
  }
  fillMode?.addEventListener('change', updateFill);
  noiseGain?.addEventListener('input', updateFill);
  units.set('edit-shift', 0, { force: true, precision: 8 });
  return { pointerStart, pointerMove, pointerEnd, deactivate, render, reset() { if (session) apply(0); }, get isActive() { return !!session; } };
}
