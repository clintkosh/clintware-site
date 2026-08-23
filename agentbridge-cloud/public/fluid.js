(()=>{
  const canvas=document.getElementById("fluidFx");
  if(!canvas)return;
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)return;
  const palette=[[99,232,255],[159,133,255],[94,140,255],[110,242,178]];
  const wisps=[];
  const pointer={x:innerWidth*.55,y:innerHeight*.24,px:innerWidth*.55,py:innerHeight*.24,vx:0,vy:0,active:false};
  let w=0,h=0,dpr=1,raf=0,last=performance.now(),quality=(navigator.deviceMemory&&navigator.deviceMemory<=4)?0.58:1;

  function resize(){
    dpr=Math.min(devicePixelRatio||1,1.65)*quality;
    w=innerWidth;h=innerHeight;
    canvas.width=Math.max(1,Math.floor(w*dpr));canvas.height=Math.max(1,Math.floor(h*dpr));
    canvas.style.width=w+"px";canvas.style.height=h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function addWisp(x,y,vx=0,vy=0,life=1,size=110,color=0){
    if(wisps.length>54*quality)wisps.splice(0,Math.ceil(wisps.length*.08));
    wisps.push({x,y,vx,vy,life,age:0,size,color,spin:(Math.random()-.5)*.005,phase:Math.random()*Math.PI*2});
  }
  function seed(){
    const count=reduce?5:Math.round(14*quality);
    for(let i=0;i<count;i++)addWisp(Math.random()*w,Math.random()*h,(Math.random()-.5)*.08,(Math.random()-.5)*.08,2+Math.random()*4,130+Math.random()*210,i%palette.length);
  }
  function pointerMove(e){
    const x=e.clientX,y=e.clientY;
    pointer.vx=x-pointer.x;pointer.vy=y-pointer.y;pointer.px=pointer.x;pointer.py=pointer.y;pointer.x=x;pointer.y=y;pointer.active=true;
    document.documentElement.style.setProperty("--mx",`${(x/w*100).toFixed(1)}%`);
    document.documentElement.style.setProperty("--my",`${(y/h*100).toFixed(1)}%`);
    if(reduce)return;
    const speed=Math.min(36,Math.hypot(pointer.vx,pointer.vy));
    const n=speed>12?3:1;
    for(let i=0;i<n;i++)addWisp(x+(Math.random()-.5)*18,y+(Math.random()-.5)*18,pointer.vx*.012+(Math.random()-.5)*.18,pointer.vy*.012+(Math.random()-.5)*.18,.8+Math.random()*.75,72+speed*2+Math.random()*60,(wisps.length+i)%palette.length);
  }
  function drawBlob(p,alpha){
    const c=palette[p.color%palette.length];
    const pulse=1+Math.sin(p.phase+p.age*.0018)*.08;
    const r=p.size*pulse;
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},${.105*alpha})`);
    g.addColorStop(.34,`rgba(${c[0]},${c[1]},${c[2]},${.055*alpha})`);
    g.addColorStop(.72,`rgba(${c[0]},${c[1]},${c[2]},${.014*alpha})`);
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
  }
  function frame(now){
    const dt=Math.min(32,now-last);last=now;
    ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation="screen";
    for(let i=wisps.length-1;i>=0;i--){
      const p=wisps[i];p.age+=dt;p.life-=dt*.00055;
      p.vx+=Math.sin(p.phase+p.age*.0007)*.0007*dt;p.vy+=Math.cos(p.phase+p.age*.00055)*.00055*dt;
      p.vx*=.997;p.vy*=.997;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.x<-p.size)p.x=w+p.size;if(p.x>w+p.size)p.x=-p.size;if(p.y<-p.size)p.y=h+p.size;if(p.y>h+p.size)p.y=-p.size;
      const fade=Math.min(1,p.age/550)*Math.min(1,Math.max(0,p.life));drawBlob(p,fade);
      if(p.life<=0)wisps.splice(i,1);
    }
    ctx.globalCompositeOperation="source-over";
    if(!reduce&&wisps.length<10*quality&&Math.random()<.025)addWisp(Math.random()*w,Math.random()*h,(Math.random()-.5)*.05,(Math.random()-.5)*.05,4+Math.random()*4,180+Math.random()*220,Math.floor(Math.random()*palette.length));
    raf=requestAnimationFrame(frame);
  }
  function start(){if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0}}
  addEventListener("resize",resize,{passive:true});addEventListener("pointermove",pointerMove,{passive:true});
  document.addEventListener("visibilitychange",()=>document.hidden?stop():start());
  resize();seed();start();
})();

// Public-alpha brand guard. Internal protocol/storage identifiers remain backward compatible,
// but no legacy product name should leak into visible Quillgeist UI generated at runtime.
(()=>{
  const rewrite=s=>typeof s==="string"?s.replace(/AgentBridge/g,"Quillgeist").replace(/agentbridge/g,"quillgeist"):s;
  function patch(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){const v=rewrite(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
    root.querySelectorAll?.("input[placeholder],textarea[placeholder],[title],[aria-label]").forEach(el=>{
      for(const a of ["placeholder","title","aria-label"]){if(el.hasAttribute(a)){const v=rewrite(el.getAttribute(a));if(v!==el.getAttribute(a))el.setAttribute(a,v)}}
    });
  }
  const run=()=>patch(document);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
  new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)patch(n);else if(n.nodeType===3){const v=rewrite(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}}).observe(document.documentElement,{subtree:true,childList:true});
})();

// Load the synchronized Usage & Savings surface after the core deferred app has initialized.
(()=>{
  const load=()=>{
    if(document.querySelector('script[data-quillgeist-usage]'))return;
    const script=document.createElement('script');script.src='/usage.js';script.defer=true;script.dataset.quillgeistUsage='1';document.body.append(script);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();

// Keep the primary Windows installer visible for both first-time and returning Cloud users.
(()=>{
  const WINDOWS_INSTALLER='https://github.com/clintkosh/clintware-site/releases/download/quillgeist-v0.3.1-alpha/Quillgeist-Setup-Windows-x64.exe';
  const makeLink=(id,label,classes='btn primary')=>{
    const a=document.createElement('a');
    a.id=id;a.className=classes;a.href=WINDOWS_INSTALLER;a.textContent=label;
    a.setAttribute('aria-label','Install Quillgeist for Windows');
    a.setAttribute('data-windows-installer','true');
    return a;
  };
  const install=()=>{
    const top=document.querySelector('#app .top-actions');
    if(top&&!document.getElementById('installWindowsTop')){
      top.insertBefore(makeLink('installWindowsTop','Install for Windows','btn primary'),top.firstChild);
    }
    const homeActions=document.querySelector('#view-home .page-head .actions');
    if(homeActions&&!document.getElementById('installWindowsHome')){
      homeActions.insertBefore(makeLink('installWindowsHome','Install Windows','btn primary'),homeActions.firstChild);
    }
    const pairPanel=document.querySelector('#view-home #pairCode')?.closest('.panel');
    if(pairPanel&&!document.getElementById('installWindowsPair')){
      const note=document.createElement('div');note.id='installWindowsPair';note.style.marginBottom='12px';
      const link=makeLink('installWindowsPairLink','Download Windows installer','btn primary wide');
      note.append(link);pairPanel.insertBefore(note,pairPanel.querySelector('.field'));
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});
})();
