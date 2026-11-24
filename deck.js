(function(){
  var doc=document.documentElement,stage=document.getElementById('stage'),vp=document.getElementById('vp'),
      slides=[].slice.call(document.querySelectorAll('.slide')),N=slides.length,
      cnt=document.getElementById('cnt'),pos=document.getElementById('pos'),live=document.getElementById('live'),ctl=document.getElementById('ctl'),
      card=document.getElementById('card'),lcs=[].slice.call(card.querySelectorAll('.lc')),plates=[].slice.call(document.querySelectorAll('.plate')),
      veils=[].slice.call(document.querySelectorAll('.veil')),chap=document.getElementById('chap'),sub=document.getElementById('sub'),
      bMotion=document.getElementById('bMotion'),bFilm=document.getElementById('bFilm'),bSay=document.getElementById('bSay'),bMute=document.getElementById('bMute'),
      tl=document.getElementById('tl'),audio=new Audio(),i=0,st=0,hideT=0,film=false,filmT=0,beatT=[],muted=false,cues=[],lastChap=null;
  audio.preload='none';
  function A(s,k,d){var v=s.getAttribute('data-'+k);return v===null?d:v;}
  var STEPS=slides.map(function(s){return +A(s,'steps',0);});
  function fit(){var s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform='translate('+((innerWidth-1920*s)/2)+'px,'+((innerHeight-1080*s)/2)+'px) scale('+s+')';}
  function lazy(s){[].forEach.call(s.querySelectorAll('[data-src]'),function(m){m.src=m.getAttribute('data-src');m.removeAttribute('data-src');});}
  function setPlates(s){
    var want={};(A(s,'plates','')).split(' ').forEach(function(p){if(p){var q=p.split(':');want[q[0]]=q[1]||'on';}});
    plates.forEach(function(p){var m=want[p.id];p.classList.remove('on','half','lhalf');if(m){p.classList.add(m);p.classList.remove('out');lazy(p);
      var v=p.querySelector('video');if(v&&!doc.classList.contains('rm')){try{v.play();}catch(e){}}}else{var v2=p.querySelector('video');if(v2)v2.pause();}});
    var vs=(A(s,'veil','')).split(' ');veils.forEach(function(v){v.classList.toggle('on',vs.indexOf(v.id)>=0);});
  }
  function render(dir,changed){
    var s=slides[i];
    stage.setAttribute('data-s',s.id);stage.setAttribute('data-step',st);stage.setAttribute('data-dir',dir);
    for(var g=1;g<=4;g++)stage.classList.toggle('ge'+g,st>=g);
    stage.classList.toggle('dark',A(s,'dark','')==='1');
    stage.classList.toggle('robe-left',A(s,'robe','')==='left');
    var c=A(s,'card','');var cs=c.split('|'),cpos=cs[0],flipAt=+(cs[1]||99);
    card.setAttribute('data-c',cpos);card.classList.toggle('flipped',st>=flipAt);
    lcs.forEach(function(l){l.classList.toggle('show',l.getAttribute('data-k')===cpos);});
    setPlates(s);lazy(s);if(slides[i+1])lazy(slides[i+1]);
    slides.forEach(function(x,k){var on=k===i;x.classList.toggle('on',on);x.setAttribute('aria-hidden',on?'false':'true');if('inert' in x)x.inert=!on;});
    cnt.textContent=('0'+(i+1)).slice(-2);pos.textContent=(i+1)+' / '+N+(STEPS[i]?' · '+st+'/'+STEPS[i]:'');
    if(changed)live.textContent='Slide '+(i+1)+' of '+N+': '+A(s,'title','');
    try{history.replaceState(null,'','#'+(i+1));}catch(e){}
    if(changed&&!film)stopSay();
  }
  function next(){if(st<STEPS[i]){st++;render('fwd',false);}else if(i<N-1){i++;st=0;render('fwd',true);}}
  function prev(){if(st>0){st--;render('back',false);}else if(i>0){i--;st=STEPS[i];render('back',true);}}
  function jump(k,end){k=Math.max(0,Math.min(N-1,k));var d=k>=i?'fwd':'back',ch=k!==i;i=k;st=end?STEPS[i]:0;render(d,ch);}
  function setMotion(on){doc.classList.toggle('rm',!on);bMotion.textContent=on?'Motion on':'Motion off';bMotion.setAttribute('aria-pressed',on?'true':'false');}
  function full(){if(document.fullscreenElement)document.exitFullscreen();else if(doc.requestFullscreen)doc.requestFullscreen();}
  function wake(){ctl.classList.add('show');clearTimeout(hideT);hideT=setTimeout(function(){ctl.classList.remove('show');},2600);}

  /* ---------- narration: one short line per slide ---------- */
  function parseVTT(t){var out=[];t.split(/\n\n+/).forEach(function(b){var m=b.match(/(\d+):(\d+)\.(\d+)\s+-->\s+(\d+):(\d+)\.(\d+)\s*\n([\s\S]+)/);
    if(m)out.push({a:+m[1]*60+ +m[2]+m[3]/1000,b:+m[4]*60+ +m[5]+m[6]/1000,t:m[7].trim()});});return out;}
  function say(k,onend){
    var s=slides[k],src=A(s,'audio','');stopSay();if(!src){if(onend)onend();return false;}
    audio.src=src;audio.muted=muted;cues=[];
    fetch(src.replace(/\.mp3$/,'.vtt')).then(function(r){return r.ok?r.text():'';}).then(function(t){cues=parseVTT(t);}).catch(function(){});
    audio.onended=function(){sub.classList.remove('on');bSay.setAttribute('aria-pressed','false');if(onend)onend();};
    var p=audio.play();if(p&&p.catch)p.catch(function(){if(onend)setTimeout(onend,4000);});
    bSay.setAttribute('aria-pressed','true');return true;
  }
  function stopSay(){audio.onended=null;try{audio.pause();}catch(e){}sub.classList.remove('on');bSay.setAttribute('aria-pressed','false');}
  audio.addEventListener('timeupdate',function(){var t=audio.currentTime,c=null;for(var k=0;k<cues.length;k++)if(t>=cues[k].a&&t<cues[k].b)c=cues[k];
    if(c){if(sub.textContent!==c.t)sub.textContent=c.t;sub.classList.add('on');}else sub.classList.remove('on');});

  /* ---------- film: auto-advance with narration, beats spread across each stay ---------- */
  var DW=slides.map(function(s){return +A(s,'dwell',0)||(10+STEPS[slides.indexOf(s)]*4);}),TOT=DW.reduce(function(a,b){return a+b;},0);
  (function ticks(){var acc=0;slides.forEach(function(s,k){var ch=A(s,'chapter','');if(ch&&k>0){var t=document.createElement('i');t.style.left=(acc/TOT*100)+'%';t.title=ch;tl.appendChild(t);}acc+=DW[k];});})();
  function clearFilm(){clearTimeout(filmT);beatT.forEach(clearTimeout);beatT=[];}
  function filmSlide(){
    clearFilm();if(!film)return;
    var s=slides[i],ch=A(s,'chapter',''),d=DW[i]*1000,n=STEPS[i],t0=Date.now(),done=0;
    var acc=0;for(var k=0;k<i;k++)acc+=DW[k];tl.querySelector('b').style.width=(acc/TOT*100)+'%';
    var start=function(){
      for(var b=1;b<=n;b++)(function(b){beatT.push(setTimeout(function(){if(film&&st<b){st=b;render('fwd',false);}},d*b/(n+1)));})(b);
      say(i,function(){done=1;});
      filmT=setTimeout(function step(){if(!film)return;if(!done&&audio.src&&!audio.paused&&Date.now()-t0<d+15000){filmT=setTimeout(step,500);return;}
        if(i<N-1){i++;st=0;render('fwd',true);filmSlide();}else stopFilm();},d);
    };
    if(ch&&ch!==lastChap){lastChap=ch;chap.querySelector('b').textContent=ch;chap.querySelector('span').textContent=A(s,'chapno','');chap.classList.add('on');
      beatT.push(setTimeout(function(){chap.classList.remove('on');},2500));beatT.push(setTimeout(start,2600));}else start();
  }
  function startFilm(){if(doc.classList.contains('rm')){live.textContent='Film mode needs motion. Turn motion on, or step through with the arrow keys.';return;}
    film=true;document.body.classList.add('film');bFilm.textContent='Stop film';bFilm.setAttribute('aria-pressed','true');lastChap=null;if(i===N-1)jump(0);filmSlide();}
  function stopFilm(){film=false;clearFilm();stopSay();chap.classList.remove('on');document.body.classList.remove('film');bFilm.textContent='Play as film';bFilm.setAttribute('aria-pressed','false');}

  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;var k=e.key,t=e.target;
    if(t&&(t.tagName==='A'||t.tagName==='BUTTON'||t.tagName==='INPUT')&&(k==='Enter'||k===' '||(t.tagName==='INPUT'&&/Arrow/.test(k))))return;
    if(film&&/Arrow|PageDown|PageUp| /.test(k))stopFilm();
    if(k==='ArrowRight'||k==='PageDown'||k===' '||k==='ArrowDown'||k==='Enter'){e.preventDefault();next();}
    else if(k==='ArrowLeft'||k==='PageUp'||k==='ArrowUp'||k==='Backspace'){e.preventDefault();prev();}
    else if(k==='Home')jump(0);else if(k==='End')jump(N-1,true);
    else if(k==='f'||k==='F')full();else if(k==='m'||k==='M')setMotion(doc.classList.contains('rm'));
    else if(k==='p'||k==='P'){film?stopFilm():startFilm();}
    else if(k==='Escape'&&film)stopFilm();
  });
  vp.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('a,button,input,#ctl'))return;if(film)stopFilm();var r=vp.getBoundingClientRect();if((e.clientX-r.left)<r.width*.22)prev();else next();});
  var x0=null,y0=null;
  vp.addEventListener('touchstart',function(e){if(e.target.closest&&e.target.closest('input'))return;x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  vp.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)){if(film)stopFilm();if(dx<0)next();else prev();}});
  document.getElementById('bNext').addEventListener('click',function(){if(film)stopFilm();next();});
  document.getElementById('bPrev').addEventListener('click',function(){if(film)stopFilm();prev();});
  bMotion.addEventListener('click',function(){setMotion(doc.classList.contains('rm'));if(film&&doc.classList.contains('rm'))stopFilm();});
  document.getElementById('bFull').addEventListener('click',full);
  bFilm.addEventListener('click',function(){film?stopFilm():startFilm();});
  bSay.addEventListener('click',function(){if(!audio.paused&&!film){stopSay();}else if(!film){say(i);}});
  bMute.addEventListener('click',function(){muted=!muted;audio.muted=muted;bMute.textContent=muted?'Sound off':'Sound on';bMute.setAttribute('aria-pressed',muted?'true':'false');});
  document.addEventListener('mousemove',wake);ctl.addEventListener('focusin',wake);
  window.addEventListener('resize',fit);
  window.addEventListener('hashchange',function(){var k=parseInt(location.hash.slice(1),10);if(k&&k-1!==i)jump(k-1);});
  /* before/after slider */
  [].forEach.call(document.querySelectorAll('.ba input'),function(r){var f=function(){r.parentNode.style.setProperty('--p',r.value+'%');};r.addEventListener('input',f);f();});
  setMotion(!doc.classList.contains('rm'));fit();
  var k0=parseInt(location.hash.slice(1),10);if(k0&&k0>=1&&k0<=N)i=k0-1;
  stage.setAttribute('data-s',slides[i].id);
  var started=false;function start(){if(started)return;started=true;document.body.classList.add('ready');requestAnimationFrame(function(){requestAnimationFrame(function(){render('fwd',true);});});}
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(start);setTimeout(start,1500);}else start();
  window.__deck={next:next,prev:prev,jump:jump,state:function(){return {slide:i+1,step:st,id:slides[i].id};},N:N,steps:STEPS};
})();
