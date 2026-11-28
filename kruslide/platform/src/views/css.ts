/**
 * The member/admin stylesheet, served at /app/static/app.css (a file, so the CSP needs no 'unsafe-inline').
 * Palette and type follow the sales site (kruslide/site/assets/site.css): navy ink, sky blue, tomato, sun, mint, lilac
 * on warm paper. No dark neon, no gradient text.
 */
export const APP_CSS = `
/* ---------- fonts: Inter for Latin, Anuphan for Thai (unicode-range). Each Anuphan face repeats the exact single
   weight of an Inter face: Chromium only merges faces whose descriptors match. ---------- */
@font-face{font-family:KS;src:url(fonts/Inter-Regular.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Inter-Medium.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Inter-SemiBold.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Inter-Bold.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Inter-ExtraBold.woff2) format("woff2");font-weight:800;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-400.woff2) format("woff2");font-weight:400;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-400.woff2) format("woff2");font-weight:500;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-600.woff2) format("woff2");font-weight:600;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:700;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:800;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KSD;src:url(fonts/InterDisplay-SemiBold.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:KSD;src:url(fonts/InterDisplay-Bold.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:KSD;src:url(fonts/InterDisplay-ExtraBold.woff2) format("woff2");font-weight:800;font-display:swap}
@font-face{font-family:KSD;src:url(fonts/Anuphan-Thai-600.woff2) format("woff2");font-weight:600;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KSD;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:700;unicode-range:U+0E00-0E7F;font-display:swap}
@font-face{font-family:KSD;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:800;unicode-range:U+0E00-0E7F;font-display:swap}

/* ---------- tokens ---------- */
:root{
 --ink:#172036;--ink2:#465069;--mute:#5E6680;
 --paper:#FFFAF2;--paper2:#FBF1E2;--card:#fff;--line:#EEE5D6;--line2:#E0D5C2;
 --navy:#1C2A55;--navy2:#26376B;--navy3:#33467F;
 --sky:#3D7BFF;--lsky:#E6EEFF;--sky-t:#2F66E8;
 --tom:#F2553C;--ltom:#FFE6E0;--tom-t:#B8341F;
 --sun:#FFC83D;--lsun:#FFF1C9;--sun-t:#8A5A00;
 --mint:#18B07F;--lmint:#DCF5EB;--mint-t:#0B7050;
 --lilac:#8B6CF6;--llilac:#EEE8FF;--lilac-t:#6A4BD8;
 --line-g:#05873E;--line-g2:#04722F;
 --r:20px;--r-lg:28px;
 --sh1:0 1px 2px rgba(23,32,54,.05),0 6px 18px rgba(23,32,54,.06);
 --sh2:0 2px 6px rgba(23,32,54,.05),0 22px 48px rgba(23,32,54,.12);
 --ease:cubic-bezier(.2,.7,.2,1);--spring:cubic-bezier(.3,1.4,.5,1);
}

/* ---------- base ---------- */
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.65 KS,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;min-height:100vh;display:flex;flex-direction:column}
body>main{flex:1}
a{color:var(--sky-t);text-underline-offset:3px;text-decoration-thickness:1.5px}
h1,h2,h3{margin:0 0 .45em;color:var(--navy);font-family:KSD,KS,sans-serif}
h1{font-size:clamp(28px,4.4vw,42px);font-weight:800;line-height:1.22;letter-spacing:-.015em}
h2{font-size:clamp(21px,2.4vw,25px);font-weight:800;line-height:1.3;letter-spacing:-.01em}
h3{font-size:18px;font-weight:700;line-height:1.35}
p{margin:0 0 1em}
img{max-width:100%;height:auto}
::selection{background:var(--sun);color:var(--ink)}
:focus-visible{outline:3px solid var(--sky);outline-offset:3px;border-radius:8px}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.sprite{position:absolute;width:0;height:0;overflow:hidden}
.ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-4px}
.ic.fill{fill:currentColor;stroke:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.wide .wrap{max-width:1320px}
.muted{color:var(--mute)}
.small{font-size:14px}
.mt{margin-top:36px}
.mt-s{margin-top:12px}
.nowrap{white-space:nowrap}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;word-break:break-all}
.stack>*+*{margin-top:16px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.between{justify-content:space-between}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.cols{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.prose{max-width:780px}.prose h2{margin-top:1.4em}.prose li{margin-bottom:.35em}
.kicker{display:inline-flex;align-items:center;gap:10px;font:700 14.5px/1.3 KS;color:var(--tom-t);margin-bottom:10px}
.kicker::before{content:"";width:24px;height:7px;border-radius:4px;background:var(--tom)}
mark{background:none;color:inherit;padding:0 .06em;background-image:linear-gradient(transparent 62%,var(--sun) 62%,var(--sun) 92%,transparent 92%);-webkit-box-decoration-break:clone;box-decoration-break:clone}
.sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:40px 0 16px}
.sec-head h2{margin:0}
.sec-head a{font-weight:600;font-size:15px;text-decoration:none}
.sec-head a:hover{text-decoration:underline}

/* ---------- header ---------- */
.top{position:sticky;top:0;z-index:40;background:rgba(255,250,242,.9);-webkit-backdrop-filter:saturate(1.3) blur(12px);backdrop-filter:saturate(1.3) blur(12px);box-shadow:0 1px 0 var(--line)}
.top .wrap{display:flex;align-items:center;gap:16px;min-height:68px}
.brand{display:inline-flex;align-items:center;gap:11px;text-decoration:none;margin-right:auto;flex:none}
.brand-ic{width:40px;height:40px;flex:none;transition:transform .5s var(--spring)}
.brand:hover .brand-ic{transform:rotate(-8deg) scale(1.06)}
.brand-txt{display:flex;flex-direction:column;line-height:1}
.brand-txt b{font:800 21px/1 KSD,KS;letter-spacing:-.02em;color:var(--navy)}
.brand-txt b span{color:var(--sky)}
.brand-txt small{font:600 12.5px/1.2 KS;color:var(--mute);margin-top:4px}
.nav{display:flex;gap:2px;align-items:center}
.nav a,.nav button{display:inline-flex;align-items:center;gap:7px;font:600 15px/1.3 KS;color:var(--ink2);text-decoration:none;padding:9px 13px;border-radius:12px;background:none;border:0;cursor:pointer;transition:background-color .2s,color .2s}
.nav a:hover,.nav button:hover{background:rgba(28,42,85,.06);color:var(--navy)}
.nav a[aria-current=page]{background:var(--navy);color:#fff}
.nav a.cta{background:var(--sun);color:var(--navy)}
.nav a.cta:hover{background:#FFD25E}
.nav a.cta[aria-current=page]{background:var(--navy);color:#fff}
.nav form{margin:0}
.who{display:inline-flex;align-items:center;gap:9px;padding:4px 12px 4px 4px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--line2);font:600 14px/1.2 KS;color:var(--ink2);text-decoration:none;max-width:220px}
.who span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ava{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--lsky);color:var(--sky-t);font:800 15px/1 KSD,KS;flex:none}
.focus .top .wrap{min-height:60px}

/* bottom tab bar on phones */
.tabs{display:none}
@media (max-width:760px){
 .nav .hide-m{display:none}
 .nav .lbl{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
 .nav button{width:44px;height:44px;justify-content:center;padding:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--line2)}
 .who{display:none}
 .tabs{display:flex;position:sticky;bottom:0;z-index:40;background:rgba(255,255,255,.94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 -1px 0 var(--line),0 -10px 30px -18px rgba(23,32,54,.3);padding:6px 8px calc(6px + env(safe-area-inset-bottom))}
 .tabs a{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border-radius:14px;font:600 11.5px/1.2 KS;color:var(--mute);text-decoration:none}
 .tabs a .ic{width:23px;height:23px}
 .tabs a[aria-current=page]{color:var(--navy);background:var(--lsky)}
 .tabs a.cta .ic{color:var(--tom)}
}

/* ---------- layout ---------- */
main{padding:30px 0 64px;overflow-x:clip}
.foot{padding:26px 0 34px;color:var(--mute);font-size:14px;border-top:1px solid var(--line)}
.foot .wrap{display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between;align-items:center}
.foot a{color:var(--ink2)}
.focus .foot{display:none}
.back{display:inline-flex;align-items:center;gap:6px;font:600 15px/1.3 KS;color:var(--ink2);text-decoration:none;margin-bottom:14px;padding:6px 10px 6px 6px;border-radius:10px;transition:background-color .2s}
.back:hover{background:rgba(28,42,85,.06);color:var(--navy)}

/* ---------- buttons ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font:700 16px/1.2 KS;min-height:48px;padding:0 22px;border-radius:999px;border:0;background:var(--navy);color:#fff;text-decoration:none;cursor:pointer;white-space:nowrap;transition:transform .25s var(--ease),box-shadow .25s var(--ease),background-color .2s,color .2s}
.btn:hover{background:var(--navy2);transform:translateY(-2px);box-shadow:0 12px 24px -10px rgba(28,42,85,.6)}
.btn:active{transform:translateY(0) scale(.98)}
.btn .ic{width:19px;height:19px}
.btn.ghost{background:#fff;color:var(--navy);box-shadow:inset 0 0 0 1.5px var(--line2)}
.btn.ghost:hover{background:#fff;box-shadow:inset 0 0 0 1.5px var(--navy);transform:translateY(-1px)}
.btn.sun{background:var(--sun);color:var(--navy)}
.btn.sun:hover{background:#FFD25E;box-shadow:0 12px 24px -10px rgba(138,90,0,.55)}
.btn.tom{background:var(--tom);color:#fff}
.btn.tom:hover{background:#E04A32;box-shadow:0 12px 24px -10px rgba(184,52,31,.55)}
.btn.ok{background:var(--mint-t)}
.btn.ok:hover{background:#095F44;box-shadow:0 12px 24px -10px rgba(11,112,80,.55)}
.btn.danger{background:#fff;color:var(--tom-t);box-shadow:inset 0 0 0 1.5px #F2B9AE}
.btn.danger:hover{background:var(--ltom);box-shadow:inset 0 0 0 1.5px var(--tom);color:var(--tom-t)}
.btn.small{min-height:38px;padding:0 15px;font-size:14.5px}
.btn.big{min-height:58px;padding:0 28px;font-size:17.5px}
.btn.block{display:flex;width:100%}
.btn.line{background:var(--line-g);box-shadow:0 8px 20px -6px rgba(5,135,62,.55)}
.btn.line:hover{background:var(--line-g2);box-shadow:0 14px 26px -8px rgba(5,135,62,.6)}
.btn[disabled]{opacity:.5;pointer-events:none}
.link{background:none;border:0;padding:0;font:inherit;color:var(--sky-t);text-decoration:underline;cursor:pointer}

/* ---------- badges, chips, flash ---------- */
.badge{display:inline-flex;align-items:center;gap:6px;font:700 13px/1.3 KS;padding:4px 11px;border-radius:999px;background:#F1ECE2;color:var(--ink2);white-space:nowrap}
.badge::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.85}
.badge.plain::before{display:none}
.badge.ok{background:var(--lmint);color:var(--mint-t)}
.badge.warn{background:var(--lsun);color:var(--sun-t)}
.badge.bad{background:var(--ltom);color:var(--tom-t)}
.badge.info{background:var(--lsky);color:var(--sky-t)}
.badge.lilac{background:var(--llilac);color:var(--lilac-t)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--line);font:600 14px/1.3 KS;color:var(--ink2)}
.chip b{color:var(--navy)}
.chip.t-sky{background:var(--lsky);box-shadow:none;color:var(--sky-t)}
.chip.t-mint{background:var(--lmint);box-shadow:none;color:var(--mint-t)}
.chip.t-tom{background:var(--ltom);box-shadow:none;color:var(--tom-t)}
.chip.t-sun{background:var(--lsun);box-shadow:none;color:var(--sun-t)}
.chip.t-lilac{background:var(--llilac);box-shadow:none;color:var(--lilac-t)}
.flash{display:flex;gap:10px;align-items:flex-start;border-radius:16px;padding:13px 16px;margin-bottom:20px;font-weight:600;animation:drop .5s var(--spring) both}
.flash::before{content:"";flex:none;width:10px;height:10px;margin-top:8px;border-radius:50%;background:currentColor}
.flash.ok{background:var(--lmint);color:#0A5E43}
.flash.bad{background:var(--ltom);color:#8E2A18}
.flash.warn{background:var(--lsun);color:#5E3D00}
.flash a{color:inherit}

/* ---------- cards & bento ---------- */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh1);padding:26px}
.card+.card{margin-top:16px}
.card.flat{box-shadow:none}
.card h2:first-child,.card h3:first-child{margin-top:0}
.lift{transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.lift:hover{transform:translateY(-4px);box-shadow:var(--sh2)}
.bento{display:grid;gap:16px;grid-template-columns:repeat(4,minmax(0,1fr))}
.tile{position:relative;overflow:hidden;border-radius:var(--r-lg);padding:22px;background:#fff;border:1px solid var(--line);box-shadow:var(--sh1);display:flex;flex-direction:column;gap:6px;text-decoration:none;color:var(--ink);min-height:150px;animation:rise .6s var(--ease) both}
.tile:nth-child(2){animation-delay:.06s}.tile:nth-child(3){animation-delay:.12s}.tile:nth-child(4){animation-delay:.18s}
a.tile{transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
a.tile:hover{transform:translateY(-4px);box-shadow:var(--sh2)}
.tile .ic-tile{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--lsky);color:var(--sky-t);margin-bottom:6px}
.tile .ic-tile .ic{width:23px;height:23px}
.tile b.num{font:800 34px/1.1 KSD,KS;letter-spacing:-.02em;color:var(--navy)}
.tile .lbl{font:600 14.5px/1.4 KS;color:var(--mute)}
.tile h3{margin:0}
.tile.span2{grid-column:span 2}
.tile.navy{background:var(--navy);border-color:var(--navy);color:#fff}
.tile.navy h2,.tile.navy h3,.tile.navy b.num{color:#fff}
.tile.navy .lbl,.tile.navy p{color:#C9D3F0}
.tile.sun{background:var(--sun);border-color:var(--sun)}
.tile.sun h2,.tile.sun h3{color:var(--navy)}
.tile.sun p{color:#4A3A10}
.tile.tom{background:var(--tom);border-color:var(--tom);color:#fff}
.tile.tom b.num,.tile.tom h3{color:#fff}.tile.tom .lbl{color:#FFE1DA}
.tile.tom .ic-tile{background:rgba(255,255,255,.2);color:#fff}
.tile.mint .ic-tile{background:var(--lmint);color:var(--mint-t)}
.tile.sunl .ic-tile{background:var(--lsun);color:var(--sun-t)}
.tile.lil .ic-tile{background:var(--llilac);color:var(--lilac-t)}
.tile.tomi .ic-tile{background:var(--ltom);color:var(--tom-t)}
.tile .go{margin-top:auto;display:inline-flex;align-items:center;gap:6px;font:700 15px/1.3 KS;color:var(--sky-t)}
.tile.sun .go,.tile.navy .go{color:inherit}
.tile .deco{position:absolute;right:-26px;bottom:-26px;width:130px;height:130px;border-radius:36px;transform:rotate(18deg);background:rgba(255,255,255,.18);pointer-events:none}
.tile.sun .deco{background:rgba(255,255,255,.35)}
.hello{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.hello h1{margin:0}
.hello p{margin:4px 0 0}

/* ---------- onboarding ---------- */
.onb{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.2fr);gap:24px;align-items:center;margin-bottom:22px}
.onb .meter{display:flex;align-items:baseline;gap:8px}
.onb .meter b{font:800 40px/1 KSD,KS;color:var(--navy)}
.onb .bar{height:10px;border-radius:6px;background:#F1ECE2;overflow:hidden;margin-top:10px}
.onb .bar i{display:block;height:100%;border-radius:6px;background:var(--mint);transform-origin:left;animation:fill 1s var(--ease) .2s both}
.onb .bar.s0 i{width:4%}.onb .bar.s1 i{width:34%}.onb .bar.s2 i{width:67%}.onb .bar.s3 i{width:100%}
.steps-h{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
.steps-h li{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:18px;background:var(--paper);border:1px solid var(--line)}
.steps-h .dot{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:inset 0 0 0 2px var(--line2);font:800 15px/1 KSD,KS;color:var(--mute)}
.steps-h li.done .dot{background:var(--mint);box-shadow:none;color:#fff}
.steps-h li.now{background:#fff;border-color:var(--sky);box-shadow:0 0 0 3px var(--lsky)}
.steps-h li.now .dot{background:var(--navy);box-shadow:none;color:#fff}
.steps-h b{display:block;font-size:15px;line-height:1.35;color:var(--navy)}
.steps-h span{font-size:13.5px;color:var(--mute);line-height:1.45;display:block}
.steps-h a{font-weight:700}

/* ---------- book cards with cover art ---------- */
.t-sky{--c:var(--sky);--lc:var(--lsky);--tc:var(--sky-t);--c2:#9DB8FF}
.t-mint{--c:var(--mint);--lc:var(--lmint);--tc:var(--mint-t);--c2:#8ADBB9}
.t-tom{--c:var(--tom);--lc:var(--ltom);--tc:var(--tom-t);--c2:#FFAE9F}
.t-sun{--c:#F0A800;--lc:var(--lsun);--tc:var(--sun-t);--c2:#FFE08A}
.t-lilac{--c:var(--lilac);--lc:var(--llilac);--tc:var(--lilac-t);--c2:#C6B6FF}
.t-navy{--c:var(--navy);--lc:var(--lsky);--tc:var(--navy);--c2:#9DB8FF}
.bcard{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh1);overflow:hidden;animation:rise .6s var(--ease) both;transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.bcard:hover{transform:translateY(-4px);box-shadow:var(--sh2)}
.bcard:nth-child(2){animation-delay:.07s}.bcard:nth-child(3){animation-delay:.14s}.bcard:nth-child(4){animation-delay:.21s}
.bcard .body{padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px;flex:1}
.bcard .body h3{margin:0}
.bcard .body .btn{margin-top:auto}
.art{position:relative;height:178px;background:var(--lc);overflow:hidden;display:flex;align-items:flex-end;justify-content:center;padding-top:20px}
.art::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(28,42,85,.12) 1.1px,transparent 1.5px);background-size:18px 18px}
.art .blob{position:absolute;left:-30px;top:-40px;width:150px;height:150px;border-radius:44px;background:var(--c2);opacity:.45;transform:rotate(22deg)}
.art .blob.b2{left:auto;right:-36px;top:auto;bottom:-50px;width:120px;height:120px;border-radius:50%;opacity:.35}
.book3d{position:relative;width:118px;height:150px;margin-bottom:-14px;border-radius:6px 14px 14px 6px;background:var(--c);box-shadow:inset 9px 0 0 rgba(0,0,0,.13),inset 11px 0 0 rgba(255,255,255,.22),0 18px 30px -12px rgba(23,32,54,.45);transform:rotate(-4deg);transition:transform .5s var(--spring);color:#fff;padding:16px 14px 0 22px;display:flex;flex-direction:column;gap:8px}
.bcard:hover .book3d,.bhead:hover .book3d{transform:rotate(-1deg) translateY(-6px)}
.book3d::after{content:"";position:absolute;right:-7px;top:6px;bottom:6px;width:7px;border-radius:0 4px 4px 0;background:repeating-linear-gradient(180deg,#fff 0 2px,#E6E0D4 2px 3px)}
.book3d .ic{width:30px;height:30px;stroke-width:2.2}
.book3d b{font:800 26px/1 KSD,KS;letter-spacing:-.02em}
.book3d i{display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.55);width:70%}
.book3d i+i{width:46%}
.art .tag{position:absolute;left:14px;top:14px;z-index:2}
.art .tag.r{left:auto;right:14px}
.price{font:800 30px/1.1 KSD,KS;letter-spacing:-.02em;color:var(--navy)}
.price small{font:500 15px KS;color:var(--mute);letter-spacing:0}
.bhead{display:grid;grid-template-columns:200px minmax(0,1fr);gap:0;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh1);overflow:hidden;animation:rise .6s var(--ease) both}
.bhead+.bhead{margin-top:16px}
.bhead .art{height:auto;min-height:200px}
.bhead .body{padding:22px 24px;min-width:0}
.bhead .body h3{font-size:21px;margin:0 0 2px}
.units{list-style:none;margin:12px 0 0;padding:0}
.units li{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:11px 0;border-top:1px solid var(--line)}
.units .n{flex:none;width:38px;height:38px;border-radius:12px;background:var(--lsky);color:var(--sky-t);font:800 16px/1 KSD,KS;display:grid;place-items:center}
.units .t{flex:1;min-width:0;font-weight:600;line-height:1.4}
.units .t .muted{font-weight:400}

/* ---------- empty states ---------- */
.empty{text-align:center;padding:40px 22px;color:var(--mute)}
.empty h1,.empty h2,.empty h3{color:var(--navy)}
.empty .row{justify-content:center}
.empty .ill{width:150px;height:112px;margin:0 auto 14px;display:block}
.empty p{max-width:34em;margin-left:auto;margin-right:auto}
.empty.box{background:#fff;border:2px dashed var(--line2);border-radius:var(--r-lg)}

/* ---------- landing ---------- */
.hero{display:grid;gap:40px;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);align-items:center;padding:24px 0 10px;position:relative}
.hero::before{content:"";position:absolute;inset:-30px -200px auto;height:520px;z-index:-1;background-image:radial-gradient(circle at 1px 1px,rgba(28,42,85,.12) 1.1px,transparent 1.5px);background-size:24px 24px;-webkit-mask-image:linear-gradient(180deg,#000 0,#000 50%,transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 50%,transparent 100%)}
.hero h1{font-size:clamp(32px,4.3vw,54px);line-height:1.22;margin:18px 0 14px}
.nw{white-space:nowrap}
.lead{font-size:clamp(17px,1.5vw,19px);line-height:1.75;color:var(--ink2);max-width:34em}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px 7px 10px;border-radius:999px;background:#fff;box-shadow:var(--sh1);font:600 14.5px/1.3 KS;color:var(--ink2)}
.pill .ic{width:18px;height:18px;color:var(--tom)}
.ticks{list-style:none;padding:0;margin:20px 0 0;display:flex;flex-wrap:wrap;gap:8px 18px}
.ticks li{display:flex;align-items:center;gap:7px;font:600 14.5px/1.4 KS;color:var(--ink2)}
.ticks .ic{width:18px;height:18px;color:var(--mint-t);stroke-width:2.6}
.mock{position:relative;aspect-ratio:1/.86}
.mock .scr{position:absolute;left:4%;right:4%;top:6%;aspect-ratio:16/10;border:10px solid var(--navy);border-radius:22px;background:#F7F8FC;box-shadow:0 30px 60px -20px rgba(28,42,85,.45);padding:5% 6%;display:flex;flex-direction:column;gap:7%}
.mock .q{height:12px;width:58%;border-radius:6px;background:var(--navy);opacity:.85}
.mock .q.s{width:36%;opacity:.25}
.mock .bars{flex:1;display:flex;align-items:flex-end;gap:9%;padding:0 6% 4px;border-bottom:3px solid var(--navy)}
.mock .bars i{flex:1;border-radius:8px 8px 0 0;background:#9DB8FF;transform-origin:bottom;animation:grow 3.2s var(--ease) infinite alternate}
.mock .bars i:nth-child(1){height:52%}.mock .bars i:nth-child(2){height:40%;animation-delay:.15s}
.mock .bars i:nth-child(3){height:86%;background:var(--tom);animation-delay:.3s}.mock .bars i:nth-child(4){height:28%;animation-delay:.45s}
.mock .float{position:absolute;display:flex;align-items:center;gap:8px;padding:9px 14px 9px 9px;border-radius:999px;background:#fff;box-shadow:var(--sh2);font:700 14px/1.2 KS;color:var(--ink);animation:bob 5s ease-in-out infinite alternate}
.mock .float .ic{width:30px;height:30px;padding:6px;border-radius:50%}
.mock .f1{right:-2%;top:0}.mock .f1 .ic{background:var(--lsun);color:var(--sun-t)}
.mock .f2{left:-2%;bottom:16%;animation-delay:-2s}.mock .f2 .ic{background:var(--lmint);color:var(--mint-t)}
.mock .f3{right:2%;bottom:2%;animation-delay:-3.5s}.mock .f3 .ic{background:var(--ltom);color:var(--tom-t)}
.feats{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:46px}
.feat{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:20px;box-shadow:var(--sh1)}
.feat .ic-tile{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;margin-bottom:12px}
.feat .ic-tile .ic{width:23px;height:23px}
.feat b{display:block;font:700 17px/1.4 KSD,KS;color:var(--navy);margin-bottom:4px}
.feat span{font-size:15px;color:var(--mute)}
.ic-tile.t-sky{background:var(--lsky);color:var(--sky-t)}.ic-tile.t-mint{background:var(--lmint);color:var(--mint-t)}
.ic-tile.t-tom{background:var(--ltom);color:var(--tom-t)}.ic-tile.t-sun{background:var(--lsun);color:var(--sun-t)}
.ic-tile.t-lilac{background:var(--llilac);color:var(--lilac-t)}

/* ---------- forms ---------- */
label{display:block;font:700 15px/1.4 KS;color:var(--navy);margin:0 0 7px}
label .opt{font-weight:500;color:var(--mute)}
.field{margin-bottom:20px}
.hint{font-size:14px;color:var(--mute);margin-top:6px}
input[type=text],input[type=number],input[type=search],input[type=date],select,textarea{width:100%;font:inherit;font-size:16px;padding:12px 15px;border:2px solid var(--line2);border-radius:14px;background:#fff;color:var(--ink);transition:border-color .2s,box-shadow .2s}
input:hover,select:hover,textarea:hover{border-color:#CDBFA8}
input:focus,select:focus,textarea:focus{border-color:var(--sky);box-shadow:0 0 0 4px var(--lsky);outline:none}
input[type=file]{font:inherit;font-size:15px}
textarea{min-height:96px;resize:vertical;line-height:1.55}
label.check{display:inline-flex;gap:9px;align-items:center;font-weight:600;font-size:14.5px;margin:0;color:var(--ink2)}
label.check input{width:19px;height:19px;accent-color:var(--navy)}
form.row input[type=search],form.row select{flex:1;width:auto;min-width:170px}
.radios{display:flex;flex-wrap:wrap;gap:8px;border:0;padding:0;margin:0}
.radios legend{font:700 15px/1.4 KS;color:var(--navy);margin-bottom:9px;padding:0}
.radios label{margin:0;font-weight:600}
.radios input{position:absolute;opacity:0;width:1px;height:1px}
.radios span{display:inline-flex;align-items:center;min-height:44px;min-width:54px;justify-content:center;padding:0 15px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 2px var(--line2);font:700 15px/1 KS;color:var(--ink2);cursor:pointer;transition:background-color .2s,color .2s,box-shadow .2s,transform .25s var(--spring)}
.radios label:hover span{box-shadow:inset 0 0 0 2px #CDBFA8}
.radios input:checked+span{background:var(--navy);color:#fff;box-shadow:none;transform:scale(1.04)}
.radios input:focus-visible+span{outline:3px solid var(--sky);outline-offset:2px}
.form-card{max-width:760px;margin:0 auto}
.form-head{display:flex;gap:18px;align-items:center;margin-bottom:22px}
.form-head .ic-tile{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:var(--lsun);color:var(--sun-t);flex:none}
.form-head .ic-tile .ic{width:30px;height:30px}
.form-head h1{margin:0}
.form-head p{margin:2px 0 0;color:var(--mute)}
.form-head .ic-tile.t-sky{background:var(--lsky);color:var(--sky-t)}
.stepper{list-style:none;margin:0 0 22px;padding:0;display:flex;gap:8px;flex-wrap:wrap}
.stepper li{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--line);font:600 14px/1.2 KS;color:var(--mute)}
.stepper li b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#F1ECE2;font:800 13px/1 KSD,KS}
.stepper li.now{background:var(--navy);color:#fff;box-shadow:none}
.stepper li.now b{background:var(--sun);color:var(--navy)}
.stepper li.done b{background:var(--mint);color:#fff}

/* ---------- style quiz ---------- */
.qtop{display:flex;align-items:center;gap:14px;flex:1;max-width:560px;margin:0 auto 0 8px;view-transition-name:qprog}
.qprog{flex:1;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:5px;list-style:none;margin:0;padding:0}
.qprog li{height:8px;border-radius:5px;background:#EDE5D6;overflow:hidden;position:relative}
.qprog li.done{background:var(--mint)}
.qprog li.now{background:#EDE5D6}
.qprog li.now::after{content:"";position:absolute;inset:0;border-radius:5px;background:var(--navy);transform-origin:left;animation:fill .7s var(--ease) both}
.qcount{font:800 15px/1 KSD,KS;color:var(--navy);white-space:nowrap}
.qcount span{color:var(--mute);font-weight:600}
.qx{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:var(--ink2);text-decoration:none;flex:none}
.qx:hover{background:rgba(28,42,85,.07)}
.quiz{max-width:1160px;margin:0 auto;view-transition-name:quiz}
.quiz .qh{text-align:center;margin:4px auto 22px;max-width:760px}
.quiz .qh .kicker{justify-content:center}
.quiz .qh h1{font-size:clamp(25px,3.6vw,38px);margin:0}
.quiz .qh p{margin:8px 0 0;color:var(--mute)}
.duel{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:18px;align-items:center}
.vs{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--navy);color:#fff;font:800 14px/1 KSD,KS;box-shadow:0 8px 18px -6px rgba(28,42,85,.5)}
.pick{all:unset;box-sizing:border-box;display:flex;flex-direction:column;cursor:pointer;background:#fff;border-radius:24px;padding:10px;box-shadow:0 0 0 2px var(--line),var(--sh1);transition:transform .3s var(--spring),box-shadow .25s var(--ease),opacity .25s;-webkit-tap-highlight-color:transparent;position:relative}
.pick img{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:16px;background:#F3EEE5}
.pick .cap{display:flex;align-items:center;gap:12px;padding:12px 8px 6px}
.pick .ab{flex:none;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--lsky);color:var(--sky-t);font:800 16px/1 KSD,KS;transition:background-color .2s,color .2s}
.pick b{display:block;font:700 17px/1.3 KSD,KS;color:var(--navy)}
.pick small{display:block;font-size:14px;line-height:1.4;color:var(--mute)}
.pick .tick{position:absolute;right:20px;top:20px;width:46px;height:46px;border-radius:50%;background:var(--mint);color:#fff;display:grid;place-items:center;transform:scale(0);transition:transform .35s var(--spring);box-shadow:0 8px 18px -6px rgba(11,112,80,.6)}
.pick .tick .ic{width:26px;height:26px;stroke-width:3}
.pick:hover{box-shadow:0 0 0 3px var(--sky),var(--sh2);transform:translateY(-4px)}
.pick:active{transform:scale(.98)}
.pick:focus-visible{box-shadow:0 0 0 4px var(--sky),var(--sh2)}
.pick.was{box-shadow:0 0 0 3px var(--mint),var(--sh1)}
.pick.was .ab{background:var(--mint);color:#fff}
.pick.chosen{box-shadow:0 0 0 4px var(--mint),var(--sh2);transform:scale(1.02)}
.pick.chosen .tick{transform:scale(1)}
.pick.chosen .ab{background:var(--mint);color:#fff}
.picked .pick:not(.chosen){opacity:.45;transform:scale(.97)}
.qfoot{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:22px}
.bothbtn{min-width:240px}
.bothbtn.was{box-shadow:inset 0 0 0 2px var(--mint);color:var(--mint-t)}
.picked .bothbtn:not(.chosen){opacity:.45}
.bothbtn.chosen{background:var(--mint);color:#fff;box-shadow:none}
.qnav{display:flex;gap:18px;align-items:center;justify-content:center;font-size:14.5px;color:var(--mute)}
.qnav a{color:var(--ink2);font-weight:600;text-decoration:none}
.qnav a:hover{text-decoration:underline}
.keys{display:none}
@media (hover:hover) and (pointer:fine){.js .keys{display:inline}}
.keys kbd{font:700 12px/1 KS;padding:3px 6px;border-radius:6px;background:#fff;box-shadow:inset 0 0 0 1px var(--line2),0 1px 0 var(--line2)}
@media (max-width:760px){
 .duel{grid-template-columns:minmax(0,1fr);gap:0}
 .vs{width:38px;height:38px;margin:-5px auto;position:relative;z-index:2;font-size:12.5px;box-shadow:0 0 0 5px var(--paper)}
 .pick{padding:8px;border-radius:20px}
 .pick img{border-radius:13px}
 .pick .cap{padding:9px 6px 3px;gap:10px}
 .pick .ab{width:30px;height:30px;border-radius:10px;font-size:14px}
 .pick b{font-size:16px}
 .pick small{font-size:13px}
 .pick .tick{right:16px;top:16px;width:40px;height:40px}
 .quiz .qh{margin-bottom:14px}
 .quiz .qh .kicker{margin-bottom:4px;font-size:13.5px}
 .quiz .qh p{display:none}
 .qfoot{margin-top:14px;gap:8px}
 .bothbtn{width:100%;min-height:50px}
 .qtop{margin-left:2px;gap:10px}
 .focus main{padding-top:14px}
}

/* cross-document view transitions (Chrome, Edge, Safari 18.2+): the quiz card slides, the rest cross-fades */
@view-transition{navigation:auto}
::view-transition-old(quiz){animation:vt-out .28s var(--ease) both}
::view-transition-new(quiz){animation:vt-in .42s var(--ease) both}
::view-transition-group(qprog){animation-duration:.4s}

/* ---------- request summary, thumbnails, status ---------- */
.thanks{position:relative;overflow:hidden;text-align:center;padding:44px 24px 34px;border-radius:var(--r-lg);background:var(--navy);color:#fff;margin-bottom:20px}
.thanks h1{color:#fff;margin:14px 0 8px}
.thanks p{color:#C9D3F0;max-width:32em;margin:0 auto 18px;font-size:17px}
.thanks .seal{width:76px;height:76px;margin:0 auto;border-radius:50%;background:var(--mint);display:grid;place-items:center;animation:pop .7s var(--spring) .1s both;box-shadow:0 0 0 10px rgba(24,176,127,.18)}
.thanks .seal .ic{width:40px;height:40px;stroke:#fff;stroke-width:3}
.confetti{position:absolute;inset:0;pointer-events:none}
.confetti i{position:absolute;top:-20px;width:10px;height:16px;border-radius:3px;background:var(--sun);animation:fall 2.6s var(--ease) both}
.confetti i:nth-child(3n){background:var(--tom);width:8px;height:8px;border-radius:50%}
.confetti i:nth-child(3n+1){background:var(--sky)}
.confetti i:nth-child(4n){background:var(--mint)}
.confetti i:nth-child(1){left:6%;animation-delay:.05s}.confetti i:nth-child(2){left:14%;animation-delay:.3s}
.confetti i:nth-child(3){left:22%;animation-delay:.15s}.confetti i:nth-child(4){left:31%;animation-delay:.45s}
.confetti i:nth-child(5){left:40%;animation-delay:.1s}.confetti i:nth-child(6){left:49%;animation-delay:.35s}
.confetti i:nth-child(7){left:58%;animation-delay:.2s}.confetti i:nth-child(8){left:66%;animation-delay:.5s}
.confetti i:nth-child(9){left:74%;animation-delay:.08s}.confetti i:nth-child(10){left:82%;animation-delay:.4s}
.confetti i:nth-child(11){left:90%;animation-delay:.22s}.confetti i:nth-child(12){left:96%;animation-delay:.55s}
.picks{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}
.thumb{margin:0;background:#fff;border:1px solid var(--line);border-radius:16px;padding:6px;display:flex;flex-direction:column;gap:6px}
.thumb .im{display:grid;grid-template-columns:1fr;gap:3px;border-radius:11px;overflow:hidden;background:#F3EEE5}
.thumb .im.two{grid-template-columns:1fr 1fr}
.thumb img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
.thumb figcaption{padding:0 6px 4px;font-size:13px;line-height:1.35;color:var(--mute)}
.thumb figcaption b{display:block;font-size:14px;color:var(--navy)}
.picks.sm{grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.picks.sm .thumb{padding:4px;border-radius:12px}
.picks.sm .thumb .im{border-radius:8px}
.picks.sm figcaption{font-size:12px;padding:0 4px 2px}
.picks.sm figcaption b{font-size:12.5px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px 20px;margin:0}
.facts div{min-width:0}
.facts dt{font:600 13px/1.3 KS;color:var(--mute);margin-bottom:2px}
.facts dd{margin:0;font-weight:600;color:var(--ink);overflow-wrap:anywhere}
.facts .full{grid-column:1/-1}
.pre{white-space:pre-line}
.track{list-style:none;margin:0;padding:0;display:flex;gap:0;counter-reset:s}
.track li{flex:1;position:relative;text-align:center;font:600 13px/1.3 KS;color:var(--mute);padding-top:34px}
.track li::before{content:"";position:absolute;top:8px;left:50%;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 3px var(--line2);z-index:1}
.track li::after{content:"";position:absolute;top:16px;left:-50%;right:50%;height:4px;background:var(--line2)}
.track li:first-child::after{display:none}
.track li.done{color:var(--navy)}
.track li.done::before{background:var(--mint);box-shadow:none}
.track li.done::after{background:var(--mint)}
.track li.now::before{background:var(--navy);box-shadow:0 0 0 5px var(--lsky)}
.reqs{display:grid;gap:16px}
.req{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px 20px;align-items:start}
.req h3{margin:0 0 2px}
.req h3 a,.areq .hd h3 a{color:inherit;text-decoration:none}
.req h3 a:hover,.areq .hd h3 a:hover{color:var(--sky-t);text-decoration:underline}
.req .meta{font-size:14px;color:var(--mute)}
.req .chips{margin-top:12px}
.qmini{display:flex;align-items:center;gap:10px;margin-top:12px;font:600 14px/1.2 KS;color:var(--ink2)}
.qmini .qprog{max-width:220px}
.ab2{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:300px;max-width:440px}
.thumb.on{border-color:var(--mint);box-shadow:0 0 0 2px var(--mint)}
.thumb.off{opacity:.5}
.answers td{vertical-align:middle}
.brief{width:100%;min-height:340px;font:13.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--paper);white-space:pre-wrap}
.copied{background:var(--mint-t)!important;color:#fff!important;box-shadow:none!important}

/* ---------- payment ---------- */
.pay{display:grid;gap:22px;grid-template-columns:minmax(0,320px) 1fr;align-items:start}
.qr{width:100%;height:auto;display:block;border-radius:14px;background:#fff}
.qrbox{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:18px;text-align:center;box-shadow:var(--sh1)}
.qrbox .pp{display:inline-block;font:800 15px/1 KS;letter-spacing:.06em;color:#fff;background:#113566;border-radius:8px;padding:7px 12px;margin-bottom:12px}
.amount{font:800 40px/1.1 KSD,KS;letter-spacing:-.02em;color:var(--navy)}
.steps{margin:0;padding:0;list-style:none;counter-reset:st}
.steps li{position:relative;padding:0 0 12px 42px;counter-increment:st}
.steps li::before{content:counter(st);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--lsky);color:var(--sky-t);font:800 14px/28px KSD,KS;text-align:center}

/* ---------- tables & admin ---------- */
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
tbody tr{transition:background-color .15s}
tbody tr:hover{background:#FFFCF7}
th{font:700 12.5px/1.3 KS;color:var(--mute);white-space:nowrap;background:var(--paper);text-transform:uppercase;letter-spacing:.04em}
.table{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh1)}
.table table{min-width:680px}
td form{display:inline}
td .row{gap:6px}
.admin{display:grid;gap:28px;grid-template-columns:220px minmax(0,1fr)}
.admin>*{min-width:0}
.side{display:flex;flex-direction:column;gap:3px;position:sticky;top:92px;align-self:start}
.side .h{font:700 12px/1 KS;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);padding:4px 12px 10px}
.side a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;text-decoration:none;color:var(--ink2);font-weight:600;font-size:15px;transition:background-color .2s,color .2s}
.side a .ic{color:var(--mute)}
.side a:hover{background:#fff;color:var(--navy)}
.side a[aria-current=page]{background:var(--navy);color:#fff;box-shadow:var(--sh1)}
.side a[aria-current=page] .ic{color:var(--sun)}
.side .cnt{margin-left:auto;min-width:24px;height:22px;padding:0 7px;border-radius:999px;background:var(--tom);color:#fff;font:800 12.5px/22px KS;text-align:center}
.stats{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:26px}
.stat{display:flex;flex-direction:column;gap:2px;background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:18px;box-shadow:var(--sh1);text-decoration:none;color:var(--ink);animation:rise .6s var(--ease) both;transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
a.stat:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
.stat .ic-tile{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;margin-bottom:10px}
.stat b{display:block;font:800 32px/1.1 KSD,KS;letter-spacing:-.02em;color:var(--navy)}
.stat span{font-size:14px;color:var(--mute);font-weight:500}
.stat.hot{background:var(--tom);border-color:var(--tom)}
.stat.hot b{color:#fff}.stat.hot span{color:#FFE1DA}
.stat.hot .ic-tile{background:rgba(255,255,255,.2);color:#fff}
.tabsrow{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 20px}
.tabsrow a{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--line2);font:600 14.5px/1.2 KS;color:var(--ink2);text-decoration:none;transition:background-color .2s,color .2s,box-shadow .2s}
.tabsrow a:hover{box-shadow:inset 0 0 0 1.5px var(--navy);color:var(--navy)}
.tabsrow a[aria-current=page]{background:var(--navy);color:#fff;box-shadow:none}
.tabsrow a i{font-style:normal;font-size:12.5px;font-weight:800;padding:1px 7px;border-radius:999px;background:#F1ECE2;color:var(--ink2)}
.tabsrow a[aria-current=page] i{background:rgba(255,255,255,.18);color:#fff}
.areq{padding:0;overflow:hidden}
.areq .hd{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:18px 22px;border-bottom:1px solid var(--line);background:#FFFDF9}
.areq .hd h3{margin:0;font-size:19px}
.areq .hd .num{font:800 14px/1 KSD,KS;color:var(--mute)}
.areq .hd .badge{margin-left:auto}
.areq .bd{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px;padding:20px 22px}
.areq .bd>*{min-width:0}
.areq .sum{margin:14px 0 0;padding:12px 14px;border-radius:14px;background:var(--lsky);color:var(--navy);font-weight:600;font-size:15px;line-height:1.55}
.areq .sum.none{background:var(--lsun);color:var(--sun-t)}
.areq .act{display:flex;flex-direction:column;gap:12px}
.areq .act textarea{min-height:84px}
.areq .act .row{gap:8px}
.areq .act select{flex:1;width:auto;min-width:150px}
h4{margin:0 0 8px;font:700 13px/1.3 KS;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
details summary{cursor:pointer;font-weight:700;color:var(--navy)}
details[open] summary{margin-bottom:10px}

/* ---------- motion ---------- */
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes drop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleY(.55)}to{transform:scaleY(1)}}
@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes bob{from{transform:translateY(0)}to{transform:translateY(-10px)}}
@keyframes pop{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes fall{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(340px) rotate(540deg);opacity:0}}
@keyframes vt-out{to{opacity:0;transform:translateX(-60px) scale(.98)}}
@keyframes vt-in{from{opacity:0;transform:translateX(80px) scale(.98)}}

/* ---------- responsive ---------- */
@media (max-width:980px){
 .bento{grid-template-columns:repeat(2,minmax(0,1fr))}
 .onb{grid-template-columns:minmax(0,1fr)}
 .areq .bd{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:860px){
 .hero{grid-template-columns:minmax(0,1fr);gap:20px}
 .mock{max-width:520px;width:100%;margin:0 auto}
 .feats{grid-template-columns:minmax(0,1fr)}
 .pay{grid-template-columns:minmax(0,1fr)}
 .admin{grid-template-columns:minmax(0,1fr);gap:16px}
 .side{position:static;flex-direction:row;overflow-x:auto;padding-bottom:6px;margin:0 -24px;padding-left:24px;padding-right:24px;scrollbar-width:none}
 .side .h{display:none}
 .side a{white-space:nowrap;background:#fff;box-shadow:inset 0 0 0 1.5px var(--line)}
 .bhead{grid-template-columns:minmax(0,1fr)}
 .bhead .art{min-height:170px}
 .steps-h{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:560px){
 .wrap{padding:0 16px}
 .side{margin:0 -16px;padding-left:16px;padding-right:16px}
 main{padding-top:20px}
 .card{padding:20px;border-radius:24px}
 .bento{gap:12px}
 .tile{padding:18px;min-height:132px;border-radius:24px}
 .tile.span2{grid-column:1/-1}
 .tile b.num{font-size:30px}
 .sec-head{margin-top:32px}
 .req{grid-template-columns:minmax(0,1fr)}
 .areq .hd,.areq .bd{padding-left:16px;padding-right:16px}
 .form-head .ic-tile{width:48px;height:48px;border-radius:15px}
 .track li{font-size:11.5px}
 .picks{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .picks.sm{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){
 *,*::before,*::after{animation:none!important;transition:none!important}
 ::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}
}
`.trim();
