export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];
export const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const compact = (value, digits = 4) => Number(value.toFixed(digits)).toString();
export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
