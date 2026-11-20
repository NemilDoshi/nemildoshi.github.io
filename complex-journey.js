(() => {
  'use strict';
  const guide=document.getElementById('journey-guide');
  const track=document.querySelector('.journey-track');
  const svg=document.getElementById('journey-route');
  const stopGroup=document.getElementById('journey-stops');
  const origin=document.getElementById('journey-origin');
  const hero=document.querySelector('.complex-hero');
  const stage=document.querySelector('.hero-stage');
  const zones=[...document.querySelectorAll('.zone')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(!guide||!origin||!svg)return;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const mix=(a,b,t)=>a+(b-a)*t;
  let points=[],stops=[],bounds=[],height=0,mobile=false,rail=0,pending=false,dirty=true;
  let heroTravel=0, animatedY=scrollY, lastFrame=0, phase=0, activity=0, lastPoint=null, snap=true, lean=0;
  function measure(){
    mobile=innerWidth<=760;
    rail=mobile?(innerWidth<=380?27:30):64;
    height=Math.ceil(document.querySelector('.complex-footer').getBoundingClientRect().bottom+scrollY);
    heroTravel=hero.offsetHeight-stage.offsetHeight;
    const firstY=hero.offsetTop+hero.offsetHeight-innerHeight*.32;
    const start=origin.getBoundingClientRect();
    const startX=clamp(start.left+start.width/2,rail,document.documentElement.clientWidth-70);
    points=[{x:startX,y:firstY}];stops=[];bounds=[];
    const viewportY=scrollY;
    for(const zone of zones){
      const zr=zone.getBoundingClientRect();
      const art=zone.querySelector('.venue-art');
      const ar=art.getBoundingClientRect();
      // Sticky art is measured in its natural grid position, independent of scroll.
      const layout=zone.querySelector('.zone-layout').getBoundingClientRect();
      const artTop=mobile?ar.top+viewportY:layout.top+viewportY;
      const zoneTop=zr.top+viewportY;
      const zoneBottom=zr.bottom+viewportY;
      bounds.push({id:zone.id,top:zoneTop,artTop,artHeight:ar.height});
      points.push({x:rail,y:zoneTop+105});
      points.push({x:rail,y:artTop+48});
      points.push({x:ar.left+ar.width*.17,y:artTop+ar.height*.48});
      const dock={x:ar.left+ar.width*(mobile?.60:.67),y:artTop+ar.height*.80,id:zone.id};
      points.push(dock);stops.push(dock);
      points.push({x:rail,y:artTop+ar.height+(mobile?88:38)});
      points.push({x:rail,y:zoneBottom-65});
    }
    points.sort((a,b)=>a.y-b.y);
    // Small or zoomed layouts can collapse adjacent waypoints; avoid zero-length segments.
    points=points.filter((p,i,all)=>i===0||p.y-all[i-1].y>2);
    let d=`M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dy=(b.y-a.y)*.5;
      d+=`C${a.x.toFixed(1)} ${(a.y+dy).toFixed(1)} ${b.x.toFixed(1)} ${(b.y-dy).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    track.style.height=`${height}px`;
    svg.setAttribute('viewBox',`0 0 ${document.documentElement.clientWidth} ${height}`);
    svg.querySelectorAll('path').forEach(path=>path.setAttribute('d',d));
    stopGroup.replaceChildren(...stops.map(stop=>{
      const node=document.createElementNS('http://www.w3.org/2000/svg','circle');
      node.setAttribute('cx',stop.x.toFixed(1));node.setAttribute('cy',stop.y.toFixed(1));
      node.setAttribute('r',mobile?'5':'7');node.setAttribute('class','journey-stop');
      node.dataset.ground=stop.id;return node;
    }));
    dirty=false;
  }
  function pointAt(y){
    y=clamp(y,points[0].y,points[points.length-1].y);
    let i=1;while(i<points.length-1&&points[i].y<y)i++;
    const a=points[i-1],b=points[i],dy=b.y-a.y;
    let lo=0,hi=1,t=.5;
    // Invert the monotone cubic so the character stays exactly on the painted path.
    for(let k=0;k<13;k++){
      t=(lo+hi)/2;const u=1-t;
      const cy=u*u*u*a.y+3*u*u*t*(a.y+dy*.5)+3*u*t*t*(b.y-dy*.5)+t*t*t*b.y;
      if(cy<y)lo=t;else hi=t;
    }
    const e=t*t*(3-2*t);
    return {x:mix(a.x,b.x,e),y};
  }
  function render(now){
    pending=false;
    if(reduce.matches){guide.classList.remove('is-ready');track.classList.remove('is-visible');lastFrame=0;return}
    const dt=Math.min(40,lastFrame?now-lastFrame:16.67);lastFrame=now;
    if(dirty){measure();snap=true;lastPoint=null;}
    const y=scrollY,vh=innerHeight;
    if(snap){animatedY=y;snap=false;activity=0;lastPoint=null;}
    else {
      // Time-based damping absorbs coarse touch events without intercepting native scrolling.
      animatedY=clamp(animatedY,y-vh*.22,y+vh*.22);
      animatedY=mix(animatedY,y,1-Math.exp(-dt/64));
    }
    const handoff=smooth((animatedY-heroTravel*.65)/(vh*.80));
    const to=pointAt(animatedY+vh*.70);
    let active=bounds[0];for(const ground of bounds)if(to.y>=ground.top+60)active=ground;
    const sport=handoff<.5?'cricket':active.id;
    if(guide.dataset.sport!==sport)guide.dataset.sport=sport;
    guide.dataset.ground=active.id;
    const entrance=smooth((to.y-active.artTop-48)/Math.max(1,active.artHeight*.42));
    const courtPresence=smooth((to.x-rail)/(mobile?120:260))*entrance;
    const base=mobile?(innerWidth<=380?76:84):142;
    const routeWidth=base+courtPresence*(mobile?(innerWidth<=380?70:76):54);
    let width=routeWidth, x=to.x, footY=to.y-y;
    if(handoff<1){
      const from=origin.getBoundingClientRect();
      const initialWidth=document.querySelector('.hero-world').getBoundingClientRect().width/1080*1.5*190;
      width=mix(initialWidth,routeWidth,handoff);
      x=mix(from.left+from.width/2,to.x,handoff);
      footY=mix(from.top+from.height/2,footY,handoff);
    }
    const h=width*225/190;
    x=clamp(x,width*.27+3,document.documentElement.clientWidth-width*.59-3);
    const dy=lastPoint?to.y-lastPoint.y:0;
    const dx=lastPoint?to.x-lastPoint.x:0;
    const distance=Math.hypot(dx,dy);
    const desiredActivity=clamp(distance/Math.max(1,dt*.60));
    activity=mix(activity,desiredActivity,1-Math.exp(-dt/(desiredActivity>activity?70:110)));
    if(Math.abs(y-animatedY)<.06&&activity<.015){animatedY=y;activity=0;}
    phase+=Math.sign(dy)*Math.min(distance,dt*.30)/(mobile?26:34);
    const step=Math.sin(phase), opposite=Math.sin(phase+Math.PI);
    lean=mix(lean,clamp(dx*.05,-3,3),1-Math.exp(-dt/90));
    const set=(name,value,unit='deg')=>guide.style.setProperty(name,`${value.toFixed(3)}${unit}`);
    set('--hip-front',step*24*activity);set('--hip-back',opposite*24*activity);
    set('--knee-front',Math.max(0,-Math.sin(phase-.6))*37*activity);
    set('--knee-back',Math.max(0,-Math.sin(phase+Math.PI-.6))*37*activity);
    set('--ankle-front',Math.sin(phase+.6)*7*activity);set('--ankle-back',Math.sin(phase+Math.PI+.6)*7*activity);
    set('--walk-bob',-Math.abs(step)*1.8*activity,'px');set('--walk-lean',lean);
    const armRange=sport==='kho-kho'?14:sport==='cricket'?8:5;
    set('--carry-arm',handoff<.5?mix(18,-8,clamp(animatedY/Math.max(1,heroTravel))):step*armRange*activity);
    set('--head-tilt',step*1.2*activity);
    guide.style.width=`${width.toFixed(2)}px`;guide.style.height=`${h.toFixed(2)}px`;
    guide.style.transform=`translate3d(${(x-width*65/190).toFixed(2)}px,${(footY-h*205/225).toFixed(2)}px,0)`;
    guide.dataset.journeyProgress=((to.y-points[0].y)/(points[points.length-1].y-points[0].y)).toFixed(4);
    guide.dataset.walking=activity>.02?'true':'false';
    guide.classList.add('is-ready');track.classList.toggle('is-visible',handoff>.02);
    stopGroup.querySelectorAll('circle').forEach(node=>node.classList.toggle('is-current',node.dataset.ground===active.id));
    lastPoint=to;
    // Settle to a planted neutral stance, then release the animation frame loop.
    if(Math.abs(y-animatedY)>.06||activity>.015){pending=true;requestAnimationFrame(render)}
  }
  function queue(){if(!pending){pending=true;requestAnimationFrame(render)}}
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',()=>{dirty=true;queue()},{passive:true});
  addEventListener('hashchange',()=>{snap=true;queue()});
  addEventListener('load',()=>{dirty=true;queue()},{once:true});
  reduce.addEventListener('change',()=>{dirty=true;queue()});
  if(document.fonts?.ready)document.fonts.ready.then(()=>{dirty=true;queue()});
  queue();
})();
