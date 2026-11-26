/* Model Map: gated learning path (lessons, checkpoints, stage tests). Progress lives in localStorage. */
(function(){
"use strict";
var P=window.PATH;if(!P)return;
var KEY='mm-path-'+P.module;
function load(){try{var s=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){s={}}s.passed=s.passed||{};s.step=s.step||{};s.done=s.done||{};s.best=s.best||{};return s}
var S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
var STAGES=P.stages,ME=P.stage||null,IDX=-1;
STAGES.forEach(function(s,i){if(s.id===ME)IDX=i});

/* ---------- small helpers ---------- */
function h(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function typeset(el){var M=window.MathJax;if(M&&M.startup&&M.startup.promise){M.startup.promise.then(function(){return M.typesetPromise?M.typesetPromise([el]):null}).catch(function(){})}}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function f(x,d){if(d==null)d=3;if(!isFinite(x))return String(x);var s=(Math.round(x*Math.pow(10,d))/Math.pow(10,d)).toFixed(d);if(s.indexOf('.')>=0)s=s.replace(/0+$/,'').replace(/\.$/,'');if(s==='-0')s='0';return s}
function T(s){return '\\('+s+'\\)'}
function sg(x){return x<0?'- '+f(-x):'+ '+f(x)}           /* "+ 3" / "- 3" for writing sums */
function par(x){return x<0?'('+f(x)+')':f(x)}
function passedUpTo(i){for(var k=0;k<i;k++){if(!S.passed[STAGES[k].id])return false}return true}
function isOpen(i){return S.revision||passedUpTo(i)}
function firstOpenUnpassed(){for(var k=0;k<STAGES.length;k++){if(!S.passed[STAGES[k].id])return k}return -1}

/* ---------- answer parsing: numbers, fractions, + - * / ^, sqrt, log/ln, exp, e, pi ---------- */
function parseNum(str){
  var s=String(str).trim().toLowerCase().replace(/\s+/g,'').replace(/×/g,'*').replace(/−/g,'-').replace(/,/g,'');if(!s)return NaN;
  var i=0;
  function peek(){return s[i]}
  function expr(){var v=term();while(peek()==='+'||peek()==='-'){var o=s[i++],w=term();v=o==='+'?v+w:v-w}return v}
  function term(){var v=pow();for(;;){if(peek()==='*'||peek()==='/'){var o=s[i++],w=pow();v=o==='*'?v*w:v/w}else if(peek()&&/[a-z(]/.test(peek()))v*=pow();else break}return v}
  function pow(){var v=unary();if(peek()==='^'){i++;v=Math.pow(v,pow())}return v}
  function unary(){if(peek()==='-'){i++;return -unary()}if(peek()==='+'){i++;return unary()}return atom()}
  function atom(){
    var m=s.slice(i).match(/^(sqrt|ln|log|exp)/);
    if(m){i+=m[1].length;var a;if(peek()==='('){i++;a=expr();if(s[i++]!==')')throw 0}else a=unary();
      return m[1]==='sqrt'?Math.sqrt(a):m[1]==='exp'?Math.exp(a):Math.log(a)}
    if(peek()==='('){i++;var v=expr();if(s[i++]!==')')throw 0;return v}
    if(s.slice(i,i+2)==='pi'){i+=2;return Math.PI}
    if(peek()==='e'&&!/[0-9]/.test(s[i+1]||'')){i++;return Math.E}
    var n=s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/);if(!n)throw 0;i+=n[0].length;var x=parseFloat(n[0]);
    if(peek()==='%'){i++;x/=100}return x}
  try{var v=expr();if(i!==s.length)return NaN;return v}catch(e){return NaN}
}
function close(v,ans,tol){if(!isFinite(v))return false;var t=tol!=null?tol:Math.max(0.006,Math.abs(ans)*0.01);return Math.abs(v-ans)<=t+1e-12}

/* ======================================================================
   Generators: fresh numbers every time. Each returns
   {q: html, fields:[{label, answer, tol} | {label, type:'choice', options:[...], answer:'...'}], expl: html}
   ====================================================================== */
var G={
  /* ---- maths-first path generators ---- */
  /* Gaussian density value */
  gauss:function(){var mu=ri(-2,6),sd=pick([1,2,0.5]),x=mu+pick([-2,-1,-0.5,0.5,1,1.5,2])*sd;
    var z=(x-mu)/sd,q=z*z/2,fx=Math.exp(-q)/Math.sqrt(2*Math.PI*sd*sd);
    return {q:'<p>A Gaussian has mean '+T('\\mu='+mu)+' and standard deviation '+T('\\sigma='+sd)+' (so '+T('\\sigma^2='+f(sd*sd))+'). At '+T('x='+f(x))+' give the exponent term '+T('\\frac{(x-\\mu)^2}{2\\sigma^2}')+' and the density '+T('f(x)')+'.</p>',
      fields:[{label:'exponent term',answer:q,tol:0.005},{label:T('f(x)'),answer:fx,tol:Math.max(0.002,fx*0.01)}],
      expl:'<p>'+T('\\frac{('+f(x)+'-'+par(mu)+')^2}{2\\times'+f(sd*sd)+'}='+f(q,4))+'.</p><p>'+T('f(x)=\\frac{1}{\\sqrt{2\\pi\\cdot'+f(sd*sd)+'}}e^{-'+f(q,4)+'}='+f(1/Math.sqrt(2*Math.PI*sd*sd),4)+'\\times'+f(Math.exp(-q),4)+'='+f(fx,4))+'. Note the exponent is a <b>squared distance</b> scaled by the variance.</p>'};
  },
  /* L1 / L2 / L-infinity distances */
  minkowski:function(){var a=[ri(-4,4),ri(-4,4),ri(-4,4)],b=[ri(-4,4),ri(-4,4),ri(-4,4)];if(a.join()===b.join())b[0]+=2;
    var d=a.map(function(v,i){return Math.abs(v-b[i])}),l1=d.reduce(function(p,c){return p+c},0),l2=Math.sqrt(d.reduce(function(p,c){return p+c*c},0)),li=Math.max.apply(null,d);
    return {q:'<p>For '+T('x=('+a.join(', ')+')')+' and '+T('y=('+b.join(', ')+')')+' give the Manhattan '+T('(L_1)')+', Euclidean '+T('(L_2)')+' and maximum '+T('(L_\\infty)')+' distances.</p>',
      fields:[{label:T('L_1'),answer:l1,tol:0.001},{label:T('L_2'),answer:l2,tol:0.01},{label:T('L_\\infty'),answer:li,tol:0.001}],
      expl:'<p>Coordinate gaps '+T('|x_i-y_i|')+': '+d.join(', ')+'.</p><p>'+T('L_1='+d.join('+')+'='+l1)+'. '+T('L_2=\\sqrt{'+d.map(function(v){return v*v}).join('+')+'}='+f(l2))+'. '+T('L_\\infty=\\max='+li)+'. Always '+T('L_\\infty\\le L_2\\le L_1')+'.</p>'};
  },
  /* centroid and SSE about it (K-means update, leaf mean) */
  centroid:function(){var n=pick([3,4]),P=[];for(var i=0;i<n;i++)P.push([ri(-2,6),ri(-2,6)]);
    var m=[0,1].map(function(j){return P.reduce(function(s,p){return s+p[j]},0)/n});
    var sq=P.map(function(p){return (p[0]-m[0])*(p[0]-m[0])+(p[1]-m[1])*(p[1]-m[1])}),sse=sq.reduce(function(a,b){return a+b},0);
    return {q:'<p>A cluster holds the points '+P.map(function(p){return T('('+p.join(', ')+')')}).join(', ')+'. Give its centroid (mean) and the sum of squared Euclidean distances from the points to the centroid.</p>',
      fields:[{label:'mean '+T('x_1'),answer:m[0],tol:0.006},{label:'mean '+T('x_2'),answer:m[1],tol:0.006},{label:'SSE',answer:sse,tol:Math.max(0.02,sse*0.01)}],
      expl:'<p>Centroid: average each coordinate, '+T('\\mu=('+f(m[0])+', '+f(m[1])+')')+'.</p><p>Squared distances '+T('\\|x-\\mu\\|^2')+': '+sq.map(function(v){return f(v)}).join(', ')+'; total '+T(f(sse))+'. No other centre gives a smaller total: <b>the mean minimises squared error</b>.</p>'};
  },
  /* variance of an average of B correlated models */
  avgvar:function(){var s2=pick([1,2,4,9]),rho=pick([0,0.1,0.2,0.3,0.5]),B=pick([5,10,25,100]);var v=rho*s2+(1-rho)*s2/B;
    return {q:'<p>Each of '+T('B='+B)+' models has prediction variance '+T('\\sigma^2='+s2)+' and any two have correlation '+T('\\rho='+rho)+'. What is the variance of their average? What would it be with '+T('B\\to\\infty')+'?</p>',
      fields:[{label:'variance',answer:v,tol:Math.max(0.002,v*0.01)},{label:T('B\\to\\infty'),answer:rho*s2,tol:0.002}],
      expl:'<p>'+T('\\rho\\sigma^2+\\frac{1-\\rho}{B}\\sigma^2='+f(rho*s2)+'+\\frac{'+f(1-rho)+'}{'+B+'}\\times'+s2+'='+f(v,4))+'.</p><p>As '+T('B')+' grows the second term vanishes, leaving '+T('\\rho\\sigma^2='+f(rho*s2))+'. Only lowering '+T('\\rho')+' (random forests) pushes it further down.</p>'};
  },
  /* penalised objective: which candidate wins? */
  penalty:function(){var lam=pick([0.5,1,2,5,10]);var A={rss:ri(10,30),b:[ri(-4,4),ri(-4,4)]},Bc={rss:0,b:[ri(-2,2),ri(-2,2)]};
    var pa=A.b[0]*A.b[0]+A.b[1]*A.b[1],pb=Bc.b[0]*Bc.b[0]+Bc.b[1]*Bc.b[1];if(pa<=pb){A.b=[A.b[0]+3,A.b[1]];pa=A.b[0]*A.b[0]+A.b[1]*A.b[1]}
    Bc.rss=A.rss+ri(2,15);var oa=A.rss+lam*pa,ob=Bc.rss+lam*pb;if(Math.abs(oa-ob)<1e-9){Bc.rss+=1;ob+=1}
    return {q:'<p>Two fitted models: <b>A</b> has RSS '+T(A.rss)+' and coefficients '+T('('+A.b.join(', ')+')')+'; <b>B</b> has RSS '+T(Bc.rss)+' and coefficients '+T('('+Bc.b.join(', ')+')')+'. With the ridge objective '+T('\\mathrm{RSS}+\\lambda\\|\\beta\\|_2^2')+' and '+T('\\lambda='+lam)+', give both objective values and the winner.</p>',
      fields:[{label:'A',answer:oa,tol:0.01},{label:'B',answer:ob,tol:0.01},{label:'winner',type:'choice',options:['A','B'],answer:oa<ob?'A':'B'}],
      expl:'<p>'+T('\\|\\beta_A\\|^2='+pa+',\\ \\|\\beta_B\\|^2='+pb)+'.</p><p>A: '+T(A.rss+'+'+lam+'\\times'+pa+'='+f(oa))+'. B: '+T(Bc.rss+'+'+lam+'\\times'+pb+'='+f(ob))+'. The smaller objective wins: <b>'+(oa<ob?'A':'B')+'</b>. Bigger '+T('\\lambda')+' favours small coefficients even at the cost of a worse fit.</p>'};
  },
  /* KNN classification on a line */
  knn:function(){
    var xs=[];while(xs.length<6){var v=ri(0,12);if(xs.indexOf(v)<0)xs.push(v)}xs.sort(function(a,b){return a-b});
    var ys;do{ys=xs.map(function(){return pick(['A','B'])})}while(ys.indexOf('A')<0||ys.indexOf('B')<0);
    var K=pick([3,5]),x0=ri(xs[1],xs[4])+pick([0.3,0.6]);
    var d=xs.map(function(x,i){return {x:x,y:ys[i],d:Math.abs(x-x0)}}).sort(function(a,b){return a.d-b.d});
    var nb=d.slice(0,K),nA=nb.filter(function(o){return o.y==='A'}).length,pA=nA/K;
    var tbl='<table><tr><th>'+T('x')+'</th>'+xs.map(function(x){return '<td>'+x+'</td>'}).join('')+'</tr><tr><th>'+T('y')+'</th>'+ys.map(function(y){return '<td>'+y+'</td>'}).join('')+'</tr></table>';
    return {q:'<p>Training data:</p>'+tbl+'<p>Use KNN with '+T('K='+K)+' at '+T('x_0='+f(x0))+'. Give '+T('\\tilde P(Y=A\\mid x_0)')+' and the predicted class.</p>',
      fields:[{label:T('\\tilde P(A)'),answer:pA,tol:0.01},{label:'class',type:'choice',options:['A','B'],answer:pA>0.5?'A':'B'}],
      expl:'<p>Distances to '+T(f(x0))+', nearest first: '+d.map(function(o){return T(f(o.d,1))+' ('+o.y+')'}).join(', ')+'.</p><p>The '+K+' nearest have labels '+nb.map(function(o){return o.y}).join(', ')+', so '+T('\\tilde P(A)='+nA+'/'+K+'\\approx'+f(pA))+'. Majority vote: <b>'+(pA>0.5?'A':'B')+'</b>.</p>'};
  },
  /* Euclidean distance in R^3 */
  dist:function(){
    var a=[ri(-4,4),ri(-4,4),ri(-4,4)],b=[ri(-4,4),ri(-4,4),ri(-4,4)];
    var sq=a.map(function(v,i){return (v-b[i])*(v-b[i])}),s=sq.reduce(function(p,c){return p+c},0);
    return {q:'<p>Compute the Euclidean distance between '+T('x=('+a.join(', ')+')')+' and '+T("x'=("+b.join(', ')+')')+'.</p>',
      fields:[{label:T("d(x,x')"),answer:Math.sqrt(s),tol:0.01}],
      expl:'<p>'+T("d(x,x')=\\sqrt{\\sum_{i=1}^{3}(x_i-x'_i)^2}=\\sqrt{"+sq.join('+')+'}=\\sqrt{'+s+'}\\approx'+f(Math.sqrt(s)))+'.</p>'};
  },
  /* dot product / orthogonality (2023 Q1c) */
  dot:function(){
    var a=[ri(-3,3),ri(-3,3),ri(-3,3)],b;
    if(Math.random()<0.5){var c=[ri(-3,3),ri(-3,3),ri(-3,3)];b=[a[1]*c[2]-a[2]*c[1],a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0]];if(b.every(function(v){return v===0}))b=[ri(-4,4),ri(-4,4),ri(-4,4)]}
    else b=[ri(-5,5),ri(-5,5),ri(-5,5)];
    var p=a.map(function(v,i){return v*b[i]}),s=p.reduce(function(x,y){return x+y},0);
    return {q:'<p>Are '+T('u=('+a.join(', ')+')')+' and '+T('v=('+b.join(', ')+')')+' orthogonal? Give '+T('u\\cdot v')+' first.</p>',
      fields:[{label:T('u\\cdot v'),answer:s,tol:0.001},{label:'orthogonal?',type:'choice',options:['yes','no'],answer:s===0?'yes':'no'}],
      expl:'<p>'+T('u\\cdot v='+p.map(par).join('+')+'='+s)+'. Two vectors are orthogonal exactly when the dot product is 0, so the answer is <b>'+(s===0?'yes':'no')+'</b>.</p>'};
  },
  /* MSE */
  mse:function(){
    var y=[],yh=[];for(var i=0;i<4;i++){var v=ri(1,9);y.push(v);yh.push(v+pick([-1.5,-1,-0.5,0,0.5,1,2]))}
    var e=y.map(function(v,i){return yh[i]-v}),m=e.reduce(function(p,c){return p+c*c},0)/4;
    return {q:'<p>True responses '+T('y=('+y.join(', ')+')')+', predictions '+T('\\hat y=('+yh.map(function(v){return f(v)}).join(', ')+')')+'. Compute the MSE.</p>',
      fields:[{label:'MSE',answer:m,tol:0.005}],
      expl:'<p>Errors '+T('\\hat y_i-y_i')+': '+e.map(function(v){return f(v)}).join(', ')+'. Squared: '+e.map(function(v){return f(v*v)}).join(', ')+'. Average: '+T(f(m*4)+'/4='+f(m,4))+'.</p>'};
  },
  /* simple linear regression by hand */
  ols:function(){var D=olsData();
    return {q:'<p>Fit '+T('\\hat y=\\hat\\beta_0+\\hat\\beta_1x')+' by least squares to</p>'+D.tbl+'<p>Give '+T('\\hat\\beta_1')+' and '+T('\\hat\\beta_0')+' (2 decimal places is fine).</p>',
      fields:[{label:T('\\hat\\beta_1'),answer:D.b1,tol:0.006},{label:T('\\hat\\beta_0'),answer:D.b0,tol:0.006}],
      expl:'<p>'+T('\\bar x='+f(D.mx)+',\\ \\bar y='+f(D.my))+'. '+T('S_{xy}=\\sum(x_i-\\bar x)(y_i-\\bar y)='+f(D.sxy))+', '+T('S_{xx}=\\sum(x_i-\\bar x)^2='+f(D.sxx))+'.</p><p>'+T('\\hat\\beta_1=S_{xy}/S_{xx}='+f(D.b1,4))+', '+T('\\hat\\beta_0=\\bar y-\\hat\\beta_1\\bar x='+f(D.b0,4))+'.</p>'};
  },
  rsq:function(){var D=olsData();
    return {q:'<p>For the data below the least-squares line is '+T('\\hat y='+f(D.b0,4)+(D.b1<0?'-':'+')+f(Math.abs(D.b1),4)+'x')+'.</p>'+D.tbl+'<p>Compute the RSS and '+T('R^2')+'.</p>',
      fields:[{label:'RSS',answer:D.rss,tol:Math.max(0.02,D.rss*0.01)},{label:T('R^2'),answer:1-D.rss/D.tss,tol:0.006}],
      expl:'<p>Fitted values: '+D.yh.map(function(v){return f(v,2)}).join(', ')+'. Residuals '+T('e_i=y_i-\\hat y_i')+': '+D.e.map(function(v){return f(v,2)}).join(', ')+'. '+T('\\mathrm{RSS}=\\sum e_i^2='+f(D.rss,3))+'.</p><p>'+T('\\mathrm{TSS}=\\sum(y_i-\\bar y)^2='+f(D.tss,3))+', so '+T('R^2=1-\\mathrm{RSS}/\\mathrm{TSS}='+f(1-D.rss/D.tss,3))+'.</p>'};
  },
  /* ridge with one centred predictor */
  ridge:function(){var sxy=ri(3,20)*pick([1,-1]),sxx=ri(4,20),l=pick([1,2,5,10,20]);
    return {q:'<p>Centred data give '+T('S_{xy}='+sxy)+' and '+T('S_{xx}='+sxx)+'. For the one-predictor ridge fit '+T('\\min_\\beta\\sum(y_i-\\beta x_i)^2+\\lambda\\beta^2')+' with '+T('\\lambda='+l)+', what is '+T('\\hat\\beta^{\\text{ridge}}')+'? And least squares?</p>',
      fields:[{label:'ridge',answer:sxy/(sxx+l),tol:0.006},{label:'least squares',answer:sxy/sxx,tol:0.006}],
      expl:'<p>Set the derivative to zero: '+T('-2(S_{xy}-\\beta S_{xx})+2\\lambda\\beta=0')+', so '+T('\\hat\\beta^{\\text{ridge}}=\\frac{S_{xy}}{S_{xx}+\\lambda}=\\frac{'+sxy+'}{'+(sxx+l)+'}='+f(sxy/(sxx+l),4))+'. With '+T('\\lambda=0')+' it is '+T(sxy+'/'+sxx+'='+f(sxy/sxx,4))+': ridge is smaller in size (shrunk towards 0).</p>'};
  },
  /* one gradient-descent step */
  gd:function(){var sxy=ri(4,12),sxx=ri(4,12),b=pick([0,0.5,1,-0.5]),eta=pick([0.01,0.02,0.05]);
    if(2*eta*sxx>=1.6)eta=0.01;var g=-2*(sxy-b*sxx),b1=b-eta*g;
    return {q:'<p>Centred one-parameter model '+T('\\hat y=\\beta x')+' with '+T('\\mathrm{RSS}(\\beta)=\\sum(y_i-\\beta x_i)^2')+', where '+T('S_{xy}='+sxy+',\\ S_{xx}='+sxx)+'. From '+T('\\beta^{(0)}='+f(b))+' with learning rate '+T('\\eta='+eta)+', give the gradient and '+T('\\beta^{(1)}')+'.</p>',
      fields:[{label:'gradient',answer:g,tol:0.01},{label:T('\\beta^{(1)}'),answer:b1,tol:0.002}],
      expl:'<p>'+T("\\mathrm{RSS}'(\\beta)=-2(S_{xy}-\\beta S_{xx})=-2("+sxy+'-'+par(b)+'\\times'+sxx+')='+f(g))+'.</p><p>'+T('\\beta^{(1)}=\\beta^{(0)}-\\eta\\,\\mathrm{RSS}\'='+f(b)+'-'+eta+'\\times'+par(g)+'='+f(b1,4))+'. The minimum is at '+T(f(sxy/sxx,3))+'; GD moved towards it.</p>'};
  },
  /* logistic regression prediction, exam notation (2023 Q3e) */
  logit:function(){var l=[pick([-2,-1,-0.5,0,0.5,1,2]),pick([-2,-1,1,2,0.5]),pick([-2,-1,1,2,-0.5])],x=[pick([-2,-1,-0.5,0.5,1,2,1/3,-1/3]),pick([-2,-1,1,2,0.5])];
    var t=l[0]+l[1]*x[0]+l[2]*x[1],p=1/(1+Math.exp(-t));if(Math.abs(t)<1e-9){l[0]+=0.5;t+=0.5;p=1/(1+Math.exp(-t))}
    function fx(v){return Math.abs(v-1/3)<1e-9?'\\tfrac13':Math.abs(v+1/3)<1e-9?'-\\tfrac13':f(v)}
    return {q:'<p>A logistic regression model has parameters '+T('\\lambda=['+l.map(f).join(', ')+']')+', so '+T('P(Y=\\text{green}\\mid x)=\\sigma(\\lambda_0+\\lambda_1x_1+\\lambda_2x_2)')+'. For '+T('x=['+x.map(fx).join(', ')+']')+', give '+T('t=\\lambda\\cdot\\tilde x')+', the probability of green, and the prediction.</p>',
      fields:[{label:T('t'),answer:t,tol:0.006},{label:'P(green)',answer:p,tol:0.006},{label:'predict',type:'choice',options:['green','red'],answer:p>0.5?'green':'red'}],
      expl:'<p>'+T('t='+f(l[0])+'+'+par(l[1])+'\\cdot'+par(x[0])+'+'+par(l[2])+'\\cdot'+par(x[1])+'='+f(t,4))+'.</p><p>'+T('\\sigma(t)=\\frac{1}{1+e^{-t}}=\\frac{1}{1+e^{'+f(-t,3)+'}}\\approx'+f(p,4))+'. '+(p>0.5?'Above':'Below')+' 0.5, so predict <b>'+(p>0.5?'green':'red')+'</b>. (Shortcut: '+T('\\sigma(t)>0.5\\iff t>0')+'.)</p>'};
  },
  /* odds multiplier */
  odds:function(){var b=pick([0.2,0.5,0.7,-0.3,-0.8,1.2]),dx=pick([1,2,5]);var m=Math.exp(b*dx);
    return {q:'<p>In a logistic regression '+T('\\hat\\beta_1='+b)+'. By what factor are the odds multiplied when '+T('x_1')+' rises by '+dx+' (other inputs fixed)?</p>',fields:[{label:'factor',answer:m,tol:Math.max(0.001,m*0.015)}],
      expl:'<p>Log-odds are linear: '+T('\\log\\frac{p}{1-p}=\\beta_0+\\beta_1x_1+\\dots')+'. Adding '+dx+' to '+T('x_1')+' adds '+T(f(b*dx))+' to the log-odds, so the odds are multiplied by '+T('e^{'+f(b*dx)+'}\\approx'+f(m,3))+'.</p>'};
  },
  /* negative log-likelihood */
  nll:function(){var n=pick([3,4]),y=[],p=[];for(var i=0;i<n;i++){y.push(ri(0,1));p.push(pick([0.1,0.2,0.3,0.4,0.6,0.7,0.8,0.9]))}
    var terms=y.map(function(v,i){return v?p[i]:1-p[i]}),L=-terms.reduce(function(s,v){return s+Math.log(v)},0);
    return {q:'<p>Labels '+T('y=('+y.join(', ')+')')+', model probabilities '+T('p_i=P(Y=1\\mid x_i)=('+p.join(', ')+')')+'. Compute the likelihood '+T('\\ell')+' and the negative log-likelihood (natural log).</p>',
      fields:[{label:T('\\ell'),answer:Math.exp(-L),tol:0.002},{label:'NLL',answer:L,tol:0.01}],
      expl:'<p>Each point contributes '+T('p_i')+' if '+T('y_i=1')+' and '+T('1-p_i')+' if '+T('y_i=0')+': '+terms.map(function(v){return f(v)}).join(', ')+'.</p><p>'+T('\\ell='+terms.map(function(v){return f(v)}).join('\\times')+'='+f(Math.exp(-L),4))+', '+T('-\\log\\ell='+f(L,3))+'.</p>'};
  },
  /* softmax and cross-entropy */
  softmax:function(){var z=[ri(-1,3),ri(-1,3),ri(-1,3)],k=ri(0,2);var e=z.map(Math.exp),s=e.reduce(function(a,b){return a+b},0),p=e.map(function(v){return v/s});
    return {q:'<p>A 3-class model outputs scores (logits) '+T('z=('+z.join(', ')+')')+' for classes 0, 1, 2. The true class is '+k+'. Give '+T('p_'+k)+' after softmax and the cross-entropy loss '+T('-\\log p_'+k)+'.</p>',
      fields:[{label:T('p_'+k),answer:p[k],tol:0.005},{label:'loss',answer:-Math.log(p[k]),tol:0.01}],
      expl:'<p>'+T('e^{z}=('+e.map(function(v){return f(v)}).join(', ')+')')+', total '+T(f(s))+'. So '+T('p=('+p.map(function(v){return f(v)}).join(', ')+')')+' and the loss is '+T('-\\log '+f(p[k])+'='+f(-Math.log(p[k])))+'.</p>'};
  },
  /* Bayes' theorem */
  bayes:function(){var pi=pick([0.01,0.02,0.05,0.1,0.2]),a=pick([0.7,0.8,0.9,0.95]),b=pick([0.05,0.1,0.15,0.2]);var num=pi*a,den=num+(1-pi)*b;
    return {q:'<p>'+f(pi*100)+'% of customers default. A late payment is seen in '+f(a*100)+'% of defaulters and '+f(b*100)+'% of non-defaulters. A customer has a late payment. What is '+T('P(\\text{default}\\mid\\text{late})')+'?</p>',fields:[{label:'posterior',answer:num/den,tol:0.005}],
      expl:'<p>'+T('\\frac{\\pi_1f_1}{\\pi_1f_1+\\pi_0f_0}=\\frac{'+pi+'\\times'+a+'}{'+pi+'\\times'+a+'+'+f(1-pi)+'\\times'+b+'}=\\frac{'+f(num,4)+'}{'+f(den,4)+'}='+f(num/den,4))+'. The prior matters: rare classes stay unlikely.</p>'};
  },
  /* LDA, one predictor */
  lda:function(){var c0=[],c1=[];var b0=ri(0,3),b1=ri(6,9);while(c0.length<pick([2,3])){var v=b0+ri(0,3);if(c0.indexOf(v)<0)c0.push(v)}while(c1.length<3){var w=b1+ri(0,3);if(c1.indexOf(w)<0)c1.push(w)}
    c0.sort(function(a,b){return a-b});c1.sort(function(a,b){return a-b});
    function mean(a){return a.reduce(function(s,v){return s+v},0)/a.length}function ss(a,m){return a.reduce(function(s,v){return s+(v-m)*(v-m)},0)}
    var m0=mean(c0),m1=mean(c1),n=c0.length+c1.length,s2=(ss(c0,m0)+ss(c1,m1))/(n-2),p0=c0.length/n,p1=c1.length/n,xs=(m0+m1)/2+s2/(m1-m0)*Math.log(p0/p1);
    return {q:'<p>One predictor. Class 0: '+T('x=('+c0.join(', ')+')')+'. Class 1: '+T('x=('+c1.join(', ')+')')+'. Fit LDA and give the pooled variance '+T('\\hat\\sigma^2')+' and the decision boundary '+T('x^*')+'.</p>',
      fields:[{label:T('\\hat\\sigma^2'),answer:s2,tol:0.01},{label:T('x^*'),answer:xs,tol:0.01}],
      expl:'<p>'+T('\\hat\\pi_0='+c0.length+'/'+n+',\\ \\hat\\pi_1='+c1.length+'/'+n+',\\ \\hat\\mu_0='+f(m0)+',\\ \\hat\\mu_1='+f(m1))+'.</p><p>Pooled: '+T('\\hat\\sigma^2=\\frac{'+f(ss(c0,m0))+'+'+f(ss(c1,m1))+'}{'+n+'-2}='+f(s2,4))+'.</p><p>'+T('x^*=\\frac{\\mu_0+\\mu_1}{2}+\\frac{\\sigma^2}{\\mu_1-\\mu_0}\\log\\frac{\\pi_0}{\\pi_1}='+f((m0+m1)/2,4)+'+'+f(s2/(m1-m0),4)+'\\times'+par(+f(Math.log(p0/p1),4))+'='+f(xs,4))+'.</p>'};
  },
  /* confusion matrix */
  confusion:function(){var TP=ri(20,60),FN=ri(5,25),FP=ri(5,40),TN=ri(60,150),P=TP+FN,N=FP+TN;
    return {q:'<p>Confusion matrix: TP = '+TP+', FN = '+FN+', FP = '+FP+', TN = '+TN+'. Give the true positive rate (sensitivity), the false positive rate and the accuracy.</p>',
      fields:[{label:'TPR',answer:TP/P,tol:0.005},{label:'FPR',answer:FP/N,tol:0.005},{label:'accuracy',answer:(TP+TN)/(P+N),tol:0.005}],
      expl:'<p>'+T('P=TP+FN='+P+',\\ N=FP+TN='+N)+'. TPR '+T('='+TP+'/'+P+'='+f(TP/P))+', FPR '+T('='+FP+'/'+N+'='+f(FP/N))+', accuracy '+T('=('+TP+'+'+TN+')/'+(P+N)+'='+f((TP+TN)/(P+N)))+'.</p>'};
  },
  /* AUC by counting pairs */
  auc:function(){var sc=shuffle([0.95,0.9,0.85,0.8,0.7,0.6,0.55,0.45,0.4,0.3,0.2,0.1]).slice(0,6).sort(function(a,b){return b-a});var lab=shuffle([1,1,1,0,0,0]);
    var pos=sc.filter(function(s,i){return lab[i]}),neg=sc.filter(function(s,i){return !lab[i]}),w=0,parts=[];
    pos.forEach(function(p){var c=neg.filter(function(n){return p>n}).length;w+=c;parts.push(f(p)+' beats '+c)});
    return {q:'<p>Scores and true labels:</p><table><tr><th>'+T('\\hat p')+'</th>'+sc.map(function(s){return '<td>'+s+'</td>'}).join('')+'</tr><tr><th>'+T('y')+'</th>'+lab.map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr></table><p>Compute the AUC by counting (positive, negative) pairs.</p>',
      fields:[{label:'AUC',answer:w/9,tol:0.006}],expl:'<p>'+parts.join('; ')+'. Total '+w+' of '+T('3\\times3=9')+' pairs, so AUC '+T('='+w+'/9\\approx'+f(w/9))+'.</p>'};
  },
  /* impurity of a leaf */
  impurity:function(){var a=ri(1,9),b=ri(0,6);if(a+b<3)b+=2;var n=a+b,p=a/n,q=b/n,g=2*p*q,e=-(p>0?p*Math.log(p):0)-(q>0?q*Math.log(q):0);
    return {q:'<p>A leaf holds '+a+' "yes" and '+b+' "no". Compute its classification error, Gini index and entropy (natural log).</p>',
      fields:[{label:'error',answer:1-Math.max(p,q),tol:0.005},{label:'Gini',answer:g,tol:0.005},{label:'entropy',answer:e,tol:0.006}],
      expl:'<p>'+T('\\hat p_{yes}='+a+'/'+n+'='+f(p))+'. Error '+T('=1-\\max(\\hat p)='+f(1-Math.max(p,q)))+'. Gini '+T('=2\\hat p(1-\\hat p)='+f(g))+'. Entropy '+T('=-\\hat p\\log\\hat p-(1-\\hat p)\\log(1-\\hat p)='+f(e))+'.</p>'};
  },
  /* Gini gain of a split */
  gain:function(){var l=[ri(0,6),ri(0,6)],r=[ri(0,6),ri(0,6)];if(l[0]+l[1]===0)l[0]=2;if(r[0]+r[1]===0)r[1]=2;
    function gi(c){var n=c[0]+c[1],p=c[0]/n;return 2*p*(1-p)}var P=[l[0]+r[0],l[1]+r[1]],nl=l[0]+l[1],nr=r[0]+r[1],n=nl+nr,after=(nl*gi(l)+nr*gi(r))/n;
    return {q:'<p>A region has '+P[0]+' A and '+P[1]+' B. A split sends ('+l[0]+' A, '+l[1]+' B) left and ('+r[0]+' A, '+r[1]+' B) right. Compute the Gini index before, the size-weighted Gini after, and the gain.</p>',
      fields:[{label:'before',answer:gi(P),tol:0.005},{label:'after',answer:after,tol:0.005},{label:'gain',answer:gi(P)-after,tol:0.006}],
      expl:'<p>Before: '+T('2\\cdot\\frac{'+P[0]+'}{'+n+'}\\cdot\\frac{'+P[1]+'}{'+n+'}='+f(gi(P)))+'. Left Gini '+f(gi(l))+', right Gini '+f(gi(r))+'. After: '+T('\\frac{'+nl+'}{'+n+'}('+f(gi(l))+')+\\frac{'+nr+'}{'+n+'}('+f(gi(r))+')='+f(after))+'. Gain '+T('='+f(gi(P)-after))+'.</p>'};
  },
  /* regression stump: best first split */
  split:function(){var xs=[1,2,3,4,5].slice(0,pick([4,5])),ys=xs.map(function(){return ri(0,12)});
    function rss(a){if(!a.length)return 0;var m=a.reduce(function(s,v){return s+v},0)/a.length;return a.reduce(function(s,v){return s+(v-m)*(v-m)},0)}
    var c=[];for(var i=1;i<xs.length;i++){c.push({s:(xs[i-1]+xs[i])/2,r:rss(ys.slice(0,i))+rss(ys.slice(i))})}
    var best=c.slice().sort(function(a,b){return a.r-b.r})[0];if(c.filter(function(o){return Math.abs(o.r-best.r)<1e-9}).length>1)return G.split();
    return {q:'<p>Regression data:</p><table><tr><th>'+T('x')+'</th>'+xs.map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr><tr><th>'+T('y')+'</th>'+ys.map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr></table><p>Which cutpoint gives the best first split, and what is the total RSS after it?</p>',
      fields:[{label:'cutpoint',type:'choice',options:c.map(function(o){return f(o.s)}),answer:f(best.s)},{label:'RSS',answer:best.r,tol:0.02}],
      expl:'<p>'+c.map(function(o){return 'cut at '+f(o.s)+': RSS '+f(o.r,3)}).join('; ')+'. Smallest: <b>'+f(best.s)+'</b> with RSS '+f(best.r,3)+'.</p>'};
  },
  /* 2024-style decision stump with entropy */
  stump:function(){var xs=[],lab=[];while(xs.length<5){var v=ri(-3,14);if(xs.indexOf(v)<0)xs.push(v)}xs.sort(function(a,b){return a-b});
    var xi=Math.floor((xs[1]+xs[2])/2)+0.5;if(xi<=xs[1]||xi>=xs[3])xi=(xs[1]+xs[2])/2;
    lab=xs.map(function(){return pick(['yes','no'])});
    var L=lab.filter(function(v,i){return xs[i]<xi}),R=lab.filter(function(v,i){return xs[i]>=xi});
    function H(a){if(!a.length)return 0;var p=a.filter(function(v){return v==='yes'}).length/a.length,q=1-p;return -(p>0?p*Math.log(p):0)-(q>0?q*Math.log(q):0)}
    var Hs=L.length*H(L)+R.length*H(R),x0=xs[3]+0.5,pr=R.filter(function(v){return v==='yes'}).length/R.length;if(pr===0.5)return G.stump();
    return {q:'<p>Data '+T('D=\\{'+xs.map(function(x,i){return '('+x+',\\text{'+lab[i]+'})'}).join(',')+'\\}')+'. A decision stump splits at '+T('\\xi='+f(xi))+': '+T('B_1=\\{X<\\xi\\}')+', '+T('B_2=\\{X\\ge\\xi\\}')+'. Compute '+T('H^*(T)=|B_1|H(B_1)+|B_2|H(B_2)')+' (natural log) and the prediction at '+T('X='+f(x0))+'.</p>',
      fields:[{label:T('H^*(T)'),answer:Hs,tol:0.01},{label:'predict',type:'choice',options:['yes','no'],answer:pr>0.5?'yes':'no'}],
      expl:'<p>'+T('B_1')+' holds '+L.join(', ')+' ('+T('H='+f(H(L)))+'); '+T('B_2')+' holds '+R.join(', ')+' ('+T('H='+f(H(R)))+').</p><p>'+T('H^*='+L.length+'('+f(H(L))+')+'+R.length+'('+f(H(R))+')='+f(Hs))+'. '+T('X='+f(x0))+' is in '+T('B_2')+' where '+T('\\hat p_{yes}='+f(pr))+', so predict <b>'+(pr>0.5?'yes':'no')+'</b>.</p>'};
  },
  /* cost-complexity pruning choice */
  prune:function(){var r=[ri(80,120)];var leaves=[1,2,3,5,8];for(var i=1;i<leaves.length;i++)r.push(Math.max(0,r[i-1]-ri(i<2?30:3,i<2?60:20)));
    var a=pick([2,5,8,12,25]),C=leaves.map(function(L,i){return r[i]+a*L}),bi=C.indexOf(Math.min.apply(null,C));if(C.filter(function(c){return c===C[bi]}).length>1)return G.prune();
    return {q:'<p>Nested subtrees with (leaves, training RSS): '+leaves.map(function(L,i){return '('+L+', '+r[i]+')'}).join(', ')+'. With '+T('\\alpha='+a)+', which subtree minimises '+T('C_\\alpha(T)=\\mathrm{RSS}+\\alpha|T|')+'?</p>',
      fields:[{label:'leaves',type:'choice',options:leaves.map(String),answer:String(leaves[bi])},{label:T('C_\\alpha'),answer:C[bi],tol:0.01}],
      expl:'<p>'+leaves.map(function(L,i){return T(r[i]+'+'+a+'\\times'+L+'='+C[i])}).join(', ')+'. Smallest: the <b>'+leaves[bi]+'-leaf</b> tree. Each extra leaf must cut the RSS by more than '+T('\\alpha')+' to pay for itself.</p>'};
  },
  /* count NN parameters */
  nnparams:function(){var p=ri(2,12),K=pick([3,4,5,8,10,16,20]),M=pick([1,1,3,10]);
    return {q:'<p>A neural network has '+p+' inputs, one hidden layer of '+K+' neurons and '+M+' output'+(M>1?'s':'')+'. Every neuron has a bias. How many parameters?</p>',fields:[{label:'parameters',answer:K*(p+1)+M*(K+1),tol:0.01}],
      expl:'<p>Hidden layer: '+T('K(p+1)='+K+'\\times'+(p+1)+'='+K*(p+1))+'. Output: '+T('M(K+1)='+M+'\\times'+(K+1)+'='+M*(K+1))+'. Total <b>'+(K*(p+1)+M*(K+1))+'</b>.</p>'};
  },
  /* NN forward pass, 2025 style */
  nnfwd:function(){var K=3,W=[],x=[ri(-2,2),ri(-2,2)];for(var k=0;k<K;k++)W.push([ri(-2,2),ri(-2,2),ri(-2,2)]);var b=[ri(-3,2),ri(-2,3),ri(-2,3),ri(-2,3)];
    var z=W.map(function(w){return w[0]+w[1]*x[0]+w[2]*x[1]}),A=z.map(function(v){return Math.max(0,v)}),out=b[0]+b[1]*A[0]+b[2]*A[1]+b[3]*A[2];
    return {q:'<p>Hidden neuron '+T('k')+' computes '+T('A_k=\\mathrm{ReLU}(w_{k0}+w_{k1}X_1+w_{k2}X_2)')+' with '+W.map(function(w,k){return T('w_'+(k+1)+'=['+w.join(', ')+']')}).join(', ')+'. The output is '+T('f(X)=\\beta_0+\\sum_k\\beta_kA_k')+' with '+T('\\beta=['+b.join(', ')+']')+'. Compute '+T('f(X)')+' for '+T('X=['+x.join(', ')+']')+'.</p>',
      fields:[{label:T('f(X)'),answer:out,tol:0.001}],
      expl:'<p>'+T('z=('+z.join(', ')+')')+', after ReLU '+T('A=('+A.join(', ')+')')+'. '+T('f='+b[0]+'+'+par(b[1])+'\\cdot'+A[0]+'+'+par(b[2])+'\\cdot'+A[1]+'+'+par(b[3])+'\\cdot'+A[2]+'='+out)+'.</p>'};
  },
  /* one backprop gradient */
  backprop:function(){var w=[[ri(-1,1),ri(-1,2)],[ri(-1,1),ri(-2,1)]],b=[pick([0,0.5,1]),ri(1,2),ri(1,2)],x=pick([1,2,-1]),y=ri(0,5);
    var z=w.map(function(v){return v[0]+v[1]*x}),A=z.map(function(v){return Math.max(0,v)}),fx=b[0]+b[1]*A[0]+b[2]*A[1],e=y-fx,g1=-2*e*A[0],gw=-2*e*b[1]*(z[0]>0?1:0)*x;
    return {q:'<p>One input, two ReLU hidden units with '+T('(w_{10},w_{11})=('+w[0].join(', ')+')')+', '+T('(w_{20},w_{21})=('+w[1].join(', ')+')')+', output '+T('f=\\beta_0+\\beta_1A_1+\\beta_2A_2')+' with '+T('\\beta=('+b.join(', ')+')')+'. One training point '+T('x='+x+',\\ y='+y)+', loss '+T('R=(y-f)^2')+'. Give '+T('\\partial R/\\partial\\beta_1')+' and '+T('\\partial R/\\partial w_{11}')+'.</p>',
      fields:[{label:T('\\partial R/\\partial\\beta_1'),answer:g1,tol:0.01},{label:T('\\partial R/\\partial w_{11}'),answer:gw,tol:0.01}],
      expl:'<p>Forward: '+T('z=('+z.join(', ')+'),\\ A=('+A.join(', ')+'),\\ f='+f(fx))+', residual '+T('e=y-f='+f(e))+'.</p><p>'+T('\\partial R/\\partial\\beta_1=-2eA_1='+f(g1))+'. '+T('\\partial R/\\partial w_{11}=-2e\\,\\beta_1\\,\\mathrm{ReLU}\'(z_1)\\,x='+f(-2*e)+'\\times'+b[1]+'\\times'+(z[0]>0?1:0)+'\\times'+par(x)+'='+f(gw))+(z[0]>0?'':' (unit 1 is off, so no gradient reaches it)')+'.</p>'};
  },
  /* polynomial / basis parameters (2024 Q1) */
  polydf:function(){var d=ri(1,5),pp=pick([1,2]);var n=pp===1?d+1:(d+1)*(d+2)/2;
    return {q:'<p>A polynomial regression of degree '+d+' in '+(pp===1?'one input '+T('X'):'two inputs '+T('X_1,X_2')+' (all monomials of total degree at most '+d+')')+' is written '+T('f(X)=\\lambda\\cdot\\phi(X)')+'. How many parameters (degrees of freedom) does it have, including the intercept?</p>',fields:[{label:'parameters',answer:n,tol:0.01}],
      expl:pp===1?'<p>'+T('\\phi(X)=(1,X,\\dots,X^{'+d+'})')+' has '+(d+1)+' entries, so '+T('\\lambda\\in\\mathbb R^{'+(d+1)+'}')+'.</p>':'<p>Count the monomials '+T('X_1^aX_2^b')+' with '+T('a+b\\le'+d)+': there are '+T('\\binom{'+(d+2)+'}{2}='+n)+'. (Degree 2 gives '+T('1,X_1,X_2,X_1^2,X_1X_2,X_2^2')+': 6.)</p>'};
  }  ,
  /* ---------- weeks 5-7 ---------- */
  /* binomial sign test from a contingency table (week 5 slides 27-35) */
  signtest:function(){var N=ri(8,14),k=ri(Math.ceil(N/2)+1,N-1),a=ri(60,200),c=ri(5,30);
    function C(n,r){var v=1;for(var i=1;i<=r;i++)v=v*(n-r+i)/i;return v}
    var p=0;for(var j=k;j<=N;j++)p+=C(N,j);p/=Math.pow(2,N);var dec=p<=0.05?'reject':'do not reject';
    var tbl='<table><tr><th></th><th>Alg 1 correct</th><th>Alg 1 wrong</th></tr><tr><th>Alg 0 correct</th><td>'+a+'</td><td>'+(N-k)+'</td></tr><tr><th>Alg 0 wrong</th><td>'+k+'</td><td>'+c+'</td></tr></table>';
    return {q:'<p>Two classifiers on the same test set:</p>'+tbl+'<p>'+T('H_0')+': Algorithm 1 is not better than Algorithm 0. Compute the one-sided p-value '+T('P(Y\\ge k)')+' with '+T('Y\\sim\\mathrm{Binomial}(N,\\tfrac12)')+', and decide at the 5% level.</p>',
      fields:[{label:T('N'),answer:N,tol:0.01},{label:T('k'),answer:k,tol:0.01},{label:'p-value',answer:p,tol:Math.max(0.0005,p*0.01)},{label:'at 5%',type:'choice',options:['reject','do not reject'],answer:dec}],
      expl:'<p>Discard the '+a+' + '+c+' agreements. '+T('N='+(N-k)+'+'+k+'='+N)+' disagreements; Algorithm 1 wins '+T('k='+k)+'.</p><p>'+T('p=\\sum_{j='+k+'}^{'+N+'}\\binom{'+N+'}{j}/2^{'+N+'}')+' = '+f(p,4)+'. '+(p<=0.05?f(p,4)+' ≤ 0.05: <b>reject</b> '+T('H_0')+' at 5%'+(p<=0.01?' (and at 1%)':' (but not at 1%)')+'.':f(p,4)+' > 0.05: <b>cannot reject</b> '+T('H_0')+'.')+'</p>'};
  },
  /* probability a point is out of bag */
  bootprob:function(){var n=pick([2,3,4,5,6,8,10,20,50]),p=Math.pow(1-1/n,n);
    return {q:'<p>A training set has '+T('n='+n)+' distinct observations. What is the probability that a particular observation is <b>not</b> in a bootstrap sample (and so is out-of-bag for that tree)?</p>',fields:[{label:'probability',answer:p,tol:0.001}],
      expl:'<p>Each of the '+n+' draws misses it with probability '+T('1-\\tfrac1{'+n+'}')+', independently: '+T('(1-\\tfrac1{'+n+'})^{'+n+'}='+f(p,4))+'. As '+T('n\\to\\infty')+' this tends to '+T('1/e\\approx0.368')+'.</p>'};
  },
  /* OOB MSE, 2023 / 2025 style */
  oob:function(){var n=4,xs=[0,1,2,3].map(function(i){return i*ri(1,3)+ri(0,1)});for(var i=1;i<n;i++)if(xs[i]<=xs[i-1])xs[i]=xs[i-1]+1;
    var ys=xs.map(function(){return ri(0,10)}),B=5,S=[],P=[],tries=0;
    do{S=[];for(var b=0;b<B;b++){var s=[];for(var j=0;j<n;j++)s.push(ri(0,n-1));s.sort();S.push(s)}tries++}
    while(tries<200&&![0,1,2,3].every(function(i){return S.some(function(s){return s.indexOf(i)<0})}));
    for(var b2=0;b2<B;b2++)P.push(ys.map(function(y){return y+ri(-3,3)}));
    var oob=[],err=0;for(var i2=0;i2<n;i2++){var ps=[];for(var b3=0;b3<B;b3++)if(S[b3].indexOf(i2)<0)ps.push(P[b3][i2]);var m=ps.reduce(function(a,v){return a+v},0)/ps.length;oob.push({m:m,ps:ps,sets:S.map(function(s,bb){return s.indexOf(i2)<0?bb+1:0}).filter(Boolean)});err+=(ys[i2]-m)*(ys[i2]-m)}
    var mse=err/n,a=ri(0,3),b4;do{b4=ri(0,3)}while(b4===a);
    var pt=function(i){return '('+xs[i]+', '+ys[i]+')'};
    var tbl='<table><tr><th>BTS</th>'+xs.map(function(x){return '<th>'+T('\\hat y('+x+')')+'</th>'}).join('')+'</tr>'+S.map(function(s,bb){return '<tr><td>'+T('\\{'+s.map(function(i){return pt(i)}).join(', ')+'\\}')+'</td>'+P[bb].map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr>'}).join('')+'</table>';
    return {q:'<p>Data '+T('D=\\{'+xs.map(function(x,i){return pt(i)}).join(', ')+'\\}')+'. Five bootstrapped training sets and their models\' predictions:</p>'+tbl+'<p>Find the OOB predictions at '+T('x='+xs[a])+' and '+T('x='+xs[b4])+', and the OOB MSE over all four points.</p>',
      fields:[{label:'OOB at '+xs[a],answer:oob[a].m,tol:0.01},{label:'OOB at '+xs[b4],answer:oob[b4].m,tol:0.01},{label:'OOB MSE',answer:mse,tol:0.01}],
      expl:'<p>'+xs.map(function(x,i){return T('x='+x)+' is missing from BTS '+oob[i].sets.join(', ')+': '+T('('+oob[i].ps.join('+')+')/'+oob[i].ps.length+'='+f(oob[i].m))}).join('<br>')+'</p><p>OOB MSE '+T('=\\tfrac14['+xs.map(function(x,i){return '('+ys[i]+'-'+par(oob[i].m)+')^2'}).join('+')+']='+f(mse))+'. Use only the sets that do <b>not</b> contain the point.</p>'};
  },
  /* one boosting step (week 6 slide 33) */
  boost:function(){var r=[0,0,0,0,0].map(function(){return ri(-3,6)}),t=r.map(function(v){return v+ri(-2,2)}),eta=pick([0.1,0.2,0.5,1]),i=ri(0,4),j;do{j=ri(0,4)}while(j===i);
    var nr=r.map(function(v,k){return v-eta*t[k]});
    return {q:'<p>One step of boosting with learning rate '+T('\\eta='+eta)+'. Residuals at the start of the step: '+T('r=('+r.join(', ')+')')+'. The new tree, fitted to them, predicts '+T('('+t.join(', ')+')')+' at the five training points. Give the new residuals '+T('r_'+(i+1))+' and '+T('r_'+(j+1))+', and the amount by which the model\'s prediction '+T('\\hat f(x_'+(i+1)+')')+' changes.</p>',
      fields:[{label:T('r_'+(i+1)),answer:nr[i],tol:0.001},{label:T('r_'+(j+1)),answer:nr[j],tol:0.001},{label:'change in '+T('\\hat f(x_'+(i+1)+')'),answer:eta*t[i],tol:0.001}],
      expl:'<p>'+T('r_i:=r_i-\\eta\\hat f^b(x_i)')+': new residuals '+T('('+nr.map(function(v){return f(v)}).join(', ')+')')+'. The model gains '+T('\\eta\\hat f^b(x_'+(i+1)+')='+eta+'\\times'+par(t[i])+'='+f(eta*t[i]))+' at '+T('x_'+(i+1))+', exactly what the residual loses.</p>'};
  },
  /* K-means in 1D from a given initial assignment (lecture version) */
  kmeans1d:function(){var xs=[];while(xs.length<6){var v=ri(0,20);if(xs.indexOf(v)<0)xs.push(v)}xs.sort(function(a,b){return a-b});
    var lab;do{lab=xs.map(function(){return ri(0,1)})}while(lab.indexOf(0)<0||lab.indexOf(1)<0);var init=lab.slice(),it=0,hist=[];
    while(it<20){var c=[0,1].map(function(k){var s=0,n=0;xs.forEach(function(x,i){if(lab[i]===k){s+=x;n++}});return n?s/n:null});
      var nw=xs.map(function(x,i){var o=lab[i],other=1-o;if(c[other]===null)return o;return Math.abs(x-c[other])<Math.abs(x-c[o])-1e-12?other:o});
      hist.push(c.slice());it++;if(nw.join()===lab.join())break;lab=nw}
    var J=0;[0,1].forEach(function(k){var pts=xs.filter(function(x,i){return lab[i]===k});if(!pts.length)return;var m=pts.reduce(function(a,v){return a+v},0)/pts.length;pts.forEach(function(x){J+=(x-m)*(x-m)})});
    var sizeMin=lab.filter(function(l){return l===lab[0]}).length;
    return {q:'<p>Run K-means ('+T('K=2')+', the lecture algorithm) on '+T(xs.join(',\\ '))+' from the initial clusters '+T('A=\\{'+xs.filter(function(x,i){return init[i]===0}).join(', ')+'\\}')+', '+T('B=\\{'+xs.filter(function(x,i){return init[i]===1}).join(', ')+'\\}')+'. Give the size of the final cluster containing '+xs[0]+' and the final '+T('J_{SSE}')+'.</p>',
      fields:[{label:'size',answer:sizeMin,tol:0.01},{label:T('J_{SSE}'),answer:J,tol:0.01}],
      expl:'<p>Centroids by iteration: '+hist.map(function(c,k){return '('+(c[0]===null?'–':f(c[0]))+', '+(c[1]===null?'–':f(c[1]))+')'}).join(' → ')+'. Final clusters '+T('\\{'+xs.filter(function(x,i){return lab[i]===0}).join(', ')+'\\}')+' and '+T('\\{'+xs.filter(function(x,i){return lab[i]===1}).join(', ')+'\\}')+'; '+T('J_{SSE}='+f(J))+' (sum of squared distances to each cluster mean).</p>'};
  },
  /* linkages between two small 2D clusters (2023 Q5b, q07 Q19) */
  linkage:function(){var pts=function(){return [ri(-4,5),ri(-4,5)]},A=[pts(),pts()],B=[pts(),pts(),pts()];
    var D=[];A.forEach(function(a){B.forEach(function(b){D.push(Math.sqrt((a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1])))})});
    if(Math.min.apply(null,D)===0)return G.linkage();
    var ca=[(A[0][0]+A[1][0])/2,(A[0][1]+A[1][1])/2],cb=[(B[0][0]+B[1][0]+B[2][0])/3,(B[0][1]+B[1][1]+B[2][1])/3],cen=Math.hypot(ca[0]-cb[0],ca[1]-cb[1]);
    var s=function(P){return T('\\{'+P.map(function(p){return '('+p.join(',')+')'}).join(',')+'\\}')};
    return {q:'<p>Clusters '+T('\\omega_1=')+s(A)+' and '+T('\\omega_2=')+s(B)+'. Compute the single, complete, average and centroid linkage (Euclidean). Answers like sqrt(18) are fine.</p>',
      fields:[{label:'single',answer:Math.min.apply(null,D),tol:0.01},{label:'complete',answer:Math.max.apply(null,D),tol:0.01},{label:'average',answer:D.reduce(function(a,v){return a+v},0)/6,tol:0.01},{label:'centroid',answer:cen,tol:0.01}],
      expl:'<p>The six cross distances: '+D.map(function(d){return f(d)}).join(', ')+'. Single = smallest, complete = largest, average = their mean '+f(D.reduce(function(a,v){return a+v},0)/6)+'. Centroids '+T('('+f(ca[0])+','+f(ca[1])+')')+' and '+T('('+f(cb[0])+','+f(cb[1])+')')+': distance '+f(cen)+'.</p>'};
  },
  /* agglomerative clustering in 1D (q07 Q24, slide 44) */
  ahc1d:function(){var xs=[];while(xs.length<5){var v=ri(-5,25);if(xs.indexOf(v)<0)xs.push(v)}xs.sort(function(a,b){return a-b});var kind=pick(['single','complete']);
    var cl=xs.map(function(x){return [x]}),H=[],steps=[];
    while(cl.length>1){var best=null,tie=false;for(var i=0;i<cl.length;i++)for(var j=i+1;j<cl.length;j++){var ds=[];cl[i].forEach(function(a){cl[j].forEach(function(b){ds.push(Math.abs(a-b))})});var d=kind==='single'?Math.min.apply(null,ds):Math.max.apply(null,ds);
        if(best===null||d<best.d-1e-9){best={d:d,i:i,j:j};tie=false}else if(Math.abs(d-best.d)<1e-9)tie=true}
      if(tie)return G.ahc1d();H.push(best.d);steps.push('{'+cl[best.i].join(',')+'} + {'+cl[best.j].join(',')+'} at '+best.d);var m=cl[best.i].concat(cl[best.j]).sort(function(a,b){return a-b});cl=cl.filter(function(c,k){return k!==best.i&&k!==best.j});cl.push(m)}
    return {q:'<p>Agglomerative clustering with <b>'+kind+'</b> linkage on '+T('\\{'+xs.join(', ')+'\\}')+'. Give the heights of the 2nd, 3rd and 4th (last) merges.</p>',
      fields:[{label:'2nd',answer:H[1],tol:0.01},{label:'3rd',answer:H[2],tol:0.01},{label:'4th',answer:H[3],tol:0.01}],
      expl:'<p>Merges: '+steps.join('; ')+'. '+(kind==='single'?'Single linkage: closest pair between clusters.':'Complete linkage: furthest pair between clusters (in 1D, the span of the merged cluster).')+'</p>'};
  },
  /* Parzen window / triangular KDE at a point (slides 60-63, q07 Q37, Q41) */
  parzen:function(){var n=pick([6,8,10]),xs=[];for(var i=0;i<n;i++)xs.push(ri(0,15));xs.sort(function(a,b){return a-b});var h=pick([2,3,4]),kern=pick(['Parzen window','Parzen window','triangular']),x0=ri(xs[1],xs[n-2])+pick([0,0.5]);
    var K=function(u){return kern==='triangular'?Math.max(0,1-Math.abs(u)):(Math.abs(u)<=0.5+1e-12?1:0)},ks=xs.map(function(x){return K((x0-x)/h)}),s=ks.reduce(function(a,v){return a+v},0),fx=s/(n*h);
    return {q:'<p>Data '+T('\\{'+xs.join(', ')+'\\}')+' ('+T('n='+n)+'). Estimate the density at '+T('x='+x0)+' with bandwidth '+T('h='+h)+' and the '+(kern==='triangular'?'triangular kernel '+T('K(u)=\\max(0,1-|u|)'):'Parzen window '+T('K(u)=1')+' if '+T('|u|\\le\\tfrac12'))+': '+T('f(x)=\\frac1{nh}\\sum_iK\\big(\\frac{x-x_i}h\\big)')+'.</p>',
      fields:[{label:T('f('+x0+')'),answer:fx,tol:0.0005}],
      expl:'<p>Kernel values: '+ks.map(function(k){return f(k)}).join(', ')+'; sum '+f(s)+'. '+T('f='+f(s)+'/('+n+'\\times'+h+')='+f(fx,4))+'.'+(kern==='triangular'?'':' (Count the points within '+T('h/2='+h/2)+' of '+x0+', edges included.)')+'</p>'};
  },
  /* PCA by hand on a symmetric 2D toy set (slides 27-28): lambda1, lambda2, PVE1 */
  pcatoy:function(){var kind=pick(['diag','axes']),a,b,pts,l1,l2,phi,expl;
    if(kind==='diag'){a=ri(1,5);do{b=ri(-3,5)}while(b===a||b===-a||Math.abs(b)===Math.abs(a));pts=[[a,b],[b,a],[-a,-b],[-b,-a]];
      var s11=(a*a+b*b)/2,s12=a*b,lp=Math.pow(a+b,2)/2,lm=Math.pow(a-b,2)/2;l1=Math.max(lp,lm);l2=Math.min(lp,lm);phi=lp>=lm?'\\tfrac1{\\sqrt2}(1,1)':'\\tfrac1{\\sqrt2}(1,-1)';
      expl='<p>Centred already. '+T('\\Sigma_{11}=\\Sigma_{22}=\\tfrac{'+(2*(a*a+b*b))+'}{4}='+f(s11))+', '+T('\\Sigma_{12}=\\tfrac{4\\times'+par(a*b)+'}{4}='+f(s12))+'. Equal diagonal, so the PCs are the diagonals: along '+T('\\tfrac1{\\sqrt2}(1,1)')+' the scores are '+T('\\pm\\tfrac{'+(a+b)+'}{\\sqrt2}')+', variance '+T('\\tfrac{('+(a+b)+')^2}{2}='+f(lp))+'; along '+T('\\tfrac1{\\sqrt2}(1,-1)')+', '+T('\\tfrac{('+(a-b)+')^2}{2}='+f(lm))+'. (Or '+T('\\lambda=\\Sigma_{11}\\pm\\Sigma_{12}')+'.) PC1 '+T(phi)+', PVE '+T(f(l1)+'/'+f(l1+l2)+'='+f(l1/(l1+l2)))+'.</p>'}
    else{a=ri(1,6);do{b=ri(1,6)}while(b===a);pts=[[-a,0],[a,0],[0,b],[0,-b]];var lx=a*a/2,ly=b*b/2;l1=Math.max(lx,ly);l2=Math.min(lx,ly);phi=lx>ly?'(1,0)':'(0,1)';
      expl='<p>Centred, and '+T('\\Sigma_{12}=0')+', so the PCs are the axes (slide 28). Along '+T('(1,0)')+': scores '+T('-'+a+','+a+',0,0')+', variance '+T('\\tfrac{2\\times'+(a*a)+'}{4}='+f(lx))+'. Along '+T('(0,1)')+': '+T('\\tfrac{2\\times'+(b*b)+'}{4}='+f(ly))+'. PC1 '+T(phi)+', PVE '+T(f(l1)+'/'+f(l1+l2)+'='+f(l1/(l1+l2)))+'.</p>'}
    return {q:'<p>PCA on the four observations '+T(pts.map(function(p){return '('+p.join(',')+')'}).join(',\\ '))+' (variance with '+T('\\tfrac1n')+', like the slides). Give the variances '+T('\\lambda_1\\ge\\lambda_2')+' of the two principal components and the proportion of variance explained by the first.</p>',
      fields:[{label:T('\\lambda_1'),answer:l1,tol:0.01},{label:T('\\lambda_2'),answer:l2,tol:0.01},{label:'PVE of PC1',answer:l1/(l1+l2),tol:0.005}],expl:expl};
  },
  /* PVE, cumulative PVE, choosing M (slides 32, 42) */
  pve:function(){var p=pick([4,5,6]),lam=[];var left=p*10;for(var i=0;i<p;i++){var v=i===p-1?left:Math.max(1,Math.round(left*(0.35+Math.random()*0.3)));if(i<p-1)v=Math.min(v,left-(p-1-i));lam.push(v);left-=v}
    lam=lam.map(function(v){return v/10}).sort(function(x,y){return y-x});if(lam[p-1]<=0)return G.pve();
    var tot=lam.reduce(function(s,v){return s+v},0),cum=[],c=0;lam.forEach(function(v){c+=v;cum.push(c/tot)});var th=pick([0.7,0.8,0.9]),M=0;while(cum[M]<=th+1e-12)M++;M++;
    var K=lam.filter(function(v){return v>1}).length;
    return {q:'<p>PCA on '+p+' standardised attributes gives the component variances '+T(lam.map(function(v){return f(v)}).join(',\\ '))+'. Give the cumulative PVE of the first two components, the smallest '+T('M')+' with cumulative PVE above '+T('\\theta='+th)+', and '+T('M')+' by the eigenvalue-one criterion.</p>',
      fields:[{label:'cumulative PVE, M = 2',answer:cum[1],tol:0.005},{label:T('M')+' for '+T('\\theta='+th),answer:M,tol:0.01},{label:T('M')+' by '+T('\\lambda>1'),answer:K,tol:0.01}],
      expl:'<p>Total '+f(tot)+' (= '+T('p')+' for standardised data). PVEs '+lam.map(function(v){return f(v/tot)}).join(', ')+'; cumulative '+cum.map(function(v){return f(v)}).join(', ')+'. The first cumulative value above '+th+' is at '+T('M='+M)+'. '+K+' variance'+(K===1?' is':'s are')+' above 1.</p>'};
  },
  /* PC scores from a loading matrix (slide 40, guide 6.2) */
  pcscore:function(){var L=[[0.54,-0.42],[0.58,-0.19],[0.28,0.87],[0.54,0.17]],names=['Murder','Assault','UrbanPop','Rape'];var x=names.map(function(){return pick([-1.5,-1,-0.5,0,0.5,1,1.5,2])});
    var z=[0,1].map(function(m){return x.reduce(function(s,v,j){return s+v*L[j][m]},0)});
    return {q:'<p>USArrests loadings (slide 40): PC1 '+T('(0.54, 0.58, 0.28, 0.54)')+', PC2 '+T('(-0.42, -0.19, 0.87, 0.17)')+' for Murder, Assault, UrbanPop, Rape. A state has standardised values '+T('('+x.join(', ')+')')+'. Compute its scores '+T('z_1')+' and '+T('z_2')+'.</p>',
      fields:[{label:T('z_1'),answer:z[0],tol:0.005},{label:T('z_2'),answer:z[1],tol:0.005}],
      expl:'<p>'+T('z_m=\\varphi_m^Tx')+': '+T('z_1='+x.map(function(v,j){return L[j][0]+'\\times'+par(v)}).join('+')+'='+f(z[0]))+'; '+T('z_2='+x.map(function(v,j){return par(L[j][1])+'\\times'+par(v)}).join('+')+'='+f(z[1]))+'.</p>'};
  },
  /* MDS stress of a 1D embedding of three points (slide 49) */
  stress:function(){var A=[0,0],B=[ri(1,6),0],C=[0,ri(1,6)];if(Math.random()<0.5)B=[ri(1,4),ri(1,4)];var d=function(p,q){return Math.hypot(p[0]-q[0],p[1]-q[1])};
    var D=[d(A,B),d(A,C),d(B,C)],e=[0,ri(-6,6),ri(-6,6)];if(e[1]===0||e[2]===0||e[1]===e[2])return G.stress();var E=[Math.abs(e[1]),Math.abs(e[2]),Math.abs(e[1]-e[2])],st=0;D.forEach(function(v,k){st+=(v-E[k])*(v-E[k])});
    return {q:'<p>Points '+T('A=('+A+'),\\ B=('+B+'),\\ C=('+C+')')+'. MDS places them on a line at '+T('\\tilde A='+e[0]+',\\ \\tilde B='+e[1]+',\\ \\tilde C='+e[2])+'. Compute the stress '+T('\\sum_{i<j}(d_{ij}-\\tilde d_{ij})^2')+' (Euclidean distances; answers like (sqrt(5)-2)^2 are fine).</p>',
      fields:[{label:'stress',answer:st,tol:0.01}],
      expl:'<p>Original distances AB '+f(D[0])+', AC '+f(D[1])+', BC '+f(D[2])+'. On the line: '+E.join(', ')+'. Stress '+T('('+f(D[0])+'-'+E[0]+')^2+('+f(D[1])+'-'+E[1]+')^2+('+f(D[2])+'-'+E[2]+')^2='+f(st))+'. (Over all ordered pairs it would be twice this.)</p>'};
  }

};
function olsData(){var n=pick([4,5]),xs=[0,1,2,3,4,5,6].slice(0,7);shuffle(xs);xs=xs.slice(0,n).sort(function(a,b){return a-b});
  var b=pick([-2,-1,1,2,3]),c=ri(0,5),ys=xs.map(function(x){return c+b*x+ri(-2,2)});
  var mx=xs.reduce(function(s,v){return s+v},0)/n,my=ys.reduce(function(s,v){return s+v},0)/n,sxy=0,sxx=0,tss=0;
  xs.forEach(function(x,i){sxy+=(x-mx)*(ys[i]-my);sxx+=(x-mx)*(x-mx);tss+=(ys[i]-my)*(ys[i]-my)});if(tss===0)return olsData();
  var b1=sxy/sxx,b0=my-b1*mx,yh=xs.map(function(x){return b0+b1*x}),e=ys.map(function(y,i){return y-yh[i]}),rss=e.reduce(function(s,v){return s+v*v},0);
  return {xs:xs,ys:ys,mx:mx,my:my,sxy:sxy,sxx:sxx,b1:b1,b0:b0,yh:yh,e:e,rss:rss,tss:tss,
    tbl:'<table><tr><th>'+T('x')+'</th>'+xs.map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr><tr><th>'+T('y')+'</th>'+ys.map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr></table>'};
}

/* ======================================================================
   Maths route v2: scaffolded generators. Same contract as G above, but every
   explanation is a full worked table plus the usual slip to avoid.
   ====================================================================== */
function tb(head,rows,foot){var s='<div class="worktbl"><table><tr>'+head.map(function(c){return '<th>'+c+'</th>'}).join('')+'</tr>';
  rows.forEach(function(r){s+='<tr>'+r.map(function(c){return '<td>'+c+'</td>'}).join('')+'</tr>'});
  if(foot)s+='<tr class="tot">'+foot.map(function(c){return '<td>'+c+'</td>'}).join('')+'</tr>';return s+'</table></div>'}
function sm(a){return a.reduce(function(p,c){return p+c},0)}
function mn(a){return sm(a)/a.length}
function sq(x){return x*x}
function slip(s){return '<p class="slip"><b>Common slip:</b> '+s+'</p>'}
function pt(p){return '('+p.map(function(v){return f(v)}).join(', ')+')'}
var G2={
  /* squared distance from one point to a centre, coordinate by coordinate */
  sqdist2:function(){var d=pick([2,2,3]),x=[],c=[];for(var i=0;i<d;i++){x.push(ri(-3,8));c.push(ri(-4,12)/2)}
    var g=x.map(function(v,i){return v-c[i]}),s=sm(g.map(sq)),raw=sm(x.map(sq));
    return {q:'<p>A point '+T('x='+pt(x))+' belongs to a cluster whose centroid is '+T('\\mu='+pt(c))+'. Work out the gap in each coordinate, then the squared distance '+T('\\|x-\\mu\\|^2')+'.</p>',
      fields:g.map(function(v,i){return {label:'gap '+T('x_'+(i+1)+'-\\mu_'+(i+1)),answer:v,tol:0.001}}).concat([{label:T('\\|x-\\mu\\|^2'),answer:s,tol:0.01}]),
      expl:tb(['coordinate',T('x_j'),T('\\mu_j'),'gap '+T('x_j-\\mu_j'),'squared gap'],x.map(function(v,i){return [T('j='+(i+1)),f(v),f(c[i]),f(g[i]),f(sq(g[i]))]}),['total','','','',f(s)])+
        '<p>'+T('\\|x-\\mu\\|^2='+g.map(function(v){return par(v)+'^2'}).join('+')+'='+f(s))+'. No square root: K-means and the SSE use the <b>squared</b> distance.</p>'+
        slip('squaring the raw coordinates, '+T(x.map(function(v){return par(v)+'^2'}).join('+')+'='+f(raw))+'. That is the squared distance to the origin, not to the centroid. Subtract first, then square.')};
  },
  /* centroid and SSE with the full table (integer centroid so the arithmetic is clean) */
  centroid2:function(){var n=pick([3,4]),P=[];for(var i=0;i<n;i++)P.push([ri(-2,7),ri(-2,7)]);
    [0,1].forEach(function(j){var s=sm(P.map(function(p){return p[j]}));var r=((s%n)+n)%n;if(r)P[n-1][j]+=n-r});
    var m=[0,1].map(function(j){return mn(P.map(function(p){return p[j]}))});
    var g=P.map(function(p){return [p[0]-m[0],p[1]-m[1]]}),d=g.map(function(v){return sq(v[0])+sq(v[1])}),sse=sm(d),raw=sm(P.map(function(p){return sq(p[0])+sq(p[1])}));
    return {q:'<p>A cluster holds '+P.map(function(p){return T(pt(p))}).join(', ')+'. Find its centroid '+T('\\mu=(\\mu_1,\\mu_2)')+', then its SSE '+T('\\sum_{x}\\|x-\\mu\\|^2')+'.</p>',
      fields:[{label:T('\\mu_1'),answer:m[0],tol:0.006},{label:T('\\mu_2'),answer:m[1],tol:0.006},{label:'SSE',answer:sse,tol:Math.max(0.02,sse*0.005)}],
      expl:'<p><b>Step 1, centroid.</b> '+T('\\mu_1=\\frac{'+P.map(function(p){return par(p[0])}).join('+')+'}{'+n+'}='+f(m[0]))+', '+T('\\mu_2=\\frac{'+P.map(function(p){return par(p[1])}).join('+')+'}{'+n+'}='+f(m[1]))+'.</p>'+
        '<p><b>Step 2, gaps to the centroid, squared, added.</b></p>'+tb(['point',T('x_1-\\mu_1'),T('x_2-\\mu_2'),T('(x_1-\\mu_1)^2'),T('(x_2-\\mu_2)^2'),T('\\|x-\\mu\\|^2')],
          P.map(function(p,i){return [T(pt(p)),f(g[i][0]),f(g[i][1]),f(sq(g[i][0])),f(sq(g[i][1])),f(d[i])]}),['total','0','0','','',f(sse)])+
        '<p>Check: each gap column adds to 0 (that is what the mean does). SSE '+T('='+d.map(function(v){return f(v)}).join('+')+'='+f(sse))+'.</p>'+
        slip('squaring the raw coordinates instead of the gaps gives '+T(f(raw))+', which is meaningless here. Always subtract the centroid first.')};
  },
  /* one K-means iteration in 2D: assign, update, new SSE */
  kmstep2:function(){var c=[[ri(0,2),ri(0,2)],[ri(6,8),ri(5,8)]],P=[],lab=[],D=[];
    var tries=0;do{P=[];for(var i=0;i<5;i++)P.push([ri(-1,9),ri(-1,9)]);
      D=P.map(function(p){return c.map(function(q){return sq(p[0]-q[0])+sq(p[1]-q[1])})});lab=D.map(function(r){return r[0]<r[1]?0:1});tries++}
    while((D.some(function(r){return r[0]===r[1]})||lab.indexOf(0)<0||lab.indexOf(1)<0||lab.filter(function(l){return l===0}).length<2)&&tries<200);
    var A=P.filter(function(p,i){return lab[i]===0}),B=P.filter(function(p,i){return lab[i]===1});
    var mA=[mn(A.map(function(p){return p[0]})),mn(A.map(function(p){return p[1]}))],mB=[mn(B.map(function(p){return p[0]})),mn(B.map(function(p){return p[1]}))];
    var J=sm(A.map(function(p){return sq(p[0]-mA[0])+sq(p[1]-mA[1])}))+sm(B.map(function(p){return sq(p[0]-mB[0])+sq(p[1]-mB[1])}));
    return {q:'<p>K-means with '+T('K=2')+'. Current centres '+T('\\mu_1='+pt(c[0]))+' and '+T('\\mu_2='+pt(c[1]))+'. Points: '+P.map(function(p,i){return T('x_'+(i+1)+'='+pt(p))}).join(', ')+'.</p><p>Do one full iteration: assign every point to its nearest centre, then move each centre to the mean of its points. Give how many points join cluster 1, the new '+T('\\mu_1')+', and the SSE '+T('J')+' with the new centres.</p>',
      fields:[{label:'points in cluster 1',answer:A.length,tol:0.01},{label:'new '+T('\\mu_1')+' (1st coord)',answer:mA[0],tol:0.006},{label:'new '+T('\\mu_1')+' (2nd coord)',answer:mA[1],tol:0.006},{label:T('J'),answer:J,tol:Math.max(0.02,J*0.005)}],
      expl:'<p><b>Assign.</b> Squared distances are enough to compare (no square roots needed).</p>'+tb(['point',T('\\|x-\\mu_1\\|^2'),T('\\|x-\\mu_2\\|^2'),'nearest'],P.map(function(p,i){return [T('x_'+(i+1)),f(D[i][0]),f(D[i][1]),lab[i]?'2':'1']}))+
        '<p><b>Update.</b> Cluster 1 = '+A.map(function(p){return T(pt(p))}).join(', ')+' so '+T('\\mu_1='+pt(mA))+'. Cluster 2 = '+B.map(function(p){return T(pt(p))}).join(', ')+' so '+T('\\mu_2='+pt(mB))+'.</p>'+
        '<p><b>New SSE.</b> Add each point\'s squared distance to its <i>own new</i> centre: '+T('J='+f(J))+'.</p>'+slip('using the old centres in the SSE after the update, or squaring the coordinates themselves.')};
  },
  /* RSS and MSE with the residual table */
  mse2:function(){var n=pick([4,5]),y=[],yh=[];for(var i=0;i<n;i++){var v=ri(1,12);y.push(v);yh.push(v+pick([-3,-2,-1,-1,0,1,1,2,3]))}
    var e=y.map(function(v,i){return v-yh[i]}),r=sm(e.map(sq));
    return {q:'<p>True '+T('y=('+y.join(', ')+')')+', predictions '+T('\\hat y=('+yh.join(', ')+')')+'. Compute the RSS and the MSE.</p>',
      fields:[{label:'RSS',answer:r,tol:0.01},{label:'MSE',answer:r/n,tol:0.006}],
      expl:tb(['i',T('y_i'),T('\\hat y_i'),T('e_i=y_i-\\hat y_i'),T('e_i^2')],y.map(function(v,i){return [i+1,v,yh[i],f(e[i]),f(sq(e[i]))]}),['total','','',f(sm(e)),f(r)])+
        '<p>RSS '+T('='+f(r))+'. MSE '+T('=\\text{RSS}/n='+f(r)+'/'+n+'='+f(r/n,4))+'.</p>'+slip('squaring the sum of the errors, '+T('('+f(sm(e))+')^2')+', instead of summing the squares. Overshoots and undershoots would cancel.')};
  },
  /* least squares by hand with the deviations table */
  ols2:function(){var D=olsData(),dx=D.xs.map(function(x){return x-D.mx}),dy=D.ys.map(function(y){return y-D.my});
    return {q:'<p>Fit '+T('\\hat y=\\hat\\beta_0+\\hat\\beta_1x')+' by least squares.</p>'+D.tbl+'<p>Give '+T('S_{xy}=\\sum(x_i-\\bar x)(y_i-\\bar y)')+', '+T('S_{xx}=\\sum(x_i-\\bar x)^2')+', then '+T('\\hat\\beta_1')+' and '+T('\\hat\\beta_0')+'.</p>',
      fields:[{label:T('S_{xy}'),answer:D.sxy,tol:0.01},{label:T('S_{xx}'),answer:D.sxx,tol:0.01},{label:T('\\hat\\beta_1'),answer:D.b1,tol:0.006},{label:T('\\hat\\beta_0'),answer:D.b0,tol:0.01}],
      expl:'<p><b>Step 1.</b> '+T('\\bar x='+f(D.mx))+', '+T('\\bar y='+f(D.my))+'.</p><p><b>Step 2.</b></p>'+
        tb([T('x_i'),T('y_i'),T('x_i-\\bar x'),T('y_i-\\bar y'),'product',T('(x_i-\\bar x)^2')],D.xs.map(function(x,i){return [x,D.ys[i],f(dx[i]),f(dy[i]),f(dx[i]*dy[i]),f(sq(dx[i]))]}),['total','','0','0',f(D.sxy),f(D.sxx)])+
        '<p><b>Step 3.</b> '+T('\\hat\\beta_1=\\frac{S_{xy}}{S_{xx}}=\\frac{'+f(D.sxy)+'}{'+f(D.sxx)+'}='+f(D.b1,4))+'. <b>Step 4.</b> '+T('\\hat\\beta_0=\\bar y-\\hat\\beta_1\\bar x='+f(D.my)+'-'+par(+f(D.b1,4))+'\\times'+f(D.mx)+'='+f(D.b0,4))+'.</p>'+
        slip('dividing by '+T('\\sum x_i^2')+' instead of '+T('\\sum(x_i-\\bar x)^2')+'. The plain sums only work when the data are centred.')};
  },
  /* RSS, TSS, R^2 */
  rsq2:function(){var D=olsData(),dy=D.ys.map(function(y){return y-D.my});
    return {q:'<p>The least-squares line for these data is '+T('\\hat y='+f(D.b0,4)+(D.b1<0?'-':'+')+f(Math.abs(D.b1),4)+'x')+'.</p>'+D.tbl+'<p>Give the RSS, the TSS and '+T('R^2')+'.</p>',
      fields:[{label:'RSS',answer:D.rss,tol:Math.max(0.02,D.rss*0.01)},{label:'TSS',answer:D.tss,tol:0.02},{label:T('R^2'),answer:1-D.rss/D.tss,tol:0.006}],
      expl:tb([T('x_i'),T('y_i'),T('\\hat y_i'),T('y_i-\\hat y_i'),T('(y_i-\\hat y_i)^2'),T('y_i-\\bar y'),T('(y_i-\\bar y)^2')],D.xs.map(function(x,i){return [x,D.ys[i],f(D.yh[i]),f(D.e[i]),f(sq(D.e[i])),f(dy[i]),f(sq(dy[i]))]}),['total','','','',f(D.rss),'',f(D.tss)])+
        '<p>'+T('\\bar y='+f(D.my))+'. '+T('R^2=1-\\frac{\\text{RSS}}{\\text{TSS}}=1-\\frac{'+f(D.rss)+'}{'+f(D.tss)+'}='+f(1-D.rss/D.tss,4))+'.</p>'+slip('using '+T('\\hat y')+' in the TSS. TSS compares with the flat line '+T('\\bar y')+'; it does not involve the model at all.')};
  },
  /* one gradient-descent step on RSS for a line */
  gd2:function(){var n=pick([2,3]),xs=[],ys=[];for(var i=0;i<n;i++){xs.push(ri(-1,3));ys.push(ri(-2,6))}var b=[pick([0,0,1,-1]),pick([0,0.5,1])],eta=pick([0.01,0.05,0.1]);
    var yh=xs.map(function(x){return b[0]+b[1]*x}),r=ys.map(function(y,i){return y-yh[i]}),g0=-2*sm(r),g1=-2*sm(r.map(function(v,i){return v*xs[i]}));
    return {q:'<p>Model '+T('\\hat y=\\beta_0+\\beta_1x')+', loss '+T('\\text{RSS}(\\beta)=\\sum_i(y_i-\\beta_0-\\beta_1x_i)^2')+'. Data: '+xs.map(function(x,i){return T('('+x+', '+ys[i]+')')}).join(', ')+'. Start at '+T('\\beta^{(0)}=('+b.join(', ')+')')+' with '+T('\\eta='+eta)+'.</p><p>Give the two partial derivatives at the start, then '+T('\\beta^{(1)}')+'.</p>',
      fields:[{label:T('\\partial_{\\beta_0}'),answer:g0,tol:0.01},{label:T('\\partial_{\\beta_1}'),answer:g1,tol:0.01},{label:'new '+T('\\beta_0'),answer:b[0]-eta*g0,tol:0.002},{label:'new '+T('\\beta_1'),answer:b[1]-eta*g1,tol:0.002}],
      expl:'<p>'+T('\\partial_{\\beta_0}\\text{RSS}=-2\\sum_i(y_i-\\hat y_i)')+' and '+T('\\partial_{\\beta_1}\\text{RSS}=-2\\sum_i(y_i-\\hat y_i)x_i')+' (chain rule: the inner derivative is '+T('-1')+' or '+T('-x_i')+').</p>'+
        tb([T('x_i'),T('y_i'),T('\\hat y_i'),T('r_i=y_i-\\hat y_i'),T('r_ix_i')],xs.map(function(x,i){return [x,ys[i],f(yh[i]),f(r[i]),f(r[i]*x)]}),['total','','',f(sm(r)),f(g1/-2)])+
        '<p>'+T('\\partial_{\\beta_0}=-2\\times'+par(sm(r))+'='+f(g0))+', '+T('\\partial_{\\beta_1}=-2\\times'+par(+f(g1/-2))+'='+f(g1))+'.</p><p>'+T('\\beta_0\\leftarrow'+b[0]+'-'+eta+'\\times'+par(g0)+'='+f(b[0]-eta*g0,4))+', '+T('\\beta_1\\leftarrow'+b[1]+'-'+eta+'\\times'+par(g1)+'='+f(b[1]-eta*g1,4))+'.</p>'+
        slip('adding '+T('\\eta\\nabla')+' instead of subtracting it (that walks uphill), or forgetting the minus sign from the chain rule.')};
  },
  /* linear score with the product table */
  score2:function(){var p=pick([2,3]),be=[pick([-2,-1,-0.5,0,0.5,1,2])],x=[];for(var i=0;i<p;i++){be.push(pick([-3,-2,-1,-0.5,0.5,1,2,3]));x.push(pick([-2,-1,0,1,2,3,4]))}
    var xt=[1].concat(x),pr=be.map(function(b,i){return b*xt[i]}),z=sm(pr);
    return {q:'<p>Coefficients '+T('\\beta=('+be.join(', ')+')')+' (intercept first) and input '+T('x=('+x.join(', ')+')')+'. Compute the score '+T('z=\\beta\\cdot\\tilde x')+'.</p>',
      fields:[{label:T('z'),answer:z,tol:0.001}],
      expl:tb(['j',T('\\beta_j'),T('\\tilde x_j'),T('\\beta_j\\tilde x_j')],be.map(function(b,i){return [i,f(b),f(xt[i]),f(pr[i])]}),['total','','',f(z)])+'<p>'+T('\\tilde x=(1, '+x.join(', ')+')')+': the leading 1 carries the intercept.</p>'+slip('forgetting the 1 in front, which drops '+T('\\beta_0')+', or pairing '+T('\\beta_1')+' with the wrong input.')};
  },
  /* Euclidean distance with a gaps table */
  dist2:function(){var a=[ri(-4,5),ri(-4,5),ri(-4,5)],b=[ri(-4,5),ri(-4,5),ri(-4,5)];var g=a.map(function(v,i){return v-b[i]}),s=sm(g.map(sq)),l1=sm(g.map(Math.abs));
    return {q:'<p>'+T('x=('+a.join(', ')+')')+', '+T('y=('+b.join(', ')+')')+'. Give the squared Euclidean distance, the Euclidean distance and the Manhattan distance.</p>',
      fields:[{label:T('\\|x-y\\|_2^2'),answer:s,tol:0.001},{label:T('\\|x-y\\|_2'),answer:Math.sqrt(s),tol:0.01},{label:T('\\|x-y\\|_1'),answer:l1,tol:0.001}],
      expl:tb(['j',T('x_j'),T('y_j'),'gap',T('|\\text{gap}|'),T('\\text{gap}^2')],a.map(function(v,i){return [i+1,v,b[i],f(g[i]),f(Math.abs(g[i])),f(sq(g[i]))]}),['total','','','',f(l1),f(s)])+
        '<p>'+T('\\|x-y\\|_2=\\sqrt{'+s+'}='+f(Math.sqrt(s)))+'.</p>'+slip('taking the square root of each squared gap separately (that gives the Manhattan distance), or forgetting that a negative gap squared is positive.')};
  },
  /* KNN in 2D with a distance table */
  knn2:function(){var P=[],L=[];while(P.length<6){var p=[ri(0,6),ri(0,6)];if(!P.some(function(q){return q[0]===p[0]&&q[1]===p[1]})){P.push(p);L.push(pick(['A','B']))}}
    if(L.indexOf('A')<0)L[0]='A';if(L.indexOf('B')<0)L[1]='B';var x0=[ri(1,5),ri(1,5)],K=3;
    var D=P.map(function(p,i){return {i:i,d:sq(p[0]-x0[0])+sq(p[1]-x0[1])}}).sort(function(a,b){return a.d-b.d});if(D[K-1].d===D[K].d)return G2.knn2();
    var nb=D.slice(0,K),nA=nb.filter(function(o){return L[o.i]==='A'}).length;
    return {q:'<p>Training points: '+P.map(function(p,i){return T(pt(p))+' '+L[i]}).join(', ')+'. Classify '+T('x_0='+pt(x0))+' with KNN, '+T('K=3')+', Euclidean distance. Give '+T('\\tilde P(A\\mid x_0)')+' and the class.</p>',
      fields:[{label:T('\\tilde P(A)'),answer:nA/K,tol:0.01},{label:'class',type:'choice',options:['A','B'],answer:nA>=2?'A':'B'}],
      expl:tb(['point','label',T('\\|x-x_0\\|^2'),'rank'],D.map(function(o,r){return [T(pt(P[o.i])),L[o.i],f(o.d),r<K?'<b>'+(r+1)+'</b>':r+1]}))+
        '<p>Ranking by squared distance gives the same order as by distance, so you can skip the square roots. The 3 nearest labels: '+nb.map(function(o){return L[o.i]}).join(', ')+', so '+T('\\tilde P(A)=\\frac13\\sum\\mathbb 1(y_i=A)='+nA+'/3')+'.</p>'+slip('using all six points, or dividing by the number of A\'s instead of by '+T('K')+'.')};
  },
  /* sigmoid prediction step by step */
  sigmoid2:function(){var b0=pick([-3,-2,-1,-0.5,0,0.5,1]),b1=pick([-2,-1,-0.5,0.5,1,1.5,2]),x=pick([-2,-1,0,1,2,3]);var z=b0+b1*x,ez=Math.exp(-z),p=1/(1+ez);
    return {q:'<p>Logistic regression '+T('p(x)=\\sigma(\\beta_0+\\beta_1x)')+' with '+T('\\beta_0='+b0)+', '+T('\\beta_1='+b1)+'. At '+T('x='+x)+' give the score '+T('z')+', '+T('e^{-z}')+', the probability '+T('p')+' and the predicted class (threshold 0.5).</p>',
      fields:[{label:T('z'),answer:z,tol:0.001},{label:T('e^{-z}'),answer:ez,tol:Math.max(0.002,ez*0.01)},{label:T('p'),answer:p,tol:0.004},{label:'class',type:'choice',options:['0','1'],answer:p>0.5?'1':'0'}],
      expl:'<p>'+T('z='+b0+'+'+par(b1)+'\\times'+par(x)+'='+f(z))+'. '+T('e^{-z}=e^{'+f(-z)+'}='+f(ez,4))+'. '+T('p=\\frac{1}{1+'+f(ez,4)+'}='+f(p,4))+'. '+(p>0.5?'Above':'Not above')+' 0.5, so class <b>'+(p>0.5?1:0)+'</b>. Shortcut: class 1 exactly when '+T('z>0')+'.</p>'+slip('computing '+T('e^{z}')+' instead of '+T('e^{-z}')+' (you would get '+T('1-p')+'), or using '+T('\\beta_1x')+' without the intercept.')};
  },
  /* softmax with exponentials table */
  softmax2:function(){var z=[ri(-1,3),ri(-1,3),pick([-1,0,0.5,1,2])];if(z[0]===z[1]&&z[1]===z[2])z[2]+=1;var e=z.map(Math.exp),s=sm(e),p=e.map(function(v){return v/s}),k=ri(0,2);var best=p.indexOf(Math.max.apply(null,p));
    return {q:'<p>Three class scores '+T('z=('+z.join(', ')+')')+'. Give '+T('\\sum_ke^{z_k}')+', '+T('p_'+(k+1))+' and the predicted class.</p>',
      fields:[{label:T('\\sum e^{z_k}'),answer:s,tol:Math.max(0.01,s*0.005)},{label:T('p_'+(k+1)),answer:p[k],tol:0.004},{label:'class',type:'choice',options:['1','2','3'],answer:String(best+1)}],
      expl:tb(['class',T('z_k'),T('e^{z_k}'),T('p_k=e^{z_k}/\\sum')],z.map(function(v,i){return [i+1,f(v),f(e[i],4),f(p[i],4)]}),['total','',f(s,4),'1'])+'<p>The largest score always wins, so the class is <b>'+(best+1)+'</b>; softmax just turns the scores into probabilities that add to 1.</p>'+slip('dividing the scores by their sum ('+T('z_k/\\sum z')+') without exponentiating. That can give negative "probabilities".')};
  },
  /* negative log-likelihood table */
  nll2:function(){var n=pick([3,4]),y=[],p=[];for(var i=0;i<n;i++){y.push(ri(0,1));p.push(pick([0.1,0.2,0.3,0.4,0.6,0.7,0.8,0.9]))}
    var t=p.map(function(v,i){return y[i]?v:1-v}),c=t.map(function(v){return -Math.log(v)}),L=sm(c);
    return {q:'<p>A logistic model gives '+T('p_i=P(Y=1\\mid x_i)')+' = '+T('('+p.join(', ')+')')+' for points with labels '+T('y=('+y.join(', ')+')')+'. Compute the negative log-likelihood (natural log).</p>',
      fields:[{label:'NLL',answer:L,tol:0.01}],
      expl:tb(['i',T('y_i'),T('p_i'),'prob. of the true label',T('-\\log(\\cdot)')],y.map(function(v,i){return [i+1,v,f(p[i]),(v?T('p_i='):T('1-p_i='))+f(t[i]),f(c[i],4)]}),['total','','','',f(L,4)])+
        '<p>For '+T('y_i=1')+' use '+T('p_i')+'; for '+T('y_i=0')+' use '+T('1-p_i')+'. That is exactly '+T('y_i\\log p_i+(1-y_i)\\log(1-p_i)')+' with the zero term dropped.</p>'+slip('using '+T('p_i')+' for every point regardless of its label.')};
  },
  /* logistic gradient (p - y) x */
  lgrad2:function(){var n=3,xs=[],y=[];for(var i=0;i<n;i++){xs.push(pick([-2,-1,0,1,2,3]));y.push(ri(0,1))}var b=[pick([0,0.5,-0.5]),pick([0,0.5,1])],eta=pick([0.1,0.5]);
    var z=xs.map(function(x){return b[0]+b[1]*x}),p=z.map(function(v){return 1/(1+Math.exp(-v))}),r=p.map(function(v,i){return v-y[i]}),g0=sm(r),g1=sm(r.map(function(v,i){return v*xs[i]}));
    return {q:'<p>Logistic regression, current '+T('\\beta=('+b.join(', ')+')')+'. Data '+xs.map(function(x,i){return T('(x='+x+', y='+y[i]+')')}).join(', ')+'. Using '+T('\\nabla L=\\sum_i(p_i-y_i)\\tilde x_i')+', give both gradient components and the new '+T('\\beta_1')+' after one step with '+T('\\eta='+eta)+'.</p>',
      fields:[{label:T('\\partial_{\\beta_0}L'),answer:g0,tol:0.006},{label:T('\\partial_{\\beta_1}L'),answer:g1,tol:0.006},{label:'new '+T('\\beta_1'),answer:b[1]-eta*g1,tol:0.004}],
      expl:tb([T('x_i'),T('y_i'),T('z_i'),T('p_i=\\sigma(z_i)'),T('p_i-y_i'),T('(p_i-y_i)x_i')],xs.map(function(x,i){return [x,y[i],f(z[i]),f(p[i],4),f(r[i],4),f(r[i]*x,4)]}),['total','','','',f(g0,4),f(g1,4)])+
        '<p>'+T('\\beta_1\\leftarrow'+b[1]+'-'+eta+'\\times'+par(+f(g1,4))+'='+f(b[1]-eta*g1,4))+'. Each point pushes in proportion to (prediction − truth) × input.</p>'+slip('writing '+T('y_i-p_i')+' with a minus step (it flips direction), or forgetting the column of 1s for '+T('\\beta_0')+'.')};
  },
  /* Bayes' rule with a natural-frequency table */
  bayes2:function(){var N=10000,pi=pick([0.01,0.02,0.05,0.1]),a=pick([0.8,0.9,0.95]),b=pick([0.05,0.1,0.2]);var S=N*pi,H=N-S,sp=S*a,hp=H*b,post=sp/(sp+hp);
    return {q:'<p>A condition affects '+f(pi*100)+'% of people. A test is positive for '+f(a*100)+'% of those with it and '+f(b*100)+'% of those without. Imagine '+N.toLocaleString('en-GB')+' people. How many have the condition and test positive, how many don\'t and test positive, and what is '+T('P(\\text{condition}\\mid +)')+'?</p>',
      fields:[{label:'with & +',answer:sp,tol:0.5},{label:'without & +',answer:hp,tol:0.5},{label:T('P(\\text{cond}\\mid +)'),answer:post,tol:0.004}],
      expl:tb(['',T('\\text{test}+'),T('\\text{test}-'),'total'],[['condition',f(sp),f(S-sp),f(S)],['no condition',f(hp),f(H-hp),f(H)]],['total',f(sp+hp),f(N-sp-hp),f(N)])+
        '<p>Among the '+f(sp+hp)+' positives, '+f(sp)+' have the condition: '+T('\\frac{'+f(sp)+'}{'+f(sp+hp)+'}='+f(post,4))+'. Same as '+T('\\frac{\\pi_1f_1}{\\pi_1f_1+\\pi_0f_0}=\\frac{'+pi+'\\times'+a+'}{'+pi+'\\times'+a+'+'+f(1-pi)+'\\times'+b+'}')+'.</p>'+slip('answering '+a+' (that is '+T('P(+\\mid\\text{cond})')+', the other way round) or forgetting the healthy people who test positive.')};
  },
  /* naive Bayes with two binary features */
  nb2:function(){var pi=pick([0.3,0.4,0.5,0.6]),a=[pick([0.5,0.6,0.7,0.8]),pick([0.3,0.4,0.6])],b=[pick([0.1,0.2,0.3]),pick([0.2,0.3,0.5])];
    var s1=pi*a[0]*a[1],s0=(1-pi)*b[0]*b[1],post=s1/(s1+s0);
    return {q:'<p>Naive Bayes spam filter. '+T('P(\\text{spam})='+pi)+'. '+T('P(w_1\\mid\\text{spam})='+a[0])+', '+T('P(w_2\\mid\\text{spam})='+a[1])+', '+T('P(w_1\\mid\\text{ham})='+b[0])+', '+T('P(w_2\\mid\\text{ham})='+b[1])+'. An email contains both words. Give the spam score '+T('\\pi_sf_s(x)')+', the ham score and '+T('P(\\text{spam}\\mid x)')+'.</p>',
      fields:[{label:'spam score',answer:s1,tol:0.0006},{label:'ham score',answer:s0,tol:0.0006},{label:T('P(\\text{spam}\\mid x)'),answer:post,tol:0.004}],
      expl:'<p>Independence within each class lets you multiply: spam '+T(pi+'\\times'+a[0]+'\\times'+a[1]+'='+f(s1,4))+', ham '+T(f(1-pi)+'\\times'+b[0]+'\\times'+b[1]+'='+f(s0,4))+'.</p><p>Normalise: '+T('\\frac{'+f(s1,4)+'}{'+f(s1,4)+'+'+f(s0,4)+'}='+f(post,4))+'.</p>'+slip('forgetting the prior, or using '+T('1-\\pi')+' for the spam class.')};
  },
  /* Gaussian density in steps */
  gauss2:function(){var mu=ri(-2,6),sd=pick([1,2,0.5]),x=mu+pick([-2,-1,-0.5,0.5,1,1.5,2])*sd;var gp=x-mu,q=gp*gp/(2*sd*sd),c=1/Math.sqrt(2*Math.PI*sd*sd),fx=c*Math.exp(-q);
    return {q:'<p>Gaussian with '+T('\\mu='+mu)+', '+T('\\sigma='+sd)+'. At '+T('x='+f(x))+' give the gap '+T('x-\\mu')+', the exponent '+T('\\frac{(x-\\mu)^2}{2\\sigma^2}')+', the constant '+T('\\frac1{\\sqrt{2\\pi\\sigma^2}}')+' and '+T('f(x)')+'.</p>',
      fields:[{label:'gap',answer:gp,tol:0.001},{label:'exponent',answer:q,tol:0.005},{label:'constant',answer:c,tol:0.003},{label:T('f(x)'),answer:fx,tol:Math.max(0.002,fx*0.01)}],
      expl:'<p>Gap '+T(f(x)+'-'+par(mu)+'='+f(gp))+'. Exponent '+T('\\frac{'+par(+f(gp))+'^2}{2\\times'+f(sd*sd)+'}='+f(q,4))+'. Constant '+T('\\frac1{\\sqrt{2\\pi\\times'+f(sd*sd)+'}}='+f(c,4))+'. '+T('f(x)='+f(c,4)+'\\times e^{-'+f(q,4)+'}='+f(c,4)+'\\times'+f(Math.exp(-q),4)+'='+f(fx,4))+'.</p>'+slip('using '+T('\\sigma')+' where the formula needs '+T('\\sigma^2')+', or dropping the minus sign in the exponent (the density would exceed the peak).')};
  },
  /* LDA, one input, equal class sizes, full table */
  lda2:function(){var c0=[],c1=[];while(c0.length<3){var v=ri(0,5);if(c0.indexOf(v)<0)c0.push(v)}while(c1.length<3){var w=ri(5,11);if(c1.indexOf(w)<0&&c0.indexOf(w)<0)c1.push(w)}c0.sort(function(a,b){return a-b});c1.sort(function(a,b){return a-b});
    var m0=mn(c0),m1=mn(c1),s0=sm(c0.map(function(v){return sq(v-m0)})),s1=sm(c1.map(function(v){return sq(v-m1)})),s2=(s0+s1)/4,x0=pick([Math.round((m0+m1)/2)-1,Math.round((m0+m1)/2)+1]);
    var d0=x0*m0/s2-m0*m0/(2*s2)+Math.log(0.5),d1=x0*m1/s2-m1*m1/(2*s2)+Math.log(0.5);
    return {q:'<p>LDA with one input. Class 0: '+T('x=('+c0.join(', ')+')')+'. Class 1: '+T('x=('+c1.join(', ')+')')+'. Give '+T('\\hat\\mu_0')+', '+T('\\hat\\mu_1')+', the pooled variance '+T('\\hat\\sigma^2=\\frac1{n-2}\\sum_k\\sum_{i\\in k}(x_i-\\hat\\mu_k)^2')+', and the class predicted at '+T('x='+x0)+'.</p>',
      fields:[{label:T('\\hat\\mu_0'),answer:m0,tol:0.006},{label:T('\\hat\\mu_1'),answer:m1,tol:0.006},{label:T('\\hat\\sigma^2'),answer:s2,tol:0.01},{label:'class at '+T('x='+x0),type:'choice',options:['0','1'],answer:d1>d0?'1':'0'}],
      expl:tb(['class',T('x_i'),T('x_i-\\hat\\mu_k'),'squared'],c0.map(function(v){return ['0',v,f(v-m0),f(sq(v-m0))]}).concat(c1.map(function(v){return ['1',v,f(v-m1),f(sq(v-m1))]})),['total','','',f(s0+s1)])+
        '<p>'+T('\\hat\\sigma^2='+f(s0+s1)+'/(6-2)='+f(s2,4))+'. Equal priors (3 and 3), so the boundary is the midpoint '+T('('+f(m0)+'+'+f(m1)+')/2='+f((m0+m1)/2))+'. Check with the scores: '+T('\\delta_0('+x0+')='+f(d0,3))+', '+T('\\delta_1('+x0+')='+f(d1,3))+', so class <b>'+(d1>d0?1:0)+'</b>.</p>'+slip('measuring the gaps from the overall mean instead of each class\'s own mean, or dividing by '+T('n')+' instead of '+T('n-2')+'.')};
  },
  /* impurity: error, Gini, entropy with a per-class table */
  impurity2:function(){var m=pick([2,2,3]),c=[];for(var i=0;i<m;i++)c.push(ri(0,8));if(sm(c)<3)c[0]+=3;var n=sm(c),p=c.map(function(v){return v/n});
    var E=1-Math.max.apply(null,p),Gi=sm(p.map(function(v){return v*(1-v)})),D=-sm(p.map(function(v){return v>0?v*Math.log(v):0}));
    return {q:'<p>A tree node holds '+c.map(function(v,i){return v+' of class '+(i+1)}).join(', ')+'. Compute its classification error, Gini index and entropy (natural log).</p>',
      fields:[{label:'error',answer:E,tol:0.005},{label:'Gini',answer:Gi,tol:0.005},{label:'entropy',answer:D,tol:0.006}],
      expl:tb(['class','count',T('\\hat p_k'),T('\\hat p_k(1-\\hat p_k)'),T('-\\hat p_k\\log\\hat p_k')],c.map(function(v,i){return [i+1,v,f(p[i],4),f(p[i]*(1-p[i]),4),p[i]>0?f(-p[i]*Math.log(p[i]),4):'0']}),['total',n,'1',f(Gi,4),f(D,4)])+
        '<p>Error '+T('=1-\\max_k\\hat p_k=1-'+f(Math.max.apply(null,p),4)+'='+f(E,4))+'. A class with count 0 contributes 0 to the entropy (the limit of '+T('p\\log p')+').</p>'+slip('using counts instead of proportions, or (for two classes) writing Gini as '+T('\\hat p(1-\\hat p)')+' once instead of adding both classes, which halves it.')};
  },
  /* Gini gain of a split with the weighted table */
  gain2:function(){var l=[ri(0,6),ri(0,6)],r=[ri(0,6),ri(0,6)];if(l[0]+l[1]<2)l[0]+=2;if(r[0]+r[1]<2)r[1]+=2;
    function gi(c){var n=c[0]+c[1],p=c[0]/n;return 2*p*(1-p)}var P=[l[0]+r[0],l[1]+r[1]],nl=l[0]+l[1],nr=r[0]+r[1],n=nl+nr,after=(nl*gi(l)+nr*gi(r))/n;
    return {q:'<p>Parent node: '+P[0]+' A, '+P[1]+' B. The split sends '+l[0]+' A + '+l[1]+' B left and '+r[0]+' A + '+r[1]+' B right. Give the Gini of the left child, the right child, the weighted Gini after the split, and the gain.</p>',
      fields:[{label:'left',answer:gi(l),tol:0.005},{label:'right',answer:gi(r),tol:0.005},{label:'weighted after',answer:after,tol:0.005},{label:'gain',answer:gi(P)-after,tol:0.006}],
      expl:tb(['node','A','B','size','weight',T('\\hat p_A'),'Gini '+T('2\\hat p_A(1-\\hat p_A)')],[['parent',P[0],P[1],n,'',f(P[0]/n,4),f(gi(P),4)],['left',l[0],l[1],nl,nl+'/'+n,f(l[0]/nl,4),f(gi(l),4)],['right',r[0],r[1],nr,nr+'/'+n,f(r[0]/nr,4),f(gi(r),4)]])+
        '<p>After '+T('=\\frac{'+nl+'}{'+n+'}\\times'+f(gi(l),4)+'+\\frac{'+nr+'}{'+n+'}\\times'+f(gi(r),4)+'='+f(after,4))+'. Gain '+T('='+f(gi(P),4)+'-'+f(after,4)+'='+f(gi(P)-after,4))+'.</p>'+slip('averaging the two children\'s Gini equally instead of weighting by size.')};
  },
  /* forward pass: 2 inputs, 2 ReLU units, linear output */
  nnfwd2:function(){var x=[ri(-2,2),ri(-2,3)],W=[[ri(-2,2),ri(-2,2),ri(-2,2)],[ri(-2,2),ri(-2,2),ri(-2,2)]],b=[ri(-2,2),ri(-2,3),ri(-2,3)];
    var z=W.map(function(w){return w[0]+w[1]*x[0]+w[2]*x[1]}),A=z.map(function(v){return Math.max(0,v)}),out=b[0]+b[1]*A[0]+b[2]*A[1];
    return {q:'<p>Network with inputs '+T('x=('+x.join(', ')+')')+', two ReLU hidden units '+T('A_k=\\max(0,w_{k0}+w_{k1}x_1+w_{k2}x_2)')+' with '+T('w_1=('+W[0].join(', ')+')')+', '+T('w_2=('+W[1].join(', ')+')')+', and output '+T('f(x)=\\beta_0+\\beta_1A_1+\\beta_2A_2')+' with '+T('\\beta=('+b.join(', ')+')')+'. Give '+T('A_1')+', '+T('A_2')+' and '+T('f(x)')+'.</p>',
      fields:[{label:T('A_1'),answer:A[0],tol:0.001},{label:T('A_2'),answer:A[1],tol:0.001},{label:T('f(x)'),answer:out,tol:0.001}],
      expl:tb(['unit','pre-activation '+T('z_k'),T('A_k=\\max(0,z_k)')],z.map(function(v,k){return [k+1,T(W[k][0]+'+'+par(W[k][1])+'\\times'+par(x[0])+'+'+par(W[k][2])+'\\times'+par(x[1])+'='+v),f(A[k])]}))+
        '<p>'+T('f(x)='+b[0]+'+'+par(b[1])+'\\times'+A[0]+'+'+par(b[2])+'\\times'+A[1]+'='+f(out))+'.</p>'+slip('passing a negative pre-activation straight through. ReLU turns every negative '+T('z_k')+' into 0.')};
  },
  /* bias-variance decomposition at one point */
  bv2:function(){var m=ri(2,7),pr=[m+pick([-2,-1]),m+pick([1,2]),m,m+pick([-1,0,1])];var c=mn(pr);var tr=c+pick([-2,-1.5,-1,1,1.5,2]),s2=pick([0.25,0.5,1]);
    var b2=sq(c-tr),v=mn(pr.map(function(p){return sq(p-c)}));
    return {q:'<p>Four training sets give predictions at '+T('x_0')+' of '+T(pr.join(',\\ '))+'. The true '+T('f(x_0)='+f(tr))+' and the noise variance is '+T('\\sigma^2='+s2)+'. Give the average prediction, bias², variance and the expected test MSE.</p>',
      fields:[{label:'average',answer:c,tol:0.004},{label:'bias²',answer:b2,tol:0.004},{label:'variance',answer:v,tol:0.004},{label:'test MSE',answer:b2+v+s2,tol:0.006}],
      expl:tb(['set',T('\\hat f(x_0)'),T('\\hat f-\\bar f'),'squared'],pr.map(function(p,i){return [i+1,p,f(p-c),f(sq(p-c))]}),['average',f(c),'0',f(v)])+
        '<p>Bias² '+T('=(\\bar f-f(x_0))^2=('+f(c)+'-'+f(tr)+')^2='+f(b2))+'. Variance = average squared spread '+T('='+f(v))+'. Total '+T('='+f(b2)+'+'+f(v)+'+'+s2+'='+f(b2+v+s2))+'.</p>'+slip('measuring the spread from the true value instead of from the average prediction, or forgetting the noise term.')};
  },
  /* linkages with the cross-distance table */
  linkage2:function(){var r=function(){return [ri(-3,5),ri(-3,5)]},A=[r(),r()],B=[r(),r()];var D=[];A.forEach(function(a){B.forEach(function(b){D.push(Math.hypot(a[0]-b[0],a[1]-b[1]))})});if(Math.min.apply(null,D)===0)return G2.linkage2();
    var ca=[mn(A.map(function(p){return p[0]})),mn(A.map(function(p){return p[1]}))],cb=[mn(B.map(function(p){return p[0]})),mn(B.map(function(p){return p[1]}))],cen=Math.hypot(ca[0]-cb[0],ca[1]-cb[1]);
    var rows=[];A.forEach(function(a,i){B.forEach(function(b,j){rows.push([T('a_'+(i+1)+'='+pt(a)),T('b_'+(j+1)+'='+pt(b)),T('\\sqrt{'+(sq(a[0]-b[0])+sq(a[1]-b[1]))+'}'),f(D[i*2+j])])})});
    return {q:'<p>Clusters '+T('A=\\{'+A.map(pt).join(', ')+'\\}')+' and '+T('B=\\{'+B.map(pt).join(', ')+'\\}')+'. Give the single, complete, average and centroid linkage distances (Euclidean).</p>',
      fields:[{label:'single',answer:Math.min.apply(null,D),tol:0.01},{label:'complete',answer:Math.max.apply(null,D),tol:0.01},{label:'average',answer:mn(D),tol:0.01},{label:'centroid',answer:cen,tol:0.01}],
      expl:tb(['from A','to B','distance','value'],rows)+'<p>Single = smallest '+f(Math.min.apply(null,D))+'; complete = largest '+f(Math.max.apply(null,D))+'; average = mean of the four '+f(mn(D))+'. Centroids '+T(pt(ca))+' and '+T(pt(cb))+', distance '+f(cen)+'.</p>'+slip('averaging the points first and calling that "average linkage". That is the centroid linkage; average linkage averages the distances.')};
  },
  /* Parzen / triangular KDE with a kernel table */
  parzen2:function(){var n=pick([5,6]),xs=[];while(xs.length<n){var v=ri(0,12);if(xs.indexOf(v)<0)xs.push(v)}xs.sort(function(a,b){return a-b});var h=pick([2,3,4]),tri=Math.random()<0.5,x0=ri(xs[1],xs[n-2])+pick([0,0.5]);
    var u=xs.map(function(x){return (x0-x)/h}),K=u.map(function(v){return tri?Math.max(0,1-Math.abs(v)):(Math.abs(v)<=0.5+1e-12?1:0)}),s=sm(K);
    return {q:'<p>Data '+T('\\{'+xs.join(', ')+'\\}')+'. Estimate the density at '+T('x='+x0)+' with '+T('h='+h)+' and the '+(tri?'triangular kernel '+T('K(u)=\\max(0,1-|u|)'):'Parzen window '+T('K(u)=\\mathbb 1(|u|\\le\\tfrac12)'))+'. Give '+T('\\sum_iK(u_i)')+' and '+T('\\hat f(x)=\\frac1{nh}\\sum_iK\\big(\\frac{x-x_i}{h}\\big)')+'.</p>',
      fields:[{label:T('\\sum K'),answer:s,tol:0.005},{label:T('\\hat f(x)'),answer:s/(n*h),tol:0.002}],
      expl:tb([T('x_i'),T('u_i=(x-x_i)/h'),T('K(u_i)')],xs.map(function(x,i){return [x,f(u[i],3),f(K[i],3)]}),['total','',f(s,3)])+'<p>'+T('\\hat f('+x0+')=\\frac{'+f(s,3)+'}{'+n+'\\times'+h+'}='+f(s/(n*h),4))+'.</p>'+slip('dividing by '+T('n')+' only. The '+T('h')+' in '+T('nh')+' makes the estimate integrate to 1.')};
  },
  /* projection score and variance along a direction (centred data) */
  proj2:function(){var phi=pick([[0.6,0.8],[0.8,0.6],[0.6,-0.8],[1,0],[0,1]]);var P;do{P=[[ri(-3,3),ri(-3,3)],[ri(-3,3),ri(-3,3)],[ri(-3,3),ri(-3,3)]];var s=[sm(P.map(function(p){return p[0]})),sm(P.map(function(p){return p[1]}))];P.push([-s[0],-s[1]])}while(P.every(function(p){return p[0]===0&&p[1]===0}));
    var sc=P.map(function(p){return phi[0]*p[0]+phi[1]*p[1]}),v=mn(sc.map(sq));
    return {q:'<p>Centred data (each column has mean 0): '+P.map(function(p){return T(pt(p))}).join(', ')+'. Project onto the unit direction '+T('\\varphi='+pt(phi))+'. Give the score of the first point and the variance of the scores '+T('\\frac1n\\sum_i(\\varphi^Tx_i)^2')+'.</p>',
      fields:[{label:'score 1',answer:sc[0],tol:0.002},{label:'variance',answer:v,tol:0.01}],
      expl:tb(['point',T('\\varphi^Tx_i'),'squared'],P.map(function(p,i){return [T(pt(p)),T(phi[0]+'\\times'+par(p[0])+'+'+par(phi[1])+'\\times'+par(p[1])+'='+f(sc[i])),f(sq(sc[i]),4)]}),['average','',f(v,4)])+'<p>The scores have mean 0 because the data are centred, so the variance is just the mean square.</p>'+slip('forgetting to check that '+T('\\varphi')+' has length 1 ('+T('0.6^2+0.8^2=1')+'), or dividing by '+T('n-1')+' when the slides use '+T('n')+'.')};
  }
};
for(var _k in G2)G[_k]=G2[_k];

/* ======================================================================
   Questions
   ====================================================================== */
var QN=0,ALLQ=window.__pathQs=[];
function Question(div,ctx){
  ALLQ.push(this);
  this.div=div;this.ctx=ctx;this.kind=div.getAttribute('kind')||'mcq';this.id='q'+(++QN);this.qid=div.getAttribute('id')||(ctx.stepIdx+'-'+ctx.n);
  this.marks=parseFloat(div.getAttribute('data-marks')||'0');this.attempts=0;this.correct=false;
  var ex=div.querySelector(':scope > .expl'),mo=div.querySelector(':scope > .model');
  this.expl=ex;if(ex)ex.remove();this.model=mo;if(mo)mo.remove();
  var ul=div.querySelector(':scope > ul.task-list');this.items=[];
  if(ul){var self=this;ul.querySelectorAll(':scope > li').forEach(function(li){var inp=li.querySelector('input');var lab=li.querySelector('label')||li;
      var frag=document.createElement('span');while(lab.firstChild){if(lab.firstChild===inp){lab.removeChild(inp);continue}frag.appendChild(lab.firstChild)}
      self.items.push({node:frag,right:!!(inp&&inp.checked)});});ul.remove();}
  this.prompt=h('div','qprompt');while(div.firstChild)this.prompt.appendChild(div.firstChild);
  if(!this.marks)this.marks=this.kind==='self'?Math.max(1,this.items.length):this.kind==='gen'?2:1;
  div.className='qcard'+(ctx.test?' intest':'');
  var top=h('div','qtop');top.appendChild(h('span','qbadge',ctx.test?'Question '+ctx.n+' &middot; '+this.marks+' mark'+(this.marks>1?'s':''):(this.kind==='self'?'Exam-style: write, then mark yourself':this.kind==='gen'?'Checkpoint &middot; fresh numbers':'Checkpoint')));
  if(this.kind==='gen'){var nb=h('button','qnew','&#8635; New numbers');var me=this;nb.onclick=function(){me.render()};top.appendChild(nb);}
  div.appendChild(top);div.appendChild(this.prompt);this.body=h('div','qbody');div.appendChild(this.body);
  this.fb=h('div','qfb');div.appendChild(this.fb);this.ex=h('div','qexpl');div.appendChild(this.ex);
  this.render();
}
Question.prototype.render=function(){
  var me=this,b=this.body;b.innerHTML='';this.fb.innerHTML='';this.fb.className='qfb';this.ex.innerHTML='';this.ex.style.display='none';this.correct=false;this.attempts=0;this.div.classList.remove('ok','bad','locked');
  if(this.kind==='mcq'||this.kind==='multi'){
    var opts=shuffle(this.items.slice());this.opts=opts;var name=this.id;
    opts.forEach(function(o,i){var l=h('label','qopt');var inp=document.createElement('input');inp.type=me.kind==='mcq'?'radio':'checkbox';inp.name=name;inp.value=i;l.appendChild(inp);var sp=h('span');sp.appendChild(o.node);l.appendChild(sp);b.appendChild(l);o.inp=inp;o.lab=l;});
    if(this.kind==='multi')b.appendChild(h('div','qhint','Tick every correct option.'));
  }else if(this.kind==='num'){
    /* one answer, or several separated by ';' (labels and tol likewise) for step-by-step checkpoints */
    var ans=String(this.div.getAttribute('data-answer')).split(';'),labs=(this.div.getAttribute('data-label')||((String(this.div.getAttribute('data-answer')).indexOf(';')>=0||/maths2$/.test(P.module))&&this.div.getAttribute('label'))||'answer').split(';'),tols=this.div.hasAttribute('data-tol')?this.div.getAttribute('data-tol').split(';'):[];
    this.fields=ans.map(function(a,i){var t=tols.length?tols[Math.min(i,tols.length-1)]:null;return {label:labs[i]||labs[0],answer:parseFloat(a),tol:t!=null?parseFloat(t):null}});
    this.inputs=fieldInputs(b,this.fields);
  }else if(this.kind==='gen'){
    var g=G[this.div.getAttribute('data-gen')];var d=g?g():{q:'(missing generator)',fields:[],expl:''};this.genData=d;
    this.prompt.innerHTML=d.q;this.fields=d.fields;this.inputs=fieldInputs(b,d.fields);typeset(this.prompt);
  }else if(this.kind==='self'){
    var ta=document.createElement('textarea');ta.rows=4;ta.placeholder='Write your answer here (or on paper), then reveal the model answer and tick the mark points you hit.';b.appendChild(ta);this.ta=ta;
  }
  if(!this.ctx.test){
    var bt=h('button','btn qcheck',this.kind==='self'?'Reveal model answer':'Check');bt.onclick=function(){me.check()};b.appendChild(bt);this.btn=bt;
  }
  typeset(b);
};
function fieldInputs(b,fields){var row=h('div','qfields'),ins=[];
  fields.forEach(function(fd){var w=h('label','qfield');w.appendChild(h('span','flab',fd.label));var inp;
    if(fd.type==='choice'){inp=document.createElement('select');inp.appendChild(new Option('choose…',''));fd.options.forEach(function(o){inp.appendChild(new Option(o,o))})}
    else{inp=document.createElement('input');inp.type='text';inp.inputMode='decimal';inp.placeholder='e.g. 0.625 or 5/8';inp.autocomplete='off'}
    w.appendChild(inp);row.appendChild(w);ins.push(inp)});b.appendChild(row);return ins}
Question.prototype.grade=function(){ /* returns fraction correct 0..1 */
  if(this.kind==='mcq'||this.kind==='multi'){var ok=true,any=false;this.opts.forEach(function(o){if(o.inp.checked)any=true;if(o.inp.checked!==o.right)ok=false});return any&&ok?1:0}
  if(this.kind==='num'||this.kind==='gen'){var n=0,me=this;this.fields.forEach(function(fd,i){var v=me.inputs[i].value;var good=fd.type==='choice'?v===fd.answer:close(parseNum(v),fd.answer,fd.tol);me.inputs[i].classList.toggle('good',good);me.inputs[i].classList.toggle('wrong',!good);if(good)n++});return this.fields.length?n/this.fields.length:0}
  return 0;
};
Question.prototype.answerHTML=function(){
  if(this.kind==='mcq'||this.kind==='multi'){return ''}
  if(this.fields)return '<b>Answer:</b> '+this.fields.map(function(fd){return fd.label+' = '+(fd.type==='choice'?fd.answer:f(fd.answer,4))}).join(', ');return '';
};
Question.prototype.showExpl=function(){var e=this.ex;e.innerHTML='';
  if(this.kind==='gen'&&this.genData)e.innerHTML=this.genData.expl;else if(this.expl)e.appendChild(this.expl.cloneNode(true));
  if(!e.innerHTML&&this.kind!=='mcq')e.innerHTML='<p>'+this.answerHTML()+'</p>';
  else if(this.kind==='num'||this.kind==='gen')e.insertAdjacentHTML('afterbegin','<p class="ans">'+this.answerHTML()+'</p>');
  if(e.innerHTML){e.style.display='block';typeset(e)}};
Question.prototype.markOpts=function(){if(!this.opts)return;this.opts.forEach(function(o){o.lab.classList.toggle('right',o.right);o.lab.classList.toggle('picked-wrong',o.inp.checked&&!o.right)})};
Question.prototype.selfMark=function(onChange){
  var me=this;if(this.model){var m=h('div','qmodel');m.innerHTML='<div class="mh">Model answer</div>';m.appendChild(this.model.cloneNode(true));this.ex.appendChild(m)}
  var need=parseInt(this.div.getAttribute('data-need')||Math.ceil(this.items.length*0.6),10);this.need=need;
  var box=h('div','qmarks','<div class="mh">Mark scheme: tick each point your answer made</div>');this.ticks=[];
  this.items.forEach(function(it){var l=h('label','qopt');var c=document.createElement('input');c.type='checkbox';l.appendChild(c);var sp=h('span');sp.appendChild(it.node.cloneNode(true));l.appendChild(sp);box.appendChild(l);me.ticks.push(c);c.onchange=function(){onChange&&onChange()}});
  this.ex.appendChild(box);this.ex.style.display='block';typeset(this.ex);
};
Question.prototype.selfScore=function(){return this.ticks?this.ticks.filter(function(c){return c.checked}).length:0};
Question.prototype.check=function(){
  var me=this;
  if(this.kind==='self'){
    if(!this.ticks){this.btn.textContent='I’ve marked it';this.selfMark(function(){});return}
    var s=this.selfScore();
    if(s>=this.need){this.pass();this.fb.innerHTML='&#9989; '+s+' of '+this.items.length+' points. Good enough to move on: learn the points you missed.';}
    else{this.fb.className='qfb bad';this.fb.innerHTML='You ticked '+s+' of '+this.items.length+'; aim for at least '+this.need+'. Reread the model answer, then try writing it again from memory.';
      if(this.ta)this.ta.value='';this.ticks.forEach(function(c){c.checked=false})}
    return;
  }
  var g=this.grade();this.attempts++;
  if(g===1){this.pass();this.fb.innerHTML='&#9989; Correct.';this.markOpts();this.showExpl();return}
  this.div.classList.add('bad');this.fb.className='qfb bad';
  if(this.attempts>=2){this.fb.innerHTML='Not yet. Here is the working: read it, then try again'+(this.kind==='gen'?' with fresh numbers':'')+'.';this.showExpl();
    if(this.kind==='gen')this.ex.insertAdjacentHTML('beforeend','<p class="qhint">Press <b>New numbers</b> to get a fresh version to try.</p>');
  }else this.fb.innerHTML=this.kind==='num'||this.kind==='gen'?'Not quite (one or more boxes are red). Check your working and try again.':'Not quite. Think again and pick another answer.';
  if((this.kind==='mcq'||this.kind==='multi')&&this.attempts>=2){var keep=this.fb.innerHTML,ex=this.ex.innerHTML;this.render();this.fb.className='qfb bad';this.fb.innerHTML=keep+' The options have been shuffled.';this.ex.innerHTML=ex;this.ex.style.display='block';this.attempts=1}
};
Question.prototype.pass=function(){this.correct=true;this.div.classList.remove('bad');this.div.classList.add('ok');this.fb.className='qfb ok';if(this.btn)this.btn.style.display='none';this.ctx.onPass&&this.ctx.onPass(this)};

/* ======================================================================
   Stage page
   ====================================================================== */
function stagePage(){
  var body=document.querySelector('.pathbody');if(!body)return;
  var lock=document.getElementById('pathlock');
  if(!isOpen(IDX)){
    var k=firstOpenUnpassed();body.style.display='none';
    lock.innerHTML='<div class="lockpanel"><div class="lk">&#128274;</div><h2>This stage is locked</h2><p>Pass the test at the end of every earlier stage first. Your next stage is <a href="'+STAGES[k].href+'"><b>Stage '+(k+1)+': '+STAGES[k].title+'</b></a>.</p><p><a class="btn" href="'+STAGES[k].href+'">Go to stage '+(k+1)+' &rarr;</a> <a class="btn ghost" href="'+P.home+'">See the whole path</a></p></div>';
    return;
  }
  /* group children into steps at each h2 */
  var kids=Array.prototype.slice.call(body.childNodes),steps=[],cur=h('section','intro');steps.push(cur);
  kids.forEach(function(n){if(n.nodeType===1&&n.tagName==='H2'){cur=h('section','step');steps.push(cur)}cur.appendChild(n)});
  body.innerHTML='';steps.forEach(function(s){body.appendChild(s)});
  var intro=steps.shift(),lessons=steps.filter(function(s){return !s.querySelector('div.test')}),testSec=steps.filter(function(s){return s.querySelector('div.test')})[0];
  var done=S.done[ME]=S.done[ME]||{},reached=S.step[ME]||0;
  var passed=S.passed[ME];
  /* top bar with step dots */
  var nav=h('div','stepnav');intro.appendChild(nav);
  var all=lessons.concat(testSec?[testSec]:[]);
  function paintNav(){nav.innerHTML='';all.forEach(function(s,i){var t=s.querySelector('h2');var a=h('a','sdot'+(i<=reached?' open':'')+(stepDone(i)?' done':''),'<i>'+(i===lessons.length?'&#9733;':(i+1))+'</i><span>'+(t?t.textContent.replace(/[0-9]+\.\s*/,''):'')+'</span>');if(i<=reached)a.href='#'+(t&&t.id);nav.appendChild(a)});
    var jump=h('button','btn ghost small','Already know this? Jump to the stage test');jump.onclick=function(){reached=lessons.length;S.step[ME]=reached;save();paintAll();testSec&&testSec.scrollIntoView()};
    if(reached<lessons.length&&testSec)nav.appendChild(jump);}
  var stepQs=[];
  function stepDone(i){if(i>=lessons.length)return !!S.passed[ME];var qs=stepQs[i]||[];return i<reached||qs.every(function(q){return q.correct||done[q.qid]})}
  lessons.forEach(function(sec,i){
    var qs=[];var n=0;
    sec.querySelectorAll('div.q').forEach(function(d){n++;var q=new Question(d,{stepIdx:i,n:n,test:false,onPass:function(qq){done[qq.qid]=1;save();maybeAdvance(i)}});if(done[q.qid]){q.div.classList.add('wasdone');q.fb.innerHTML='&#10003; You passed this before. Try it again any time.';q.fb.className='qfb ok'}qs.push(q)});
    stepQs[i]=qs;
    var foot=h('div','stepfoot');sec.appendChild(foot);sec._foot=foot;
    var lockmsg=h('div','steplock','<span>&#128274;</span> Locked: finish the checkpoint'+(qs.length>1?'s':'')+' in the step above to open this step.');sec.parentNode.insertBefore(lockmsg,sec);sec._lock=lockmsg;
  });
  function maybeAdvance(i){var qs=stepQs[i];if(qs.every(function(q){return q.correct||done[q.qid]})){if(reached<=i){reached=i+1;S.step[ME]=reached;save();paintAll();var nx=all[i+1];if(nx)setTimeout(function(){nx.scrollIntoView({behavior:'smooth',block:'start'})},350)}}}
  function paintAll(){
    lessons.forEach(function(sec,i){var open=i<=reached;sec.style.display=open?'':'none';sec._lock.style.display=(!open&&i===reached+1)?'':'none';
      var qs=stepQs[i];sec._foot.innerHTML='';
      if(open&&i===reached){if(!qs.length){var b=h('button','btn','I’ve read this: continue &rarr;');b.onclick=function(){reached=i+1;S.step[ME]=reached;save();paintAll();var nx=all[i+1];nx&&nx.scrollIntoView({behavior:'smooth'})};sec._foot.appendChild(b)}
        else sec._foot.innerHTML='<div class="todo">Answer the checkpoint'+(qs.length>1?'s':'')+' above to unlock the next step.</div>'}});
    if(testSec){var open=reached>=lessons.length;testSec.style.display=open?'':'none';tlock.style.display=(!open&&reached===lessons.length-1)?'':'none';}
    paintNav();
  }
  var tlock=h('div','steplock','<span>&#128274;</span> The stage test unlocks when every step above is done.');if(testSec){testSec.parentNode.insertBefore(tlock,testSec);buildTest(testSec)}
  paintAll();
  /* first visit: unlocked step 0 */
}
function buildTest(sec){
  var tdiv=sec.querySelector('div.test');var pass=parseFloat(tdiv.getAttribute('data-pass')||'80'),draw=parseInt(tdiv.getAttribute('data-draw')||'0',10);
  var pool=Array.prototype.slice.call(tdiv.querySelectorAll(':scope > div.q'));pool.forEach(function(d){d.remove()});
  var templates=pool.map(function(d){return d.cloneNode(true)});
  var info=h('div','testinfo');tdiv.appendChild(info);var holder=h('div','testqs');tdiv.appendChild(holder);var bar=h('div','testbar');tdiv.appendChild(bar);
  var qs=[];
  function start(){
    holder.innerHTML='';bar.innerHTML='';qs=[];QN+=0;
    var chosen=templates.map(function(t,i){return i});if(draw&&draw<chosen.length){chosen=shuffle(chosen).slice(0,draw).sort(function(a,b){return a-b})}
    chosen.forEach(function(ix,k){var d=templates[ix].cloneNode(true);holder.appendChild(d);qs.push(new Question(d,{stepIdx:'t',n:k+1,test:true}))});
    var total=qs.reduce(function(s,q){return s+q.marks},0);
    var best=S.best[ME];
    info.innerHTML='<p><b>'+qs.length+' questions, '+total+' marks. Pass mark '+pass+'%.</b> No feedback until you submit. Calculator allowed, notes not: close the lesson above and answer from memory, as in the exam. Questions with fresh numbers change on every attempt.'+(best!=null?' Your best so far: <b>'+best+'%</b>.':'')+(S.passed[ME]?' <span class="passtag">&#10003; Passed</span>':'')+'</p>';
    var sb=h('button','btn','Submit test');sb.onclick=submit;bar.appendChild(sb);typeset(holder);
  }
  function submit(){
    bar.innerHTML='';var auto=0,total=0,selfQs=[];
    qs.forEach(function(q){total+=q.marks;q.div.classList.add('locked');q.div.querySelectorAll('input,select,textarea').forEach(function(i){if(!i.closest('.qmarks'))i.disabled=true});
      if(q.kind==='self'){selfQs.push(q);return}
      var g=q.grade(),m=Math.round(g*q.marks*100)/100;q.got=m;auto+=m;q.div.classList.add(g===1?'ok':g>0?'part':'bad');q.markOpts();q.showExpl();
      q.fb.className='qfb '+(g===1?'ok':'bad');q.fb.innerHTML=(g===1?'&#9989; ':'&#10060; ')+m+' / '+q.marks;});
    var out=h('div','testresult');bar.appendChild(out);
    function tally(){var sm=selfQs.reduce(function(s,q){return s+Math.min(q.marks,q.selfScore())},0);var pct=Math.round(100*(auto+sm)/total);return pct}
    if(selfQs.length){selfQs.forEach(function(q){q.selfMark(function(){show(false)});q.fb.className='qfb';q.fb.innerHTML='Mark this one yourself against the scheme below.'});}
    function show(final){var pct=tally();
      if(!final){out.innerHTML='<p>Auto-marked so far, plus your self-marking: <b>'+pct+'%</b>. Tick the mark points you honestly hit, then confirm.</p>';var c=h('button','btn','Confirm my score');c.onclick=function(){show(true)};out.appendChild(c);return}
      var ok=pct>=pass;S.best[ME]=Math.max(S.best[ME]||0,pct);
      if(ok){S.passed[ME]={score:pct,at:new Date().toISOString().slice(0,10)};}
      save();
      selfQs.forEach(function(q){q.ticks.forEach(function(c){c.disabled=true})});
      var nx=STAGES[IDX+1];
      out.innerHTML=ok?'<div class="banner win"><div class="big">&#127881; '+pct+'%: stage passed</div><p>'+(nx?'<b>Stage '+(IDX+2)+': '+nx.title+'</b> is now unlocked.':'You have finished the whole path.')+' Read the explanations above for anything you lost marks on.</p>'+(nx?'<a class="btn" href="'+nx.href+'">Next stage &rarr;</a> ':'')+'<a class="btn ghost" href="'+P.home+'">Path overview</a></div>'
        :'<div class="banner lose"><div class="big">'+pct+'%: not passed yet (need '+pass+'%)</div><p>Read the working for each question you missed, reopen the matching step above, then retake. Fresh-number questions will change.</p></div>';
      var r=h('button','btn ghost','&#8635; Retake the test');r.onclick=function(){start();sec.scrollIntoView()};out.appendChild(r);
      document.querySelectorAll('.sidebar .pstat').forEach(paintSide);
    }
    show(!selfQs.length);
  }
  start();
}

/* ======================================================================
   Path overview page and sidebar
   ====================================================================== */
function paintSide(el){var i=parseInt(el.getAttribute('data-i'),10),s=STAGES[i];el.innerHTML=S.passed[s.id]?'&#10003;':isOpen(i)?'':'&#128274;';el.parentNode.classList.toggle('plocked',!isOpen(i))}
function overview(){
  var host=document.getElementById('pathmap');if(!host)return;
  var np=STAGES.filter(function(s){return S.passed[s.id]}).length,nx=firstOpenUnpassed();
  var top=h('div','pathsum');top.innerHTML='<div class="track"><div class="fill" style="width:'+Math.round(100*np/STAGES.length)+'%"></div></div><p><b>'+np+' of '+STAGES.length+' stages passed.</b> '+(nx>=0?'Next up: <a href="'+STAGES[nx].href+'">Stage '+(nx+1)+': '+STAGES[nx].title+'</a>.':'Everything passed. Use the mock exam and the fresh-number drills to stay sharp.')+'</p>'+(nx>=0?'<a class="btn" href="'+STAGES[nx].href+'">'+(np?'Continue':'Start')+' &rarr;</a>':'');
  host.appendChild(top);
  var wk='';STAGES.forEach(function(s,i){
    if(s.group!==wk){wk=s.group;host.appendChild(h('h3','pgroup',wk))}
    var open=isOpen(i),ps=S.passed[s.id],cls='pcard'+(ps?' passed':open?' open':' locked');
    var a=h(open?'a':'div',cls);if(open)a.href=s.href;
    a.innerHTML='<span class="pn">'+(ps?'&#10003;':open?(i+1):'&#128274;')+'</span><span class="pt"><b>Stage '+(i+1)+': '+s.title+'</b><small>'+s.blurb+'</small></span><span class="pm">'+(ps?ps.score+'%':open?(S.step[s.id]?'in progress':'~'+s.mins+' min'):'locked')+'</span>';
    host.appendChild(a)});
  var tools=h('div','pathtools');
  var rev=h('button','btn ghost small',S.revision?'Revision mode is ON: turn gating back on':'Revision mode: unlock everything');
  rev.onclick=function(){if(!S.revision&&!confirmBox('Revision mode opens every stage without passing the tests. Your passes are kept. Turn it on?'))return;S.revision=!S.revision;save();location.reload()};
  var ex=h('button','btn ghost small','Copy my progress code');ex.onclick=function(){var c=btoa(unescape(encodeURIComponent(JSON.stringify(S))));var ta=h('textarea','codebox');ta.value=c;tools.appendChild(ta);ta.select();try{document.execCommand('copy');ex.textContent='Copied: paste it on another device'}catch(e){}};
  var im=h('button','btn ghost small','Load a progress code');im.onclick=function(){var ta=h('textarea','codebox');ta.placeholder='Paste the code, then press Load';var go=h('button','btn small','Load');tools.appendChild(ta);tools.appendChild(go);go.onclick=function(){try{var s=JSON.parse(decodeURIComponent(escape(atob(ta.value.trim()))));localStorage.setItem(KEY,JSON.stringify(s));location.reload()}catch(e){go.textContent='That code didn’t work'}}};
  var rs=h('button','btn ghost small danger','Reset all progress');rs.onclick=function(){if(confirmBox('Delete all learning-path progress in this browser?')){try{localStorage.removeItem(KEY)}catch(e){}location.reload()}};
  [rev,ex,im,rs].forEach(function(b){tools.appendChild(b)});host.appendChild(tools);
}
function confirmBox(msg){return window.confirm(msg)}

function init(){document.querySelectorAll('.sidebar .pstat').forEach(paintSide);if(ME)stagePage();else overview();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.PathGen=G;window.PathParse=parseNum;
})();
