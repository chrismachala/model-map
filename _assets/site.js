/* Model Map — shared behaviour (all modules) */
(function(){
"use strict";
var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var root=document.documentElement;
var PAGE=document.body.getAttribute('data-page')||'page';

/* ---------- theme ---------- */
function applyTheme(t){root.setAttribute('data-theme',t);var b=document.getElementById('themeBtn');if(b)b.innerHTML=t==='dark'?'&#9728;&#65039;<span class="lbl"> Light</span>':'&#127769;<span class="lbl"> Dark</span>';}
var saved=store.get('mm-theme');
applyTheme(saved||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
document.addEventListener('DOMContentLoaded',init);

function init(){
  applyTheme(root.getAttribute('data-theme'));
  var tb=document.getElementById('themeBtn');
  if(tb)tb.onclick=function(){var t=root.getAttribute('data-theme')==='dark'?'light':'dark';store.set('mm-theme',t);applyTheme(t);redrawWidgets();};
  var mb=document.getElementById('menuBtn');
  if(mb)mb.onclick=function(){document.body.classList.toggle('navopen')};
  document.addEventListener('click',function(e){if(document.body.classList.contains('navopen')&&!e.target.closest('.sidebar')&&!e.target.closest('#menuBtn'))document.body.classList.remove('navopen')});

  boxHeads();wrapTables();prompts();examples();progress();toc();scrollBits();sidebarTicks();homeTiles();modCards();widgets();
}

/* ---------- callout headers ---------- */
function boxHeads(){
  var defs={why:['&#128161;','Why this exists'],words:['&#128172;','Words you’ll hear'],technique:['&#128295;','Technique'],example:['&#9999;&#65039;','Worked example'],warn:['&#9888;&#65039;','Watch out'],book:['&#128214;','What to read in the book'],prompt:['&#129302;','Practice prompt']};
  Object.keys(defs).forEach(function(cls){
    document.querySelectorAll('div.'+cls).forEach(function(d){
      var lab=d.querySelector('.label'),text=defs[cls][1];
      if(lab){text=lab.textContent;var p=lab.parentNode;lab.remove();if(p&&p.tagName==='P'&&!p.textContent.trim())p.remove();}
      if(cls==='example'){var s=d.querySelector('p > strong:first-child');if(s&&/^worked example/i.test(s.textContent)){var t=s.textContent.replace(/^worked example\s*/i,'').replace(/[.:]\s*$/,'').replace(/^\(|\)$/g,'');if(t)text='Worked example: '+t;var nx=s.nextSibling;s.remove();if(nx&&nx.nodeType===3)nx.textContent=nx.textContent.replace(/^\s+/,'');}}
      var h=document.createElement('div');h.className='boxhead';h.innerHTML='<span class="ico">'+defs[cls][0]+'</span>'+text;
      d.insertBefore(h,d.firstChild);
    });
  });
}
function wrapTables(){document.querySelectorAll('.content table').forEach(function(t){if(t.parentNode.classList.contains('tablewrap'))return;var w=document.createElement('div');w.className='tablewrap';t.parentNode.insertBefore(w,t);w.appendChild(t);});}

/* ---------- copy prompt ---------- */
function prompts(){
  document.querySelectorAll('div.prompt').forEach(function(d){var p=d.querySelector('pre');if(!p)return;
    var b=document.createElement('button');b.className='iconbtn copy';b.innerHTML='&#128203; Copy prompt';
    b.onclick=function(){var t=p.innerText;var done=function(){b.innerHTML='&#9989; Copied';setTimeout(function(){b.innerHTML='&#128203; Copy prompt'},1600)};
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,fallback)}else fallback();
      function fallback(){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){b.textContent='Select and press Ctrl+C'}ta.remove();}};
    d.appendChild(b);});
}

/* ---------- try-it-first examples ---------- */
function examples(){
  var on=store.get('mm-tryfirst')==='1';
  var btn=document.getElementById('tryBtn');
  var exs=document.querySelectorAll('div.example');
  exs.forEach(function(d){
    var body=document.createElement('div');body.className='exbody';
    while(d.childNodes.length>1)body.appendChild(d.childNodes[1]);
    d.appendChild(body);
    var r=document.createElement('div');r.className='reveal';r.innerHTML='<button>Show the worked answer</button><small>Have a go on paper first</small>';
    r.querySelector('button').onclick=function(){d.classList.remove('hidden-ans')};
    d.appendChild(r);
  });
  function set(v){on=v;store.set('mm-tryfirst',v?'1':'0');exs.forEach(function(d){d.classList.toggle('hidden-ans',v)});if(btn){btn.innerHTML=v?'&#128584;<span class="lbl"> Try-first: on</span>':'&#128064;<span class="lbl"> Try-first: off</span>';btn.classList.toggle('on',v);btn.title='When on, worked examples are hidden until you click to reveal them';}}
  if(btn){btn.onclick=function(){set(!on)};if(!exs.length)btn.style.display='none';}
  set(on);
}

/* ---------- "got it" progress ---------- */
function techHeads(){return Array.prototype.filter.call(document.querySelectorAll('.content h2'),function(h){return /^Technique\s+\d/i.test(h.textContent.trim())});}
function progress(){
  var hs=techHeads();
  hs.forEach(function(h){
    var key='mm:'+PAGE+':'+h.id;var b=document.createElement('button');b.className='gotit';
    function paint(){var on=store.get(key)==='1';b.classList.toggle('on',on);b.innerHTML=on?'&#10003; Got it':'Mark as understood';}
    b.onclick=function(){store.set(key,store.get(key)==='1'?'0':'1');paint();meter();sidebarTicks();tocTicks();};
    paint();h.appendChild(b);
  });
  meter();
}
function pageDone(page,total){var n=0;for(var i=0;i<localStorageKeys().length;i++){}return countDone(page)}
function localStorageKeys(){try{return Object.keys(localStorage)}catch(e){return[]}}
function countDone(page){return localStorageKeys().filter(function(k){return k.indexOf('mm:'+page+':')===0&&store.get(k)==='1'}).length}
function meter(){
  var m=document.querySelector('.hero .meter');if(!m)return;var total=techHeads().length;
  if(!total){m.style.display='none';return}
  var d=countDone(PAGE);m.querySelector('.fill').style.width=(100*d/total)+'%';m.querySelector('.txt').textContent=d+' of '+total+' techniques marked as understood';
}
function sidebarTicks(){
  document.querySelectorAll('.sidebar a[data-total]').forEach(function(a){var t=+a.getAttribute('data-total');var d=countDone(a.getAttribute('data-page'));var s=a.querySelector('.tick');if(!s)return;s.textContent=t&&d>=t?'✓':(d?d+'/'+t:'');});
}
function homeTiles(){
  document.querySelectorAll('.tile[data-total]').forEach(function(a){var t=+a.getAttribute('data-total');var i=a.querySelector('.bar i');if(i&&t)i.style.width=(100*countDone(a.getAttribute('data-page'))/t)+'%';});
  var fb=document.querySelectorAll('.filter button');
  fb.forEach(function(b){b.onclick=function(){fb.forEach(function(x){x.classList.toggle('on',x===b)});var f=b.getAttribute('data-f');document.querySelectorAll('.tile').forEach(function(t){t.style.display=(f==='all'||t.getAttribute('data-kind')===f||t.getAttribute('data-week')===f)?'':'none'})}});
}

function modCards(){
  document.querySelectorAll('.modcard[data-pages]').forEach(function(c){var tot=0,done=0;
    c.getAttribute('data-pages').split(',').forEach(function(x){var q=x.split(':');var t=+q[1];tot+=t;done+=Math.min(t,countDone(q[0]))});
    var i=c.querySelector('.bar i'),m=c.querySelector('.modprog');if(i&&tot)i.style.width=(100*done/tot)+'%';
    if(m)m.textContent=done?(done+' of '+tot+' techniques marked as understood'):(tot+' techniques to work through');});
}

/* ---------- on this page ---------- */
function toc(){
  var box=document.querySelector('.toc .list');if(!box)return;
  var hs=document.querySelectorAll('.content h2');
  if(hs.length<3){document.querySelector('.toc').style.visibility='hidden';return}
  hs.forEach(function(h){var a=document.createElement('a');a.href='#'+h.id;var t=h.cloneNode(true);var g=t.querySelector('.gotit');if(g)g.remove();var tx=t.textContent.replace(/\s+/g,' ').trim().replace(/^Technique\s+\d+:\s*/i,'').replace(/\s*\(.*\)\s*$/,'');a.textContent=tx.charAt(0).toUpperCase()+tx.slice(1);a.setAttribute('data-id',h.id);box.appendChild(a)});
  tocTicks();
  var links=box.querySelectorAll('a');
  function spy(){var cur=null;hs.forEach(function(h){if(h.getBoundingClientRect().top<120)cur=h.id});links.forEach(function(a){a.classList.toggle('on',a.getAttribute('data-id')===cur)})}
  window.addEventListener('scroll',spy,{passive:true});spy();
}
function tocTicks(){document.querySelectorAll('.toc a[data-id]').forEach(function(a){var on=store.get('mm:'+PAGE+':'+a.getAttribute('data-id'))==='1';var s=a.querySelector('.ok');if(on&&!s){s=document.createElement('span');s.className='ok';s.textContent='✓';a.appendChild(s)}if(!on&&s)s.remove();});}
function scrollBits(){
  var bar=document.querySelector('.progressbar'),top=document.getElementById('toTop');
  function f(){var h=document.documentElement;var p=h.scrollTop/((h.scrollHeight-h.clientHeight)||1);if(bar)bar.style.width=(p*100)+'%';if(top)top.classList.toggle('show',h.scrollTop>700)}
  window.addEventListener('scroll',f,{passive:true});f();
  if(top)top.onclick=function(){window.scrollTo({top:0,behavior:'smooth'})};
}

/* ================= interactive widgets ================= */
var W=[];
function redrawWidgets(){W.forEach(function(f){f()})}
function cssv(n){return getComputedStyle(root).getPropertyValue(n).trim()}
function el(tag,attrs,parent){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
function frame(svg,w,h,xr,yr,pad){
  pad=pad||{l:40,r:14,t:12,b:28};svg.setAttribute('viewBox','0 0 '+w+' '+h);while(svg.firstChild)svg.removeChild(svg.firstChild);
  var X=function(x){return pad.l+(x-xr[0])/(xr[1]-xr[0])*(w-pad.l-pad.r)},Y=function(y){return h-pad.b-(y-yr[0])/(yr[1]-yr[0])*(h-pad.t-pad.b)};
  return {X:X,Y:Y,w:w,h:h,pad:pad,
    axes:function(xt,yt,xl,yl){
      el('line',{x1:pad.l,x2:w-pad.r,y1:h-pad.b,y2:h-pad.b,'class':'ax'},svg);el('line',{x1:pad.l,x2:pad.l,y1:pad.t,y2:h-pad.b,'class':'ax'},svg);
      (xt||[]).forEach(function(v){el('line',{x1:X(v),x2:X(v),y1:h-pad.b,y2:h-pad.b+4,'class':'ax'},svg);var t=el('text',{x:X(v),y:h-pad.b+16,'text-anchor':'middle','class':'axt'},svg);t.textContent=v});
      (yt||[]).forEach(function(v){el('line',{x1:pad.l-4,x2:pad.l,y1:Y(v),y2:Y(v),'class':'ax'},svg);var t=el('text',{x:pad.l-7,y:Y(v)+4,'text-anchor':'end','class':'axt'},svg);t.textContent=v});
      if(xl){var a=el('text',{x:w-pad.r,y:h-pad.b-6,'text-anchor':'end','class':'axt'},svg);a.textContent=xl}
      if(yl){var b=el('text',{x:pad.l+6,y:pad.t+10,'class':'axt'},svg);b.textContent=yl}
    },
    path:function(f,x0,x1,style,n){n=n||200;var d='';for(var i=0;i<=n;i++){var x=x0+(x1-x0)*i/n,y=f(x);if(!isFinite(y))continue;y=Math.max(yr[0]-(yr[1]-yr[0]),Math.min(yr[1]+(yr[1]-yr[0]),y));d+=(d?'L':'M')+X(x).toFixed(1)+','+Y(y).toFixed(1)}return el('path',{d:d,fill:'none',style:style},svg)}
  };
}
function mk(host,title,sub,ico){host.innerHTML='<div class="whead"><span class="ico">'+(ico||'&#9881;')+'</span>'+title+'</div><p class="wsub">'+sub+'</p>';var s=el('svg',{});host.appendChild(s);var c=document.createElement('div');c.className='controls';host.appendChild(c);var r=document.createElement('div');r.className='readout';host.appendChild(r);return {svg:s,ctl:c,out:r}}
function slider(ctl,label,min,max,step,val,fmt){var l=document.createElement('label');l.innerHTML=label+' <input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"> <b></b>';ctl.appendChild(l);var i=l.querySelector('input'),b=l.querySelector('b');var o={get v(){return +i.value},set:function(v){i.value=v;b.textContent=(fmt||String)(+i.value)},on:function(f){i.addEventListener('input',function(){b.textContent=(fmt||String)(+i.value);f()})}};b.textContent=(fmt||String)(val);return o}
function button(ctl,label,f){var b=document.createElement('button');b.className='btn';b.innerHTML=label;b.onclick=f;ctl.appendChild(b);return b}
function stats(out,items){out.innerHTML=items.map(function(s){return '<span class="stat">'+s[0]+' <b>'+s[1]+'</b></span>'}).join('')}
function f2(v,d){return (+v).toFixed(d==null?2:d)}

var builders={
  /* Logistic: sigmoid explorer */
  sigmoid:function(host){
    var u=mk(host,'Play with the S-curve','Move the sliders to change the coefficients. Watch where the 50% line (the decision boundary) lands.','&#12316;');
    var b0=slider(u.ctl,'&beta;<sub>0</sub>',-5,5,0.1,-1,function(v){return f2(v,1)}),b1=slider(u.ctl,'&beta;<sub>1</sub>',-3,3,0.1,1,function(v){return f2(v,1)}),xs=slider(u.ctl,'input x',-8,8,0.1,2,function(v){return f2(v,1)});
    function draw(){var F=frame(u.svg,640,260,[-8,8],[0,1]);F.axes([-8,-4,0,4,8],[0,0.5,1],'x','p(x)');
      el('line',{x1:F.X(-8),x2:F.X(8),y1:F.Y(.5),y2:F.Y(.5),style:'stroke:var(--line);stroke-dasharray:4 4'},u.svg);
      var s=function(x){return 1/(1+Math.exp(-(b0.v+b1.v*x)))};F.path(s,-8,8,'stroke:var(--accent);stroke-width:3');
      var bd=b1.v!==0?-b0.v/b1.v:NaN;if(isFinite(bd)&&bd>-8&&bd<8)el('line',{x1:F.X(bd),x2:F.X(bd),y1:F.Y(0),y2:F.Y(1),style:'stroke:var(--cls);stroke-width:2;stroke-dasharray:6 4'},u.svg);
      var p=s(xs.v);el('circle',{cx:F.X(xs.v),cy:F.Y(p),r:7,style:'fill:var(--ex-b);stroke:var(--surface);stroke-width:2'},u.svg);
      var z=b0.v+b1.v*xs.v;stats(u.out,[['score z =',f2(z)],['p = &sigma;(z) =',f2(p,3)],['odds =',f2(p/(1-p))],['predict',p>=.5?'1 (yes)':'0 (no)'],['boundary x =',isFinite(bd)?f2(bd):'none']]);}
    [b0,b1,xs].forEach(function(s){s.on(draw)});draw();W.push(draw);
  },
  /* Linear regression: gradient descent stepper */
  gd:function(host){
    var u=mk(host,'Gradient descent, one step at a time','The worked example’s data, centred, so there’s one number β to find (the answer is 0.6). The curve is the RSS bowl. Press Step and watch the ball roll downhill. Try a learning rate above 0.1.','&#9196;');
    var eta=slider(u.ctl,'learning rate &eta;',0.005,0.12,0.005,0.01,function(v){return f2(v,3)});
    var beta=0,hist=[0],timer=null;
    function rss(b){return 6-12*b+10*b*b+0}
    function step(){var g=-2*(6-10*beta);beta=beta-eta.v*g;hist.push(beta);draw()}
    button(u.ctl,'Step',step);button(u.ctl,'Run 20',function(){var n=0;clearInterval(timer);timer=setInterval(function(){step();if(++n>=20||Math.abs(beta)>50)clearInterval(timer)},120)});
    button(u.ctl,'Reset',function(){clearInterval(timer);beta=0;hist=[0];draw()});
    eta.on(function(){});
    function draw(){var F=frame(u.svg,640,260,[-0.4,1.6],[0,10]);F.axes([-0.4,0,0.4,0.6,0.8,1.2,1.6],[0,5,10],'β','RSS');
      F.path(rss,-0.4,1.6,'stroke:var(--accent);stroke-width:3');
      el('line',{x1:F.X(.6),x2:F.X(.6),y1:F.Y(0),y2:F.Y(10),style:'stroke:var(--done);stroke-dasharray:4 4'},u.svg);
      var d='';hist.forEach(function(b,i){var bb=Math.max(-0.4,Math.min(1.6,b));d+=(i?'L':'M')+F.X(bb)+','+F.Y(Math.min(10,rss(bb)))});el('path',{d:d,fill:'none',style:'stroke:var(--ex-b);stroke-width:1.5;opacity:.7'},u.svg);
      var bb=Math.max(-0.4,Math.min(1.6,beta));el('circle',{cx:F.X(bb),cy:F.Y(Math.min(10,rss(bb))),r:8,style:'fill:var(--cls);stroke:var(--surface);stroke-width:2'},u.svg);
      var g=-2*(6-10*beta);stats(u.out,[['steps',hist.length-1],['β =',Math.abs(beta)>1e4?'blew up!':f2(beta,4)],['slope of RSS =',Math.abs(g)>1e5?'huge':f2(g,3)],['RSS =',Math.abs(beta)>1e4?'∞':f2(rss(beta),3)],['status',Math.abs(beta-.6)<1e-3?'✅ at the bottom':(eta.v>0.1?'⚠ step too big: overshooting':'rolling…')]]);}
    draw();W.push(draw);
  },
  /* KNN 1D */
  knn:function(host){
    var pts=[[1,'A'],[2,'A'],[3,'B'],[4,'B'],[5,'B'],[6,'A'],[7.2,'A'],[8,'B'],[0.4,'B'],[6.6,'A']];
    var u=mk(host,'KNN neighbourhood vote','Drag the new point and change K. The highlighted points are its neighbours; the vote decides the prediction.','&#127919;');
    var x0=slider(u.ctl,'new point x₀',0,9,0.1,3.4,function(v){return f2(v,1)}),K=slider(u.ctl,'K',1,9,1,3);
    function draw(){var F=frame(u.svg,640,170,[0,9],[0,1],{l:20,r:20,t:20,b:28});F.axes([0,1,2,3,4,5,6,7,8,9],[]);
      var d=pts.map(function(p){return {x:p[0],c:p[1],d:Math.abs(p[0]-x0.v)}}).sort(function(a,b){return a.d-b.d});var nb=d.slice(0,K.v);
      var far=nb[nb.length-1].d;el('rect',{x:F.X(Math.max(0,x0.v-far)),y:F.Y(.85),width:Math.max(2,F.X(Math.min(9,x0.v+far))-F.X(Math.max(0,x0.v-far))),height:F.Y(.15)-F.Y(.85),rx:10,style:'fill:var(--accent-soft);stroke:var(--accent);stroke-dasharray:4 3'},u.svg);
      pts.forEach(function(p){var isN=nb.some(function(n){return n.x===p[0]});var col=p[1]==='A'?'var(--reg)':'var(--cls)';el('circle',{cx:F.X(p[0]),cy:F.Y(.5),r:isN?11:8,style:'fill:'+col+';opacity:'+(isN?1:.35)+';stroke:var(--surface);stroke-width:2'},u.svg);var t=el('text',{x:F.X(p[0]),y:F.Y(.5)+4,'text-anchor':'middle',style:'fill:#fff;font-size:11px;font-weight:700'},u.svg);t.textContent=p[1]});
      el('line',{x1:F.X(x0.v),x2:F.X(x0.v),y1:F.Y(.95),y2:F.Y(.05),style:'stroke:var(--ink);stroke-width:2'},u.svg);var q=el('text',{x:F.X(x0.v),y:F.Y(.97),'text-anchor':'middle','class':'axt'},u.svg);q.textContent='?';
      var a=nb.filter(function(n){return n.c==='A'}).length,b=K.v-a;var pred=a>b?'A':b>a?'B':'tie!';
      stats(u.out,[['neighbours',nb.map(function(n){return n.c}).join(', ')],['P(A) ≈',a+'/'+K.v+' = '+f2(a/K.v)],['P(B) ≈',b+'/'+K.v+' = '+f2(b/K.v)],['prediction',pred]]);}
    x0.on(draw);K.on(draw);draw();W.push(draw);
  },
  /* Ridge shrinkage */
  ridge:function(host){
    var xc=[-2,-1,0,1,2],yc=[-2,0,1,0,1];
    var u=mk(host,'Turn the ridge dial','The worked example’s centred data. As λ grows, the line flattens towards zero slope. The faint line is plain least squares.','&#127899;');
    var L=slider(u.ctl,'λ',-2,2.5,0.05,0,function(v){return f2(Math.pow(10,v),v<0?2:1)});
    function draw(){var lam=Math.pow(10,L.v),b=6/(10+lam);var F=frame(u.svg,640,240,[-2.6,2.6],[-2.6,2.6]);F.axes([-2,-1,0,1,2],[-2,0,2],'x (centred)','y');
      F.path(function(x){return .6*x},-2.6,2.6,'stroke:var(--muted);stroke-width:1.5;stroke-dasharray:5 4');F.path(function(x){return b*x},-2.6,2.6,'stroke:var(--accent);stroke-width:3');
      xc.forEach(function(x,i){el('circle',{cx:F.X(x),cy:F.Y(yc[i]),r:6,style:'fill:var(--ex-b)'},u.svg)});
      var rss=0;xc.forEach(function(x,i){rss+=Math.pow(yc[i]-b*x,2)});
      stats(u.out,[['λ =',f2(lam,lam<1?2:1)],['β = 6/(10+λ) =',f2(b,3)],['training RSS',f2(rss,2)],['penalty λβ²',f2(lam*b*b,2)]]);}
    L.on(draw);draw();W.push(draw);
  },
  /* Polynomial degree / overfitting */
  poly:function(host){
    var xs=[],ys=[];var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
    for(var i=0;i<12;i++){var x=-1+2*i/11;xs.push(x);ys.push(Math.sin(3*x)+0.3*(rnd()-0.5)*2)}
    var tx=[],ty=[];for(i=0;i<40;i++){var x2=-1+2*rnd();tx.push(x2);ty.push(Math.sin(3*x2)+0.3*(rnd()-0.5)*2)}
    var u=mk(host,'How bendy should the curve be?','12 training points (orange) from a gentle curve plus luck. Raise the degree and watch the training error fall while the error on 40 new points (grey) eventually rises.','&#12316;');
    var D=slider(u.ctl,'degree',0,11,1,1);
    function fit(d){var n=d+1,A=[],b=[];for(var r=0;r<n;r++){A.push([]);for(var c=0;c<n;c++){var s=0;for(var k=0;k<xs.length;k++)s+=Math.pow(xs[k],r+c);A[r].push(s)}var t=0;for(k=0;k<xs.length;k++)t+=ys[k]*Math.pow(xs[k],r);b.push(t)}
      for(r=0;r<n;r++)A[r][r]+=1e-9;
      for(c=0;c<n;c++){var p=c;for(r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;var tA=A[c];A[c]=A[p];A[p]=tA;var tb=b[c];b[c]=b[p];b[p]=tb;for(r=c+1;r<n;r++){var m=A[r][c]/A[c][c];for(var j=c;j<n;j++)A[r][j]-=m*A[c][j];b[r]-=m*b[c]}}
      var be=new Array(n);for(r=n-1;r>=0;r--){var s2=b[r];for(j=r+1;j<n;j++)s2-=A[r][j]*be[j];be[r]=s2/A[r][r]}return function(x){var v=0;for(var q=0;q<n;q++)v+=be[q]*Math.pow(x,q);return v}}
    function mse(f,X,Y){var s=0;for(var i=0;i<X.length;i++)s+=Math.pow(Y[i]-f(X[i]),2);return s/X.length}
    function draw(){var f=fit(D.v);var F=frame(u.svg,640,250,[-1.1,1.1],[-2,2]);F.axes([-1,0,1],[-2,-1,0,1,2],'x','y');
      tx.forEach(function(x,i){el('circle',{cx:F.X(x),cy:F.Y(ty[i]),r:3.5,style:'fill:var(--muted);opacity:.45'},u.svg)});
      F.path(f,-1.05,1.05,'stroke:var(--accent);stroke-width:3',300);
      xs.forEach(function(x,i){el('circle',{cx:F.X(x),cy:F.Y(ys[i]),r:6,style:'fill:var(--ex-b);stroke:var(--surface);stroke-width:1.5'},u.svg)});
      var tr=mse(f,xs,ys),te=mse(f,tx,ty);var verdict=D.v<=2?'too stiff (high bias)':D.v<=5?'about right':D.v<=7?'starting to chase the luck':'overfitting (high variance)';
      stats(u.out,[['training MSE',f2(tr,3)],['new-data MSE',te>99?'huge':f2(te,3)],['verdict',verdict]]);}
    D.on(draw);draw();W.push(draw);
  },
  /* LDA: two bell curves */
  lda:function(host){
    var u=mk(host,'Two bell curves and a boundary','Each curve is πₖ × fₖ(x): how common the class is, times how typical x is in it. The boundary sits where they cross. Make one class rarer and watch the boundary move.','&#128276;');
    var m0=slider(u.ctl,'μ₀',0,10,0.1,2,function(v){return f2(v,1)}),m1=slider(u.ctl,'μ₁',0,10,0.1,6.5,function(v){return f2(v,1)}),sd=slider(u.ctl,'spread σ',0.4,3,0.05,1.18,function(v){return f2(v,2)}),p1=slider(u.ctl,'π₁',0.05,0.95,0.01,0.57,function(v){return f2(v,2)});
    function draw(){var s2=sd.v*sd.v,pi1=p1.v,pi0=1-pi1;var g=function(x,m){return Math.exp(-(x-m)*(x-m)/(2*s2))/Math.sqrt(2*Math.PI*s2)};
      var top=Math.max(pi0,pi1)/Math.sqrt(2*Math.PI*s2)*1.15;var F=frame(u.svg,640,240,[-1,11],[0,top]);F.axes([0,2,4,6,8,10],[],'x');
      F.path(function(x){return pi0*g(x,m0.v)},-1,11,'stroke:var(--reg);stroke-width:3;fill:none');F.path(function(x){return pi1*g(x,m1.v)},-1,11,'stroke:var(--cls);stroke-width:3;fill:none');
      var bd=NaN;if(Math.abs(m1.v-m0.v)>1e-6)bd=(m0.v+m1.v)/2+s2/(m1.v-m0.v)*Math.log(pi0/pi1);
      if(isFinite(bd)&&bd>-1&&bd<11)el('line',{x1:F.X(bd),x2:F.X(bd),y1:F.Y(0),y2:F.Y(top),style:'stroke:var(--ink);stroke-width:2;stroke-dasharray:6 4'},u.svg);
      var t0=el('text',{x:F.X(m0.v),y:F.Y(pi0*g(m0.v,m0.v))-8,'text-anchor':'middle',style:'fill:var(--reg);font-size:12px;font-weight:700'},u.svg);t0.textContent='class 0';
      var t1=el('text',{x:F.X(m1.v),y:F.Y(pi1*g(m1.v,m1.v))-8,'text-anchor':'middle',style:'fill:var(--cls);font-size:12px;font-weight:700'},u.svg);t1.textContent='class 1';
      stats(u.out,[['boundary x* =',isFinite(bd)?f2(bd):'none'],['midpoint',f2((m0.v+m1.v)/2)],['shift from priors',isFinite(bd)?f2(bd-(m0.v+m1.v)/2):'–']]);}
    [m0,m1,sd,p1].forEach(function(s){s.on(draw)});draw();W.push(draw);
  },
  /* Threshold / ROC */
  roc:function(host){
    var P=[.9,.8,.7,.6,.55,.4,.3,.2],Yv=[1,1,0,1,0,1,0,0];
    var u=mk(host,'Slide the threshold','The worked example’s eight test points. Predict “yes” when the score is at least ξ. Watch the confusion counts and the point on the ROC curve.','&#127914;');
    var T=slider(u.ctl,'threshold ξ',0,1,0.01,0.5,function(v){return f2(v)});
    function rates(t){var tp=0,fp=0,tn=0,fn=0;P.forEach(function(p,i){var yh=p>=t?1:0;if(yh&&Yv[i])tp++;else if(yh)fp++;else if(Yv[i])fn++;else tn++});return {tp:tp,fp:fp,tn:tn,fn:fn,tpr:tp/4,fpr:fp/4}}
    function draw(){var F=frame(u.svg,640,260,[0,1],[0,1],{l:40,r:330,t:12,b:30});F.axes([0,0.5,1],[0,0.5,1],'FPR','TPR');
      el('line',{x1:F.X(0),y1:F.Y(0),x2:F.X(1),y2:F.Y(1),style:'stroke:var(--line);stroke-dasharray:4 4'},u.svg);
      var ts=[1.01].concat(P,[0]);var d='';ts.forEach(function(t,i){var r=rates(t);d+=(i?'L':'M')+F.X(r.fpr)+','+F.Y(r.tpr)});el('path',{d:d,fill:'none',style:'stroke:var(--accent);stroke-width:3'},u.svg);
      var r=rates(T.v);el('circle',{cx:F.X(r.fpr),cy:F.Y(r.tpr),r:8,style:'fill:var(--cls);stroke:var(--surface);stroke-width:2'},u.svg);
      /* score strip */
      var x0=340,w=280;var t=el('text',{x:x0,y:24,'class':'axt'},u.svg);t.textContent='scores (filled = really yes)';
      P.forEach(function(p,i){var cx=x0+w-p*w;var yes=p>=T.v;el('circle',{cx:cx,cy:60+(i%2)*26,r:10,style:'fill:'+(Yv[i]?'var(--cls)':'var(--surface)')+';stroke:var(--cls);stroke-width:2;opacity:'+(yes?1:.35)},u.svg);var tt=el('text',{x:cx,y:60+(i%2)*26+28,'text-anchor':'middle','class':'axt'},u.svg);tt.textContent=p;});
      var lx=x0+w-T.v*w;el('line',{x1:lx,x2:lx,y1:38,y2:126,style:'stroke:var(--ink);stroke-width:2'},u.svg);var lt=el('text',{x:lx,y:140,'text-anchor':'middle','class':'axt'},u.svg);lt.textContent='ξ';
      var cm=[['','pred no','pred yes'],['really no',r.tn,r.fp],['really yes',r.fn,r.tp]];cm.forEach(function(row,i){row.forEach(function(v,j){var tx=el('text',{x:x0+20+j*85,y:175+i*24,'class':'axt',style:'font-size:12px'+((i&&j)?';font-weight:700;fill:var(--ink)':'')},u.svg);tx.textContent=v})});
      stats(u.out,[['TPR (caught)',f2(r.tpr)],['FPR (false alarms)',f2(r.fpr)],['accuracy',f2((r.tp+r.tn)/8)],['AUC','0.8125']]);}
    T.on(draw);draw();W.push(draw);
  },
  /* Bayes theorem counting */
  bayes:function(host){
    var u=mk(host,'Bayes’ theorem by counting','1000 customers. Change how common defaulting is and how typical a high balance is in each group. Each square is 10 customers.','&#129518;');
    var pr=slider(u.ctl,'% who default',1,50,1,3),a=slider(u.ctl,'% of defaulters with high balance',5,100,1,80),b=slider(u.ctl,'% of others with high balance',1,60,1,10);
    function draw(){var n1=Math.round(1000*pr.v/100),n0=1000-n1,h1=n1*a.v/100,h0=n0*b.v/100;var svg=u.svg;svg.setAttribute('viewBox','0 0 640 150');while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var i=0;i<100;i++){var isD=i<Math.round(n1/10);var hi=isD?(i<Math.round(h1/10)):(i-Math.round(n1/10)<Math.round(h0/10));var x=14+(i%25)*24.5,y=12+Math.floor(i/25)*30;el('rect',{x:x,y:y,width:20,height:24,rx:4,style:'fill:'+(isD?'var(--cls)':'var(--reg)')+';opacity:'+(hi?1:.22)},svg)}
      stats(u.out,[['high-balance defaulters',f2(h1,0)],['high-balance others',f2(h0,0)],['P(default | high) =',f2(h1,0)+' / '+f2(h1+h0,0)+' = '+f2(h1/(h1+h0),3)]]);}
    [pr,a,b].forEach(function(s){s.on(draw)});draw();W.push(draw);
  },
  /* Derivative as a nudge */
  slope:function(host){
    var u=mk(host,'The slope as a tiny nudge','f(z) = z². The dashed line joins z and z + h. Shrink h and it turns into the tangent, whose slope is exactly 2z.','&#128208;');
    var Z=slider(u.ctl,'point z',-2,2,0.1,1,function(v){return f2(v,1)}),H=slider(u.ctl,'nudge h',0.01,1.5,0.01,1,function(v){return f2(v,2)});
    function draw(){var z=Z.v,h=H.v,f=function(x){return x*x};var F=frame(u.svg,640,250,[-2.6,2.6],[-0.5,6]);F.axes([-2,-1,0,1,2],[0,2,4,6],'z','f(z)');
      F.path(f,-2.6,2.6,'stroke:var(--accent);stroke-width:3');var m=(f(z+h)-f(z))/h;
      F.path(function(x){return f(z)+m*(x-z)},-2.6,2.6,'stroke:var(--ex-b);stroke-width:2;stroke-dasharray:6 4');
      F.path(function(x){return f(z)+2*z*(x-z)},-2.6,2.6,'stroke:var(--done);stroke-width:1.5;opacity:.6');
      el('circle',{cx:F.X(z),cy:F.Y(f(z)),r:6,style:'fill:var(--cls)'},u.svg);el('circle',{cx:F.X(z+h),cy:F.Y(f(z+h)),r:5,style:'fill:var(--ex-b)'},u.svg);
      stats(u.out,[['nudge slope (f(z+h) − f(z))/h =',f2(m,3)],['exact slope 2z =',f2(2*z,3)],['gap',f2(m-2*z,3)+' (equals h)']]);}
    Z.on(draw);H.on(draw);draw();W.push(draw);
  },
  /* Softmax */
  softmax:function(host){
    var u=mk(host,'Softmax: scores into chances','Three classes, three scores. The bars are the chances; they always add up to 1.','&#128202;');
    var z=[slider(u.ctl,'z₁',-4,4,0.1,2,function(v){return f2(v,1)}),slider(u.ctl,'z₂',-4,4,0.1,1,function(v){return f2(v,1)}),slider(u.ctl,'z₃',-4,4,0.1,0,function(v){return f2(v,1)})];
    function draw(){var e=z.map(function(s){return Math.exp(s.v)}),S=e[0]+e[1]+e[2],p=e.map(function(v){return v/S});var svg=u.svg;svg.setAttribute('viewBox','0 0 640 150');while(svg.firstChild)svg.removeChild(svg.firstChild);
      var cols=['var(--accent)','var(--cls)','var(--reg)'];p.forEach(function(v,i){el('rect',{x:120,y:16+i*42,width:Math.max(1,480*v),height:30,rx:6,style:'fill:'+cols[i]},svg);var t=el('text',{x:20,y:36+i*42,'class':'axt',style:'font-size:13px'},svg);t.textContent='class '+(i+1);var t2=el('text',{x:128+480*v,y:36+i*42,'class':'axt',style:'font-size:13px;font-weight:700;fill:var(--ink)'},svg);t2.textContent=f2(v,3)});
      var best=p.indexOf(Math.max.apply(null,p));stats(u.out,[['e^z =',e.map(function(v){return f2(v)}).join(', ')],['total',f2(S)],['predict','class '+(best+1)]]);}
    z.forEach(function(s){s.on(draw)});draw();W.push(draw);
  },
  /* ================= CS5100 week 4 ================= */
  /* Regression tree: one split */
  treesplit:function(host){
    var X=[1,2,3,5,7,8],Y=[2,3,5,8,9,12];
    var u=mk(host,'Try a cutpoint','The guide’s six players. Move the cut s: points left of it are predicted by their average, points right of it by theirs. The red lines are the misses whose squares make the RSS.','&#127795;');
    var S=slider(u.ctl,'cut s',0.5,8.5,0.1,6,function(v){return f2(v,1)});
    function parts(s){var L=[],R=[];X.forEach(function(x,i){(x<s?L:R).push(Y[i])});function m(a){return a.length?a.reduce(function(p,c){return p+c},0)/a.length:NaN}function r(a,mm){return a.reduce(function(p,c){return p+(c-mm)*(c-mm)},0)}var ml=m(L),mr=m(R);return {L:L,R:R,ml:ml,mr:mr,rl:L.length?r(L,ml):0,rr:R.length?r(R,mr):0}}
    button(u.ctl,'Jump to best',function(){var best=null,bv=1e9;[1.5,2.5,4,6,7.5].forEach(function(s){var q=parts(s);if(q.rl+q.rr<bv){bv=q.rl+q.rr;best=s}});S.set(best);draw()});
    function draw(){var s=S.v,q=parts(s);var F=frame(u.svg,640,250,[0,9],[0,14]);F.axes([0,1,2,3,4,5,6,7,8,9],[0,4,8,12],'years x','salary y');
      el('line',{x1:F.X(s),x2:F.X(s),y1:F.Y(0),y2:F.Y(14),style:'stroke:var(--ink);stroke-width:2;stroke-dasharray:6 4'},u.svg);
      if(q.L.length)el('line',{x1:F.X(0),x2:F.X(s),y1:F.Y(q.ml),y2:F.Y(q.ml),style:'stroke:var(--reg);stroke-width:3'},u.svg);
      if(q.R.length)el('line',{x1:F.X(s),x2:F.X(9),y1:F.Y(q.mr),y2:F.Y(q.mr),style:'stroke:var(--cls);stroke-width:3'},u.svg);
      X.forEach(function(x,i){var m=x<s?q.ml:q.mr;el('line',{x1:F.X(x),x2:F.X(x),y1:F.Y(Y[i]),y2:F.Y(m),style:'stroke:#d33;stroke-width:1.5;opacity:.7'},u.svg);el('circle',{cx:F.X(x),cy:F.Y(Y[i]),r:6,style:'fill:'+(x<s?'var(--reg)':'var(--cls)')+';stroke:var(--surface);stroke-width:2'},u.svg)});
      stats(u.out,[['left mean',q.L.length?f2(q.ml):'–'],['left RSS',f2(q.rl)],['right mean',q.R.length?f2(q.mr):'–'],['right RSS',f2(q.rr)],['total RSS',f2(q.rl+q.rr)+(Math.abs(q.rl+q.rr-13.333)<0.01?' ✅ best':'')]]);}
    S.on(draw);draw();W.push(draw);
  },
  /* Classification tree: impurity curves */
  impurity:function(host){
    var u=mk(host,'Three ways to measure a mixed leaf','Slide the fraction of class 1 in a two-class leaf. All three scores are 0 when the leaf is pure; Gini and entropy are curved, the error rate is a tent.','&#9878;');
    var P=slider(u.ctl,'fraction of class 1, p',0,1,0.01,0.3,function(v){return f2(v)});
    function err(p){return 1-Math.max(p,1-p)}function gin(p){return 2*p*(1-p)}function ent(p){return (p<=0||p>=1)?0:-(p*Math.log(p)+(1-p)*Math.log(1-p))}
    function draw(){var F=frame(u.svg,640,250,[0,1],[0,0.75]);F.axes([0,0.25,0.5,0.75,1],[0,0.25,0.5,0.75],'p','impurity');
      F.path(err,0,1,'stroke:var(--muted);stroke-width:2.5');F.path(gin,0,1,'stroke:var(--accent);stroke-width:3');F.path(ent,0,1,'stroke:var(--cls);stroke-width:3');
      [[err,'var(--muted)'],[gin,'var(--accent)'],[ent,'var(--cls)']].forEach(function(a){el('circle',{cx:F.X(P.v),cy:F.Y(a[0](P.v)),r:6,style:'fill:'+a[1]+';stroke:var(--surface);stroke-width:2'},u.svg)});
      el('line',{x1:F.X(P.v),x2:F.X(P.v),y1:F.Y(0),y2:F.Y(0.75),style:'stroke:var(--line);stroke-dasharray:4 4'},u.svg);
      [['error rate','var(--muted)',0.62],['Gini','var(--accent)',0.55],['entropy','var(--cls)',0.70]].forEach(function(a){var t=el('text',{x:F.X(0.83),y:F.Y(a[2]),style:'fill:'+a[1]+';font-size:12px;font-weight:700'},u.svg);t.textContent=a[0]});
      stats(u.out,[['error',f2(err(P.v),3)],['Gini',f2(gin(P.v),3)],['entropy',f2(ent(P.v),3)],['leaf predicts',P.v>0.5?'class 1':P.v<0.5?'class 0':'tie']]);}
    P.on(draw);draw();W.push(draw);
  },
  /* Pruning: C_alpha bars */
  prune:function(host){
    var L=[1,2,3,4,6],R=[73.5,13.33,5.17,1.0,0];
    var u=mk(host,'Charge a fee per leaf','Each bar is a subtree of the worked example: the darker part is its training RSS, the lighter part is the fee α × leaves. The lowest bar wins. Raise α and watch the winner shrink.','&#9986;');
    var A=slider(u.ctl,'fee per leaf α',0,70,0.25,5,function(v){return f2(v,2)});
    function draw(){var a=A.v,C=L.map(function(l,i){return R[i]+a*l}),best=C.indexOf(Math.min.apply(null,C));var top=Math.max.apply(null,C)*1.1;
      var F=frame(u.svg,640,250,[0,5],[0,top],{l:46,r:14,t:12,b:30});F.axes([],[0,Math.round(top/2),Math.round(top)],'','C_α');
      L.forEach(function(l,i){var x0=F.X(i+0.18),w=F.X(i+0.82)-x0;var on=i===best;
        el('rect',{x:x0,y:F.Y(R[i]),width:w,height:F.Y(0)-F.Y(R[i]),style:'fill:'+(on?'var(--done)':'var(--accent)')+';opacity:'+(on?1:.55)},u.svg);
        el('rect',{x:x0,y:F.Y(C[i]),width:w,height:F.Y(R[i])-F.Y(C[i]),style:'fill:'+(on?'var(--done)':'var(--accent)')+';opacity:'+(on?.45:.22)},u.svg);
        var t=el('text',{x:x0+w/2,y:F.Y(0)+16,'text-anchor':'middle','class':'axt'},u.svg);t.textContent=l+(l===1?' leaf':' leaves');
        var t2=el('text',{x:x0+w/2,y:F.Y(C[i])-5,'text-anchor':'middle','class':'axt',style:'font-weight:700'},u.svg);t2.textContent=f2(C[i],1)});
      stats(u.out,[['chosen subtree',L[best]+(L[best]===1?' leaf':' leaves')],['its RSS',f2(R[best])],['sklearn ccp_alpha (n = 6)',f2(a/6,3)]]);}
    A.on(draw);draw();W.push(draw);
  },
  /* Neural net: sum of ReLU hinges */
  relunet:function(host){
    var xs=[],ys=[];for(var i=0;i<15;i++){var x=-3+6*i/14;xs.push(x);ys.push(Math.sin(1.2*x)+0.3*x)}
    var u=mk(host,'Build a curve from ReLU hinges','f(x) = β₀ + β₁·ReLU(x − c₁) + β₂·ReLU(x − c₂) + β₃·ReLU(x − c₃). Each unit adds a corner at cₖ and changes the slope by βₖ after it. Try to fit the dots.','&#129504;');
    var b0=slider(u.ctl,'β₀',-3,3,0.05,-0.6,function(v){return f2(v)});
    var c=[],b=[],c0=[-3,-1,1];
    for(var k0=0;k0<3;k0++){c.push(slider(u.ctl,'c'+'₁₂₃'[k0],-3,3,0.05,c0[k0],function(v){return f2(v)}));b.push(slider(u.ctl,'β'+'₁₂₃'[k0],-3,3,0.05,0,function(v){return f2(v)}))}
    function f(x){var v=b0.v;for(var k=0;k<3;k++)v+=b[k].v*Math.max(0,x-c[k].v);return v}
    function draw(){var F=frame(u.svg,640,250,[-3.2,3.2],[-2.5,2.5]);F.axes([-3,-2,-1,0,1,2,3],[-2,-1,0,1,2],'x','f(x)');
      for(var k=0;k<3;k++){(function(k){F.path(function(x){return b[k].v*Math.max(0,x-c[k].v)},-3.2,3.2,'stroke:var(--muted);stroke-width:1;stroke-dasharray:4 3;opacity:.7')})(k);el('line',{x1:F.X(c[k].v),x2:F.X(c[k].v),y1:F.Y(-2.5),y2:F.Y(-2.3),style:'stroke:var(--ink);stroke-width:2'},u.svg)}
      xs.forEach(function(x,i){el('circle',{cx:F.X(x),cy:F.Y(ys[i]),r:5,style:'fill:var(--ex-b)'},u.svg)});
      F.path(f,-3.2,3.2,'stroke:var(--accent);stroke-width:3',400);
      var m=0;xs.forEach(function(x,i){m+=Math.pow(ys[i]-f(x),2)});m/=xs.length;
      stats(u.out,[['training MSE',f2(m,3)],['verdict',m<0.03?'✅ great fit with 3 units':m<0.15?'close':'keep going (stuck? with the corners at −3, −1, 1 try β₁ ≈ −0.45, β₂ ≈ 2, β₃ ≈ −2)']]);}
    [b0].concat(c,b).forEach(function(s){s.on(draw)});draw();W.push(draw);
  },
  /* Training: GD on a non-convex loss */
  nonconvex:function(host){
    var u=mk(host,'Gradient descent in a landscape with two valleys','R(θ) = (θ² − 1)² + 0.3θ has a lower valley on the left and a higher one on the right. Where you start decides where you end up.','&#9968;');
    var T0=slider(u.ctl,'start θ₀',-1.8,1.8,0.05,0.6,function(v){return f2(v)}),E=slider(u.ctl,'learning rate η',0.005,0.3,0.005,0.05,function(v){return f2(v,3)});
    var th=0.6,hist=[0.6],timer=null;
    function R(t){return Math.pow(t*t-1,2)+0.3*t}function dR(t){return 4*t*(t*t-1)+0.3}
    function reset(){clearInterval(timer);th=T0.v;hist=[th];draw()}
    function step(){th=th-E.v*dR(th);hist.push(th);draw()}
    button(u.ctl,'Step',step);button(u.ctl,'Run 30',function(){var n=0;clearInterval(timer);timer=setInterval(function(){step();if(++n>=30||Math.abs(th)>5)clearInterval(timer)},90)});button(u.ctl,'Reset',reset);
    T0.on(reset);E.on(function(){});
    function draw(){var F=frame(u.svg,640,250,[-1.9,1.9],[-0.6,4]);F.axes([-1.5,-1,-0.5,0,0.5,1,1.5],[0,2,4],'θ','R(θ)');
      F.path(R,-1.9,1.9,'stroke:var(--accent);stroke-width:3');
      var d='';hist.forEach(function(t,i){var tt=Math.max(-1.9,Math.min(1.9,t));d+=(i?'L':'M')+F.X(tt)+','+F.Y(Math.min(4,R(tt)))});el('path',{d:d,fill:'none',style:'stroke:var(--ex-b);stroke-width:1.5;opacity:.7'},u.svg);
      var tt=Math.max(-1.9,Math.min(1.9,th));el('circle',{cx:F.X(tt),cy:F.Y(Math.min(4,R(tt))),r:8,style:'fill:var(--cls);stroke:var(--surface);stroke-width:2'},u.svg);
      var g=dR(th);var where=Math.abs(g)<1e-3?(th<0?'✅ global minimum (θ ≈ −1.04)':'⚠ stuck in the local minimum (θ ≈ 0.96)'):(Math.abs(th)>3?'blew up: η too big':'rolling…');
      stats(u.out,[['steps',hist.length-1],['θ =',Math.abs(th)>100?'∞':f2(th,3)],['R(θ) =',Math.abs(th)>100?'∞':f2(R(th),3)],['slope',Math.abs(g)>1e4?'huge':f2(g,3)],['status',where]]);}
    draw();W.push(draw);
  },
  /* ================= CS5940 widgets ================= */
  /* Environment properties: classify-it quiz */
  envquiz:function(host){
    var P=[['obs','Observable','fully','partially'],['det','Deterministic?','deterministic','stochastic'],['epi','Episodic?','episodic','sequential'],['sta','Static?','static','dynamic'],['dis','Discrete?','discrete','continuous'],['ag','Agents','single','multi']];
    var ENV=[
      ['Crossword',{obs:0,det:0,epi:1,sta:0,dis:0,ag:0},'You see the whole grid; writing a word has one effect; each answer constrains later ones; nothing changes while you think; finite letters; just you.'],
      ['Poker',{obs:1,det:1,epi:1,sta:0,dis:0,ag:1},'Hidden cards; the deal is random; bets carry over within a hand; the table waits for your move; finite actions; other players.'],
      ['Taxi driving',{obs:1,det:1,epi:1,sta:1,dis:1,ag:1},'The hardest case: limited view, unpredictable traffic, every manoeuvre affects the next, the world moves while you decide, continuous speeds and positions, other drivers.'],
      ['Image classifier',{obs:0,det:0,epi:0,sta:0,dis:1,ag:0},'The image is the whole state for its task; same input gives same output; each image is independent; nothing changes during a decision; pixel values are continuous (often treated as discrete); one agent.'],
      ['Assembly-line part picker',{obs:1,det:1,epi:0,sta:1,dis:1,ag:0},'Sensors see only part of each item; grips can slip; each part is a separate episode; the belt keeps moving; continuous positions; one robot.'],
      ['Flight booking agent',{obs:1,det:1,epi:1,sta:1,dis:0,ag:1},'Can’t see other customers or future prices; a seat can go before you click; leg 1 constrains leg 2; prices change while it decides; finite flights; other bookers and airline pricing systems.'],
      ['Sudoku',{obs:0,det:0,epi:1,sta:0,dis:0,ag:0},'Everything visible; placing a digit has one effect; each digit constrains later cells; static; finite; single player.']];
    host.innerHTML='<div class="whead"><span class="ico">&#127758;</span>Classify the environment</div><p class="wsub">Pick an environment, choose an answer for each property, then check. Several answers depend on how you model the world, so read the reasons.</p>';
    var pick=document.createElement('div');pick.className='chipset';host.appendChild(pick);
    var grid=document.createElement('div');host.appendChild(grid);var ctl=document.createElement('div');ctl.className='controls';host.appendChild(ctl);
    var out=document.createElement('div');out.className='readout';host.appendChild(out);
    var cur=0,ans={};
    ENV.forEach(function(e,i){var b=document.createElement('button');b.className='toggle';b.textContent=e[0];b.onclick=function(){cur=i;ans={};render()};pick.appendChild(b)});
    function render(){
      pick.querySelectorAll('button').forEach(function(b,i){b.classList.toggle('on',i===cur)});
      var h='<table class="rules">';P.forEach(function(p){h+='<tr><td>'+p[1]+'</td><td>'+[2,3].map(function(j){return '<button class="toggle'+(ans[p[0]]===j-2?' on':'')+'" data-p="'+p[0]+'" data-v="'+(j-2)+'">'+p[j]+'</button>'}).join(' ')+'</td><td class="mk" data-m="'+p[0]+'"></td></tr>'});
      grid.innerHTML=h+'</table>';out.innerHTML='';
      grid.querySelectorAll('button').forEach(function(b){b.onclick=function(){ans[b.getAttribute('data-p')]=+b.getAttribute('data-v');render()}});
    }
    button(ctl,'Check',function(){var e=ENV[cur],ok=0;P.forEach(function(p){var c=grid.querySelector('[data-m="'+p[0]+'"]');var right=ans[p[0]]===e[1][p[0]];if(right)ok++;c.innerHTML=ans[p[0]]==null?'<b>'+p[2+e[1][p[0]]]+'</b>':(right?'&#9989;':'&#10060; <b>'+p[2+e[1][p[0]]]+'</b>')});
      out.innerHTML='<span class="stat">score <b>'+ok+' / 6</b></span><span class="stat">why <b style="font-weight:500">'+e[2]+'</b></span>'});
    button(ctl,'Clear',function(){ans={};render()});
    render();
  },
  /* Formal model: thermostat with memory */
  thermo:function(host){
    var u=mk(host,'Step the thermostat with a memory','Feed it percepts. The internal state i counts cold readings in a row; action(i) is off, on, or alarm from 3. The last column is the best a purely reactive thermostat could do: it only sees the current reading.','&#127777;');
    u.svg.style.display='none';var log=document.createElement('div');host.insertBefore(log,u.ctl);
    var hist=[];function act(i){return i>=3?'ALARM':i>=1?'heater on':'heater off'}
    function draw(){var i=0,h='<table class="rules"><tr><td><b>step</b></td><td><b>percept</b></td><td><b>i = next(i, p)</b></td><td><b>action(i)</b></td><td><b>reactive agent</b></td></tr>';
      hist.forEach(function(p,s){i=p==='cold'?i+1:0;h+='<tr class="'+(i>=3?'win':'')+'"><td>'+(s+1)+'</td><td>'+p+'</td><td>'+i+'</td><td>'+act(i)+'</td><td>'+(p==='cold'?'heater on':'heater off')+'</td></tr>'});
      log.innerHTML=hist.length?h+'</table>':'<p class="wsub">No percepts yet. Start with three colds in a row.</p>';
      stats(u.out,[['internal state i =',i],['action',act(i)],['percepts so far',hist.length]]);}
    button(u.ctl,'&#10052; cold',function(){hist.push('cold');draw()});button(u.ctl,'&#9728; ok',function(){hist.push('ok');draw()});
    button(u.ctl,'Reset',function(){hist=[];draw()});draw();
  },
  /* Practicals: tokens sent per turn, with optional trimmed window */
  tokens:function(host){
    var k0=+(host.getAttribute('data-window')||0);
    var u=mk(host,'How many tokens does each turn send?','Bars are the prompt tokens sent at each turn. Set the window k to 0 to resend the whole history (week 1), or to a number to send only the last k messages plus the system prompt (week 2).','&#129518;');
    var s=slider(u.ctl,'system s',0,300,10,50),uu=slider(u.ctl,'user msg u',5,200,5,20),a=slider(u.ctl,'reply a',5,300,5,80),T=slider(u.ctl,'turns T',1,30,1,10),k=slider(u.ctl,'window k',0,20,1,k0,function(v){return v?v:'all'});
    function sent(t){var hist=[];for(var j=1;j<=t;j++){hist.push(uu.v);if(j<t)hist.push(a.v)}var r=k.v?hist.slice(-k.v):hist;return s.v+r.reduce(function(x,y){return x+y},0)}
    function draw(){var n=T.v,vals=[],full=[];for(var t=1;t<=n;t++){vals.push(sent(t));full.push(s.v+t*uu.v+(t-1)*a.v)}
      var mx=Math.max.apply(null,full.concat([10]));var F=frame(u.svg,640,240,[0.4,n+0.6],[0,mx*1.08]);
      var ticks=[];for(var t2=1;t2<=n;t2+=Math.ceil(n/10))ticks.push(t2);F.axes(ticks,[0,Math.round(mx/2),Math.round(mx)],'turn','tokens');
      var bw=Math.max(4,(F.X(1.4)-F.X(1))*0.8);
      vals.forEach(function(v,i){var x=F.X(i+1);if(k.v)el('rect',{x:x-bw/2,y:F.Y(full[i]),width:bw,height:F.Y(0)-F.Y(full[i]),rx:3,style:'fill:none;stroke:var(--muted);stroke-dasharray:3 3'},u.svg);el('rect',{x:x-bw/2,y:F.Y(v),width:bw,height:F.Y(0)-F.Y(v),rx:3,style:'fill:var(--accent)'},u.svg)});
      var tot=vals.reduce(function(x,y){return x+y},0),totFull=full.reduce(function(x,y){return x+y},0);
      var first=k.v?Math.floor((k.v+1)/2):n;
      stats(u.out,[['turn '+n+' sends',vals[n-1]],['total over '+n+' turns',tot],k.v?['without trimming',totFull]:['formula Ts + u·T(T+1)/2 + a·T(T−1)/2',n*s.v+uu.v*n*(n+1)/2+a.v*n*(n-1)/2],k.v?['turn-1 message last sent at turn',Math.min(first,n)]:['growth','quadratic in T']]);}
    [s,uu,a,T,k].forEach(function(z){z.on(draw)});draw();W.push(draw);
  },
  /* Deductive agent: vacuum rule prover */
  vacuum:function(host){
    host.innerHTML='<div class="whead"><span class="ico">&#129529;</span>Prove the vacuum agent’s action</div><p class="wsub">Set up the database Δ. The table checks each of the slides’ four rules against it (closed world: anything not ticked is false). The action function returns the first provable action in Ac = (clean, turn(left), turn(right), forward).</p>';
    var ctl=document.createElement('div');ctl.className='controls';host.appendChild(ctl);var box=document.createElement('div');host.appendChild(box);var out=document.createElement('div');out.className='readout';host.appendChild(out);
    var X=slider(ctl,'location X',1,4,1,1),Y=slider(ctl,'Y',1,3,1,1),st={f:'S',dirty:false,wall:false};
    var fs=document.createElement('div');fs.className='chipset';ctl.appendChild(fs);
    ['N','E','S','W'].forEach(function(d){var b=document.createElement('button');b.className='toggle';b.textContent='facing('+d+')';b.onclick=function(){st.f=d;draw()};b.setAttribute('data-d',d);fs.appendChild(b)});
    [['dirty','dirty(X,Y)'],['wall','wall(front)']].forEach(function(q){var b=document.createElement('button');b.className='toggle';b.textContent=q[1];b.setAttribute('data-q',q[0]);b.onclick=function(){st[q[0]]=!st[q[0]];draw()};fs.appendChild(b)});
    function ck(v){return v?'&#9989;':'&#10060;'}
    function draw(){fs.querySelectorAll('[data-d]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-d')===st.f)});fs.querySelectorAll('[data-q]').forEach(function(b){b.classList.toggle('on',st[b.getAttribute('data-q')])});
      var x=X.v,y=Y.v,odd=x%2===1;
      var R=[['1','location('+x+','+y+') ∧ dirty('+x+','+y+') → do(clean)',[['dirty',st.dirty]],'clean'],
        ['2','location ∧ odd('+x+') ∧ facing(S) → do(turn(left))',[['odd('+x+')',odd],['facing(S)',st.f==='S']],'turn(left)'],
        ['3','location ∧ odd('+x+') ∧ facing(D), D ∈ {W,N} → do(turn(right))',[['odd('+x+')',odd],['facing W/N',st.f==='W'||st.f==='N']],'turn(right)'],
        ['4','location ∧ odd('+x+') ∧ facing(E) ∧ ¬dirty ∧ ¬wall(front) → do(forward)',[['odd('+x+')',odd],['facing(E)',st.f==='E'],['¬dirty',!st.dirty],['¬wall',!st.wall]],'forward']];
      var proved={};R.forEach(function(r){r.ok=r[2].every(function(c){return c[1]});if(r.ok)proved[r[3]]=r[0]});
      var Ac=['clean','turn(left)','turn(right)','forward'],ret=null;Ac.some(function(a){if(proved[a]){ret=a;return true}});
      var h='<table class="rules">';R.forEach(function(r){h+='<tr class="'+(r.ok?(r[3]===ret?'win':'fire'):'')+'"><td>rule '+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2].map(function(c){return c[0]+' '+ck(c[1])}).join(' &nbsp;')+'</td></tr>'});box.innerHTML=h+'</table>';
      var n=Object.keys(proved).length;
      stats(out,[['Δ',' {location('+x+','+y+'), facing('+st.f+')'+(st.dirty?', dirty('+x+','+y+')':'')+(st.wall?', wall(front)':'')+'}'],['provable Do(α)',n?Object.keys(proved).join(', '):'none'],['action returned',ret?ret+' (loop 1)':'clean (loop 2: nothing is forbidden, so the first action in Ac)']]);
      if(n>1)out.innerHTML+='<span class="stat">&#9888; <b>two actions provable: the order of Ac decides</b></span>';}
    X.on(draw);Y.on(draw);draw();
  },
  /* Teleo-reactive corridor */
  tr:function(host){
    var N=6;var u=mk(host,'Run sweep_clean down a corridor','Click a cell to drop or remove dirt, even mid-run. The wall on the robot’s left (north) runs the whole way and there’s a wall at the east end. Each step checks the rules from the top.','&#129302;');
    var pos=0,dirt=[false,true,false,false,true,false],done=false,log=[],timer=null;
    var tbl=document.createElement('div');host.insertBefore(tbl,u.ctl);var lg=document.createElement('div');lg.className='log';host.appendChild(lg);
    function cond(){var wa=pos===N-1,wl=true;return [['dirty(X,Y) → clean',dirt[pos]],['¬wall(front) → forward',!wa],['wall(front) ∧ ¬wall(left) → turn(left)',wa&&!wl],['wall(front) ∧ wall(left) → nil',wa&&wl]]}
    function step(){if(done)return;var c=cond(),i=0;while(!c[i][1])i++;var act=['clean','forward','turn(left)','nil'][i];log.push('cycle '+(log.length+1)+': cell '+(pos+1)+', rule '+(i+1)+' → '+act);
      if(i===0)dirt[pos]=false;else if(i===1)pos++;else if(i===3)done=true;draw()}
    function draw(){var F=frame(u.svg,640,120,[0,N],[0,1],{l:10,r:10,t:10,b:24});
      for(var c=0;c<N;c++){(function(c){var r=el('rect',{x:F.X(c)+3,y:F.Y(.9),width:F.X(1)-F.X(0)-6,height:F.Y(.1)-F.Y(.9),rx:10,style:'fill:'+(dirt[c]?'color-mix(in srgb,var(--ex-b) 45%,transparent)':'var(--surface-2)')+';stroke:var(--line);cursor:pointer'},u.svg);r.addEventListener('click',function(){dirt[c]=!dirt[c];draw()});var t=el('text',{x:F.X(c+.5),y:F.Y(0)+16,'text-anchor':'middle','class':'axt'},u.svg);t.textContent='cell '+(c+1)+(dirt[c]?' (dirt)':'')})(c)}
      el('line',{x1:F.X(0),x2:F.X(N),y1:F.Y(.95),y2:F.Y(.95),style:'stroke:var(--ink);stroke-width:4'},u.svg);el('line',{x1:F.X(N)-1,x2:F.X(N)-1,y1:F.Y(.95),y2:F.Y(.05),style:'stroke:var(--ink);stroke-width:4'},u.svg);
      var cx=F.X(pos+.5),cy=F.Y(.5);el('circle',{cx:cx,cy:cy,r:16,style:'fill:var(--accent)'},u.svg);el('path',{d:'M'+(cx+8)+','+(cy-7)+' L'+(cx+18)+','+cy+' L'+(cx+8)+','+(cy+7)+'Z',style:'fill:var(--accent)'},u.svg);
      var c2=cond(),w=0;while(!c2[w][1])w++;tbl.innerHTML='<table class="rules">'+c2.map(function(r,i){return '<tr class="'+(i===w?'win':(r[1]?'fire':''))+'"><td>'+(i+1)+'</td><td>'+r[0]+'</td><td>'+(r[1]?'true':'false')+'</td></tr>'}).join('')+'</table>';
      lg.textContent=log.length?log.join('\n'):'Press Step. The highlighted row is the rule that will fire next.';
      stats(u.out,[['robot at cell',pos+1],['next action',done?'stopped':['clean','forward','turn(left)','nil'][w]],['dirt left',dirt.filter(Boolean).length]]);}
    button(u.ctl,'Step',step);button(u.ctl,'Run',function(){clearInterval(timer);timer=setInterval(function(){step();if(done)clearInterval(timer)},450)});
    button(u.ctl,'Reset',function(){clearInterval(timer);pos=0;dirt=[false,true,false,false,true,false];done=false;log=[];draw()});draw();W.push(draw);
  },
  /* STRIPS blocks world */
  blocks:function(host){
    var B=['A','B','C'];var u=mk(host,'Plan in the blocks world','Click actions to apply them. Greyed-out actions have a precondition that’s false. Goal: the tower A on B on C. The shortest plan from the start state has 6 steps.','&#129521;');
    var m,plan,msg;var bx=document.createElement('div');bx.className='chipset';host.insertBefore(bx,u.ctl);
    var facts=document.createElement('div');facts.className='log';host.appendChild(facts);
    function has(f){return m.indexOf(f)>=0}
    function acts(){var L=[];B.forEach(function(x){L.push(['pickup('+x+')',['clear('+x+')','onTable('+x+')','armEmpty'],['onTable('+x+')','armEmpty'],['holding('+x+')']]);L.push(['putdown('+x+')',['holding('+x+')'],['holding('+x+')'],['armEmpty','onTable('+x+')']]);
      B.forEach(function(y){if(x===y)return;L.push(['stack('+x+','+y+')',['clear('+y+')','holding('+x+')'],['clear('+y+')','holding('+x+')'],['armEmpty','on('+x+','+y+')']]);L.push(['unstack('+x+','+y+')',['on('+x+','+y+')','clear('+x+')','armEmpty'],['on('+x+','+y+')','armEmpty'],['holding('+x+')','clear('+y+')']])})});return L}
    function reset(s){m=s==='table'?['armEmpty','onTable(A)','onTable(B)','onTable(C)','clear(A)','clear(B)','clear(C)']:['armEmpty','clear(A)','on(A,B)','onTable(B)','onTable(C)','clear(C)'];plan=[];msg='';draw()}
    function draw(){bx.innerHTML='';acts().forEach(function(a){var b=document.createElement('button');b.className='toggle';b.textContent=a[0];var ok=a[1].every(has);b.disabled=!ok;b.style.opacity=ok?1:.35;b.title='pre: '+a[1].join(', ')+'\ndel: '+a[2].join(', ')+'\nadd: '+a[3].join(', ');
        b.onclick=function(){m=m.filter(function(f){return a[2].indexOf(f)<0});a[3].forEach(function(f){if(!has(f))m.push(f)});plan.push(a[0]);draw()};bx.appendChild(b)});
      var F=frame(u.svg,640,200,[0,6],[0,5],{l:10,r:10,t:10,b:20});el('line',{x1:F.X(0),x2:F.X(6),y1:F.Y(0),y2:F.Y(0),style:'stroke:var(--ink);stroke-width:3'},u.svg);
      var col=0,cols={'A':'var(--reg)','B':'var(--cls)','C':'var(--tool)'};
      function box(x,yy,lab){el('rect',{x:F.X(x)+4,y:F.Y(yy+1),width:F.X(1)-F.X(0)-8,height:F.Y(0)-F.Y(1)-2,rx:6,style:'fill:'+cols[lab]},u.svg);var t=el('text',{x:F.X(x+.5),y:F.Y(yy+.5)+6,'text-anchor':'middle',style:'fill:#fff;font-weight:700;font-size:18px'},u.svg);t.textContent=lab}
      B.forEach(function(x){if(!has('onTable('+x+')'))return;var h=0,cur=x;box(col,h,cur);for(;;){var up=B.filter(function(z){return has('on('+z+','+cur+')')})[0];if(!up)break;h++;cur=up;box(col,h,cur)}col+=1.3});
      var held=B.filter(function(x){return has('holding('+x+')')})[0];el('text',{x:F.X(5.1),y:F.Y(4.5),'text-anchor':'middle','class':'axt'},u.svg).textContent='arm';
      el('line',{x1:F.X(5.1),x2:F.X(5.1),y1:F.Y(4.3),y2:F.Y(3.4),style:'stroke:var(--ink);stroke-width:3'},u.svg);if(held)box(4.6,2.3,held);
      var goal=['on(A,B)','on(B,C)','onTable(C)'].every(has);
      facts.textContent='state m = {'+m.join(', ')+'}\nplan so far: '+(plan.length?plan.join(' → '):'(empty)');
      stats(u.out,[['steps',plan.length],['goal on(A,B), on(B,C), onTable(C)',goal?'&#9989; reached'+(plan.length===6?' (shortest!)':''):'not yet']]);}
    var startState;
    function apply(nm){var a=acts().filter(function(x){return x[0]===nm})[0];m=m.filter(function(f){return a[2].indexOf(f)<0});a[3].forEach(function(f){if(!has(f))m.push(f)});plan.push(nm)}
    button(u.ctl,'Reset: A on B',function(){reset('ab');startState=m.slice()});
    button(u.ctl,'Reset: all on table',function(){reset('table');startState=m.slice()});
    button(u.ctl,'Undo',function(){var p=plan.slice(0,-1);m=startState.slice();plan=[];p.forEach(apply);draw()});
    reset('ab');startState=m.slice();W.push(draw);
  },
  /* Reconsideration: bold vs cautious simulation */
  boldness:function(host){
    var u=mk(host,'Bold vs cautious, simulated','A target sits somewhere in a 20-cell corridor and jumps elsewhere at random, γ times per step on average. Each agent walks to where it last believed the target was, and deliberating costs d steps. Effectiveness = targets caught ÷ targets that appeared; the chart shows each strategy against the bold one. This is this page’s own small simulation, so the exact numbers differ from Kinny and Georgeff’s, but the crossover is the same.','&#9878;');
    var d=slider(u.ctl,'deliberation cost d',0,1,0.05,0.25,function(v){return f2(v,2)+' steps'}),g=slider(u.ctl,'γ (marker)',0.01,0.5,0.01,0.1,function(v){return f2(v,2)});
    function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
    function sim(gam,k,cost,seed){var R=rng(seed),L=20,pos=0,tgt=7,bel=null,since=0,caught=0,app=1,time=0,T=4000;
      function pois(lam){var Lm=Math.exp(-lam),p=1,n=0;do{n++;p*=R()}while(p>Lm);return n-1}
      function adv(t){var n=pois(gam*t);for(var i=0;i<n;i++){tgt=Math.floor(R()*L);app++}time+=t}
      function delib(){adv(cost);bel=tgt;since=0}
      delib();
      while(time<T){if(pos===tgt){caught++;do{tgt=Math.floor(R()*L)}while(tgt===pos);app++;delib();continue}
        if(pos===bel||since>=k){delib();continue}
        pos+=bel>pos?1:-1;since++;adv(1)}
      return caught/app}
    var G=[0.01,0.02,0.04,0.06,0.08,0.1,0.13,0.16,0.2,0.25,0.3,0.4,0.5],S=[['bold (k = ∞)',1e9,'var(--reg)'],['k = 4',4,'var(--tool)'],['cautious (k = 1)',1,'var(--cls)']];
    function eff(gam,k){var s=0;for(var r=0;r<6;r++)s+=sim(gam,k,d.v,1000+r*77+Math.round(gam*1000));return s/6}
    var cache=null;
    function compute(){cache=S.map(function(s){return G.map(function(x){return eff(x,s[1])})})}
    function draw(){if(!cache)compute();var lo=-0.08,hi=0.08;cache.forEach(function(r){r.forEach(function(v,i){var dv=v-cache[0][i];lo=Math.min(lo,dv-0.01);hi=Math.max(hi,dv+0.01)})});
      var F=frame(u.svg,640,260,[0,0.5],[lo,hi],{l:46,r:14,t:30,b:28});F.axes([0,0.1,0.2,0.3,0.4,0.5],[],'γ (world changes per step)','');
      [lo,0,hi].forEach(function(v){var t=el('text',{x:F.pad.l-7,y:F.Y(v)+4,'text-anchor':'end','class':'axt'},u.svg);t.textContent=(v>0?'+':'')+f2(v,2)});
      var lab=el('text',{x:F.pad.l+6,y:14,'class':'axt'},u.svg);lab.textContent='effectiveness minus the bold agent’s (above 0 = beats bold)';
      S.forEach(function(s,j){var dd='';G.forEach(function(x,i){dd+=(i?'L':'M')+F.X(x)+','+F.Y(cache[j][i]-cache[0][i])});el('path',{d:dd,fill:'none',style:'stroke:'+s[2]+';stroke-width:3'},u.svg);
        el('rect',{x:F.X(0.02)+j*150,y:F.Y(hi)+4,width:12,height:4,style:'fill:'+s[2]},u.svg);var t=el('text',{x:F.X(0.02)+j*150+16,y:F.Y(hi)+10,style:'fill:'+s[2]+';font-size:12px;font-weight:700'},u.svg);t.textContent=s[0]});
      el('line',{x1:F.X(g.v),x2:F.X(g.v),y1:F.Y(lo),y2:F.Y(hi),style:'stroke:var(--ink);stroke-dasharray:4 4'},u.svg);
      var vals=S.map(function(s){return eff(g.v,s[1])});var best=vals.indexOf(Math.max.apply(null,vals));
      stats(u.out,S.map(function(s,j){return [s[0],f2(vals[j],3)+(j===best?' ★':'')]}).concat([['P(10-step plan survives) = e^(−10γ)',f2(Math.exp(-10*g.v),3)]]));}
    d.on(function(){cache=null;draw()});g.on(draw);draw();W.push(draw);
  },
  /* AgentSpeak: quench-thirst interpreter */
  agentspeak:function(host){
    var u=mk(host,'Step an AgentSpeak interpreter','The quench-thirst program from the worked example. Toggle the beliefs (and an optional extra plan), then press Step: each step handles one event if there is one, then runs one body element of the intention. The stack is drawn top first.','&#128483;');
    u.svg.style.display='none';
    var bel={have_glass:true,soft_drink_in_fridge:true},shop=false,st;
    var tg=document.createElement('div');tg.className='chipset';host.insertBefore(tg,u.ctl);var view=document.createElement('div');host.insertBefore(view,u.ctl);var lg=document.createElement('div');lg.className='log';host.appendChild(lg);
    function lib(){var L=[{n:'P1',trig:'+!quench_thirst',ctx:['have_glass'],body:['!have_soft_drink','fill_glass','drink']},{n:'P2',trig:'+!have_soft_drink',ctx:['soft_drink_in_fridge'],body:['open_fridge','get_soft_drink']}];
      if(shop)L.push({n:'P3',trig:'+!have_soft_drink',ctx:['not soft_drink_in_fridge'],body:['go_to_shop','buy_soft_drink']});return L}
    function holds(c){return c.slice(0,4)==='not '?!bel[c.slice(4)]:!!bel[c]}
    function reset(){st={events:[{e:'+!quench_thirst',i:null}],stack:[],acts:[],log:[],over:false,started:false};draw()}
    function step(){if(st.over)return;var line='';
      if(st.events.length){var ev=st.events.shift();var rel=lib().filter(function(p){return p.trig===ev.e});var app=rel.filter(function(p){return p.ctx.every(holds)});
        if(!app.length){line='event '+ev.e+': '+(rel.length?'relevant plans '+rel.map(function(p){return p.n}).join(', ')+' but none applicable':'no relevant plan')+' → intention fails';st.log.push(line);st.stack=[];st.over=true;draw();return}
        var p=app[0];st.stack.push({n:p.n,body:p.body.slice()});line='S_E picks '+ev.e+'; S_O picks '+p.n+(app.length>1?' (first of '+app.length+')':'')+(ev.i?' → pushed':' → new intention')+'. '}
      var top=st.stack[st.stack.length-1];
      if(top){var h=top.body.shift();if(h.charAt(0)==='!'){st.events.push({e:'+'+h,i:1});line+='posts subgoal +'+h}else{st.acts.push(h);line+='executes '+h}
        while(st.stack.length&&!st.stack[st.stack.length-1].body.length){line+='; '+st.stack.pop().n+' empty → pop';}
        if(!st.stack.length&&!st.events.length){line+='; intention finished';st.over=true}}
      st.log.push('step '+(st.log.length+1)+': '+line);draw()}
    function draw(){tg.innerHTML='';[['have_glass','have_glass'],['soft_drink_in_fridge','soft_drink_in_fridge']].forEach(function(q){var b=document.createElement('button');b.className='toggle'+(bel[q[0]]?' on':'');b.textContent='belief: '+q[1];b.onclick=function(){bel[q[0]]=!bel[q[0]];reset()};tg.appendChild(b)});
      var b2=document.createElement('button');b2.className='toggle'+(shop?' on':'');b2.textContent='add plan P3: +!have_soft_drink : not soft_drink_in_fridge <- go_to_shop; buy_soft_drink.';b2.onclick=function(){shop=!shop;reset()};tg.appendChild(b2);
      var h='<table class="rules"><tr><td><b>intention stack (top first)</b></td></tr>';if(!st.stack.length)h+='<tr><td>(empty)</td></tr>';
      st.stack.slice().reverse().forEach(function(f,i){h+='<tr class="'+(i===0?'win':'')+'"><td>'+f.n+': '+(f.body.length?f.body.join('; '):'(done)')+'</td></tr>'});view.innerHTML=h+'</table>';
      lg.textContent=st.log.length?st.log.join('\n'):'Press Step to start.';
      stats(u.out,[['pending events',st.events.length?st.events.map(function(e){return e.e}).join(', '):'none'],['actions so far',st.acts.length?st.acts.join(', '):'none'],['stack depth',st.stack.length]]);}
    button(u.ctl,'Step',step);button(u.ctl,'Reset',reset);reset();
  },
  /* Subsumption: Mars explorer */
  mars:function(host){
    host.innerHTML='<div class="whead"><span class="ico">&#128640;</span>Which Mars-explorer behaviour wins?</div><p class="wsub">Toggle what the robot perceives. Every behaviour whose condition holds fires; the highest one in the list (the lowest layer) inhibits the rest.</p>';
    var st={obstacle:false,carrying:false,base:false,sample:false,crumbs:false};var tg=document.createElement('div');tg.className='chipset';host.appendChild(tg);var box=document.createElement('div');host.appendChild(box);var out=document.createElement('div');out.className='readout';host.appendChild(out);
    var L=[['obstacle','obstacle detected'],['carrying','carrying samples'],['base','at the base'],['sample','sample detected'],['crumbs','crumbs sensed']];
    var R=[['1','if detect an obstacle then change direction',function(s){return s.obstacle}],['2','if carrying samples and at the base then drop samples',function(s){return s.carrying&&s.base}],['3','if carrying samples and not at the base then drop 2 crumbs and travel up gradient',function(s){return s.carrying&&!s.base}],['4','if detect a sample then pick sample up',function(s){return s.sample}],['5','if sense crumbs then pick up 1 crumb and travel down gradient',function(s){return s.crumbs}],['6','if true then move randomly',function(){return true}]];
    function draw(){tg.innerHTML='';L.forEach(function(q){var b=document.createElement('button');b.className='toggle'+(st[q[0]]?' on':'');b.textContent=q[1];b.onclick=function(){st[q[0]]=!st[q[0]];draw()};tg.appendChild(b)});
      var fired=R.filter(function(r){return r[2](st)}),win=fired[0];
      box.innerHTML='<table class="rules">'+R.map(function(r){var f=r[2](st);return '<tr class="'+(r===win?'win':(f?'fire':''))+'"><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+(r===win?'wins':(f?'fires, inhibited':''))+'</td></tr>'}).join('')+'</table>';
      stats(out,[['fired',fired.map(function(r){return r[0]}).join(', ')],['action',win[1].replace(/^if .*? then /,'')],['checks needed (in priority order)',R.indexOf(win)+1]]);}
    draw();
  },
  /* Hybrid: interaction counts */
  layers:function(host){
    var u=mk(host,'How many interactions must the designer handle?','n layers, each suggesting one of m actions. Horizontal: the mediator faces every combination, mⁿ. Vertical: only neighbouring layers meet, m²(n − 1). The chart uses a log scale.','&#128200;');
    var n=slider(u.ctl,'layers n',2,8,1,3),m=slider(u.ctl,'actions per layer m',2,10,1,4);
    function draw(){var M=m.v,mx=Math.log10(Math.pow(M,8))+0.3;var F=frame(u.svg,640,240,[1.5,8.5],[0,mx]);
      var yt=[];for(var e=0;e<=mx;e+=Math.max(1,Math.round(mx/4)))yt.push(e);F.axes([2,3,4,5,6,7,8],[],'layers n','');
      yt.forEach(function(e){var t=el('text',{x:F.pad.l-7,y:F.Y(e)+4,'text-anchor':'end','class':'axt'},u.svg);t.textContent=e===0?'1':'10'+(e>1?['','','²','³','⁴','⁵','⁶','⁷','⁸','⁹'][e]||'^'+e:'')});
      for(var k=2;k<=8;k++){var h=Math.log10(Math.pow(M,k)),v=Math.log10(M*M*(k-1));var w=(F.X(1)-F.X(0))*0.3;
        el('rect',{x:F.X(k)-w-1,y:F.Y(h),width:w,height:F.Y(0)-F.Y(h),rx:3,style:'fill:var(--cls);opacity:'+(k===n.v?1:.45)},u.svg);el('rect',{x:F.X(k)+1,y:F.Y(v),width:w,height:F.Y(0)-F.Y(v),rx:3,style:'fill:var(--reg);opacity:'+(k===n.v?1:.45)},u.svg)}
      var H=Math.pow(M,n.v),V=M*M*(n.v-1);
      stats(u.out,[['<span style="color:var(--cls)">■</span> horizontal mⁿ',H.toLocaleString()],['<span style="color:var(--reg)">■</span> vertical m²(n−1)',V.toLocaleString()],['ratio',f2(H/V,1)+'×']]);}
    n.on(draw);m.on(draw);draw();W.push(draw);
  },
  /* MDP: discount weights */
  discount:function(host){
    var u=mk(host,'What does γ do to future rewards?','Each bar is how much a reward k steps away counts, γᵏ. The readout uses slide 20’s run (four steps of −0.04, then +1) and a living cost of −0.04 for ever.','&#9203;');
    var g=slider(u.ctl,'γ',0,1,0.01,0.9,function(v){return f2(v,2)});
    function draw(){var G=g.v,K=20;var F=frame(u.svg,640,220,[-0.6,K-0.4],[0,1.05]);F.axes([0,5,10,15],[0,0.5,1],'steps away k','weight γᵏ');
      var bw=(F.X(1)-F.X(0))*0.7;for(var k=0;k<K;k++){var v=Math.pow(G,k);el('rect',{x:F.X(k)-bw/2,y:F.Y(v),width:bw,height:F.Y(0)-F.Y(v),rx:2,style:'fill:'+(k===4?'var(--cls)':'var(--accent)')},u.svg)}
      var ret=-0.04*(1+G+G*G+G*G*G)+Math.pow(G,4);
      stats(u.out,[['slide 20 return G₀',f2(ret,4)],['+1 at step 4 counts',f2(Math.pow(G,4),3)],['−0.04 for ever',G<1?f2(-0.04/(1-G),3):'−∞ (diverges)'],['reward 10 steps away counts',f2(Math.pow(G,10),3)]]);}
    g.on(draw);draw();W.push(draw);
  },
  /* MDP: gridworld value iteration */
  gridvi:function(host){
    var u=mk(host,'Value iteration on the 4 × 3 gridworld','Each sweep applies the Bellman optimality update to every cell (0.8 intended move, 0.1 slip each side). Numbers are V; arrows are the greedy policy. Change γ or the living cost and run again.','&#129517;');
    var g=slider(u.ctl,'γ',0.5,1,0.01,1,function(v){return f2(v,2)}),c=slider(u.ctl,'living cost',-2,0.1,0.01,-0.04,function(v){return f2(v,2)});
    var cells=[],T={'4,3':1,'4,2':-1},A={N:[0,1],S:[0,-1],E:[1,0],W:[-1,0]},SL={N:['W','E'],S:['E','W'],E:['N','S'],W:['S','N']},V,k,lastD;
    for(var x=1;x<=4;x++)for(var y=1;y<=3;y++)if(!(x===2&&y===2))cells.push(x+','+y);
    function mv(s,d){var p=s.split(',').map(Number),n=(p[0]+A[d][0])+','+(p[1]+A[d][1]);return cells.indexOf(n)>=0?n:s}
    function q(s,a,Vv){var tot=0;[[a,.8],[SL[a][0],.1],[SL[a][1],.1]].forEach(function(z){var n=mv(s,z[0]);tot+=z[1]*((n in T?T[n]:c.v)+g.v*(n in T?0:Vv[n]))});return tot}
    function best(s,Vv){var b='N',bv=-1e18;['N','S','E','W'].forEach(function(a){var v=q(s,a,Vv);if(v>bv+1e-12){bv=v;b=a}});return [b,bv]}
    function reset(){V={};cells.forEach(function(s){V[s]=0});k=0;lastD=null;draw()}
    function sweep(){var N={},d=0;cells.forEach(function(s){N[s]=s in T?0:best(s,V)[1];d=Math.max(d,Math.abs(N[s]-V[s]))});V=N;k++;lastD=d}
    function draw(){var W0=640,H0=260;u.svg.setAttribute('viewBox','0 0 '+W0+' '+H0);while(u.svg.firstChild)u.svg.removeChild(u.svg.firstChild);
      var cw=150,ch=80,ox=20,oy=10,arr={N:'↑',S:'↓',E:'→',W:'←'};
      for(var x=1;x<=4;x++)for(var y=1;y<=3;y++){var s=x+','+y,X=ox+(x-1)*cw,Y=oy+(3-y)*ch;
        var fill=s==='2,2'?'var(--line)':s in T?(T[s]>0?'color-mix(in srgb,var(--reg) 35%,transparent)':'color-mix(in srgb,var(--cls) 35%,transparent)'):'var(--surface-2)';
        el('rect',{x:X+2,y:Y+2,width:cw-4,height:ch-4,rx:8,style:'fill:'+fill+';stroke:var(--line)'},u.svg);
        var t=el('text',{x:X+cw/2,y:Y+ch/2+6,'text-anchor':'middle',style:'fill:var(--ink);font-size:18px;font-weight:700'},u.svg);
        if(s==='2,2')t.textContent='wall';else if(s in T)t.textContent=(T[s]>0?'+1':'−1');else{t.textContent=(k?arr[best(s,V)[0]]+' ':'')+f2(V[s],3)}
        var l=el('text',{x:X+8,y:Y+16,style:'fill:var(--muted);font-size:11px'},u.svg);l.textContent='s'+x+','+y}
      stats(u.out,[['sweeps',k],['biggest change last sweep',lastD===null?'–':f2(lastD,5)],['V(s1,1)',f2(V['1,1'],3)],['converged?',lastD!==null&&lastD<1e-5?'yes':'not yet']]);}
    button(u.ctl,'Sweep once',function(){sweep();draw()});
    button(u.ctl,'Run to convergence',function(){var i=0;do{sweep();i++}while(lastD>1e-6&&i<2000);draw();if(lastD>1e-6)u.out.innerHTML+='<span class="stat">&#9888; <b>not converging: with γ = 1 and a positive living reward the values grow for ever</b></span>'});
    button(u.ctl,'Reset',reset);g.on(reset);c.on(reset);reset();W.push(draw);
  },
  /* Q-learning on the corridor */
  qlearn:function(host){
    var u=mk(host,'Q-learning on the corridor','s1 ⇄ s2 → s3 (goal). −0.1 per step, 0.9 for entering s3, West from s1 stays. “Slide step” replays slides 36 to 37 in order; “Episode” runs one episode from s1 choosing ε-greedily (ε = 0.3).','&#129504;');
    u.svg.style.display='none';
    var a=slider(u.ctl,'α',0.05,1,0.05,0.5,function(v){return f2(v,2)}),g=slider(u.ctl,'γ',0.5,0.99,0.01,0.9,function(v){return f2(v,2)});
    var box=document.createElement('div');host.insertBefore(box,u.ctl);var lg=document.createElement('div');lg.className='log';host.appendChild(lg);
    var Q,log,si,seed,SL=[['s2','E',0.9,'s3'],['s1','E',-0.1,'s2'],['s2','E',0.9,'s3'],['s1','E',-0.1,'s2'],['s2','W',-0.1,'s1']];
    function R(){seed=(seed*1103515245+12345)%2147483648;return seed/2147483648}
    function env(s,x){if(x==='E')return s==='s1'?['s2',-0.1]:['s3',0.9];return ['s1',-0.1]}
    function mx(s){return s==='s3'?0:Math.max(Q[s+'E'],Q[s+'W'])}
    function upd(s,x,r,n){var t=r+g.v*mx(n),d=t-Q[s+x];Q[s+x]+=a.v*d;log.push('('+s+', '+x+', '+(r>0?'+':'')+r+', '+n+'): target '+f2(t,4)+', δ '+f2(d,4)+' → Q('+s+','+x+') = '+f2(Q[s+x],4))}
    function reset(){Q={s1E:0,s1W:0,s2E:0,s2W:0};log=[];si=0;seed=7;draw()}
    function qstar(){var G=g.v,v2=0.9,v1=Math.max(-0.1+G*0.9,-0.1/(1-G));return {s1E:-0.1+G*v2,s1W:-0.1+G*v1,s2E:0.9,s2W:-0.1+G*v1}}
    function draw(){var S=qstar(),h='<table class="rules"><tr><td></td><td><b>Q(·, East)</b></td><td><b>Q(·, West)</b></td><td><b>greedy</b></td></tr>';
      ['s1','s2'].forEach(function(s){h+='<tr><td><b>'+s+'</b></td><td>'+f2(Q[s+'E'],4)+' <small>(Q* '+f2(S[s+'E'],3)+')</small></td><td>'+f2(Q[s+'W'],4)+' <small>(Q* '+f2(S[s+'W'],3)+')</small></td><td>'+(Q[s+'E']>=Q[s+'W']?'East':'West')+'</td></tr>'});
      box.innerHTML=h+'</table>';lg.textContent=log.length?log.slice(-12).join('\n'):'Press a button. Each line is one update.';
      stats(u.out,[['updates',log.length],['slide steps used',si+' of 5']]);}
    button(u.ctl,'Slide step',function(){if(si<5){var z=SL[si++];upd(z[0],z[1],z[2],z[3])}draw()});
    button(u.ctl,'Episode',function(){var s='s1',n=0;while(s!=='s3'&&n<50){var x=R()<0.3?(R()<0.5?'E':'W'):(Q[s+'E']>=Q[s+'W']?'E':'W');var e=env(s,x);upd(s,x,e[1],e[0]);s=e[0];n++}draw()});
    button(u.ctl,'Reset',reset);a.on(draw);g.on(draw);reset();
  },
  /* Exploration: the tempting exit */
  explore:function(host){
    var u=mk(host,'Does the learner find the long way round?','Corridor 0–1–2–3–4 from 0. West at 0 exits with 0.3; reaching 4 gives 1; γ = 0.95; α = 0.5. Ties go to West. Each run trains one Q-learner; the bar shows how many of 20 runs end up choosing East at 0 (the right answer). Start with ε = 0.2, then try ε = 0.5, more episodes, or initial Q = 1.','&#129517;');
    var e=slider(u.ctl,'ε',0,0.6,0.05,0.2,function(v){return f2(v,2)}),n=slider(u.ctl,'episodes',50,3000,50,300),o=slider(u.ctl,'initial Q',0,1,0.1,0,function(v){return f2(v,1)});
    function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
    function run(seed){var R=rng(seed),Q={},I=o.v;function g(s,a){return (s+a) in Q?Q[s+a]:I}
      for(var ep=0;ep<n.v;ep++){var s=0,steps=0;while(s!=='x'&&s!==4&&steps<200){var a=R()<e.v?(R()<0.5?'W':'E'):(g(s,'E')>g(s,'W')?'E':'W');
        var s2,r;if(a==='W'){if(s===0){s2='x';r=0.3}else{s2=s-1;r=0}}else{s2=s+1;r=s2===4?1:0}
        var nb=(s2==='x'||s2===4)?0:Math.max(g(s2,'W'),g(s2,'E'));Q[s+a]=g(s,a)+0.5*(r+0.95*nb-g(s,a));s=s2;steps++}}
      return [g(0,'E')>g(0,'W'),g(0,'E')]}
    function draw(){var hits=0,qe=0;for(var i=0;i<20;i++){var z=run(100+i);hits+=z[0]?1:0;qe+=z[1]}
      var F=frame(u.svg,640,90,[0,20],[0,1],{l:10,r:10,t:10,b:24});el('rect',{x:F.X(0),y:F.Y(.9),width:F.X(20)-F.X(0),height:F.Y(.1)-F.Y(.9),rx:8,style:'fill:var(--surface-2);stroke:var(--line)'},u.svg);
      el('rect',{x:F.X(0),y:F.Y(.9),width:F.X(hits)-F.X(0),height:F.Y(.1)-F.Y(.9),rx:8,style:'fill:var(--reg)'},u.svg);
      stats(u.out,[['runs choosing East at 0',hits+' / 20'],['average Q(0, East)',f2(qe/20,3)],['true Q*(0, East)',f2(Math.pow(0.95,3),3)],['Q(0,East) = 0.271 means','learned “go East, come back, exit”']]);}
    [e,n,o].forEach(function(z){z.on(draw)});draw();W.push(draw);
  },
  /* POMDP: belief update */
  belief:function(host){
    var u=mk(host,'Update the belief: which room am I in?','Rooms L and R. Each step the robot stays with the probability below (otherwise it is moved). Then it sees a window or not. Press an observation to predict, correct and normalise.','&#128301;');
    var st=slider(u.ctl,'P(stay)',0.5,1,0.05,0.9,function(v){return f2(v,2)}),wl=slider(u.ctl,'O(window | L)',0,1,0.05,0.8,function(v){return f2(v,2)}),wr=slider(u.ctl,'O(window | R)',0,1,0.05,0.3,function(v){return f2(v,2)});
    var lg=document.createElement('div');lg.className='log';host.appendChild(lg);var m,log;
    function reset(){m=[0.5,0.5];log=[];draw()}
    function obs(w){var p=st.v,pr=[m[0]*p+m[1]*(1-p),m[1]*p+m[0]*(1-p)],oL=w?wl.v:1-wl.v,oR=w?wr.v:1-wr.v,c=[pr[0]*oL,pr[1]*oR],z=c[0]+c[1];
      if(z<=0){log.push('impossible observation under this model');draw();return}
      m=[c[0]/z,c[1]/z];log.push((w?'window':'none  ')+': predict ('+f2(pr[0],3)+', '+f2(pr[1],3)+')  correct ('+f2(c[0],3)+', '+f2(c[1],3)+')  normalise → ('+f2(m[0],3)+', '+f2(m[1],3)+')');draw()}
    function draw(){var F=frame(u.svg,640,120,[0,1],[0,2],{l:30,r:14,t:10,b:20});
      [['L',m[0],1.35,'var(--reg)'],['R',m[1],0.45,'var(--cls)']].forEach(function(b){el('rect',{x:F.X(0),y:F.Y(b[2]+0.35),width:F.X(1)-F.X(0),height:F.Y(b[2]-0.35)-F.Y(b[2]+0.35),rx:6,style:'fill:var(--surface-2)'},u.svg);
        el('rect',{x:F.X(0),y:F.Y(b[2]+0.35),width:F.X(b[1])-F.X(0),height:F.Y(b[2]-0.35)-F.Y(b[2]+0.35),rx:6,style:'fill:'+b[3]},u.svg);
        var t=el('text',{x:F.pad.l-8,y:F.Y(b[2])+5,'text-anchor':'end','class':'axt'},u.svg);t.textContent=b[0]});
      lg.textContent=log.length?log.slice(-10).join('\n'):'Start at (0.5, 0.5). Try window, window, none (guide 8.5).';
      stats(u.out,[['P(L)',f2(m[0],3)],['P(R)',f2(m[1],3)],['best guess',m[0]>=m[1]?'L':'R'],['observations',log.length]]);}
    button(u.ctl,'&#129695; see window',function(){obs(true)});button(u.ctl,'&#11036; see nothing',function(){obs(false)});button(u.ctl,'Reset',reset);
    [st,wl,wr].forEach(function(z){z.on(draw)});reset();W.push(draw);
  }
};
function widgets(){document.querySelectorAll('[data-widget]').forEach(function(h){var f=builders[h.getAttribute('data-widget')];if(f){h.classList.add('widget');try{f(h)}catch(e){h.textContent='(interactive demo failed to load)'}}})}
})();
