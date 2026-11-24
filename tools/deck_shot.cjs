// node tools/deck_shot.cjs out.png "1:0,2:0,3:2" [w h] -> contact sheet (2 columns) of slide:step states
const {chromium}=require('playwright');
(async()=>{
  const [out,list,w='1920',h='1080']=process.argv.slice(2);
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://localhost:8765/index.html#1');await p.waitForTimeout(800);
  const shots=[];
  for(const it of list.split(',')){const [s,st]=it.split(':').map(Number);
    await p.evaluate(([s,st])=>{__deck.jump(s-1);for(let k=0;k<st;k++)__deck.next();},[s,st]);
    await p.waitForTimeout(3600);shots.push((await p.screenshot()).toString('base64'));}
  const cols=2,sw=+w/2,sh=+h/2;
  await p.setViewportSize({width:sw*cols,height:sh*Math.ceil(shots.length/cols)});
  await p.setContent('<body style="margin:0;display:grid;grid-template-columns:repeat(2,'+sw+'px);gap:0">'+shots.map(s=>'<img style="width:'+sw+'px;height:'+sh+'px;outline:1px solid red" src="data:image/png;base64,'+s+'">').join('')+'</body>');
  await p.screenshot({path:out,fullPage:true});
  console.log('errors:',errs.slice(0,5));await b.close();
})();
