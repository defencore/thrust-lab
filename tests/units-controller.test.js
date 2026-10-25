import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnitsController } from '../src/controllers/units-controller.js';
import { createPreferences } from '../src/preferences.js';

function fixture(t, options = {}) {
  const oldDocument = globalThis.document;
  globalThis.document = { activeElement: null };
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  const nodes = new Map();
  function $(selector) {
    if (!nodes.has(selector)) {
      const attributes = new Map(), suffix = { tagName: 'SPAN', textContent: '' };
      nodes.set(selector, {
        value: '', step: '', nextElementSibling: { textContent: '' }, classList: { add() {} },
        closest: () => ({ lastElementChild: suffix }), addEventListener() {},
        setAttribute: (name, value) => attributes.set(name, String(value)), getAttribute: name => attributes.get(name),
      });
    }
    return nodes.get(selector);
  }
  const preferences = createPreferences(null), errors = [];
  preferences.update({ displayUnits: options.displayUnits || {} });
  const units = createUnitsController({ $, preferences, onChange: options.onChange || (() => {}), onError: error => errors.push(error) });
  return { $, preferences, units, errors };
}

test('unit changes retain exact canonical input values and leave unrelated preferences alone', t => {
  const { $, preferences, units } = fixture(t, { displayUnits: { thrust: 'kgf' } });
  units.set('edit-offset', 9.80665);
  assert.equal($('#edit-offset').value, '1');
  units.change({ thrust: 'kN', time: 'ms', impulse: 'N·s' });
  assert.equal($('#edit-offset').value, '0.00980665');
  assert.equal(units.read('edit-offset'), 9.80665);
  assert.equal(preferences.get().controls['export-thrust'], 'N');
  assert.equal(preferences.get().displayUnits.thrust, 'kN');
  assert.equal(units.format(125, 'thrust'), '0.125');
});

test('failed unit rendering restores numeric fields, SI caches, and saved unit choices together', t => {
  const { $, preferences, units, errors } = fixture(t, { onChange() { throw new Error('Renderer unavailable'); } });
  units.set('edit-offset', 9.80665);
  units.set('range-start', 1.25);
  units.change({ thrust: 'kgf', time: 'ms', impulse: 'N·s' });
  assert.equal(errors.length, 1);
  assert.equal(units.get().thrust, 'N');
  assert.equal($('#edit-offset').value, '9.80665');
  assert.equal($('#range-start').value, '1.25');
  assert.equal(units.read('edit-offset'), 9.80665);
  assert.equal(preferences.get().displayUnits.thrust, 'N');
  assert.equal($('#display-time').value, 's');
});

test('incomplete and overflowing display inputs stay invalid without escaping UI event handlers', t => {
  const { $, units } = fixture(t, { displayUnits: { time: 'min' } });
  $('#range-start').value = '1e308';
  assert.ok(Number.isNaN(units.read('range-start')));
  assert.equal($('#range-start').getAttribute('aria-invalid'), 'true');
  $('#range-start').value = '';
  assert.ok(Number.isNaN(units.read('range-start')));
  $('#range-start').value = '0.5';
  assert.equal(units.read('range-start'), 30);
});

test('live renders preserve the focused numeric input until editing completes', t => {
  const { $, units } = fixture(t);
  const input = $('#curve-thrust');
  input.value = '125.'; globalThis.document.activeElement = input;
  units.set('curve-thrust', 125);
  assert.equal(input.value, '125.');
  globalThis.document.activeElement = null;
  units.set('curve-thrust', 130);
  assert.equal(input.value, '130');
});

test('clean ruler input labels retain the exact snapped SI timestamp for subsequent reads', t => {
  const { $, units } = fixture(t);
  const time = 1.4000000000000001;
  units.set('measure-time-b', time, { precision: 15 });
  assert.equal($('#measure-time-b').value, '1.4');
  assert.equal(units.read('measure-time-b'), time);
});
