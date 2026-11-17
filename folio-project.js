import { tileHTML } from './folio-eye.js';
import { projects, mark, esc } from './folio-content.js?v=6';
const slug = new URLSearchParams(location.search).get('p');
const index = projects.findIndex(p => p.slug === slug);
const main = document.getElementById('main');
if (index < 0) {
  main.innerHTML = '<h1 class="cut">Selected work</h1><ul>' + projects.map(p => `<li><a href="?p=${p.slug}">${esc(p.short)}</a></li>`).join('') + '</ul>';
} else {
  const p = projects[index];
  document.title = `${p.short} · Nemil Doshi`;
  main.style.setProperty('--bg', p.color);
  main.innerHTML = `<article class="sheet"><header class="ph"><div class="ph-mark" style="background:${p.color}">${tileHTML(mark(p))}</div>
    <div><p class="kicker">${esc(p.type)}</p><h1 class="cut">${esc(p.short)}</h1><p class="lede">${esc(p.org)}</p></div></header>
    <section class="sec"><h2>${esc(p.role)}</h2>
    ${p.year ? `<p>${esc(p.year)}</p>` : ''}
    <p>${esc(p.result)}</p>
    ${p.highlights?.length ? `<ul class="steps">${p.highlights.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    ${p.url ? `<a class="pill" href="${esc(p.url)}">${p.slug === 'nj-group' ? 'LinkedIn profile' : 'Event information'}</a>` : ''}
    </section></article>`;
  const prev = projects[(index + projects.length - 1) % projects.length];
  const next = projects[(index + 1) % projects.length];
  document.getElementById('foot').innerHTML = `<a class="pn prev" href="?p=${prev.slug}"><small>Previous</small><b>${esc(prev.short)}</b></a><a class="pn next" href="?p=${next.slug}"><small>Next</small><b>${esc(next.short)}</b></a>`;
}
