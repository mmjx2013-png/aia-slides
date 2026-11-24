// Text fit + contrast on real pixels for every slide at its last beat. node tools/deck_qa.cjs OUT
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('http://localhost:8765/index.html#1');await p.waitForTimeout(800);
await p.addStyleTag({content:'.rm *{}'});await p.evaluate(()=>document.documentElement.classList.add('rm'));
const N=await p.evaluate(()=>__deck.N),rep=[];
for(let s=0;s<N;s++){const steps=await p.evaluate(s=>__deck.steps[s],s);
 for(let st=0;st<=steps;st++){
  await p.evaluate(([s,st])=>{__deck.jump(s);for(let k=0;k<st;k++)__deck.next();},[s,st]);await p.waitForTimeout(250);
  const items=await p.evaluate(()=>{const R=[];const sel=[...document.querySelectorAll('.slide.on *, #card .lc.show *, #robe .rules li')];
   for(const e of sel){const t=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!t||e.closest('svg')||e.closest('.face.back')&&!e.closest('#card.flipped')||e.closest('.face.front')&&e.closest('#card.flipped'))continue;
    let o=1,x=e;while(x&&x!==document.body){const cs=getComputedStyle(x);o*=+cs.opacity;if(cs.visibility==='hidden'){o=0}x=x.parentElement;}
    if(o<.9)continue;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);
    if(e.closest('#robe')&&!document.querySelector('[data-s="answer"].ge1'))continue;
    R.push({t:t.slice(0,40),x:r.left,y:r.top,w:r.width,h:r.height,c:cs.color,fs:cs.fontSize,sw:e.scrollWidth>e.clientWidth+2&&cs.overflow!=='visible'});}
   return R;});
  await p.addStyleTag({content:'*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important} .src{border-color:transparent!important} svg text{fill:transparent!important}'}).then(h=>h);
  const buf=await p.screenshot({path:`${out}/bg-${s+1}-${st}.png`});
  await p.evaluate(()=>{const ss=document.querySelectorAll('style');ss[ss.length-1].remove();});
  rep.push({slide:s+1,step:st,items});}}
fs.writeFileSync(out+'/rep.json',JSON.stringify(rep));await b.close();})();
