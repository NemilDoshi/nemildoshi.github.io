(() => {
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const zones=[...document.querySelectorAll('.zone')];
  const links=[...document.querySelectorAll('[data-nav]')];
  const progress=document.getElementById('page-progress');
  const image=document.getElementById('campus-image');
  const hero=document.querySelector('.complex-hero');
  let pending=false;
  function renderScroll(){
    pending=false;
    const y=scrollY;
    const travel=document.documentElement.scrollHeight-innerHeight;
    progress.style.transform=`scaleX(${travel>0?Math.max(0,Math.min(1,y/travel)):0})`;
    if(!reduce.matches&&innerWidth>760&&y<hero.offsetHeight+80){
      image.style.transform=`translate3d(0,${Math.min(55,y*.065).toFixed(1)}px,0) scale(1.025)`;
    }else if(innerWidth<=760||reduce.matches){image.style.removeProperty('transform');}
  }
  function queue(){if(!pending){pending=true;requestAnimationFrame(renderScroll);}}
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',queue,{passive:true});
  addEventListener('load',queue,{once:true});
  reduce.addEventListener('change',queue);
  if('IntersectionObserver' in window){
    const active=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        links.forEach(link=>{
          if(link.dataset.nav===entry.target.id)link.setAttribute('aria-current','location');
          else link.removeAttribute('aria-current');
        });
      }
    },{rootMargin:'-18% 0px -60% 0px',threshold:0});
    zones.forEach(zone=>active.observe(zone));
    if(!reduce.matches){
      const reveal=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');reveal.unobserve(entry.target);}});
      },{rootMargin:'0px 0px 70px 0px',threshold:0});
      document.documentElement.classList.add('motion-ready');
      document.querySelectorAll('[data-reveal]').forEach(node=>reveal.observe(node));
    }
  }
  // Keep older home-page bookmarks within the new continuous page.
  const aliases={journey:'grounds',deals:'cricket',work:'cricket',record:'tennis',about:'clubhouse',contact:'clubhouse',hero:'top'};
  const alias=aliases[location.hash.slice(1)];
  if(alias){history.replaceState(null,'','#'+alias);document.getElementById(alias).scrollIntoView({behavior:'instant'});}
  renderScroll();
})();
