const {chromium}=require('playwright');
(async()=>{const [src,out]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+src,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
await p.pdf({path:out,format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
footerTemplate:'<div style="font-size:8px;color:#888;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',margin:{top:'16mm',bottom:'16mm',left:'15mm',right:'15mm'}});
await b.close();})();
