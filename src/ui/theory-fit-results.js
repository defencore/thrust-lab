import { metrics } from '../profile.js';
import { escape } from './dom.js';

/** Compare measured quantities with one consistent 5%-burn definition. */
export function renderFitComparison({ before, theory, result, units }) {
  const columns = [before, theory, result].map(points => points?.length ? metrics(points) : null);
  return [
    ['Burn start', 'burnStart', 'time'], ['Burn duration', 'burnDuration', 'time'],
    ['Peak thrust', 'peak', 'thrust'], ['Mean over burn', 'burnAverage', 'thrust'], ['Impulse', 'impulse', 'impulse'],
  ].map(([label, key, dimension]) => `<tr><th scope="row"><span>${label}</span><small>${units.symbol(dimension)}</small></th>${columns.map(column => `<td>${column ? escape(units.format(column[key], dimension, 3)) : '—'}</td>`).join('')}</tr>`).join('');
}
