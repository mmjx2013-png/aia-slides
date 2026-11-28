/** The member/admin stylesheet, served at /app/static/app.css (a file, so the CSP needs no 'unsafe-inline'). */
export const APP_CSS = `
@font-face{font-family:Inter;src:url(fonts/Inter-Regular.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:Inter;src:url(fonts/Inter-Medium.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:Inter;src:url(fonts/Inter-SemiBold.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:Inter;src:url(fonts/Inter-Bold.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:Inter;src:url(fonts/Anuphan-Thai-400.woff2) format("woff2");font-weight:400 500;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:Inter;src:url(fonts/Anuphan-Thai-600.woff2) format("woff2");font-weight:600;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:Inter;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:700 800;unicode-range:U+0E00-0E7F;font-display:swap}
:root{--bg:#F6F4EF;--card:#fff;--ink:#1B2333;--muted:#5C6577;--line:#E5E0D5;--brand:#2950D6;--brand-ink:#fff;--brand-soft:#E8EDFD;
--coral:#EE6A43;--ok:#17865A;--ok-bg:#E2F3EA;--warn:#8A5A00;--warn-bg:#FFF1D2;--bad:#B23A2A;--bad-bg:#FBE6E1;--line-green:#06C755;
--r:16px;--shadow:0 1px 2px rgba(27,35,51,.05),0 8px 24px rgba(27,35,51,.06)}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--brand);text-underline-offset:3px}
h1,h2,h3{line-height:1.3;margin:0 0 .5em;letter-spacing:-.01em}
h1{font-size:clamp(26px,4.4vw,38px);font-weight:700}
h2{font-size:22px;font-weight:700}
h3{font-size:18px;font-weight:600}
p{margin:0 0 1em}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.top .wrap{display:flex;align-items:center;gap:14px;min-height:64px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:700;font-size:19px;margin-right:auto}
.logo .mark{width:34px;height:34px;border-radius:10px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:18px;font-weight:800;position:relative;overflow:hidden}
.logo .mark::after{content:"";position:absolute;right:-6px;bottom:-6px;width:18px;height:18px;border-radius:6px;background:var(--coral);transform:rotate(20deg)}
.logo small{display:block;font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.08em;line-height:1}
.nav{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.nav a,.nav button{font:inherit;font-size:15px;font-weight:500;color:var(--ink);text-decoration:none;padding:8px 12px;border-radius:10px;background:none;border:0;cursor:pointer}
.nav a:hover,.nav button:hover{background:var(--bg)}
.nav a[aria-current=page]{background:var(--brand-soft);color:var(--brand)}
.nav form{margin:0}
main{padding:28px 0 56px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);padding:22px}
.card+.card{margin-top:16px}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.stack>*+*{margin-top:16px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.between{justify-content:space-between}
.muted{color:var(--muted)}
.mt{margin-top:32px}
.mt-s{margin-top:12px}
.nowrap{white-space:nowrap}
form.row input[type=search],form.row select{flex:1;width:auto;min-width:180px}
label.check{display:inline-flex;gap:8px;align-items:center;font-weight:500;font-size:14px;margin:0}
label.check input{width:18px;height:18px}
.wide .wrap{max-width:1280px}
.small{font-size:14px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:600;font-size:16px;line-height:1.2;padding:12px 18px;min-height:46px;border-radius:12px;border:2px solid var(--brand);background:var(--brand);color:var(--brand-ink);text-decoration:none;cursor:pointer;transition:transform .15s,box-shadow .15s,background .15s}
.btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(41,80,214,.22)}
.btn:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #F5B83D;outline-offset:2px}
.btn.ghost{background:#fff;color:var(--brand)}
.btn.ghost:hover{background:var(--brand-soft)}
.btn.danger{background:#fff;color:var(--bad);border-color:#E7B3A9}
.btn.ok{background:var(--ok);border-color:var(--ok)}
.btn.small{min-height:36px;padding:7px 12px;font-size:14px;border-radius:10px}
.btn.line{background:var(--line-green);border-color:var(--line-green);font-size:17px;padding:14px 24px}
.btn.line:hover{box-shadow:0 6px 16px rgba(6,199,85,.28)}
.btn.line .chat{width:22px;height:20px;border-radius:7px;background:#fff;position:relative}
.btn.line .chat::after{content:"";position:absolute;left:5px;bottom:-4px;border:5px solid transparent;border-top-color:#fff;border-left-color:#fff}
.btn[disabled]{opacity:.5;pointer-events:none}
.badge{display:inline-block;font-size:13px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--bg);color:var(--muted);white-space:nowrap}
.badge.ok{background:var(--ok-bg);color:var(--ok)}
.badge.warn{background:var(--warn-bg);color:var(--warn)}
.badge.bad{background:var(--bad-bg);color:var(--bad)}
.badge.info{background:var(--brand-soft);color:var(--brand)}
.flash{border-radius:12px;padding:12px 16px;margin-bottom:18px;font-weight:500}
.flash.ok{background:var(--ok-bg);color:#0F5E3F}
.flash.bad{background:var(--bad-bg);color:#7D2418}
.flash.warn{background:var(--warn-bg);color:#5E3D00}
label{display:block;font-weight:600;font-size:15px;margin:0 0 6px}
.field{margin-bottom:16px}
.hint{font-size:14px;color:var(--muted);margin-top:4px}
input[type=text],input[type=number],input[type=search],select,textarea{width:100%;font:inherit;font-size:16px;padding:11px 13px;border:2px solid var(--line);border-radius:12px;background:#fff;color:var(--ink)}
input:focus,select:focus,textarea:focus{border-color:var(--brand);outline:none}
input[type=file]{font:inherit;font-size:15px}
textarea{min-height:80px;resize:vertical}
.cols{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.book{display:flex;flex-direction:column;gap:12px;animation:rise .45s both}
.book:nth-child(2){animation-delay:.06s}.book:nth-child(3){animation-delay:.12s}.book:nth-child(4){animation-delay:.18s}
.cover{border-radius:12px;padding:16px;min-height:118px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;position:relative;overflow:hidden}
.cover::before{content:"";position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:30px;background:rgba(255,255,255,.14);transform:rotate(18deg)}
.cover b{font-size:24px;font-weight:800;line-height:1.15;position:relative}
.cover span{font-size:14px;font-weight:600;opacity:.92;position:relative}
.c0{background:#2950D6}.c1{background:#0E8A6A}.c2{background:#D5573A}.c3{background:#6B4BC8}.c4{background:#B07A00}.c5{background:#1F7FA8}
.price{font-size:28px;font-weight:800;letter-spacing:-.02em}
.price small{font-size:15px;font-weight:500;color:var(--muted);letter-spacing:0}
.units{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.units li{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)}
.units .n{flex:none;width:34px;height:34px;border-radius:10px;background:var(--brand-soft);color:var(--brand);font-weight:700;display:grid;place-items:center}
.units .t{flex:1;min-width:0}
.hero{display:grid;gap:28px;grid-template-columns:1.1fr .9fr;align-items:center;padding:20px 0 12px}
.hero p.lead{font-size:18px;color:var(--muted);max-width:34em}
.screen{background:#1B2333;border-radius:18px;padding:12px;box-shadow:0 20px 50px rgba(27,35,51,.22);transform:rotate(-1.2deg)}
.screen .slide{background:#FBFAF7;border-radius:10px;aspect-ratio:16/10;padding:18px;display:flex;flex-direction:column;gap:10px}
.screen .q{height:12px;width:62%;border-radius:6px;background:#D9DDE8}
.screen .q.s{width:40%}
.bars{flex:1;display:flex;align-items:flex-end;gap:10%;padding:0 6%}
.bars i{flex:1;border-radius:6px 6px 0 0;background:var(--brand);transform-origin:bottom;animation:grow 2.8s ease-in-out infinite alternate}
.bars i:nth-child(2){background:var(--coral);animation-delay:.3s}.bars i:nth-child(3){background:#0E8A6A;animation-delay:.6s}.bars i:nth-child(4){background:#6B4BC8;animation-delay:.9s}
.bars i:nth-child(1){height:46%}.bars i:nth-child(2){height:78%}.bars i:nth-child(3){height:58%}.bars i:nth-child(4){height:30%}
.tap{align-self:flex-end;background:var(--ok);color:#fff;font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;animation:pop 2.8s ease-in-out infinite}
.feats{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:28px}
.feat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px}
.feat b{display:block;margin-bottom:4px}
.pay{display:grid;gap:22px;grid-template-columns:minmax(0,300px) 1fr;align-items:start}
.qr{width:100%;height:auto;display:block;border-radius:12px;border:1px solid var(--line);background:#fff}
.qrbox{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;text-align:center}
.qrbox .pp{font-weight:800;letter-spacing:.06em;color:#113566;font-size:15px;margin-bottom:8px}
.amount{font-size:34px;font-weight:800;letter-spacing:-.02em}
.steps{margin:0;padding-left:22px}.steps li{margin-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;padding:10px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:13px;font-weight:600;color:var(--muted);white-space:nowrap}
.table{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:var(--r)}
.table table{min-width:640px}
td form{display:inline}
td .row{gap:6px}
.admin{display:grid;gap:24px;grid-template-columns:200px minmax(0,1fr)}
.admin>*{min-width:0}
.side{display:flex;flex-direction:column;gap:2px;position:sticky;top:84px;align-self:start}
.side a{padding:9px 12px;border-radius:10px;text-decoration:none;color:var(--ink);font-weight:500}
.side a:hover{background:#fff}
.side a[aria-current=page]{background:#fff;color:var(--brand);box-shadow:var(--shadow)}
.stats{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:22px}
.stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.stat b{display:block;font-size:28px;font-weight:800;letter-spacing:-.02em}
.stat span{font-size:14px;color:var(--muted)}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}
.foot{border-top:1px solid var(--line);padding:22px 0 30px;color:var(--muted);font-size:14px}
.foot .wrap{display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between}
.prose{max-width:760px}.prose h2{margin-top:1.4em}.prose li{margin-bottom:.35em}
.empty{text-align:center;padding:34px 20px;color:var(--muted)}
.empty h1{color:var(--ink)}.empty .row{justify-content:center}
details summary{cursor:pointer;font-weight:600}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleY(.55)}to{transform:scaleY(1)}}
@keyframes pop{0%,60%{opacity:0;transform:scale(.8)}70%,100%{opacity:1;transform:none}}
@media (max-width:820px){.hero{grid-template-columns:1fr}.screen{transform:none}.pay{grid-template-columns:1fr}.admin{grid-template-columns:minmax(0,1fr)}.side{position:static;flex-direction:row;overflow-x:auto;padding-bottom:4px}.side a{white-space:nowrap}}
@media (max-width:560px){.top .wrap{padding-top:8px;padding-bottom:8px}.nav{width:100%;justify-content:flex-start}.card{padding:18px}main{padding-top:20px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`.trim();
