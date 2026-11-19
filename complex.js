(() => {
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement;
  const hero=document.querySelector('.complex-hero');
  const stage=document.querySelector('.hero-stage');
  const zones=[...document.querySelectorAll('.zone')];
  const progress=document.getElementById('page-progress');
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  let pending=false;
  function render(){
    pending=false;
    const vh=innerHeight;
    const travel=root.scrollHeight-vh;
    progress.style.transform=`scaleX(${clamp(scrollY/Math.max(1,travel))})`;
    if(reduce.matches)return;
    const hr=hero.getBoundingClientRect();
    if(hr.bottom>0&&hr.top<vh){
      const p=clamp(-hr.top/Math.max(1,hero.offsetHeight-stage.offsetHeight));
      const mobile=innerWidth<=760;
      stage.style.setProperty('--world-scale',(1+p*(mobile?.28:.42)).toFixed(3));
      stage.style.setProperty('--world-y',`${(-p*(mobile?45:85)).toFixed(1)}px`);
      stage.style.setProperty('--world-x',`${(-p*(mobile?10:70)).toFixed(1)}px`);
      stage.style.setProperty('--world-rotate',`${(-4+p*7).toFixed(2)}deg`);
      stage.style.setProperty('--player-x',`${(100-p*155).toFixed(1)}px`);
      stage.style.setProperty('--player-tilt',`${(8-p*12).toFixed(2)}deg`);
      stage.style.setProperty('--bat-lift',`${(36-p*72).toFixed(1)}deg`);
      stage.style.setProperty('--copy-y',`${(-p*95).toFixed(1)}px`);
      stage.style.setProperty('--copy-opacity',clamp(1-p*1.5).toFixed(3));
      stage.style.setProperty('--sun-y',`${(-p*110).toFixed(1)}px`);
      stage.style.setProperty('--sticker-scale',(1-p*.45).toFixed(3));
    }
    for(const zone of zones){
      const r=zone.getBoundingClientRect();
      if(r.bottom<0||r.top>vh*1.15)continue;
      const p=clamp((vh-r.top)/(vh+Math.min(r.height,vh)));
      zone.style.setProperty('--bridge-x',`${((p-.5)*65).toFixed(1)}px`);
      const art=zone.querySelector('.venue-art');
      const ar=art.getBoundingClientRect();
      if(ar.bottom<0||ar.top>vh*1.1)continue;
      const ap=clamp((vh-ar.top)/(vh+Math.min(ar.height,vh)));
      art.style.setProperty('--deck-y',`${((1-ap)*28).toFixed(1)}px`);
      art.style.setProperty('--deck-rotate',`${(-8+ap*13).toFixed(2)}deg`);
      art.style.setProperty('--ball-x',`${(95+ap*350).toFixed(1)}px`);
      art.style.setProperty('--ball-y',`${(175-Math.sin(ap*Math.PI)*125).toFixed(1)}px`);
      art.style.setProperty('--ball-spin',`${(ap*390).toFixed(1)}deg`);
      art.style.setProperty('--venue-bat',`${(18-ap*42).toFixed(1)}deg`);
      art.style.setProperty('--trail-opacity',clamp(1-ap*1.2).toFixed(2));
    }
  }
  function queue(){if(!pending){pending=true;requestAnimationFrame(render)}}
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',queue,{passive:true});
  addEventListener('load',queue,{once:true});
  reduce.addEventListener('change',()=>{document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('in-view'));queue()});
  if('IntersectionObserver' in window&&!reduce.matches){
    const reveal=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('in-view');reveal.unobserve(entry.target)}}},{rootMargin:'0px 0px -20px 0px',threshold:.03});
    root.classList.add('motion-ready');
    document.querySelectorAll('[data-reveal]').forEach(node=>reveal.observe(node));
  }
  const aliases={journey:'cricket',deals:'cricket',work:'cricket',record:'tennis',about:'clubhouse',contact:'clubhouse',hero:'top'};
  const alias=aliases[location.hash.slice(1)];
  if(alias){history.replaceState(null,'','#'+alias);document.getElementById(alias).scrollIntoView({behavior:'instant'})}
  render();
})();
