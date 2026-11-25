const {chromium}=require('playwright');
(async()=>{const out=process.argv[2];const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('http://localhost:8765/pitch/',{waitUntil:'networkidle'});
const n=await p.evaluate(()=>__deck.state().n);
for(let k=0;k<n;k++){await p.evaluate(k=>__deck.jump(k),k);await p.waitForTimeout(300);
 const st=await p.evaluate(()=>__deck.state());
 for(let s=0;s<st.steps;s++){await p.evaluate(()=>__deck.next());await p.waitForTimeout(250);}
 const id=(await p.evaluate(()=>__deck.state())).id; if(id!==st.id){await p.evaluate(()=>__deck.prev());}
 await p.waitForTimeout(st.id==='speed'?11000:3200);
 const f=await p.evaluate(()=>__deck.state());
 await p.screenshot({path:`${out}/${String(f.slide).padStart(2,'0')}-${f.id}.jpg`,type:'jpeg',quality:82});
 console.log(f.slide,f.id,f.step,'/',f.steps);}
await b.close();})();
