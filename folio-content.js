export const D = await fetch('folio-data.json?v=6').then(response => response.json());
export const projects = D.projects;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const mark = p => ({ name: p.short, abbr: p.abbr, bg: p.color, fg: '#141210' });
export const cover = p => `<div class="window project-cover" aria-hidden="true" style="--cover:${p.color}">${esc(p.abbr)}</div>`;
