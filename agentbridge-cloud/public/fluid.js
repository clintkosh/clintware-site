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
