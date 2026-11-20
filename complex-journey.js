/* A bounded action clock. Rendering and browser input stay with the journey. */
class CourtActionClock {
  constructor(grounds, viewport) {
    this.grounds=grounds;this.viewport=viewport;this.completed=new Set();
    this.active=null;this.pausedAt=null;
    this.durations={cricket:1800,football:1700,basketball:2100,'kho-kho':1650,tennis:1850,clubhouse:1100};
  }
  gate(g){return Math.max(0,g.dockY-this.viewport()*.70)}
  crossing(from,to){
    if(to<=from)return null;
    return this.grounds().find(g=>!this.completed.has(g.id)&&this.gate(g)>=from-1&&this.gate(g)<=to+1)||null;
  }
  begin(id,from,target,now){
    if(this.active)return false;
    const g=this.grounds().find(g=>g.id===id);
    if(!g||this.completed.has(id))return false;
    this.active={id,from,target,started:now,state:'approach',duration:this.durations[id]||1700,finalFrame:false};
    return true;
  }
  push(delta){if(this.active)this.active.target+=delta}
  tick(now){
    const a=this.active;if(!a)return null;
    const ground=this.grounds().find(g=>g.id===a.id);
    if(!ground){this.active=null;return null}
    const hold=this.gate(ground);
    if(a.state==='approach'){
      const t=Math.min(1,Math.max(0,(now-a.started)/240));
      const e=t*t*(3-2*t);
      const scroll=a.from+(hold-a.from)*e;
      if(t<1)return {state:'approach',scroll,play:null};
      a.state='playing';a.started=now;
    }
    const p=Math.min(1,Math.max(0,(now-a.started)/a.duration));
    if(p>=1&&a.finalFrame){
      this.completed.add(a.id);this.active=null;
      return {state:'complete',scroll:hold,resume:a.target,completed:a.id,play:null};
    }
    if(p>=1)a.finalFrame=true;
    return {state:'playing',scroll:hold,play:{id:a.id,progress:p}};
  }
  pause(now){if(this.pausedAt===null)this.pausedAt=now}
  resume(now){
    if(this.active&&this.pausedAt!==null)this.active.started+=Math.max(0,now-this.pausedAt);
    this.pausedAt=null;
  }
  cancel(mark=false){if(mark&&this.active)this.completed.add(this.active.id);this.active=null;this.pausedAt=null}
  rearm(scroll){
    for(const g of this.grounds())if(scroll+this.viewport()*.70<g.playStart-this.viewport()*.30)this.completed.delete(g.id);
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports=CourtActionClock;

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
  const actionClock=new CourtActionClock(()=>bounds,()=>innerHeight);
  let observedY=scrollY,internalY=null,deferredTarget=null,navigationHash=location.hash;
  let pendingNavigation=location.hash.slice(1),lastTimedState='',touchY=null;
  function limitScroll(v){return clamp(v,0,Math.max(0,document.documentElement.scrollHeight-innerHeight))}
  function applyScroll(v){internalY=limitScroll(v);observedY=internalY;window.scrollTo({top:internalY,behavior:'auto'})}
  function beginAction(g,from,target){
    if(!g||reduce.matches||!actionClock.begin(g.id,from,limitScroll(target),performance.now()))return false;
    document.documentElement.classList.add('court-action-hold');
    document.documentElement.dataset.actionLocked='true';
    delete document.documentElement.dataset.lastCompletedAction;
    const section=document.getElementById(g.id);section.dataset.performanceState='playing';section.dataset.performanceStarted=performance.now().toFixed(1);
    applyScroll(from);queue();return true;
  }
  function observeScroll(){
    const value=scrollY;
    if(reduce.matches){observedY=value;queue();return}
    if(location.hash!==navigationHash){observedY=value;queue();return}
    if(internalY!==null&&Math.abs(value-internalY)<2){internalY=null;observedY=value;queue();return}
    if(actionClock.active){
      const ground=bounds.find(g=>g.id===actionClock.active.id);
      const hold=actionClock.gate(ground);
      actionClock.push(value-hold);applyScroll(hold);queue();return;
    }
    const crossed=actionClock.crossing(observedY,value);
    if(crossed){beginAction(crossed,observedY,deferredTarget??value);return}
    observedY=value;actionClock.rearm(value);
    if(deferredTarget!==null&&Math.abs(value-deferredTarget)<3)deferredTarget=null;
    queue();
  }
  function inputScroll(event,delta){
    if(reduce.matches||!Number.isFinite(delta))return;
    if(actionClock.active){if(event.cancelable)event.preventDefault();actionClock.push(delta);queue();return}
    deferredTarget=null;
    const crossed=actionClock.crossing(scrollY,limitScroll(scrollY+delta));
    if(crossed){if(event.cancelable)event.preventDefault();beginAction(crossed,scrollY,scrollY+delta)}
  }
  addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaY)<Math.abs(e.deltaX))return;inputScroll(e,e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1))},{passive:false});
  addEventListener('touchstart',e=>{touchY=e.touches.length===1?e.touches[0].clientY:null},{passive:true});
  addEventListener('touchmove',e=>{if(e.touches.length!==1||touchY===null)return;const value=e.touches[0].clientY;const delta=touchY-value;touchY=value;inputScroll(e,delta)},{passive:false});
  addEventListener('touchend',()=>{touchY=null},{passive:true});
  addEventListener('keydown',e=>{
    if(e.key==='Escape'&&actionClock.active){actionClock.cancel(true);deferredTarget=null;observedY=scrollY;document.documentElement.classList.remove('court-action-hold');document.documentElement.dataset.actionLocked='false';snap=true;queue();return}
    if(e.target.closest?.('input,textarea,select,button,[contenteditable="true"]'))return;
    const amount={ArrowDown:42,ArrowUp:-42,PageDown:innerHeight*.85,PageUp:-innerHeight*.85,' ':innerHeight*.85,End:document.documentElement.scrollHeight,Home:-document.documentElement.scrollHeight}[e.key];
    if(amount!==undefined)inputScroll(e,e.shiftKey&&e.key===' '?-amount:amount);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)actionClock.pause(performance.now());else{actionClock.resume(performance.now());queue()}});
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
      const playStart=artTop+ar.height*.58,playEnd=artTop+ar.height+(mobile?84:34);
      bounds.push({id:zone.id,top:zoneTop,artTop,artHeight:ar.height,art,playStart,playEnd,dockY:artTop+ar.height*.80});
      zone.dataset.playStart=playStart.toFixed(1);zone.dataset.playEnd=playEnd.toFixed(1);
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
    svg.querySelectorAll('.trail-edge,.trail-paper,.trail-dashes').forEach(path=>path.setAttribute('d',d));
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
    if(reduce.matches){actionClock.cancel();document.documentElement.classList.remove('court-action-hold');document.documentElement.dataset.actionLocked='false';guide.classList.remove('is-ready');track.classList.remove('is-visible');lastFrame=0;return}
    const dt=Math.min(40,lastFrame?now-lastFrame:16.67);lastFrame=now;
    if(dirty){measure();snap=true;lastPoint=null;}
    if(pendingNavigation){
      const target=bounds.find(g=>g.id===pendingNavigation);
      if(target){
        for(const g of bounds){if(g.id===target.id)break;actionClock.completed.add(g.id)}
        const gate=actionClock.gate(target);
        if(scrollY>=gate-innerHeight*.25&&scrollY<=target.playEnd-innerHeight*.45)beginAction(target,scrollY,scrollY);
      }
      pendingNavigation='';
    }
    let timed=actionClock.tick(now);
    if(timed){
      applyScroll(timed.scroll);
      if(timed.state==='playing'&&lastTimedState!=='playing')snap=true;
      if(timed.state==='complete'){
        document.documentElement.dataset.lastCompletedAction=timed.completed;
        const finished=document.getElementById(timed.completed);finished.dataset.performanceState='complete';finished.dataset.performanceEnded=now.toFixed(1);
        document.documentElement.dataset.actionLocked='false';
        document.documentElement.classList.remove('court-action-hold');
        deferredTarget=limitScroll(timed.resume);
        if(Math.abs(deferredTarget-scrollY)>2){const destination=deferredTarget;requestAnimationFrame(()=>window.scrollTo({top:destination,behavior:'smooth'}))}
      }
      lastTimedState=timed.state;
    }else lastTimedState='';
    const y=scrollY,vh=innerHeight;
    if(snap){animatedY=y;snap=false;activity=0;lastPoint=null;}
    else {
      // Time-based damping absorbs coarse touch events without intercepting native scrolling.
      animatedY=clamp(animatedY,y-vh*.22,y+vh*.22);
      animatedY=mix(animatedY,y,1-Math.exp(-dt/64));
    }
    const handoff=smooth((animatedY-heroTravel*.65)/(vh*.80));
    const routeY=animatedY+vh*.70;
    const play=timed?.play?bounds.find(g=>g.id===timed.play.id):null;
    const playProgress=timed?.play?.progress||0;
    const pathY=play?play.dockY:routeY;
    const to=pointAt(pathY);
    const playWeight=play?smooth(playProgress/.15)*smooth((1-playProgress)/.32):0;
    const playRect=play?play.art.getBoundingClientRect():null;
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
    const actionSport=play?.id||'';
    guide.dataset.playing=play?'true':'false';guide.dataset.action=actionSport;
    guide.dataset.actionProgress=play?playProgress.toFixed(4):'';
    guide.dataset.pose='walk';guide.dataset.released='false';
    set('--left-arm',0);set('--play-lift',0,'px');set('--shoot-reach',1,'');set('--wrist-flick',0);
    track.dataset.effect=actionSport;
    zones.forEach(zone=>zone.classList.toggle('is-playing',zone.id===actionSport));
    track.style.setProperty('--projectile-opacity','0');track.style.setProperty('--impact-opacity','0');
    if(play){
      const p=playProgress,w=playWeight,unit=width/190;
      track.style.setProperty('--target-opacity',(smooth(p/.12)*smooth((1-p)/.10)).toFixed(3));
      const a={left:playRect.left,top:playRect.top+y,width:playRect.width,height:playRect.height};
      const strike=(back,contact,follow=contact)=>p<.28?mix(0,back,smooth(p/.28)):p<.45?mix(back,contact,clamp((p-.28)/.17)**2):p<.63?mix(contact,follow,1-(1-clamp((p-.45)/.18))**2):mix(follow,0,smooth((p-.63)/.31));
      let front=0,back=0,kneeFront=0,kneeBack=0,arm=0,torso=0,lift=0;
      if(actionSport==='cricket'){arm=strike(-58,54,82);front=10*w;back=-9*w;kneeFront=12*w;torso=strike(-8,6,10);}
      if(actionSport==='football'){front=strike(-28,62,70);back=-8*w;kneeBack=10*w;kneeFront=24*(1-smooth((p-.28)/.17))*w;arm=-15*w;torso=-8*w;set('--left-arm',-12*w);}
      if(actionSport==='basketball'){
        const crouch=Math.sin(clamp(p/.42)*Math.PI)*w;
        kneeFront=25*crouch;kneeBack=25*crouch;front=-10*crouch;back=-10*crouch;
        lift=-17*Math.sin(clamp((p-.28)/.37)*Math.PI)*w;
        if(p>.17&&p<.87)guide.dataset.pose='shoot';
        set('--wrist-flick',28*smooth((p-.40)/.10)*smooth((.95-p)/.10));
        set('--shoot-reach',.45+.55*smooth((p-.17)/.17),'');
      }
      if(actionSport==='tennis'){arm=strike(-48,50,74);front=14*w;back=-11*w;kneeFront=16*w;kneeBack=8*w;torso=strike(-10,8,12);}
      if(actionSport==='kho-kho'){
        const lunge=Math.sin(smooth(clamp((p-.12)/.70))*Math.PI)*w;
        front=25*lunge;back=-18*lunge;kneeFront=35*lunge;kneeBack=13*lunge;arm=-27*lunge;torso=11*lunge;
        x+=lunge*Math.min(27,a.width*.08);
      }
      if(actionSport==='clubhouse'){set('--left-arm',(85+Math.sin(p*Math.PI*6)*14)*w);torso=-3*w;arm=0;}
      set('--hip-front',mix(step*24*activity,front,w));set('--hip-back',mix(opposite*24*activity,back,w));
      set('--knee-front',mix(Math.max(0,-Math.sin(phase-.6))*37*activity,kneeFront,w));
      set('--knee-back',mix(Math.max(0,-Math.sin(phase+Math.PI-.6))*37*activity,kneeBack,w));
      set('--ankle-front',Math.sin(phase+.6)*7*activity*(1-w));set('--ankle-back',Math.sin(phase+Math.PI+.6)*7*activity*(1-w));
      set('--walk-bob',-Math.abs(step)*1.8*activity*(1-w),'px');set('--walk-lean',mix(lean,torso,w));
      set('--carry-arm',mix(step*armRange*activity,arm,w));set('--play-lift',lift,'px');
      const foot={x,y:footY+y+lift*unit};
      const hand={x:x+61*unit,y:foot.y-70*unit};
      const target={x:a.left+a.width*.83,y:a.top+a.height*.32};
      const propScale=a.width/600;
      const targetNode=svg.querySelector(`[data-target="${actionSport}"]`);
      if(actionSport==='football'){target.x=a.left+a.width*.19;target.y=a.top+a.height*.64;}
      if(actionSport==='kho-kho'){target.x=a.left+a.width*.87;target.y=a.top+a.height*.65;}
      if(targetNode)targetNode.setAttribute('transform',`translate(${target.x.toFixed(2)} ${target.y.toFixed(2)}) scale(${propScale.toFixed(4)})`);
      let projectile=null,opacity=0,impact=0,impactPoint=target;
      const lerpPoint=(start,end,t,arc=0)=>({x:mix(start.x,end.x,t),y:mix(start.y,end.y,t)-4*t*(1-t)*arc});
      const boundedArc=(start,end,arc,minY)=>{for(let i=1;i<12;i++){const t=i/12;arc=Math.min(arc,(mix(start.y,end.y,t)-minY)/(4*t*(1-t)))}return Math.max(0,arc)};
      if(actionSport==='basketball'){
        guide.dataset.released=p>.17&&p<.90?'true':'false';
        const reach=.45+.55*smooth((p-.17)/.17);
        const held={x:x+5*unit,y:foot.y+(-100-108*reach)*unit};
        const release={x:x+5*unit,y:footY+y-224*unit};
        if(p>.17&&p<.42){projectile=held;opacity=1;}
        if(p>=.42&&p<.75){projectile=lerpPoint(release,target,clamp((p-.42)/.33),boundedArc(release,target,a.height*.22,a.top+14));opacity=1;}
        if(p>=.75&&p<.92){projectile={x:target.x,y:target.y+smooth((p-.75)/.17)*a.height*.24};opacity=1-smooth((p-.87)/.05);}
        impact=Math.max(0,1-Math.abs(p-.76)/.045);
        track.style.setProperty('--net-wobble',`${(p>.74&&p<.94?Math.sin((p-.74)*90)*9*(1-smooth((p-.74)/.20)):0).toFixed(2)}deg`);
      }
      if(actionSport==='football'){
        const feet={x:x-9*unit,y:foot.y-5*unit};
        if(p>.10&&p<.26){projectile=lerpPoint(hand,feet,smooth((p-.10)/.16));opacity=1;}
        if(p>=.26&&p<.44){projectile=feet;opacity=1;}
        if(p>=.44&&p<.82){projectile=lerpPoint(feet,target,clamp((p-.44)/.34),a.height*.10);opacity=1-smooth((p-.77)/.05);}
        guide.dataset.released=p>.10&&p<.90?'true':'false';impact=Math.max(0,1-Math.abs(p-.79)/.05);
      }
      if(actionSport==='cricket'||actionSport==='tennis'){
        const tennis=actionSport==='tennis';
        const contact={x:x+(tennis?68:75)*unit,y:foot.y-(tennis?111:85)*unit};
        const incoming={x:a.left+a.width*.12,y:a.top+a.height*(tennis?.36:.48)};
        const destination={x:a.left+a.width*(tennis?.17:.90),y:a.top+a.height*.24};
        if(p>.10&&p<.45){
          if(!tennis){const bounce={x:a.left+a.width*.40,y:a.top+a.height*.74};projectile=p<.28?lerpPoint(incoming,bounce,clamp((p-.10)/.18),a.height*.04):lerpPoint(bounce,contact,clamp((p-.28)/.17),a.height*.04)}
          else projectile=lerpPoint(incoming,contact,clamp((p-.10)/.35),a.height*.025);opacity=1;}
        if(p>=.45&&p<.85){projectile=lerpPoint(contact,destination,clamp((p-.45)/.34),a.height*.10);opacity=1-smooth((p-.78)/.07);}
        impactPoint=contact;impact=Math.max(0,1-Math.abs(p-.46)/.04);
      }
      if(actionSport==='kho-kho'){impactPoint={x:target.x-12*propScale,y:target.y-57*propScale};impact=Math.max(0,1-Math.abs(p-.51)/.10);}
      if(actionSport==='clubhouse'){impactPoint={x:x-48*unit,y:foot.y-160*unit};impact=Math.sin(p*Math.PI)*.7;}
      if(projectile){
        projectile.x=clamp(projectile.x,a.left+18,a.left+a.width-18);
        projectile.y=clamp(projectile.y,a.top+(actionSport==='basketball'?12:22),a.top+a.height-12);
        track.style.setProperty('--projectile-x',`${projectile.x.toFixed(2)}px`);track.style.setProperty('--projectile-y',`${projectile.y.toFixed(2)}px`);
        const ballSize=actionSport==='basketball'?mix(.85,.50,smooth((p-.42)/.33)):actionSport==='football'?mix(.85,.42,smooth((p-.44)/.34)):.36;
        track.style.setProperty('--projectile-scale',(unit*ballSize).toFixed(4));
        track.style.setProperty('--projectile-spin',`${(p*650).toFixed(2)}deg`);track.style.setProperty('--projectile-opacity',opacity.toFixed(3));
      }
      track.style.setProperty('--impact-x',`${impactPoint.x.toFixed(2)}px`);track.style.setProperty('--impact-y',`${impactPoint.y.toFixed(2)}px`);
      track.style.setProperty('--impact-scale',(unit*.8).toFixed(4));track.style.setProperty('--impact-opacity',impact.toFixed(3));
    }
    guide.style.width=`${width.toFixed(2)}px`;guide.style.height=`${h.toFixed(2)}px`;
    guide.style.transform=`translate3d(${(x-width*65/190).toFixed(2)}px,${(footY-h*205/225).toFixed(2)}px,0)`;
    guide.dataset.journeyProgress=((to.y-points[0].y)/(points[points.length-1].y-points[0].y)).toFixed(4);
    guide.dataset.walking=activity>.02&&playWeight<.8?'true':'false';
    guide.classList.add('is-ready');track.classList.toggle('is-visible',handoff>.02);
    stopGroup.querySelectorAll('circle').forEach(node=>node.classList.toggle('is-current',node.dataset.ground===active.id));
    lastPoint=to;
    // Settle to a planted neutral stance, then release the animation frame loop.
    if(actionClock.active||Math.abs(y-animatedY)>.06||activity>.015){pending=true;requestAnimationFrame(render)}
  }
  function queue(){if(!pending){pending=true;requestAnimationFrame(render)}}
  addEventListener('scroll',observeScroll,{passive:true});
  addEventListener('resize',()=>{dirty=true;queue()},{passive:true});
  addEventListener('hashchange',()=>{actionClock.cancel();document.documentElement.classList.remove('court-action-hold');document.documentElement.dataset.actionLocked='false';navigationHash=location.hash;pendingNavigation=location.hash.slice(1);deferredTarget=null;observedY=scrollY;snap=true;queue()});
  addEventListener('load',()=>{dirty=true;queue()},{once:true});
  reduce.addEventListener('change',()=>{dirty=true;queue()});
  if(document.fonts?.ready)document.fonts.ready.then(()=>{dirty=true;queue()});
  queue();
})();
