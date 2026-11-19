(() => {
  'use strict';
  const chapters = JSON.parse(document.getElementById('chapter-data').textContent);
  const $ = id => document.getElementById(id);
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery = matchMedia('(hover: hover) and (pointer: fine)');
  const stadium = $('stadium-intro');
  const stadiumStage = stadium.querySelector('.stadium-stage');
  const journey = $('journey');
  const stage = journey.querySelector('.journey-stage');
  const dial = $('journey-dial');
  const stops = [...dial.querySelectorAll('[data-chapter]')];
  const story = $('story-dialog');
  const list = $('chapter-list');
  let active = 1;
  let shown = 1;
  let angle = 30;
  let entrance = 0;
  let framePending = false;
  let pointer = null;
  let shotTimer = null;
  let shotRelease = null;
  let shotAnimation = null;
  let opener = null;
  let listOpener = null;
  let manualAim = false;
  let storyScroll = 0;
  let listScroll = 0;
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const pad = n => String(n).padStart(2, '0');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));

  function renderBat() {
    const raised = reduceQuery.matches || manualAim ? 1 : smooth((entrance - .35) / .45);
    $('bat-rig').style.setProperty('--bat-angle', (145 * (1 - raised) + angle * raised).toFixed(2) + 'deg');
  }

  function select(number, manual = false) {
    if (manual) manualAim = true;
    const c = chapters[number - 1];
    // Unwrap the angle so moving between 11 and 12 does not spin the bat a full turn.
    const wanted = (number % 12) * 30;
    let delta = ((wanted - angle) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    angle += delta;
    if (active !== number) {
      active = number;
      stops.forEach((stop, i) => {
        stop.classList.toggle('active', i + 1 === number);
        stop.setAttribute('aria-pressed', i + 1 === number ? 'true' : 'false');
      });
      $('preview-number').textContent = pad(number);
      $('preview-title').textContent = c.label;
      $('preview-category').textContent = c.category;
      $('mobile-preview').textContent = `${pad(number)} / ${c.label}`;
    }
    renderBat();
  }

  function render() {
    framePending = false;
    const sr = stadium.getBoundingClientRect();
    const stadiumTravel = sr.height - stadiumStage.offsetHeight;
    const ascent = reduceQuery.matches ? 0 : stadiumTravel > 0 ? clamp(-sr.top / stadiumTravel) : 1;
    stadiumStage.style.setProperty('--ascent', ascent.toFixed(4));
    stadiumStage.style.setProperty('--tunnel-fade', smooth((ascent - .44) / .56).toFixed(4));
    const jr = journey.getBoundingClientRect();
    const travel = jr.height - stage.offsetHeight;
    entrance = reduceQuery.matches ? 1 : clamp(-jr.top / Math.max(1, travel));
    const walk = reduceQuery.matches ? 1 : smooth(entrance / .58);
    stage.style.setProperty('--walk', walk.toFixed(4));
    stage.style.setProperty('--stride', (Math.sin(walk * Math.PI * 10) * 12 * (1 - smooth((walk - .8) / .2))).toFixed(3) + 'deg');
    stage.style.setProperty('--step-bob', (-Math.abs(Math.sin(walk * Math.PI * 10)) * 3 * (1 - walk)).toFixed(3) + 'px');
    stage.style.setProperty('--ready', (reduceQuery.matches ? 1 : smooth((entrance - .36) / .56)).toFixed(4));
    const ready = entrance > .88 || reduceQuery.matches;
    $('entrance-caption').textContent = ready ? (fineQuery.matches ? 'Aim the bat. Choose a chapter.' : 'Tap a number. Open its story.') : 'Scroll. Step out. Take your stance.';
    $('stance-status').textContent = ready ? 'The field is yours ↗' : 'Scroll to take guard ↓';
    if (entrance < .05 && !story.open && !list.open) { manualAim = false; angle = (active % 12) * 30; }
    if (pointer && !story.open && !list.open && shotTimer === null && entrance > .55 && jr.top < innerHeight && jr.bottom > 0) {
      const r = dial.getBoundingClientRect();
      const dx = pointer.x - r.left - r.width / 2;
      const dy = pointer.y - r.top - r.height / 2;
      if (Math.hypot(dx, dy) > r.width * .07) {
        const degrees = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        select(Math.round(degrees / 30) % 12 || 12, true);
      }
      pointer = null;
    }
    renderBat();
  }
  function queue() {
    if (!framePending) { framePending = true; requestAnimationFrame(render); }
  }
  addEventListener('scroll', queue, {passive:true});
  addEventListener('resize', queue, {passive:true});
  reduceQuery.addEventListener('change', queue);
  document.addEventListener('pointermove', event => {
    if (!fineQuery.matches || event.pointerType === 'touch' || story.open || list.open || shotTimer !== null) return;
    pointer = {x:event.clientX, y:event.clientY}; queue();
  }, {passive:true});

  function renderStory(number) {
    shown = number;
    select(number, true);
    const c = chapters[number - 1];
    $('story-kicker').textContent = `Chapter ${pad(number)} / ${c.category}`;
    $('story-count').textContent = `${pad(number)} / 12`;
    const bullets = c.bullets?.length ? `<ul class="story-points">${c.bullets.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    const entries = c.entries?.length ? `<div class="story-entries">${c.entries.map(e => `<article><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></article>`).join('')}</div>` : '';
    const link = c.link ? `<a class="story-link" href="${esc(c.link)}"${c.download ? ' download' : ''}${c.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(c.linkText)} <span aria-hidden="true">${c.download ? '↓' : '↗'}</span></a>` : '';
    $('story-body').innerHTML = `<span class="story-big-number" aria-hidden="true">${pad(number)}</span><p class="story-meta">${esc(c.meta)}</p><h2 id="story-title">${esc(c.title)}</h2>${c.body ? `<p class="story-lede">${esc(c.body)}</p>` : ''}${bullets}${entries}${link}`;
    // The panel itself scrolls, keeping the title and close control reachable on phones.
    story.scrollTop = 0;
    if (!reduceQuery.matches) $('story-body').animate([{opacity:.3,transform:'translateY(10px)'},{opacity:1,transform:'none'}], {duration:260,easing:'ease-out'});
  }
  function showStory(number, source) {
    opener = source || document.activeElement;
    storyScroll = scrollY;
    renderStory(number);
    story.showModal();
    document.body.classList.add('dialog-open');
    story.querySelector('[data-close-story]').focus({preventScroll:true});
  }
  function clearShot() {
    clearTimeout(shotTimer); clearTimeout(shotRelease);
    shotTimer = shotRelease = null;
    shotAnimation?.cancel();
    dial.classList.remove('playing-shot');
    dial.removeAttribute('aria-busy');
  }
  function playShot(number, source) {
    clearShot();
    select(number, true);
    // A direct click can always open the story, even before the scroll entrance finishes.
    if (reduceQuery.matches || entrance < .55) { showStory(number, source); return; }
    dial.classList.add('playing-shot');
    dial.setAttribute('aria-busy','true');
    const r = dial.getBoundingClientRect();
    const a = (number % 12) * Math.PI / 6;
    const x = Math.sin(a) * r.width * .42;
    const y = -Math.cos(a) * r.height * .42;
    shotAnimation = $('shot-ball').animate([
      {transform:'translate(-50%,-50%) scale(.6)',opacity:0,offset:0},
      {transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.12},
      {transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(.65)`,opacity:1,offset:.8},
      {transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(1.8)`,opacity:0,offset:1}
    ],{duration:460,easing:'cubic-bezier(.2,.7,.3,1)'});
    shotTimer = setTimeout(() => showStory(number, source), 370);
    shotRelease = setTimeout(clearShot, 500);
  }

  stops.forEach(stop => {
    const n = Number(stop.dataset.chapter);
    stop.addEventListener('pointerenter', () => { if(fineQuery.matches) select(n, true); });
    stop.addEventListener('focus', () => select(n, true));
    stop.addEventListener('click', () => playShot(n, stop));
  });
  dial.addEventListener('keydown', event => {
    if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault(); pointer = null;
    const n = event.key === 'Home' ? 1 : event.key === 'End' ? 12 : ((active - 1 + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : 11)) % 12) + 1;
    stops[n - 1].focus({preventScroll:true});
    select(n, true);
  });
  $('open-chapter').addEventListener('click', event => playShot(active, event.currentTarget));
  $('previous-chapter').addEventListener('click', () => renderStory((shown + 10) % 12 + 1));
  $('next-chapter').addEventListener('click', () => renderStory(shown % 12 + 1));
  document.querySelector('[data-close-story]').addEventListener('click', () => story.close());
  document.querySelector('[data-close-list]').addEventListener('click', () => list.close());
  story.addEventListener('close', () => {
    clearShot(); document.body.classList.remove('dialog-open');
    opener?.focus({preventScroll:true});
    scrollTo({top:storyScroll,behavior:'instant'});
    queue();
  });
  document.querySelectorAll('[data-open-list]').forEach(button => button.addEventListener('click', () => {
    clearShot(); listOpener = button; listScroll = scrollY; list.showModal();
    document.body.classList.add('dialog-open');
    list.querySelector('[data-close-list]').focus({preventScroll:true});
  }));
  list.addEventListener('close', () => {
    if (!story.open) {
      document.body.classList.remove('dialog-open');
      listOpener?.focus({preventScroll:true});
      scrollTo({top:listScroll,behavior:'instant'});
      queue();
    }
  });
  document.querySelectorAll('[data-list-chapter]').forEach(button => button.addEventListener('click', () => {
    const n = Number(button.dataset.listChapter);
    list.close(); showStory(n, listOpener);
  }));
  // Native dialog traps focus and supports Escape. Only an actual backdrop click closes it.
  for (const dialog of [story,list]) {
    let downOutside = false;
    dialog.addEventListener('pointerdown', event => { downOutside = event.target === dialog && outside(event,dialog); });
    dialog.addEventListener('click', event => { if (downOutside && event.target === dialog && outside(event,dialog)) dialog.close(); downOutside = false; });
  }
  function outside(event, dialog) {
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  }
  $('control-hint').textContent = fineQuery.matches ? 'Move your pointer to aim. Choose a chapter to play the shot.' : 'Tap any number to aim the bat and open its story. Or use All chapters.';
  // Preserve older links to the homepage's former project/section anchors.
  const oldLinks = {'college-cafeteria':2,'nj-group':3,'household-research':4,'falcon-labs':5,'retail-summit':7,hyrox:8,record:10,about:1,contact:11};
  const oldChapter = oldLinks[location.hash.slice(1)];
  if (oldChapter) { render(); showStory(oldChapter,document.querySelector('[data-open-list]')); }
  render();
})();
