const {chromium,webkit}=require('playwright');
(async()=>{
 const url=process.argv[2], eng=process.argv[3]||'chromium';
 const b=await (eng==='webkit'?webkit:chromium).launch(); const ctx=await b.newContext({viewport:{width:1440,height:900},hasTouch:eng==='touch'}); const p=await ctx.newPage();
 await p.goto(url,{waitUntil:'networkidle'});
 const goto=async(id,beats)=>{await p.evaluate(id=>{const n=__deck.state().n;for(let k=0;k<n;k++){__deck.jump(k);if(__deck.state().id===id)return;}},id);for(let k=0;k<beats;k++)await p.evaluate(()=>__deck.next());await p.waitForTimeout(2600);};
 const fr=()=>p.frames().find(f=>f!==p.mainFrame());
 for(const [id,beats] of [['speed',0],['weight',0],['find',1],['ask',0]]){
  await goto(id,beats);
  const r=await p.evaluate(()=>{const f=document.querySelector('#phB .s-live');const r=f.getBoundingClientRect();const k=r.width/390;return {x:r.left,y:r.top,w:r.width,h:r.height,k,top:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===f}});
  const f=fr(); const y0=await f.evaluate(()=>scrollY);
  await p.mouse.move(r.x+r.w/2,r.y+r.h/2); await p.mouse.wheel(0,600); await p.waitForTimeout(600);
  const y1=await f.evaluate(()=>scrollY);
  // tap a real link inside the phone: first visible in-page link
  await f.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(300);
  const L=await f.evaluate(()=>{const a=[...document.querySelectorAll('a[href]')].find(a=>{const q=a.getBoundingClientRect();return q.top>120&&q.bottom<700&&q.width>30&&q.left>=0&&q.right<=390&&!a.href.startsWith('tel')&&!a.href.includes('#')});if(!a)return null;const q=a.getBoundingClientRect();return {href:a.getAttribute('href'),x:q.left+q.width/2,y:q.top+q.height/2}});
  const before=f.url(), s0=(await p.evaluate(()=>__deck.state())).id;
  if(eng==='touch') await p.touchscreen.tap(r.x+L.x*r.k,r.y+L.y*r.k); else await p.mouse.click(r.x+L.x*r.k,r.y+L.y*r.k);
  await p.waitForTimeout(1500);
  const after=fr()?fr().url():'(gone)', s1=(await p.evaluate(()=>__deck.state())).id;
  // keys from inside the page go back to the deck
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); const s2=await p.evaluate(()=>__deck.state());
  console.log(eng,id,'top=iframe:',r.top,'| scroll',y0,'->',y1,'| tap',L&&L.href,before.split('/').pop(),'->',after.split('/').pop(),'| deck',s0,'->',s1,'| ArrowRight ->',s2.id,s2.step);
 }
 await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
