let effectInstanceSequence = 0;

/** Recompute live parameters from one fixed baseline instead of compounding edits. */
export function createLiveEffects(store) {
  if (!store || typeof store.get !== 'function' || typeof store.edit !== 'function') throw new Error('Live effects need a project store.');
  const instance = ++effectInstanceSequence;
  let sequence = 0;
  let active = null;
  function run(id, label, compute) {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Live effects need a nonempty effect identifier.');
    if (typeof compute !== 'function') throw new Error('Live effects need a computation function.');
    const session = active?.id === id ? active : { id, key: `live:${instance}:${++sequence}:${id}`, points: structuredClone(store.get().points) };
    const result = compute(structuredClone(session.points));
    if (result && typeof result.then === 'function') throw new Error('Live effects must be synchronous.');
    const output = Array.isArray(result) ? { points: result } : result;
    if (!output || typeof output !== 'object' || !Array.isArray(output.points)) throw new Error('A live effect must return measurement points.');
    const project = store.edit(label, draft => {
      draft.points = output.points;
      if (Object.hasOwn(output, 'curveEdit') && output.curveEdit !== undefined) draft.curveEdit = output.curveEdit;
    }, { key: session.key });
    active = session;
    return project;
  }
  function reset() { active = null; }
  return { run, reset, get activeId() { return active?.id ?? null; } };
}
