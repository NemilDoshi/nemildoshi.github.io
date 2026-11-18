import { startEye, tileHTML } from './folio-eye.js';
import { cover, esc, mark, projects, D } from './folio-content.js?v=6';
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stadium = $('stadium-intro');
if (!reduce) {
  const stage = stadium.querySelector('.stadium-stage');
  const cricketGame = $('field-game');
  let pending = false;
  function renderAscent() {
    pending = false;
    const bounds = stadium.getBoundingClientRect();
    const travel = bounds.height - stage.offsetHeight;
    // Leave a stretch of pinned scrolling after the reveal so visitors can stop and play.
    const progress = travel > 0 ? Math.max(0, Math.min(1, -bounds.top / (travel * .72))) : 0;
    stage.style.setProperty('--ascent', progress.toFixed(3));
    cricketGame.inert = progress < .88;
  }
  function queueAscent() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(renderAscent);
  }
  function landOnField() {
    if (location.hash !== '#field-game') return;
    const start = stadium.getBoundingClientRect().top + scrollY;
    const travel = stadium.offsetHeight - stage.offsetHeight;
    scrollTo({ top: start + Math.ceil(travel * .72), behavior: 'instant' });
    renderAscent();
  }
  renderAscent();
  if (location.hash === '#field-game') requestAnimationFrame(landOnField);
  addEventListener('scroll', queueAscent, { passive: true });
  addEventListener('resize', queueAscent);
  addEventListener('hashchange', landOnField);
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
$('heroFacts').innerHTML = '<li><b>300+</b><span>daily cafeteria customers</span></li><li><b>10%</b><span>of qualified prospects converted at NJ E-Wealth</span></li><li><b>300</b><span>participants in my research study</span></li>';
const S = { dive: [['Entrepreneurship', 'Co-founded and operated a college cafeteria'], ['Business development', 'Investment client outreach at NJ E-Wealth'], ['Quantitative research', 'Survey research and ANOVA']] };
$('dive').classList.add('dark-scene');
let rings = '';
for (let r = 300, i = 0; r > 40; r -= 13, i++) rings += `<circle r="${r}" fill="${i % 2 ? '#5c2b3d' : '#542636'}" stroke="#2d1520" stroke-width="${i % 3 ? 1.5 : 3}"/>`;
$('rings').innerHTML = rings + `<g id="dEye"><circle r="38" fill="#e46a8c" stroke="#141210" stroke-width="5"/><circle r="24" fill="#f4ecdc"/><rect x="-6" y="-20" width="12" height="40" rx="6" fill="#141210"/></g>`;
$('diveLines').innerHTML = S.dive.map(l => `<li${reduce ? ' class="on"' : ''}>${esc(l[0])}<small>${esc(l[1])}</small></li>`).join('');


const word = 'Hi, I’m Nemil';
const rnd = (i) => ((Math.sin(i * 91.7) + 1) / 2);
$('hiWord').innerHTML = word.split(' ').map((w, wi) => `<span class="w" aria-hidden="true">${[...w].map((ch, i) => `<span class="ch" style="--r:${((rnd(i + wi * 7) - .5) * 12).toFixed(1)}deg;--y:${((rnd(i * 3 + wi) - .5) * 18).toFixed(0)}px">${esc(ch)}</span>`).join('')}</span>`).join(' ');

$('intro').textContent = D.bio;
$('now').textContent = 'I’ve also worked at live events, from summit registration to sports volunteering.';
$('where').textContent = 'Gurugram, India';
const touch = !matchMedia('(hover: hover) and (pointer: fine)').matches;
$('dealHint').textContent = touch ? 'Tap a project to preview it.' : 'Hover over a project to preview it, or open the write-up.';
$('ledger').innerHTML = projects.map((p, i) => `<div class="row" id="${p.slug}" data-mark="${i}" style="--c:${p.color}">
  <span class="mini" style="background:${p.color}" aria-hidden="true">${tileHTML(mark(p), true)}</span>
  <span class="txt"><a class="t" href="project.html?p=${p.slug}" data-ring="OPEN">${esc(p.short)}</a><span class="o">${esc(p.type)}</span></span>
  <span class="go" aria-hidden="true">Open</span>
  <span class="facts"><span>${esc(p.role)}<small>My role</small></span></span>
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
$('exp').innerHTML = ['college-cafeteria', 'nj-group', 'retail-summit', 'hyrox'].map(slug => projects.find(p => p.slug === slug)).map(p => `<div class="job"><span class="lg" style="background:${p.color}">${tileHTML(mark(p), true)}</span><div><b>${esc(p.role)}</b><span class="m">${esc(p.org)} · ${esc(p.year)}</span></div></div>`).join('');
$('skills').innerHTML = D.skills.map(name => `<span>${esc(name)}</span>`).join('');
$('wins').innerHTML = D.achievements.map(([title, detail]) => `<article class="win"><h3>${esc(title)}</h3><p>${esc(detail)}</p></article>`).join('');
const journey = [
  { year: 'Finance', title: 'Shantilal K. Somaiya', detail: 'Studied finance for my BBA.' },
  { year: 'Operations', title: 'N.L. College Cafeteria', detail: 'Co-founded and ran a college cafeteria.' },
  { year: 'Business development', title: 'NJ E-Wealth', detail: 'Worked with prospective investment clients in Mumbai.' },
  { year: 'Sports', title: 'Masters’ Union', detail: 'Studying Sports Management & Gaming.' },
  { year: 'Live events', title: 'HYROX Delhi', detail: 'Volunteered at the event.' },
];
const engine = `<div class="engine" aria-hidden="true"><svg viewBox="0 0 250 330"><rect x="40" y="130" width="210" height="160" rx="22" fill="#141210"/><rect x="150" y="40" width="100" height="110" rx="16" fill="#141210"/><rect x="170" y="62" width="60" height="50" rx="10" fill="#f4ecdc"/><rect x="62" y="70" width="38" height="70" rx="6" fill="#141210"/><rect x="54" y="60" width="54" height="16" rx="6" fill="#141210"/><circle cx="58" cy="200" r="30" fill="#f4ecdc" stroke="#141210" stroke-width="6"/><rect x="52" y="182" width="12" height="36" rx="6" fill="#141210"/><path d="M40 250L0 300H40Z" fill="#141210"/><circle cx="96" cy="300" r="26" fill="#141210" stroke="#27957d" stroke-width="8"/><circle cx="196" cy="300" r="26" fill="#141210" stroke="#27957d" stroke-width="8"/></svg></div>`;
$('train').innerHTML = engine + journey.map(j => `<article class="car"><div class="win"><span class="yr">${esc(j.year)}</span><h3>${esc(j.title)}</h3><p>${esc(j.detail)}</p></div></article>`).join('');


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
    const rect = $('field-game').getBoundingClientRect();
    return { x: rect.right + scrollX, y: rect.top + scrollY };
  },
});
/* ---------- scroll playhead ---------- */
if (!reduce) {
  const dive = $('dive'), ringsEl = $('rings'), lines = [...$('diveLines').children], dEye = $('dEye');
  const hi = $('about'), hiWord = $('hiWord'), jr = $('journey'), train = $('train');
  const clamp = (v) => Math.max(0, Math.min(1, v));
  let ticking = false;
  function frame() {
    ticking = false; const vh = innerHeight, vw = innerWidth;
    let r = dive.getBoundingClientRect(); const p = clamp(-r.top / (r.height - vh));
    ringsEl.style.setProperty('--s', (1 + p * p * 5).toFixed(3));
    dEye.style.opacity = (1 - p * 4).toFixed(2);
    const idx = p < .1 ? -1 : p < .4 ? 0 : p < .7 ? 1 : 2;
    lines.forEach((l, i) => l.classList.toggle('on', i === idx));
    r = hi.getBoundingClientRect(); const q = clamp((vh - r.top) / (vh + r.height));
    hiWord.style.setProperty('--x', ((.35 - q * .9) * (vw > 700 ? vw * .5 : 0)).toFixed(1) + 'px');
    if (vw > 700) {
      r = jr.getBoundingClientRect(); const t = clamp(-r.top / (r.height - vh));
      const tw = train.scrollWidth; train.style.setProperty('--tx', ((vw * .55) * (1 - t) - (tw - vw * .9) * t).toFixed(1) + 'px');
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame); frame();
}

const initialProject = projects.find(project => location.hash === '#' + project.slug);
if (initialProject) document.getElementById(initialProject.slug).scrollIntoView({ behavior: 'instant' });
