const symbol = `<path class="brand-vector-t" d="M7 7h31v7H26v13h-7V14H7z"/><path class="brand-nozzle" d="M18 29h11l5 10H13z"/><path class="brand-plume" d="M19 41h9l-4.5 7z"/><path class="brand-trajectory" d="M35 31c6-4 9-10 10-18m-5 4 5-4 1 6"/>`;

/** The wordmark stays in its original brand language when the interface changes. */
export function brandMarkup() {
  return `<a class="brand" href="./" aria-label="Thrust Lab Studio home"><svg class="brand-symbol" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${symbol}</svg><span class="brand-wordmark" data-i18n="ignore"><span class="brand-name">Thrust<span>Lab</span></span><span class="brand-studio">STUDIO</span></span></a>`;
}
