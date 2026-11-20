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
  let points=[],stops=[],height=0,mobile=false,rail=0,pending=false,dirty=true;
  let lastY=scrollY,lastX=0,heroTravel=0;
  function measure(){
    mobile=innerWidth<=760;
    rail=mobile?20:44;
    height=Math.ceil(document.querySelector('.complex-footer').getBoundingClientRect().bottom+scrollY);
    heroTravel=hero.offsetHeight-stage.offsetHeight;
    const firstY=hero.offsetTop+hero.offsetHeight-innerHeight*.32;
    const start=origin.getBoundingClientRect();
    const startX=clamp(start.left+start.width/2,rail,document.documentElement.clientWidth-70);
    points=[{x:startX,y:firstY}];stops=[];
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
      points.push({x:rail,y:zoneTop+105});
      points.push({x:rail,y:artTop-22});
      points.push({x:ar.left+ar.width*.17,y:artTop+ar.height*.30});
      const dock={x:ar.left+ar.width*.67,y:artTop+ar.height*.76,id:zone.id};
      points.push(dock);stops.push(dock);
      points.push({x:rail,y:artTop+ar.height+(mobile?60:22)});
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
  function render(){
    pending=false;
    if(reduce.matches){guide.classList.remove('is-ready');track.classList.remove('is-visible');return}
    if(dirty)measure();
    const y=scrollY,vh=innerHeight;
    const from=origin.getBoundingClientRect();
    const artWidth=document.querySelector('.hero-world').getBoundingClientRect().width;
    const initialWidth=artWidth/1080*1.5*190;
    const handoff=smooth((y-heroTravel*.65)/(vh*.80));
    const to=pointAt(y+vh*.70);
    const courtPresence=smooth((to.x-rail)/(mobile?125:260));
    const routeWidth=(mobile?60:104)+courtPresence*(mobile?48:34);
    const width=mix(initialWidth,routeWidth,handoff);
    const h=width*225/190;
    let x=mix(from.left+from.width/2,to.x,handoff);
    const footY=mix(from.top+from.height/2,to.y-y,handoff);
    // Keep the full outline in view, including the bat, on narrow phones.
    x=clamp(x,width*.245+2,document.documentElement.clientWidth-width*.58-2);
    const delta=y-lastY;
    const moving=Math.abs(delta)>.15;
    const phase=y/22;
    const step=Math.sin(phase);
    const front=moving?step*25:0;
    const lean=moving?clamp((x-lastX)*.35,-7,7):0;
    guide.style.width=`${width.toFixed(2)}px`;
    guide.style.height=`${h.toFixed(2)}px`;
    guide.style.transform=`translate3d(${(x-width*65/190).toFixed(2)}px,${(footY-h*205/225).toFixed(2)}px,0)`;
    guide.style.setProperty('--walk-front',`${front.toFixed(1)}deg`);
    guide.style.setProperty('--walk-back',`${(-front).toFixed(1)}deg`);
    guide.style.setProperty('--walk-bob',`${(moving?-Math.abs(step)*2:0).toFixed(2)}px`);
    guide.style.setProperty('--walk-lean',`${lean.toFixed(1)}deg`);
    guide.style.setProperty('--walk-arm',`${(handoff<.5?mix(36,-30,clamp(y/Math.max(1,heroTravel))):8+step*8).toFixed(1)}deg`);
    guide.dataset.journeyProgress=((to.y-points[0].y)/(points[points.length-1].y-points[0].y)).toFixed(4);
    guide.classList.add('is-ready');
    track.classList.toggle('is-visible',handoff>.02);
    let nearest=stops[0];for(const stop of stops)if(Math.abs(stop.y-to.y)<Math.abs(nearest.y-to.y))nearest=stop;
    guide.dataset.ground=nearest.id;
    stopGroup.querySelectorAll('circle').forEach(node=>node.classList.toggle('is-current',node.dataset.ground===nearest.id));
    lastY=y;lastX=x;
  }
  function queue(){if(!pending){pending=true;requestAnimationFrame(render)}}
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',()=>{dirty=true;queue()},{passive:true});
  addEventListener('load',()=>{dirty=true;queue()},{once:true});
  reduce.addEventListener('change',()=>{dirty=true;queue()});
  if(document.fonts?.ready)document.fonts.ready.then(()=>{dirty=true;queue()});
  queue();
})();
