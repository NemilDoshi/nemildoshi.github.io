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
  let targetEntrance = 0;
  let poseRaise = 0;
  let lastFrameTime = 0;
  let layoutDirty = true;
  let inView = false;
  let dialAspect = 1;
  let previewNumber = 0;
  let touchPreview = 0;
  let previewAnchor = null;
  const tooltip = $('chapter-tooltip');
  const player = $('player-entry');
  const bat = $('bat-rig');
  const torso = $('player-torso');
  const limb = Object.fromEntries(['front-thigh','front-shin','front-pad','front-shoe','back-thigh','back-shin','back-pad','back-shoe','free-arm','bat-arm','bat-sleeve'].map(id => [id,$(id)]));
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const pad = n => String(n).padStart(2, '0');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const tapMode = () => !fineQuery.matches || innerWidth <= 820;

  function hidePreview() {
    tooltip.hidden = true;
    dial.classList.remove('has-preview');
    previewAnchor?.removeAttribute('aria-describedby');
    previewAnchor = null;
    previewNumber = touchPreview = 0;
  }
  function showPreview(number, mode) {
    previewAnchor?.removeAttribute('aria-describedby');
    previewNumber = number;
    previewAnchor = stops[number-1];
    select(number,true);
    $('tooltip-label').textContent = chapters[number-1].label;
    tooltip.dataset.mode = mode;
    tooltip.hidden = false;
    previewAnchor.setAttribute('aria-describedby','tooltip-label');
    dial.classList.add('has-preview');
    const r = previewAnchor.getBoundingClientRect();
    const t = tooltip.getBoundingClientRect();
    let left,top;
    if (r.left > innerWidth*.65) { left=r.left-t.width-12;top=r.top+(r.height-t.height)/2; }
    else if (r.right < innerWidth*.35) { left=r.right+12;top=r.top+(r.height-t.height)/2; }
    else { left=r.left+(r.width-t.width)/2;top=r.top<innerHeight/2?r.bottom+12:r.top-t.height-12; }
    tooltip.style.setProperty('left',Math.max(12,Math.min(innerWidth-t.width-12,left)).toFixed(1)+'px');
    tooltip.style.setProperty('top',Math.max(78,Math.min(innerHeight-t.height-12,top)).toFixed(1)+'px');
  }

  function bearing(number) {
    const radians = (number % 12) * Math.PI / 6;
    return (Math.atan2(Math.sin(radians)*dialAspect,Math.cos(radians))*180/Math.PI+360)%360;
  }
  function aim(number) {
    let delta = ((bearing(number)-angle)%360+360)%360;
    if(delta>180) delta-=360;
    angle+=delta;
  }

  function renderBat() {
    const desired = ((angle % 360) + 360) % 360;
    let liftAngle = ((desired - 145 + 540) % 360) - 180;
    const rotation = poseRaise > .999 ? angle : 145 + liftAngle * poseRaise;
    bat.style.setProperty('--bat-angle', rotation.toFixed(2) + 'deg');
    dial.classList.toggle('is-aiming', manualAim && poseRaise > .999);
  }

  // Solve a two-part limb so the knee bends while the shoe stays on the ground.
  function joint(start, end, upper, lower, bend = -1) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const distance = Math.max(.001, Math.min(Math.hypot(dx,dy), upper + lower - .001));
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    const away = Math.sqrt(Math.max(0,upper * upper - along * along));
    const direction = Math.atan2(dy,dx);
    return {x:start.x + Math.cos(direction) * along - Math.sin(direction) * away * bend,
      y:start.y + Math.sin(direction) * along + Math.cos(direction) * away * bend};
  }
  const lerp = (a,b,t) => a + (b-a)*t;
  const point = p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  function renderPose() {
    const p = entrance;
    const walking = clamp((p - .02) / .60);
    const travel = smooth(walking);
    const phase = walking * Math.PI * 4;
    const gait = smooth(walking / .10) * (1 - smooth((walking - .78) / .22));
    const settle = smooth((p - .50) / .18);
    const sway = Math.sin(phase) * 1.3 * gait;
    const bob = -(Math.sin(phase) ** 2) * 2.8 * gait + Math.sin(settle * Math.PI) * 1.8;
    const lean = (-3 + Math.sin(phase) * 1.4) * gait-Math.sin(poseRaise*Math.PI)*2.5;
    const radians = lean * Math.PI / 180;
    const project = (x,y) => ({x:100+(x-100)*Math.cos(radians)-(y-203)*Math.sin(radians)+sway,
      y:203+(x-100)*Math.sin(radians)+(y-203)*Math.cos(radians)+bob});
    player.style.setProperty('--player-x', lerp(24,50,travel).toFixed(3)+'%');
    player.style.setProperty('--player-y', (lerp(52,50,travel)-Math.sin(travel*Math.PI)*1.3).toFixed(3)+'%');
    player.style.setProperty('--player-scale', lerp(.64,1,travel).toFixed(4));
    player.style.setProperty('--player-opacity', (reduceQuery.matches ? 1 : smooth((p-.005)/.17)).toFixed(4));
    torso.setAttribute('transform',`translate(${sway.toFixed(2)} ${bob.toFixed(2)}) rotate(${lean.toFixed(2)} 100 203)`);
    for (const [name, hipX, stanceX, offset] of [['front',84,60,0],['back',108,132,Math.PI]]) {
      const cycle = phase + offset;
      const hip = project(hipX,203);
      const foot = {x:lerp((name === 'front' ? 82 : 116)+Math.cos(cycle)*18*gait,stanceX,settle),
        y:280-Math.max(0,Math.sin(cycle))*14*gait};
      const knee = joint(hip,foot,41,41);
      limb[name+'-thigh'].setAttribute('d',`M${point(hip)}L${point(knee)}`);
      limb[name+'-shin'].setAttribute('d',`M${point(knee)}L${point(foot)}`);
      const shinAngle = Math.atan2(foot.y-knee.y,foot.x-knee.x)*180/Math.PI-90;
      limb[name+'-pad'].setAttribute('transform',`translate(${point(knee)}) rotate(${shinAngle.toFixed(2)})`);
      const roll = Math.sin(cycle)*9*gait + (name==='front' ? -8 : 6)*settle;
      limb[name+'-shoe'].setAttribute('transform',`translate(${point(foot)}) rotate(${roll.toFixed(2)})`);
    }
    limb['free-arm'].setAttribute('transform',`rotate(${(-Math.cos(phase)*9*gait).toFixed(2)} 64 125)`);
    // The hand leads the raise in a small arc; the bat shares its exact pivot.
    const grip = {x:lerp(120,103,poseRaise)+Math.sin(poseRaise*Math.PI)*10,
      y:lerp(174,150,poseRaise)-Math.sin(poseRaise*Math.PI)*14};
    const shoulder = {x:112,y:124};
    const elbow = joint(shoulder,grip,28,28);
    limb['bat-arm'].setAttribute('d',`M${point(shoulder)}L${point(elbow)}L${point(grip)}`);
    const sleeve = {x:lerp(shoulder.x,elbow.x,.45),y:lerp(shoulder.y,elbow.y,.45)};
    limb['bat-sleeve'].setAttribute('d',`M${point(shoulder)}L${point(sleeve)}`);
    const hand = project(grip.x,grip.y);
    $('bat-pivot').style.setProperty('--grip-x',(hand.x/2).toFixed(3)+'%');
    $('bat-pivot').style.setProperty('--grip-y',(hand.y/3.1).toFixed(3)+'%');
    stage.style.setProperty('--walk',travel.toFixed(4));
    stage.style.setProperty('--ready',smooth((p-.60)/.34).toFixed(4));
    const ballTravel = smooth((p-.12)/.70);
    const ball = $('arrival-ball');
    ball.style.setProperty('--ball-x',(83-33*ballTravel+Math.sin(ballTravel*Math.PI)*3).toFixed(3)+'%');
    ball.style.setProperty('--ball-y',(12+70*ballTravel-Math.sin(ballTravel*Math.PI)*14).toFixed(3)+'%');
    ball.style.setProperty('--ball-scale',(.35+Math.sin(ballTravel*Math.PI)*.7).toFixed(3));
    ball.style.setProperty('--ball-turn',ballTravel.toFixed(3));
    ball.style.setProperty('--ball-opacity',(reduceQuery.matches?0:smooth(ballTravel/.12)*(1-smooth((ballTravel-.75)/.25))).toFixed(3));
    renderBat();
  }

  function select(number, manual = false) {
    if (manual) manualAim = true;
    const c = chapters[number - 1];
    // Unwrap the angle so moving between 11 and 12 does not spin the bat a full turn.
    aim(number);
    const direction=number*Math.PI/6;
    $('guide-line').setAttribute('x2',(50+Math.sin(direction)*42).toFixed(3));
    $('guide-line').setAttribute('y2',(50-Math.cos(direction)*42).toFixed(3));
    if (active !== number) {
      active = number;
      stops.forEach((stop, i) => {
        stop.classList.toggle('active', i + 1 === number);
        stop.setAttribute('aria-pressed', i + 1 === number ? 'true' : 'false');
      });
      $('chapter-announcement').textContent = `Chapter ${pad(number)}: ${c.label}`;
    }
    renderBat();
    queue(false);
  }

  function render(now = performance.now()) {
    framePending = false;
    if (layoutDirty) {
      const sr = stadium.getBoundingClientRect();
      const jr = journey.getBoundingClientRect();
      const dr = dial.getBoundingClientRect();
      const stadiumTravel = sr.height - stadiumStage.offsetHeight;
      const travel = jr.height - stage.offsetHeight;
      const ascent = reduceQuery.matches ? 0 : stadiumTravel > 0 ? clamp(-sr.top/stadiumTravel) : 1;
      targetEntrance = reduceQuery.matches ? 1 : clamp(-jr.top/Math.max(1,travel));
      inView = jr.top < innerHeight && jr.bottom > 0;
      dialAspect = dr.width/Math.max(1,dr.height);
      aim(active);
      stadiumStage.style.setProperty('--ascent',ascent.toFixed(4));
      stadiumStage.style.setProperty('--tunnel-fade',smooth((ascent-.44)/.56).toFixed(4));
      layoutDirty = false;
    }
    const dt = Math.min(48,Math.max(8,now-lastFrameTime || 16));
    lastFrameTime = now;
    const alpha = 1-Math.exp(-dt/105);
    // A large touch fling still shows the steps and raise instead of skipping poses.
    const poseStep = Math.min(Math.abs(targetEntrance-entrance)*alpha,dt*.00065);
    entrance = reduceQuery.matches || !inView ? targetEntrance : entrance+Math.sign(targetEntrance-entrance)*poseStep;
    if (Math.abs(entrance-targetEntrance)<.0004) entrance=targetEntrance;
    if (targetEntrance < .05 && !story.open && !list.open) { manualAim=false; angle=bearing(active); }
    const liftTarget = reduceQuery.matches ? 1 : smooth((entrance-(manualAim ? .50 : .64))/(manualAim ? .22 : .30));
    poseRaise = reduceQuery.matches || !inView ? liftTarget : lerp(poseRaise,liftTarget,alpha);
    if (Math.abs(poseRaise-liftTarget)<.0004) poseRaise=liftTarget;
    const ready = entrance > .94 || reduceQuery.matches;
    stage.setAttribute('data-entrance',ready ? 'ready' : 'walking');
    if (pointer && !story.open && !list.open && shotTimer === null && entrance > .78 && inView) {
      const r = dial.getBoundingClientRect();
      const dx = pointer.x - r.left - r.width / 2;
      const dy = pointer.y - r.top - r.height / 2;
      stage.style.setProperty('--look-x',Math.max(-1,Math.min(1,dx/(r.width/2))).toFixed(3));
      if (Math.hypot(dx, dy) > r.width * .07) {
        const degrees = (Math.atan2(dx/r.width, -dy/r.height) * 180 / Math.PI + 360) % 360;
        select(Math.round(degrees / 30) % 12 || 12, true);
      }
      pointer = null;
    }
    renderPose();
    // Continue only until the scroll-driven pose has settled, with no idle animation loop.
    if (inView && !reduceQuery.matches && (Math.abs(entrance-targetEntrance)>.0004 || Math.abs(poseRaise-liftTarget)>.0004)) queue(false);
  }
  function queue(readLayout = true) {
    if (readLayout) layoutDirty=true;
    if (!framePending) { framePending = true; requestAnimationFrame(render); }
  }
  addEventListener('scroll', () => { hidePreview();queue(); }, {passive:true});
  addEventListener('resize', () => { hidePreview();queue(); }, {passive:true});
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
    hidePreview();
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
    hidePreview();
    select(number, true);
    // A direct click can always open the story, even before the scroll entrance finishes.
    if (reduceQuery.matches || entrance < .78 || poseRaise < .94 || !$('shot-ball')) { showStory(number, source); return; }
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
    stop.addEventListener('pointerenter', () => { if(!tapMode()) showPreview(n,'pointer'); });
    stop.addEventListener('pointerleave', () => { if(!tapMode() && document.activeElement!==stop) hidePreview(); });
    stop.addEventListener('focus', () => showPreview(n,'keyboard'));
    stop.addEventListener('click', event => {
      if(event.detail!==0 && (tapMode() || event.pointerType==='touch') && touchPreview!==n) {
        touchPreview=n;showPreview(n,'touch');return;
      }
      playShot(n,stop);
    });
  });
  $('tooltip-open').addEventListener('click', () => { if(previewNumber) playShot(previewNumber,stops[previewNumber-1]); });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.chapter-stop,.chapter-tooltip')) hidePreview();
  }, {passive:true});
  dial.addEventListener('keydown', event => {
    if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault(); pointer = null;
    const n = event.key === 'Home' ? 1 : event.key === 'End' ? 12 : ((active - 1 + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : 11)) % 12) + 1;
    stops[n - 1].focus({preventScroll:true});
    select(n, true);
  });
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
    clearShot();hidePreview(); listOpener = button; listScroll = scrollY; list.showModal();
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
  // Preserve older links to the homepage's former project/section anchors.
  const oldLinks = {'college-cafeteria':2,'nj-group':3,'household-research':4,'falcon-labs':5,'retail-summit':7,hyrox:8,record:10,about:1,contact:11};
  const oldChapter = oldLinks[location.hash.slice(1)];
  if (oldChapter) { render(); showStory(oldChapter,document.querySelector('[data-open-list]')); }
  render();
})();
