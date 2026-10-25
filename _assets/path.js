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
    this.fields=[{label:this.div.getAttribute('data-label')||'answer',answer:parseFloat(this.div.getAttribute('data-answer')),tol:this.div.hasAttribute('data-tol')?parseFloat(this.div.getAttribute('data-tol')):null}];
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
