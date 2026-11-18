import { startEye, tileHTML } from './folio-eye.js?v=13';
import { cover, esc, mark, projects, D } from './folio-content.js?v=6';
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stadium = $('stadium-intro');
if (!reduce) {
  const stage = stadium.querySelector('.stadium-stage');
  const hero = $('hero');
  const clampProgress = value => Math.max(0, Math.min(1, value));
  function fadeProgress(value) {
    const progress = clampProgress(value);
    return progress * progress * (3 - 2 * progress);
  }
  let pending = false;
  function renderAscent() {
    pending = false;
    const bounds = stadium.getBoundingClientRect();
    const travel = bounds.height - stage.offsetHeight;
    const progress = travel > 0 ? clampProgress(-bounds.top / travel) : 0;
    const heroTop = hero.getBoundingClientRect().top / stage.offsetHeight;
    stage.style.setProperty('--ascent', progress.toFixed(3));
    stage.style.setProperty('--tunnel-fade', fadeProgress((progress - .44) / .56).toFixed(3));
    hero.style.setProperty('--name-reveal', fadeProgress((.94 - heroTop) / .60).toFixed(3));
    hero.style.setProperty('--intro-reveal', fadeProgress((.78 - heroTop) / .62).toFixed(3));
  }
  function queueAscent() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(renderAscent);
  }
  renderAscent();
  addEventListener('scroll', queueAscent, { passive: true });
  addEventListener('resize', queueAscent);
}
/* ---------- grain texture, drawn once ---------- */
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 180;
  const x = c.getContext('2d'), img = x.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  document.querySelector('.grain').style.backgroundImage = `url(${c.toDataURL()})`;
})();

/* ---------- curtain ---------- */
const curtain = $('curtain');
function openCurtain() { curtain.classList.remove('gone'); requestAnimationFrame(() => curtain.classList.add('open')); setTimeout(() => curtain.classList.add('gone'), 1700); }
if (!reduce && !location.hash) openCurtain();


$('headline').textContent = 'Finance graduate studying Sports Management & Gaming.';
$('avail').textContent = 'Masters’ Union · Gurugram, India';
const word = 'My focus';
const rnd = (i) => ((Math.sin(i * 91.7) + 1) / 2);
$('hiWord').innerHTML = word.split(' ').map((w, wi) => `<span class="w" aria-hidden="true">${[...w].map((ch, i) => `<span class="ch" style="--r:${((rnd(i + wi * 7) - .5) * 12).toFixed(1)}deg;--y:${((rnd(i * 3 + wi) - .5) * 18).toFixed(0)}px">${esc(ch)}</span>`).join('')}</span>`).join(' ');

$('intro').textContent = 'I’m interested in business strategy, operations, and founder’s office roles.';
const touch = !matchMedia('(hover: hover) and (pointer: fine)').matches;
$('dealHint').textContent = touch ? 'Tap a project to preview it.' : 'Hover over a project to preview it, or open the write-up.';
$('ledger').innerHTML = projects.map((p, i) => `<div class="row" id="${p.slug}" data-mark="${i}" style="--c:${p.color}">
  <span class="mini" style="background:${p.color}" aria-hidden="true">${tileHTML(mark(p), true)}</span>
  <span class="txt"><a class="t" href="project.html?p=${p.slug}" data-ring="OPEN">${esc(p.short)}</a><span class="o">${[p.role, p.year].filter(Boolean).map(esc).join(' · ')}</span></span>
  <span class="go" aria-hidden="true">Open</span>
  <div class="more"><p>${esc(p.result)}</p><a class="pill" href="project.html?p=${p.slug}">Read the write-up</a></div>
</div>`).join('');
function peek(index, animate = true) {
  const p = projects[index];
  $('peek').innerHTML = `${cover(p)}<h3>${esc(p.short)}</h3><p>${esc(p.result)}</p><a class="pill" href="project.html?p=${p.slug}">Read the write-up</a>`;
  if (animate && !reduce) $('peek').querySelector('.window').animate([{transform:'translateX(25%) rotate(6deg)',opacity:0},{transform:'none',opacity:1}], {duration:330,easing:'ease-out'});
}
peek(0, false);
let preview = 0;
const rows = [...document.querySelectorAll('.row')];
rows.forEach((row, i) => {
  function show() { if (preview !== i) { peek(i); preview = i; } }
  row.addEventListener('mouseenter', show);
  row.addEventListener('focusin', show);
  if (touch && !reduce) row.querySelector('a.t').addEventListener('click', event => {
    if (row.classList.contains('on')) return;
    event.preventDefault();
    rows.forEach(other => other.classList.toggle('on', other === row));
  });
});
$('quota').innerHTML = '<h3>Education</h3>' + D.education.map(([degree, school, dates]) => `<p><b>${esc(degree)}</b><br>${esc(school)} · ${esc(dates)}</p>`).join('');
$('skills').innerHTML = D.skills.map(name => `<span>${esc(name)}</span>`).join('');
$('certs').innerHTML = D.certifications.map(([title, issuer]) => `<li><b>${esc(title)}</b><span>${esc(issuer)}</span></li>`).join('');
$('wins').innerHTML = D.achievements.map(([title, detail]) => `<article class="win"><h3>${esc(title)}</h3><p>${esc(detail)}</p></article>`).join('');
$('links').innerHTML = `<li><a href="${D.linkedin}">LinkedIn</a></li>`;
$('fine').textContent = 'nemildoshi.lol';
/* ---------- menu ---------- */
$('menuBtn').addEventListener('click', () => { const o = $('nav').classList.toggle('open'); $('menuBtn').setAttribute('aria-expanded', o); $('menuBtn').textContent = o ? 'Close' : 'Menu'; });
$('nav').addEventListener('click', (e) => { if (e.target.closest('a')) { $('nav').classList.remove('open'); $('menuBtn').setAttribute('aria-expanded', false); $('menuBtn').textContent = 'Menu'; } });

/* ---------- rope: close the curtain, back to the start ---------- */
$('rope').dataset.ring = 'PULL';
$('rope').addEventListener('click', () => {
  const r = $('rope'); r.classList.add('pulled'); setTimeout(() => r.classList.remove('pulled'), 400);
  curtain.classList.remove('gone', 'open');
  setTimeout(() => { scrollTo({ top: 0, behavior: 'instant' }); openCurtain(); }, 1600);
});


startEye({
  marks: key => {
    const p = projects[Number(key)];
    return p ? { mark: mark(p), tag: { name: p.short, rows: [['Role', p.role], ['Area', p.type]] } } : null;
  },
  start: () => {
    const rect = $('hero').querySelector('.name').getBoundingClientRect();
    return { x: rect.right + scrollX, y: rect.top + scrollY };
  },
});
const initialProject = projects.find(project => location.hash === '#' + project.slug);
if (initialProject) document.getElementById(initialProject.slug).scrollIntoView({ behavior: 'instant' });
