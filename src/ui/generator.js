import { icon } from './icons.js';
import { escape } from './dom.js';

export function generatorControls(defaultPreset) {
  return `<section id="create-controls" class="panel create-controls">
  <div class="creation-controls-heading"><h2>Create a new profile</h2><span>The preview updates as you change targets.</span><span class="bottom-tabs-end" id="generator-preset">${escape(defaultPreset.name)} preset</span></div>
        <div id="generator-panel" role="region" aria-label="Generator controls" class="generator-panel">
          <form id="generator-form"><div class="generator-grid">
            <label>Peak thrust <span class="input-unit"><input id="gen-peak" type="number" min="0.001" max="10000000" step="any" required><span>N</span></span></label>
            <label>Max. burn time <span class="input-unit"><input id="gen-duration" type="number" min="0.001" max="100000" step="any" required><span>s</span></span></label>
            <label>Target impulse <span class="input-unit"><input id="gen-impulse" type="number" min="0.000001" max="1000000000000" step="any" required><span>N·s</span></span></label>
            <label>Profile shape<select id="gen-shape"><option value="neutral">Neutral</option><option value="progressive">Progressive</option><option value="regressive">Regressive</option><option value="boost-sustain">Boost + sustain</option></select></label>
          </div><div class="sampling-strip"><span class="sampling-label">SAMPLING</span><label><span class="sr-only">Sampling mode</span><select id="gen-sampling"><option value="uniform">Uniform intervals</option><option value="jitter">Uniform + jitter</option><option value="random">Random sequential</option></select></label><label class="compact-field">Step<span class="input-unit"><input id="gen-interval" type="number" min="0.001" max="1000000" step="any" required><span>ms</span></span></label><label class="compact-field" id="jitter-field">Jitter<span class="input-unit"><input id="gen-jitter" type="number" min="0" max="80" step="1" required><span>%</span></span></label><label class="compact-field">Noise<span class="input-unit"><input id="gen-noise" type="number" min="0" max="100" step="0.1" required><span>%</span></span></label><label class="compact-field seed-field">Seed<input id="gen-seed" type="number" min="0" max="4294967295" step="1" required></label></div><div class="generator-footer"><p>${icon('help')}The preview updates as you change targets.</p><button type="button" class="button small" id="random-seed" title="Choose a new random seed">${icon('reset')}New seed</button></div><div id="generation-notes" class="notice" hidden></div></form>
        </div>
</section>`;
}

export function creationInspector() {
  return `<aside id="creation-inspector" class="panel creation-inspector"><div class="panel-heading"><h2>Generator preview</h2>${icon('spark')}</div><p class="creation-intro">Create a separate preview from motor presets or custom targets.</p><ol class="creation-steps"><li>1. Set generator targets</li><li>2. Inspect the live preview</li><li>3. Open it in the editor</li></ol><div class="preview-state"><span class="status-led"></span><strong id="preview-status">Preview ready</strong></div><p id="preview-details"></p><button id="adopt-draft" class="button primary full">Open in editor${icon('arrow')}</button><p class="creation-adopt-note">Opening this preview starts a new working profile. Undo restores the previous one.</p><div class="working-profile-kept"><span class="eyebrow">Current working profile</span><strong id="kept-profile-name"></strong><p>Generating a preview keeps your working profile unchanged.</p><button id="return-editor" class="button full">${icon('undo')}Back to editing</button></div></aside>`;
}
