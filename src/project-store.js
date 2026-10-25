import { parseProject, serializeProject } from './csv.js';

const COALESCE_MS = 800;

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function canonical(project) {
  const text = serializeProject(project);
  return { text, project: freeze(parseProject(text)) };
}

function validLabel(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Project edits need a descriptive label.');
  return value.trim().slice(0, 200);
}

/** Canonical project state, transactional editing, undo, and deferred local saving. */
export function createProjectStore(initial, options = {}) {
  if (!options || typeof options !== 'object') throw new Error('Project store options must be an object.');
  const { key = 'thrust-lab-project-v1', limit = 80, saveDelay = 100 } = options;
  if (typeof key !== 'string' || !key.trim()) throw new Error('Project storage needs a nonempty key.');
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Project history limit must be a positive whole number.');
  if (!Number.isFinite(saveDelay) || saveDelay < 0) throw new Error('Project save delay must be a finite, nonnegative number.');
  let backend;
  try { backend = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage; }
  catch { backend = null; }
  const canStore = !!backend && typeof backend.getItem === 'function' && typeof backend.setItem === 'function';
  let restored = false;
  let loaded;
  let saveStatus = canStore ? 'saved' : 'unavailable';
  if (canStore) {
    try {
      const saved = backend.getItem(key);
      if (saved != null) {
        try { loaded = canonical(parseProject(saved)); restored = true; }
        catch { /* Invalid saved projects do not prevent a fresh workspace. */ }
      }
    } catch { saveStatus = 'unavailable'; }
  }
  loaded ||= canonical(initial);
  let current = loaded.project;
  let currentText = loaded.text;
  let savedText = restored ? currentText : null;
  let revision = 0;
  let timer = null;
  let destroyed = false;
  let gesture = null;
  let lastEdit = null;
  let activitySequence = 0;
  const undoStack = [];
  const redoStack = [];
  const listeners = new Set();
  const activity = [{ id: ++activitySequence, label: restored ? 'Workspace restored' : 'Workspace created', at: new Date().toISOString() }];

  function assertOpen() { if (destroyed) throw new Error('This project store has been destroyed.'); }
  function emit(type, label = '', editKey = null) {
    const event = Object.freeze({ type, label, key: editKey, revision, saveStatus });
    for (const listener of [...listeners]) {
      try { listener(event); }
      catch (error) { console.error('Project subscriber failed.', error); }
    }
  }
  function addActivity(label) {
    const entry = { id: ++activitySequence, label, at: new Date().toISOString() };
    activity.unshift(entry);
    activity.length = Math.min(activity.length, limit);
    return entry.id;
  }
  function addUndo(before, after, label, editKey) {
    const entry = { before, after, label, key: editKey, activityId: addActivity(label) };
    undoStack.push(entry);
    if (undoStack.length > limit) undoStack.shift();
    redoStack.length = 0;
    return entry;
  }
  function flush() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    const previous = saveStatus;
    if (!canStore) saveStatus = 'unavailable';
    else if (currentText === savedText) saveStatus = 'saved';
    else {
      try { backend.setItem(key, currentText); savedText = currentText; saveStatus = 'saved'; }
      catch { saveStatus = 'unavailable'; }
    }
    if (!destroyed && previous !== saveStatus) emit('saved');
    return saveStatus === 'saved';
  }
  function scheduleSave() {
    if (timer !== null) clearTimeout(timer);
    if (!canStore) { timer = null; saveStatus = 'unavailable'; return; }
    saveStatus = currentText === savedText ? 'saved' : 'pending';
    if (saveStatus === 'pending') timer = setTimeout(() => { timer = null; flush(); }, saveDelay);
    else timer = null;
  }
  function setCurrent(next, type, label, editKey = null) {
    current = next.project;
    currentText = next.text;
    revision += 1;
    scheduleSave();
    emit(type, label, editKey);
    return current;
  }
  function edit(labelValue, mutate, { key: editKey = null } = {}) {
    assertOpen();
    const label = validLabel(labelValue);
    if (typeof mutate !== 'function') throw new Error('Project edits need a mutation function.');
    if (editKey !== null && (typeof editKey !== 'string' || !editKey)) throw new Error('Project edit keys must be nonempty strings.');
    const draft = structuredClone(current);
    const returned = mutate(draft);
    if (returned && typeof returned.then === 'function') throw new Error('Project edits must be synchronous.');
    const next = canonical(returned === undefined ? draft : returned);
    if (next.text === currentText) return current;
    const before = currentText;
    const now = Date.now();
    if (gesture) {
      gesture.changed = next.text !== gesture.before;
      lastEdit = null;
    } else {
      const previous = undoStack.at(-1);
      const coalescing = editKey !== null && lastEdit?.key === editKey && now - lastEdit.at <= COALESCE_MS && previous === lastEdit.entry && redoStack.length === 0;
      if (coalescing) {
        previous.after = next.text;
        previous.label = label;
        const record = activity.find(item => item.id === previous.activityId);
        if (record) { record.label = label; record.at = new Date(now).toISOString(); }
        if (previous.before === next.text) {
          undoStack.pop();
          const index = activity.findIndex(item => item.id === previous.activityId);
          if (index >= 0) activity.splice(index, 1);
          lastEdit = null;
        } else lastEdit = { key: editKey, at: now, entry: previous };
      } else {
        const entry = addUndo(before, next.text, label, editKey);
        lastEdit = editKey === null ? null : { key: editKey, at: now, entry };
      }
    }
    return setCurrent(next, 'edit', gesture?.label || label, editKey);
  }
  function begin(labelValue) {
    assertOpen();
    if (gesture) throw new Error('A project edit gesture is already active.');
    gesture = { before: currentText, label: validLabel(labelValue), changed: false };
    lastEdit = null;
  }
  function end() {
    assertOpen();
    if (!gesture) return false;
    const completed = gesture;
    gesture = null;
    lastEdit = null;
    if (!completed.changed || completed.before === currentText) return false;
    addUndo(completed.before, currentText, completed.label, null);
    emit('history', completed.label);
    return true;
  }
  function cancel() {
    assertOpen();
    if (!gesture) return false;
    const canceled = gesture;
    gesture = null;
    lastEdit = null;
    if (currentText === canceled.before) return false;
    setCurrent(canonical(parseProject(canceled.before)), 'cancel', canceled.label);
    return true;
  }
  function undo() {
    assertOpen();
    if (gesture) end();
    const entry = undoStack.pop();
    if (!entry) return false;
    redoStack.push(entry);
    lastEdit = null;
    const label = `Undo: ${entry.label}`;
    addActivity(label);
    setCurrent(canonical(parseProject(entry.before)), 'undo', label);
    return true;
  }
  function redo() {
    assertOpen();
    if (gesture) end();
    const entry = redoStack.pop();
    if (!entry) return false;
    undoStack.push(entry);
    if (undoStack.length > limit) undoStack.shift();
    lastEdit = null;
    const label = `Redo: ${entry.label}`;
    addActivity(label);
    setCurrent(canonical(parseProject(entry.after)), 'redo', label);
    return true;
  }
  function replace(label, project) {
    assertOpen();
    if (gesture) end();
    lastEdit = null;
    return edit(label, () => project);
  }
  function status() {
    const pendingGesture = !!gesture?.changed;
    return {
      canUndo: undoStack.length > 0 || pendingGesture,
      canRedo: !pendingGesture && redoStack.length > 0,
      undoCount: undoStack.length + Number(pendingGesture),
      redoCount: pendingGesture ? 0 : redoStack.length,
      activity: activity.map(({ label, at }) => ({ label, at })),
      revision,
      restored,
      saveStatus,
    };
  }
  function subscribe(listener) {
    assertOpen();
    if (typeof listener !== 'function') throw new Error('Project subscriptions need a listener function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function destroy() {
    if (destroyed) return;
    flush();
    destroyed = true;
    listeners.clear();
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  if (!restored) scheduleSave();
  return { get: () => current, edit, begin, end, cancel, undo, redo, replace, subscribe, status, flush, destroy };
}
