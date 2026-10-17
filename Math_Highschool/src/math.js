// 화면과 독립적인 계산. 식 문자열을 실행하지 않고 명시적으로 정의한 모형만 사용한다.
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const signedNumber=v=>v<0?`−${Math.abs(v)}`:String(v);
export const signedTerm=v=>v===0?'':v<0?` − ${Math.abs(v)}`:` + ${v}`;
export const coefficient=(a,term='x')=>a===0?'0':`${a<0?'−':''}${Math.abs(a)===1?'':Math.abs(a)}${term}`;
export const shiftedInput=a=>`x${signedTerm(-a)}`;
export const sum = xs => xs.reduce((a,b)=>a+b,0);
export const mean = xs => sum(xs)/xs.length;
export const variance = xs => mean(xs.map(x=>(x-mean(xs))**2));
export function factorial(n) { if(!Number.isInteger(n)||n<0||n>170)return NaN;let r=1;for(let i=2;i<=n;i++)r*=i;return r; }
export function choose(n,r) { if(!Number.isInteger(n)||!Number.isInteger(r)||r<0||r>n)return 0;let v=1;for(let i=1;i<=Math.min(r,n-r);i++)v=v*(n-i+1)/i;return v; }
export const normalPDF=(x,mu=0,sigma=1)=>sigma>0?Math.exp(-0.5*((x-mu)/sigma)**2)/(sigma*Math.sqrt(2*Math.PI)):NaN;
export function rng(seed=2026) { let a=seed>>>0;return ()=>{a=(1664525*a+1013904223)>>>0;return a/4294967296;}; }
export function sampleNormal(n,seed=23,mu=50,sigma=10) {const random=rng(seed),out=[];for(let i=0;i<n;i++)out.push(mu+sigma*Math.sqrt(-2*Math.log(Math.max(random(),1e-15)))*Math.cos(2*Math.PI*random()));return out;}
export function integrate(fn,a,b,n=400) { const h=(b-a)/n;let v=0;for(let i=0;i<n;i++)v+=fn(a+(i+0.5)*h)*h;return v; }
export function rectangleSum(fn,a,b,n) {const h=(b-a)/n;return Array.from({length:n},(_,i)=>({x:a+i*h,y:fn(a+i*h),width:h}));}
export function matmul(A,B) {return A.map(row=>B[0].map((_,j)=>sum(row.map((v,k)=>v*B[k][j]))));}
export function binomial(n,p) {return Array.from({length:n+1},(_,k)=>choose(n,k)*p**k*(1-p)**(n-k));}
export function confidence(meanValue,sigma,n,z=1.96) {const margin=z*sigma/Math.sqrt(n);return [meanValue-margin,meanValue+margin];}
export function ciExperiment(n=25,repetitions=80) { const populationMean=50,sigma=10;return Array.from({length:repetitions},(_,i)=>{const sample=sampleNormal(n,31+i*19,populationMean,sigma),m=mean(sample),bounds=confidence(m,sigma,n);return {mean:m,lo:bounds[0],hi:bounds[1],covers:bounds[0]<=populationMean&&populationMean<=bounds[1]};}); }
export function graphModel(kind,p={}) {
  const a=p.a??1,b=p.b??0,h=p.h??0.5,x=p.x??1;
  const models={
    variable: {fn:t=>a*t+b,formula:`y = ${a===0?b<0?'−'+Math.abs(b):b:coefficient(a)+signedTerm(b)}`},
    power: {fn:t=>t**Math.round(a),formula:`y = x^${Math.round(a)}`},
    polynomial: {fn:t=>t*t+a*t+b,formula:`y = x²${a===0?'':`${a<0?' − ':' + '}${coefficient(Math.abs(a))}`}${signedTerm(b)}`},
    factor: {fn:t=>(t-a)*(t-b),formula:`y = (${shiftedInput(a)})(${shiftedInput(b)})`,roots:[a,b]},
    remainder:{fn:t=>t**3-2*t+1,formula:'P(x) = x³ − 2x + 1',marker:[a,a**3-2*a+1]},
    quadratic:{fn:t=>t*t-2*t+a,formula:`y = x² − 2x${signedTerm(a)}`,discriminant:4-4*a},
    inequality:{fn:t=>t*t-a,formula:`x² − ${a} < 0`},
    system:{fn:t=>a*t+1,other:t=>-t+b,formula:`y = ${a===0?'1':coefficient(a)+' + 1'}, y = −x${signedTerm(b)}`,marker:[(b-1)/(a+1),a*(b-1)/(a+1)+1]},
    function:{fn:t=>t*t,formula:'f(x) = x²'},
    transform:{fn:t=>(t-a)**2+b,formula:`y = (${shiftedInput(a)})²${signedTerm(b)}`},
    composition:{fn:t=>(t+a)**2,other:t=>t*t+a,formula:`f(x)=x², g(x)=x${signedTerm(a)}`},
    inverse:{fn:t=>a*t+b,other:t=>(t-b)/a,formula:`f(x)=${coefficient(a)}${signedTerm(b)}, f⁻¹(x)=${b===0?'x':`(${shiftedInput(b)})`}${a===1?'':`/${a}`}`},
    rational:{fn:t=>t===a?NaN:1/(t-a),formula:`y = 1/(${shiftedInput(a)}), x ≠ ${signedNumber(a)}`,asymptote:a},
    radical:{fn:t=>t-a>=0?Math.sqrt(t-a):NaN,formula:`y = √(${shiftedInput(a)}), x ≥ ${signedNumber(a)}`},
    exponential:{fn:t=>a**t,formula:`y = ${a}^x`},
    log:{fn:t=>t>0?Math.log(t)/Math.log(a):NaN,formula:`y = log_${a}(x), x > 0`},
    logrule:{fn:t=>t>0?Math.log(t)/Math.log(2):NaN,formula:'log₂(ab) = log₂a + log₂b'},
    trig:{fn:t=>a*Math.sin(t+b),other:t=>Math.cos(t),formula:`y = ${coefficient(a,`sin(x${signedTerm(b)})`)}`},
    tangent:{fn:t=>Math.abs(Math.cos(t))<1e-12?NaN:Math.tan(t),formula:'tan θ = sin θ / cos θ',asymptotes:[-Math.PI/2,Math.PI/2]},
    limit:{fn:t=>t===1?NaN:t+1,formula:'x≠1이면 f(x)=x+1; f(1)=a',hole:[1,2],marker:[1,a]},
    continuity:{fn:t=>t<0?-1:t>0?1:NaN,formula:'x<0이면 −1, x>0이면 1, f(0)=a',hole:[0,1],marker:[0,a]},
    secant:{fn:t=>t*t,formula:'s(t)=t²',secant:[[x,x*x],[x+h,(x+h)**2]],marker:[x,x*x]},
    derivative:{fn:t=>t*t,formula:'f(x)=x², f′(x)=2x',tangent:{x,y:x*x,slope:2*x}},
    corner:{fn:t=>Math.abs(t),formula:'f(x)=|x|',secant:[[-h,h],[0,0]],right:[[0,0],[h,h]]},
    derivativegraph:{fn:t=>t**3-3*t,other:t=>3*t*t-3,formula:'f(x)=x³−3x, f′(x)=3x²−3',marker:[x,x**3-3*x],secondaryMarker:[x,3*x*x-3],tangent:{x,y:x**3-3*x,slope:3*x*x-3}},
    stationary:{fn:t=>t**3,other:t=>3*t*t,formula:'f(x)=x³, f′(0)=0'},
    chain:{fn:t=>Math.sin(a*t),other:t=>a*Math.cos(a*t),formula:`f(x)=sin(${coefficient(a)}), f′(x)=${coefficient(a,`cos(${coefficient(a)})`)}`},
    integral:{fn:t=>t*t,formula:'∫₀ᵇ x² dx = b³/3',integral:{a:0,b,n:Math.round(a)}},
    signed:{fn:t=>t,formula:'∫₋₁ᵇ x dx = (b²−1)/2',integral:{a:-1,b,n:36}},
    fundamental:{fn:t=>t*t,other:t=>t**3/3,formula:'F(x)=∫₀ˣ t²dt=x³/3, F′(x)=x²',marker:[x,x*x],secondaryMarker:[x,x**3/3],tangent:{x,y:x**3/3,slope:x*x},integral:{a:0,b:x,n:40}},
    substitute:{fn:t=>2*t*Math.cos(t*t),formula:'u=x², du=2x dx; ∫2x cos(x²)dx=sin(x²)+C',integral:{a:0,b,n:48}},
    parts:{fn:t=>t*Math.exp(t),formula:'∫x eˣ dx = x eˣ − eˣ + C',integral:{a:0,b,n:48}},
    motion:{fn:t=>t-1,formula:'v(t)=t−1',integral:{a:0,b,n:48}},
    product:{fn:t=>t*t*Math.sin(t),other:t=>2*t*Math.sin(t)+t*t*Math.cos(t),formula:'(x² sin x)′ = 2x sin x + x² cos x'},
    expderiv:{fn:t=>Math.exp(a*t),other:t=>a*Math.exp(a*t),formula:`(e^(${coefficient(a)}))′ = ${coefficient(a,`e^(${coefficient(a)})`)}`},
    between:{fn:t=>t,other:t=>t*t,formula:'넓이=∫₀ᵇ (x−x²)dx (0≤b≤1)',integral:{a:0,b,n:40}},
    volume:{fn:t=>t,formula:'회전체 부피=π∫₀ᵇ x² dx=πb³/3',integral:{a:0,b,n:40}},
  };
  return models[kind]||models.variable;
}
export function sequenceModel(kind,a=2,r=1.5,n=8) {
  if(kind==='arithmetic')return Array.from({length:n},(_,i)=>a+i*r);
  if(kind==='geometric'||kind==='series')return Array.from({length:n},(_,i)=>a*r**i);
  if(kind==='seqlimit')return Array.from({length:n},(_,i)=>1/(i+1));
  return Array.from({length:n},(_,i)=>(i+1)*(i+2)/2);
}
export function modelReport(kind,p={}) {
  const a=p.a??1,b=p.b??0,x=p.x??1,h=p.h??0.5;
  switch(kind) {
    case 'complex': return [['실수부 a',a],['허수부 b',b],['원점까지 거리',Math.hypot(a,b)]];
    case 'factor':return [['첫 번째 영점',a],['두 번째 영점',b],['상수항 ab',a*b]];
    case 'remainder':return [['나누는 식',shiftedInput(a)],['나머지 P(a)',a**3-2*a+1]];
    case 'quadratic':return [['판별식 D',4-4*a],['서로 다른 실근 개수',a<1?2:a===1?1:0]];
    case 'inequality':return [['판정할 x',x],['x²−a',x*x-a],['x²<a인가?',x*x<a?'참':'거짓']];
    case 'system':return [['교점의 x',(b-1)/(a+1)],['교점의 y',a*(b-1)/(a+1)+1]];
    case 'composition':return [['관찰 입력 x',x],[`f(g(${signedNumber(x)}))`,(x+a)**2],[`g(f(${signedNumber(x)}))`,x*x+a]];
    case 'inverse':return [['입력 x',x],['f(x)',a*x+b],['f⁻¹(f(x))',x]];
    case 'logrule':return [['a × b',a*b],['log₂(ab)',Math.log2(a*b)],['log₂a + log₂b',Math.log2(a)+Math.log2(b)]];
    case 'secant':return [['시간 간격 h',h],['위치 변화량',(x+h)**2-x*x],['평균 변화율',2*x+h]];
    case 'derivative':return [['관찰 위치 x',x],['함숫값 f(x)',x*x],['접선의 기울기',2*x]];
    case 'corner':return [['왼쪽 기울기',-1],['오른쪽 기울기',1],['0에서 미분 가능?', '불가능']];
    case 'stationary':return [['f′(0)',0],['0의 왼쪽과 오른쪽','모두 증가'],['0에서 극값?', '아님']];
    case 'integral':return [['직사각형 개수',Math.round(a)],['왼쪽 합',sum(rectangleSum(t=>t*t,0,b,Math.round(a)).map(r=>r.y*r.width))],['정확한 적분값',b**3/3]];
    case 'signed':return [['정적분 (부호 포함)',(b*b-1)/2],['넓이 (항상 양수)',b>=0?(1+b*b)/2:(1-b*b)/2]];
    case 'fundamental':return [['위치 x',x],['누적 F(x)',x**3/3],['누적의 변화율 F′(x)',x*x]];
    case 'substitute':return [['적분 구간 끝 b',b],['u 구간 끝 b²',b*b],['정확한 정적분',Math.sin(b*b)]];
    case 'parts':return [['구간 끝 b',b],['정확한 정적분',(b-1)*Math.exp(b)+1]];
    case 'motion':return [['시간 t',b],['변위',b*b/2-b],['총 이동 거리',b<=1?b-b*b/2:0.5+(b-1)**2/2]];
    case 'chain':return [['안쪽 함수의 변화율',a],['x=0에서 도함수 값',a]];
    case 'product':return [['관찰 입력 x',x],['f(x)',x*x*Math.sin(x)],['f′(x)',2*x*Math.sin(x)+x*x*Math.cos(x)]];
    case 'expderiv':return [['계수 a',a],['f(0)',1],['f′(0)',a]];
    case 'between':return [['구간 끝 b',b],['위 그래프 − 아래 그래프',b-b*b],['두 그래프 사이 넓이',b*b/2-b**3/3]];
    case 'volume':return [['회전할 구간 끝 b',b],['끝의 단면 넓이',Math.PI*b*b],['회전체 부피',Math.PI*b**3/3]];
    case 'continuity':return [['현재 입력 x',x],['현재 f(x)',x===0?a:x<0?-1:1],['0까지 거리 |x|',Math.abs(x)],['왼쪽·오른쪽 극한','−1과 1: 서로 다름'],['f(0)',a]];
    case 'limit':return [['현재 입력 x',x],['현재 f(x)',x===1?a:x+1],['1까지 거리 |x−1|',Math.abs(x-1)],['x→1의 극한',2],['지정한 f(1)',a],['1에서 연속?',a===2?'예':'아니요']];
    default: {const m=graphModel(kind,p),value=m.fn(x);return [['관찰 입력 x',x],['함숫값',Number.isFinite(value)?value:'정의되지 않음']];}
  }
}
