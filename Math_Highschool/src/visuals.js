import {graphModel,modelReport,sequenceModel,sum,mean,variance,matmul,choose,factorial,binomial,normalPDF,sampleNormal,ciExperiment,rng} from './math.js';
export const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=x=>typeof x==='number'?(Number.isFinite(x)?x!==0&&Math.abs(x)<.001?x.toExponential(3):Number(x.toFixed(4)).toLocaleString('ko-KR',{maximumFractionDigits:4}):'정의되지 않음'):String(x);
const TEAL='#187e7c',ORANGE='#c46e32',GRAY='#a2a9b0',BLUE='#526ba5';
let plotId=0;
const txt=(x,y,text,extra='')=>`<text x="${x}" y="${y}" ${extra}>${escapeHTML(text)}</text>`;
const point=(x,y,color=ORANGE,r=5)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/>`;
const seg=(x1,y1,x2,y2,color=TEAL,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra.includes('stroke-width')?'':'stroke-width="2"'} ${extra}/>`;
function frame(w=600,h=320,label='수학 개념의 시각화') {return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHTML(label)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font:12px system-ui;fill:#607080">`;}
function plane(w=600,{x0=-3,x1=3,y0=-3,y1=5,h=320,xlabel='입력 x',ylabel='출력 y',equalAspect=false,xticks=null}={}) {
  const p={l:45,r:20,t:30,b:45};
  if(equalAspect){const side=Math.min(w-p.l-p.r,h-p.t-p.b);p.l=(w-side)/2;p.r=p.l;p.t=(h-p.b-side);}
  const pw=w-p.l-p.r,ph=h-p.t-p.b,id=`clip${++plotId}`;
  const X=x=>p.l+(x-x0)/(x1-x0)*pw,Y=y=>h-p.b-(y-y0)/(y1-y0)*ph;
  let svg=frame(w,h)+`<defs><clipPath id="${id}"><rect x="${p.l}" y="${p.t}" width="${pw}" height="${ph}"/></clipPath></defs>`;
  for(let i=0;i<=4;i++) {
    const x=x0+(x1-x0)*i/4,y=y0+(y1-y0)*i/4;
    if(!xticks)svg+=seg(X(x),p.t,X(x),h-p.b,'#e9eeee','stroke-width="1"')+txt(X(x),h-p.b+20,fmt(x),'text-anchor="middle"');
    svg+=seg(p.l,Y(y),w-p.r,Y(y),'#e9eeee','stroke-width="1"')+txt(p.l-8,Y(y)+4,fmt(y),'text-anchor="end"');
  }
  if(xticks)for(const tick of xticks){const value=typeof tick==='number'?tick:tick.value,label=typeof tick==='number'?fmt(tick):tick.label;svg+=seg(X(value),p.t,X(value),h-p.b,'#e9eeee','stroke-width="1"')+txt(X(value),h-p.b+20,label,'text-anchor="middle"');}
  if(x0<=0&&x1>=0)svg+=seg(X(0),p.t,X(0),h-p.b,'#b9c7c7');
  if(y0<=0&&y1>=0)svg+=seg(p.l,Y(0),w-p.r,Y(0),'#b9c7c7');
  svg+=txt(p.l,17,ylabel)+txt(w/2,h-5,xlabel,'text-anchor="middle"');
  const path=(fn,color=TEAL,dashed=false)=>{
    let d='',last=null;
    for(let i=0;i<=500;i++) {
      const x=x0+(x1-x0)*i/500,y=fn(x),xp=X(x),yp=Y(y);
      if(!Number.isFinite(y)||Math.abs(yp)>1e6){last=null;continue;}
      const jump=last&&Math.abs(yp-last[1])>ph*1.2;
      d+=`${last&&!jump?'L':'M'}${xp.toFixed(2)},${yp.toFixed(2)} `;last=[xp,yp];
    }
    return `<path d="${d}" clip-path="url(#${id})" fill="none" stroke="${color}" stroke-width="2.5" ${dashed?'stroke-dasharray="6 4"':''}/>`;
  };
  return {svg,X,Y,path,x0,x1,y0,y1,w,h,id,left:p.l,right:p.r};
}
const close=(p,extra='')=>p.svg+extra+'</svg>';
export const GRAPH_KINDS=new Set('variable power polynomial factor remainder quadratic inequality system function transform composition inverse rational radical exponential log logrule trig tangent limit continuity secant derivative corner derivativegraph stationary chain integral signed fundamental substitute parts motion product expderiv between volume'.split(' '));
export const SPECIAL_KINDS=new Set('complex sets logic implication distance circle matrix matrixproduct unitcircle triangle arithmetic geometric induction seqlimit series counting combination probability conditional independence binomial summary normal sample confidence correlation conic vector dot space'.split(' '));
export const VISUAL_KINDS=new Set([...GRAPH_KINDS,...SPECIAL_KINDS]);

function graphVisual(lesson,p,w) {
  const m=graphModel(lesson.kind,p),k=lesson.kind;
  let bounds={x0:-3,x1:3,y0:-4,y1:8};
  if(k==='rational')bounds={x0:-4,x1:4,y0:-4,y1:4};
  if(k==='tangent')bounds={x0:-4,x1:4,y0:-6,y1:6};
  if(['log','logrule'].includes(k))bounds={x0:-0.5,x1:5,y0:-3,y1:3};
  if(['trig','chain'].includes(k))bounds={x0:-Math.PI,x1:Math.PI,y0:-3.5,y1:3.5,xlabel:'각의 입력 (라디안)'};
  if(k==='trig')bounds={x0:-2*Math.PI,x1:2*Math.PI,y0:-3,y1:3,xlabel:'각의 입력 (라디안)',xticks:[{value:-2*Math.PI,label:'−2π'},{value:-Math.PI,label:'−π'},0,{value:Math.PI,label:'π'},{value:2*Math.PI,label:'2π'}]};
  if(['exponential','expderiv'].includes(k)){const end=k==='exponential'?3:2,max=Math.max(m.fn(-2),m.fn(end),m.other?m.other(end):0,3);bounds={x0:-2,x1:end,y0:-0.5,y1:Math.ceil(max*1.15)};}
  if(k==='secant')bounds={x0:-0.5,x1:3.5,y0:-1,y1:13};
  if(k==='derivative')bounds={x0:-2.5,x1:3.5,y0:-2,y1:13};
  if(['integral','fundamental','volume'].includes(k))bounds={x0:-0.25,x1:3.25,y0:-1,y1:11};
  if(['signed','motion','substitute','parts','between'].includes(k))bounds={x0:-1.5,x1:3.25,y0:-2,y1:k==='parts'?16:5};
  if(k==='substitute')bounds={x0:-.25,x1:2.25,y0:-4,y1:4};
  if(k==='volume')bounds={x0:-.25,x1:3.25,y0:-3.5,y1:3.5,xlabel:'위치 x',ylabel:'단면의 반지름 ±x'};
  if(k==='derivativegraph')bounds={x0:-2.05,x1:2.05,y0:-5,y1:10};
  if(['limit','continuity','corner'].includes(k))bounds={x0:-2,x1:3,y0:-2,y1:5};
  if(lesson.id==='variable')bounds={x0:0,x1:5,y0:0,y1:Math.max(10,(p.a??2)*5),xlabel:'물건 개수 (개)',ylabel:'총가격 (원)'};
  else if(['power','polynomial','factor','quadratic','function','transform','composition','inverse','variable'].includes(k)){
    const ys=Array.from({length:81},(_,i)=>bounds.x0+(bounds.x1-bounds.x0)*i/80).flatMap(x=>[m.fn(x),m.other?m.other(x):0]).filter(Number.isFinite);
    const lo=Math.min(...ys),hi=Math.max(...ys),pad=Math.max(1,(hi-lo)*.1);bounds.y0=Math.floor(lo-pad);bounds.y1=Math.ceil(hi+pad);
  }
  if(k==='inverse')bounds={x0:-4,x1:4,y0:-4,y1:4,equalAspect:true};
  // 선택한 유한 관찰점은 항상 축 안에 둔다. 곡선 전체의 발산은 그대로 잘라 그린다.
  const observations=[m.marker,m.secondaryMarker,m.hole,...(m.secant||[]),...(m.right||[]),m.tangent?[m.tangent.x,m.tangent.y]:null];
  if(lesson.controls.some(c=>c.key==='x')&&!m.marker&&!m.tangent)observations.push([p.x??1,m.fn(p.x??1)]);
  for(const q of observations)if(q&&q.every(Number.isFinite)){
    const px=(bounds.x1-bounds.x0)*.03,py=(bounds.y1-bounds.y0)*.03;
    if(q[0]<bounds.x0||q[0]>bounds.x1){bounds.x0=Math.min(bounds.x0,q[0]-px);bounds.x1=Math.max(bounds.x1,q[0]+px);}
    if(q[1]<bounds.y0||q[1]>bounds.y1){bounds.y0=Math.min(bounds.y0,q[1]-py);bounds.y1=Math.max(bounds.y1,q[1]+py);}
  }
  const g=plane(w,bounds);let extra='';
  if(m.integral&&k!=='volume') {
    const {a,b,n}=m.integral,step=(b-a)/n;
    for(let i=0;i<n;i++) {
      const x=a+i*step,y=m.fn(x),lower=k==='between'?m.other(x):0;
      const top=Math.min(g.Y(y),g.Y(lower)),bottom=Math.max(g.Y(y),g.Y(lower));
      if(Number.isFinite(y))extra+=`<rect x="${g.X(x)}" y="${top}" width="${Math.abs(g.X(x+step)-g.X(x))}" height="${Math.max(0,bottom-top)}" fill="${y>=lower?'#abd6d0':'#e8c4a9'}" fill-opacity=".7" stroke="white" stroke-width=".4" clip-path="url(#${g.id})"/>`;
    }
  }
  if(k==='volume'){
    for(let i=1;i<=9;i++){const x=(p.b??2)*i/9;extra+=`<ellipse cx="${g.X(x)}" cy="${g.Y(0)}" rx="5" ry="${g.Y(0)-g.Y(x)}" fill="#bfded3" fill-opacity=".25" stroke="${TEAL}" stroke-width="1.5"/>`;}
    extra+=g.path(x=>x>=0&&x<=(p.b??2)?x:NaN)+g.path(x=>x>=0&&x<=(p.b??2)?-x:NaN);
  }else extra+=lesson.id==='variable'?Array.from({length:6},(_,x)=>point(g.X(x),g.Y(m.fn(x)),TEAL,4)).join(''):g.path(m.fn);
  if(m.other)extra+=g.path(m.other,BLUE,true);
  if(k==='inverse')extra+=g.path(t=>t,GRAY,true);
  if(k==='inequality') {
    const a=p.a??2;
    if(a>0){const radius=Math.sqrt(a);extra+=seg(g.X(-radius),g.Y(0)+8,g.X(radius),g.Y(0)+8,ORANGE,'stroke-width="5"');}
  }
  if(m.asymptote!==undefined)extra+=seg(g.X(m.asymptote),30,g.X(m.asymptote),275,ORANGE,'stroke-dasharray="3 5"');
  if(m.asymptotes)for(const x of m.asymptotes)extra+=seg(g.X(x),30,g.X(x),275,ORANGE,'stroke-dasharray="3 5"');
  if(m.secant)extra+=seg(g.X(m.secant[0][0]),g.Y(m.secant[0][1]),g.X(m.secant[1][0]),g.Y(m.secant[1][1]),ORANGE)+m.secant.map(q=>point(g.X(q[0]),g.Y(q[1]))).join('');
  if(m.right)extra+=seg(g.X(m.right[0][0]),g.Y(m.right[0][1]),g.X(m.right[1][0]),g.Y(m.right[1][1]),BLUE);
  if(m.tangent)extra+=g.path(t=>m.tangent.y+m.tangent.slope*(t-m.tangent.x),ORANGE,true)+point(g.X(m.tangent.x),g.Y(m.tangent.y));
  if(lesson.id==='mvt') {const c=(p.x??0)+(p.h??1)/2;extra+=g.path(t=>c*c+2*c*(t-c),BLUE,true)+point(g.X(c),g.Y(c*c),BLUE);}
  if(m.hole)extra+=`<circle cx="${g.X(m.hole[0])}" cy="${g.Y(m.hole[1])}" r="5" fill="white" stroke="${TEAL}" stroke-width="2"/>`;
  if(k==='continuity')extra+=`<circle cx="${g.X(0)}" cy="${g.Y(-1)}" r="5" fill="white" stroke="${TEAL}" stroke-width="2"/>`;
  if(m.marker)extra+=point(g.X(m.marker[0]),g.Y(m.marker[1]));
  if(m.secondaryMarker)extra+=point(g.X(m.secondaryMarker[0]),g.Y(m.secondaryMarker[1]),BLUE);
  let rows=lesson.id==='variable'?[['물건 개수',p.x??3],['총가격 (원)',(p.a??2)*(p.x??3)],['개당 가격 (원)',p.a??2]]:modelReport(k,p);
  if(lesson.id==='mvt'){const x=p.x??0,h=p.h??1;rows=[['구간 시작 a',x],['구간 끝 b',x+h],['평균 변화율',2*x+h],['같은 기울기의 접점 c',x+h/2]];}
  if(k==='derivativegraph')rows=[['관찰 입력 x',p.x??0],['원래 높이 f(x)',m.fn(p.x??0)],['기울기 = 도함수 높이',m.other(p.x??0)]];
  const probe=p.x??1;
  if(['limit','continuity'].includes(k))extra+=point(g.X(probe),g.Y(k==='limit'?(probe===1?(p.a??1):probe+1):(probe===0?(p.a??1):probe<0?-1:1)),BLUE);
  else if(lesson.controls.some(c=>c.key==='x')&&!m.marker&&!m.tangent&&Number.isFinite(m.fn(probe))&&probe>=g.x0&&probe<=g.x1)extra+=point(g.X(probe),g.Y(m.fn(probe)));
  const approach=k==='limit'?[.9,.99,.999,1.001,1.01,1.1]:k==='continuity'?[-.1,-.01,.01,.1]:null;
  const inputs=lesson.id==='variable'?[0,1,2,3,4,5]:[...new Set([...(approach||(k==='log'||k==='logrule'?[.5,1,1.5,2,2.5]:[-2,-1,0,1,2])),probe])].sort((a,b)=>a-b);
  let table=inputs.map(x=>[fmt(x),fmt(k==='limit'&&x===1?(p.a??1):k==='continuity'&&x===0?(p.a??1):m.fn(x))]),headers=['입력 x','주 그래프의 값'];
  if(['secant','derivative'].includes(k)){const hs=[...new Set([1,.5,.1,.01,.001,...(p.h!==undefined?[p.h]:[])])].sort((a,b)=>b-a);table=hs.map(h=>[fmt(h),fmt((probe+h)**2-probe**2),fmt(2*probe+h)]);headers=['간격 h','함숫값 변화량','평균 변화율'];}
  if(['derivativegraph','fundamental'].includes(k)){table=inputs.map(x=>[fmt(x),fmt(m.fn(x)),fmt(m.other(x))]);headers=['입력 x',k==='fundamental'?'높이 f(x)':'원래 높이 f(x)',k==='fundamental'?'누적 F(x)':'기울기 f′(x)'];}
  if(k==='volume'){table=Array.from({length:5},(_,i)=>(p.b??2)*i/4).map(x=>[fmt(x),fmt(x),fmt(Math.PI*x*x)]);headers=['위치 x','단면 반지름','단면 넓이 πx²'];}
  const comparison=({system:'파랑 점선: 둘째 직선 · 주황: 두 직선의 교점',composition:'초록: f(g(x)) · 파랑 점선: g(f(x))',inverse:'파랑 점선: 역함수 · 회색 점선: y=x',trig:'파랑 점선: cos x',fundamental:'파랑: 누적 F(x)와 그 점 · 주황 점: 높이 f(x) · 주황 접선의 기울기는 f(x)',between:'파랑 점선: 아래 함수 x²'})[k]||'파랑 점선: 도함수 f′(x)';
  const legends={derivativegraph:'초록: f · 파랑 점선: f′와 그 점 · 주황 접선의 기울기 = 파랑 점의 높이',derivative:'초록: 원래 함수 · 주황: 접선과 관찰점',secant:lesson.id==='mvt'?'주황: 양끝의 평균 기울기 · 파랑: 같은 기울기의 접선과 접점':'초록: 위치 · 주황: 두 시각 사이의 평균 기울기',corner:'초록: |x| · 주황: 왼쪽 기울기 · 파랑: 오른쪽 기울기',limit:'빈 원: 주변 극한 · 주황: f(1) · 파랑: 현재 입력의 값',continuity:'빈 원: 양쪽 접근값 · 주황: f(0) · 파랑: 현재 입력의 값',integral:'연초록 직사각형: 왼쪽 근사합 · 초록: 곡선',signed:'초록 음영: 양의 기여 · 살구 음영: 음의 기여',volume:'타원은 원판을 옆에서 본 설명도 · 세로 반지름은 x'};
  return {svg:close(g,extra),rows,table,headers,caption:m.formula,probe:{x0:g.x0,x1:g.x1,width:g.w,left:g.left,right:g.right},axes:{xUnit:g.X(1)-g.X(0),yUnit:g.Y(0)-g.Y(1)},tableHighlight:['secant'].includes(k)?p.h:headers[0]==='입력 x'?p.x:undefined,
    legend:legends[k]||(m.other?(k==='composition'?comparison:`초록 실선: 주 함수 · ${comparison}`):'초록: 함수 · 주황: 관찰하는 값'),
    description:`${lesson.definition} ${rows.map(([key,value])=>`${key}: ${fmt(value)}`).join('. ')}`};
}

function arrow(g,ux,uy,color=TEAL,start=[0,0]) {
  const x0=g.X(start[0]),y0=g.Y(start[1]),x1=g.X(start[0]+ux),y1=g.Y(start[1]+uy),angle=Math.atan2(y1-y0,x1-x0);
  return seg(x0,y0,x1,y1,color,'stroke-width="3"')+`<path d="M${x1},${y1} L${x1-10*Math.cos(angle-.45)},${y1-10*Math.sin(angle-.45)} L${x1-10*Math.cos(angle+.45)},${y1-10*Math.sin(angle+.45)} Z" fill="${color}"/>`;
}

export function renderVisual(lesson,p={},width=600,seed=1) {
  if(!VISUAL_KINDS.has(lesson.kind))throw new Error(`지원하지 않는 실험: ${lesson.kind}`);
  const w=Math.max(280,Math.min(900,width)),k=lesson.kind,a=p.a??1,b=p.b??2,n=Math.round(p.n??8),r=p.r??1.5;
  if(GRAPH_KINDS.has(k))return graphVisual(lesson,p,w);
  let svg='',rows=[],caption='',table=[],headers=['항목','값'],legend='',description=lesson.definition;
  if(['complex','distance','circle','unitcircle','triangle','vector','dot','space','conic'].includes(k)) {
    const extent=k==='unitcircle'?1.4:4.5,halfX=Math.max(extent,extent*(w-65)/265),halfY=halfX*265/(w-65);
    const g=plane(w,{x0:-halfX,x1:halfX,y0:-halfY,y1:halfY,h:340,xlabel:'가로 좌표 x',ylabel:'세로 좌표 y'});let extra='';
    if(k==='complex'||k==='distance') {
      extra=seg(g.X(0),g.Y(0),g.X(a),g.Y(0),GRAY)+seg(g.X(a),g.Y(0),g.X(a),g.Y(b),GRAY)+arrow(g,a,b)+point(g.X(a),g.Y(b));
      rows=[['가로 성분',a],['세로 성분',b],['원점까지 거리',Math.hypot(a,b)]];caption=k==='complex'?`z=${a}+(${b})i`:`거리²=${a*a}+${b*b}`;
    } else if(k==='circle') {
      extra=`<ellipse cx="${g.X(a)}" cy="${g.Y(0)}" rx="${Math.abs(g.X(b)-g.X(0))}" ry="${Math.abs(g.Y(b)-g.Y(0))}" fill="#e5f3ef" stroke="${TEAL}" stroke-width="2"/>`+seg(g.X(a),g.Y(0),g.X(a+b),g.Y(0),ORANGE)+point(g.X(a),g.Y(0));
      rows=[['중심',`(${a},0)`],['반지름',b],['오른쪽 점',`(${a+b},0)`]];caption=`(x${a===0?'':a<0?' + '+Math.abs(a):' − '+a})²+y²=${b*b}`;
    } else if(k==='unitcircle') {
      const angle=a*Math.PI/180,x=Math.cos(angle),y=Math.sin(angle);
      extra=`<ellipse cx="${g.X(0)}" cy="${g.Y(0)}" rx="${g.X(1)-g.X(0)}" ry="${g.Y(0)-g.Y(1)}" fill="none" stroke="${TEAL}" stroke-width="2"/>`+arrow(g,x,y)+seg(g.X(x),g.Y(0),g.X(x),g.Y(y),ORANGE)+point(g.X(x),g.Y(y));
      rows=[['각도',`${a}° = ${fmt(angle)} 라디안`],['가로 cos θ',x],['세로 sin θ',y],['제곱의 합',x*x+y*y]];caption='단위원의 반지름은 1';
    } else if(k==='triangle') {
      const angle=a*Math.PI/180,x=b*Math.cos(angle),y=b*Math.sin(angle),c=Math.hypot(2-x,y);
      extra=`<path d="M${g.X(0)},${g.Y(0)} L${g.X(2)},${g.Y(0)} L${g.X(x)},${g.Y(y)} Z" fill="#e4f1eb" stroke="${TEAL}" stroke-width="2"/>`;
      rows=[['변 a',2],['변 b',b],['사이각 C',`${a}°`],['맞은편 변 c',c]];caption='두 변과 사이각으로 나머지 변을 계산합니다.';
    } else if(k==='vector') {
      extra=arrow(g,a,b)+arrow(g,-1,1,BLUE,[a,b])+arrow(g,a-1,b+1,ORANGE);
      rows=[['첫 벡터 u',`(${a},${b})`],['둘째 벡터 v','(−1,1)'],['벡터 합',`(${a-1},${b+1})`]];legend='초록 u / 파랑 v / 주황 합벡터';
    } else if(k==='dot') {
      const angle=a*Math.PI/180,x=b*Math.cos(angle),y=b*Math.sin(angle);
      extra=arrow(g,2,0)+arrow(g,x,y,BLUE)+seg(g.X(x),g.Y(0),g.X(x),g.Y(y),GRAY,'stroke-dasharray="4 3"');
      rows=[['첫 벡터의 크기',2],['둘째 벡터의 크기',b],['사이각',`${a}°`],['내적',2*b*Math.cos(angle)]];caption='점선은 가로 방향으로의 정사영을 보여 줍니다.';
    } else if(k==='space') {
      const P=[b+0.45,0.5+a*0.65],base=[b+0.45,0.5];
      extra=arrow(g,3,0,GRAY)+arrow(g,1.2,1.2,GRAY)+arrow(g,0,2.7,GRAY)+seg(g.X(base[0]),g.Y(base[1]),g.X(P[0]),g.Y(P[1]),ORANGE,'stroke-dasharray="4 3"')+point(g.X(P[0]),g.Y(P[1]),TEAL)+point(g.X(base[0]),g.Y(base[1]));
      rows=[['공간의 점',`(${b},1,${a})`],['xy평면 정사영',`(${b},1,0)`],['공간 거리',Math.sqrt(b*b+1+a*a)],['투영 후 거리',Math.sqrt(b*b+1)]];caption='공간좌표의 개념도입니다. 화면상의 선 길이를 직접 재지 마세요.';
    } else if(k==='conic') {
      const mode=p.mode??0;let path='';
      if(mode===0){const c=1,bb=Math.sqrt(a*a-c*c);for(let i=0;i<=200;i++){const t=2*Math.PI*i/200;path+=`${i?'L':'M'}${g.X(a*Math.cos(t))},${g.Y(bb*Math.sin(t))} `;}extra=`<path d="${path}" fill="#e6f2ef" stroke="${TEAL}" stroke-width="2"/>`+point(g.X(-c),g.Y(0),ORANGE)+point(g.X(c),g.Y(0),ORANGE);rows=[['두 초점','(−1,0), (1,0)'],['일정한 거리 합',2*a]];}
      else if(mode===1){extra=g.path(x=>x*x/(2*a))+point(g.X(0),g.Y(a/2))+seg(g.X(-4),g.Y(-a/2),g.X(4),g.Y(-a/2),ORANGE,'stroke-dasharray="5 4"');rows=[['초점',`(0,${a/2})`],['준선',`y=−${a/2}`]];}
      else {const c=a+1,bb=Math.sqrt(c*c-a*a);extra=g.path(x=>Math.abs(x)>=a?bb*Math.sqrt(x*x/a**2-1):NaN)+g.path(x=>Math.abs(x)>=a?-bb*Math.sqrt(x*x/a**2-1):NaN)+point(g.X(-c),g.Y(0),ORANGE)+point(g.X(c),g.Y(0),ORANGE);rows=[['두 초점',`(−${c},0), (${c},0)`],['일정한 거리 차의 절댓값',2*a]];}
      caption=['타원: 두 초점까지 거리 합이 일정','포물선: 초점과 준선까지 같은 거리','쌍곡선: 두 초점까지 거리 차의 절댓값이 일정'][mode];
    }
    svg=close(g,extra);table=rows.map(([key,val])=>[key,fmt(val)]);
  } else if(['arithmetic','geometric','induction','seqlimit','series'].includes(k)) {
    const count=['arithmetic','geometric'].includes(k)?8:n,first=k==='series'?1:a;
    const values=sequenceModel(k,first,r,count),partial=values.map((_,i)=>sum(values.slice(0,i+1))),total=sum(values),limit=k==='series'?1/(1-r):0;
    const ymax=Math.max(...values,limit,1)*1.12,ymin=Math.min(0,...values)*1.1;
    const ticks=count<=12?Array.from({length:count},(_,i)=>i+1):[1,...[1,2,3,4].map(i=>Math.round(count*i/4))];
    const g=plane(w,{x0:0,x1:count+1,y0:ymin,y1:ymax||1,xlabel:'순서 번호 n',ylabel:k==='induction'?'1부터 n까지 합':k==='series'?'각 항과 부분합':'항의 값',xticks:ticks});let extra='';
    values.forEach((v,i)=>{extra+=seg(g.X(i+1),g.Y(0),g.X(i+1),g.Y(v),TEAL)+point(g.X(i+1),g.Y(v),TEAL,4)});
    if(k==='series'){extra+=seg(g.X(0),g.Y(limit),g.X(count+1),g.Y(limit),ORANGE,'stroke-dasharray="4 4"');partial.forEach((v,i)=>{extra+=point(g.X(i+1),g.Y(v),BLUE,4)});}
    svg=close(g,extra);rows=[['표시한 항의 수',count],['마지막 항',values.at(-1)],['표시한 항들의 합',total]];
    if(k==='series')rows.push(['무한등비급수의 합',limit]);
    if(k==='induction')rows=[['n',n],['1부터 n까지 합',n*(n+1)/2],['다음 수 n+1',n+1],['그 수를 더한 합',(n+1)*(n+2)/2]];
    table=k==='series'?values.map((v,i)=>[i+1,fmt(v),Number(partial[i].toPrecision(12)).toString(),fmt(r**(i+1)/(1-r))]):values.slice(0,12).map((v,i)=>[i+1,fmt(v)]);headers=k==='series'?['n','그 항의 값','부분합 Sₙ','극한까지 차이']:['순서 n','그 항의 값'];caption=k==='series'?'초록 점: 각 항 / 파랑 점: 그 항까지 더한 부분합 / 주황선: 무한 합. 소수는 반올림해 표시하며 항과 부분합은 서로 다른 수열입니다.':'수열은 자연수 순서에 대응하는 값입니다. 점들을 연속인 선으로 잇지 않습니다.';
  } else if(k==='sets') {
    const A=Array.from({length:8},(_,i)=>i+1).filter(x=>x<=a),B=Array.from({length:8},(_,i)=>i+1).filter(x=>x%b===0),intersection=A.filter(x=>B.includes(x)),union=[...new Set([...A,...B])].sort((a,b)=>a-b);
    svg=frame(w,245)+`<ellipse cx="${w*.38}" cy="115" rx="${w*.27}" ry="80" fill="#dfefeb"/><ellipse cx="${w*.62}" cy="115" rx="${w*.27}" ry="80" fill="#f5dfcb" fill-opacity=".75"/>`+txt(w*.25,45,'집합 A')+txt(w*.68,45,'집합 B');
    const place=(values,x,y)=>values.map((v,i)=>txt(x+(i%2)*23,y+Math.floor(i/2)*23,v,'font-size="16"')).join('');
    svg+=place(A.filter(x=>!B.includes(x)),w*.2,90)+place(intersection,w*.46,90)+place(B.filter(x=>!A.includes(x)),w*.73,90)+'</svg>';
    rows=[['A',`{${A.join(', ')}}`],['B',`{${B.join(', ')}}`],['A∩B',`{${intersection.join(', ')}}`],['A∪B',`{${union.join(', ')}}`]];
    table=Array.from({length:8},(_,i)=>[i+1,A.includes(i+1)?'A에 속함':'A에 안 속함',B.includes(i+1)?'B에 속함':'B에 안 속함']);headers=['원소','A 판정','B 판정'];caption='겹치는 영역에는 두 집합에 모두 속한 원소를 놓습니다. 타원 크기는 원소 수에 비례하지 않습니다.';
  } else if(k==='logic'||k==='implication') {
    const values=k==='logic'?Array.from({length:9},(_,i)=>i-3):[0,1,2,3];
    svg=frame(w,220);
    if(k==='logic')values.forEach((value,i)=>{const x=20+(i%5)*(w-40)/5,y=35+Math.floor(i/5)*85,truth=value*value>value;svg+=`<rect x="${x}" y="${y}" width="${(w-55)/5}" height="65" rx="10" fill="${truth?'#e0f0e9':'#f4dfcf'}"/>`+txt(x+10,y+23,`n=${value}`)+txt(x+10,y+45,truth?'참':'반례');});
    else svg+=`<rect x="${w*.1}" y="30" width="${w*.8}" height="150" rx="20" fill="#dfefeb"/><rect x="${w*.28}" y="75" width="${w*.44}" height="85" rx="10" fill="#acd2c6"/>`+txt(w/2,55,'직사각형 전체','text-anchor="middle"')+txt(w/2,120,'정사각형','text-anchor="middle"');
    svg+='</svg>';rows=k==='logic'?[['검사할 n',a],['n²',a*a],['n²>n?',a*a>a?'참':'거짓: 반례']]:[['정사각형 ⇒ 직사각형','참'],['직사각형 ⇒ 정사각형','항상 참은 아님'],['대우','직사각형 아님 ⇒ 정사각형 아님']];table=rows;caption=k==='logic'?'정수 몇 개의 판정표입니다. 전체 명제를 증명한 표는 아닙니다.':'작은 집합의 조건은 큰 집합에 속하기 위한 충분조건입니다.';
  } else if(k==='matrix'||k==='matrixproduct') {
    const A=k==='matrix'?[[3,2],[1,4]]:[[a,0],[0,1]],B=k==='matrix'?[[a],[b]]:[[1,b],[0,1]],AB=matmul(A,B),BA=k==='matrixproduct'?matmul(B,A):null;
    const matrix=(arr,x,y,label)=>{let s=txt(x,y,label,'font-weight="bold"');arr.forEach((row,j)=>row.forEach((v,i)=>{s+=`<rect x="${x+i*42}" y="${y+12+j*40}" width="38" height="35" rx="6" fill="#edf3ef"/>`+txt(x+19+i*42,y+35+j*40,fmt(v),'text-anchor="middle"')}));return s;};
    svg=frame(w,280)+matrix(A,15,25,'A')+matrix(B,w*.43,25,'B')+matrix(AB,15,160,'AB')+(BA?matrix(BA,w*.55,160,'BA'):'')+'</svg>';
    rows=k==='matrix'?[['수량',`${a}개, ${b}개`],['가게 1의 합계',AB[0][0]],['가게 2의 합계',AB[1][0]]]:[['AB의 오른쪽 위 원소',AB[0][1]],['BA의 오른쪽 위 원소',BA[0][1]],['곱의 순서 결과',AB[0][1]===BA[0][1]?'이 설정에서는 같음':'서로 다름']];table=rows;
    caption=k==='matrix'?'A의 두 행은 두 가게, 두 열은 두 메뉴의 가격입니다. B는 메뉴별 주문 수량입니다.':'A는 가로 늘이기, B는 가로 기울이기입니다. 곱의 순서를 비교하세요.';
  } else if(k==='counting'||k==='combination') {
    const n1=k==='counting'?a:n,n2=k==='counting'?b:Math.round(p.r??2);svg=frame(w,245);
    if(k==='counting')for(let i=0;i<n1;i++)for(let j=0;j<n2;j++){const xx=25+i*(w-50)/n1,yy=45+j*35;svg+=`<rect x="${xx}" y="${yy}" width="${Math.min(70,(w-60)/n1)}" height="28" rx="6" fill="#dceee7"/>`+txt(xx+6,yy+19,`${i+1}·${j+1}`);}
    else {const teams=[];function visit(start,chosen){if(chosen.length===n2){teams.push(chosen);return;}for(let i=start;i<=n1;i++)visit(i+1,[...chosen,i]);}visit(1,[]);teams.slice(0,18).forEach((t,i)=>{const col=i%3,row=Math.floor(i/3);svg+=txt(15+col*(w-20)/3,35+row*30,`{${t.join(',')}}`);});}
    svg+='</svg>';rows=k==='counting'?[['상의 선택',a],['하의 선택',b],['옷차림 수',a*b]]:[['순서 없는 조합',choose(n1,n2)],['순서 있는 순열',factorial(n1)/factorial(n1-n2)],['조합 하나의 순서 수',factorial(n2)]];table=rows;caption=k==='counting'?'각 칸은 상의·하의 조합 하나입니다.':'그림은 순서 없는 팀을 최대 18개만 표시합니다. 전체 경우의 수는 숫자 표에서 확인하세요.';
  } else if(k==='probability'||k==='binomial') {
    let values,labels;
    if(k==='probability'){const random=rng(2026+seed),counts=Array(6).fill(0);for(let i=0;i<n;i++)counts[Math.floor(random()*6)]++;values=counts.map(c=>c/n);labels=[1,2,3,4,5,6];rows=[['정확한 성공 확률',a/6],['관찰한 성공 비율',sum(counts.slice(0,a))/n],['독립 시행 횟수',n]];caption='막대는 이번 표본의 상대도수입니다. 다시 실험하면 달라질 수 있습니다.';}
    else{values=binomial(n,p.p??.5);labels=values.map((_,i)=>i);rows=[['기대 성공 횟수',n*p.p],['분산',n*p.p*(1-p.p)],['모든 확률의 합',sum(values)]];caption='막대는 각 성공 횟수의 정확한 확률입니다. 표본 실험값이 아닙니다.';}
    const g=plane(w,{x0:-.5,x1:labels.at(-1)+.75,y0:0,y1:Math.max(...values)*1.2,xlabel:k==='binomial'?'성공 횟수 k':'주사위 눈',ylabel:k==='binomial'?'확률':'상대도수',xticks:labels});let extra='';
    values.forEach((v,i)=>{const xx=labels[i];extra+=`<rect x="${g.X(xx-.3)}" y="${g.Y(v)}" width="${g.X(.3)-g.X(-.3)}" height="${g.Y(0)-g.Y(v)}" fill="${k==='probability'&&xx<=a?ORANGE:TEAL}" rx="3"/>`;});
    svg=close(g,extra);table=labels.map((v,i)=>[v,fmt(values[i])]);headers=[k==='binomial'?'성공 횟수':'주사위 눈',k==='binomial'?'정확한 확률':'실험 상대도수'];
  } else if(k==='conditional'||k==='independence') {
    let cells,total;
    if(k==='conditional'){total=100;const ab=a*b;cells=[[ab,a-ab],[(100-a)*.25,(100-a)*.75]];rows=[['전체 인원',100],['조건 A의 인원',a],['A와 B 모두',ab],['P(B|A)',b],['P(A|B)',ab/(ab+cells[1][0])]];}
    else {total=1;cells=a===0?[[.25,.25],[.25,.25]]:[[.5,0],[0,.5]];rows=[['첫 동전 앞면 확률',.5],['둘째 앞면 확률',.5],['둘 다 앞면 확률',cells[0][0]],['독립 여부',a===0?'독립':'독립 아님']];}
    svg=frame(w,235)+txt(w*.4,35,k==='conditional'?'B':'둘째 앞면')+txt(w*.7,35,k==='conditional'?'B 아님':'둘째 뒷면');
    for(let i=0;i<2;i++){svg+=txt(10,90+i*72,k==='conditional'?(i?'A 아님':'A'):(i?'첫 뒷면':'첫 앞면'));for(let j=0;j<2;j++)svg+=`<rect x="${w*.32+j*w*.3}" y="${55+i*72}" width="${w*.27}" height="60" rx="8" fill="${i===0?'#dceee5':'#eef1f4'}"/>`+txt(w*.455+j*w*.3,92+i*72,fmt(cells[i][j]),'text-anchor="middle" font-size="18"');}
    svg+='</svg>';table=cells.map((row,i)=>[k==='conditional'?(i===0?'A':'A 아님'):(i===0?'첫 앞면':'첫 뒷면'),...row.map(fmt)]);headers=['첫 조건',k==='conditional'?'B 인원':'둘째 앞면 확률',k==='conditional'?'B 아닌 인원':'둘째 뒷면 확률'];caption=k==='conditional'?'A라는 조건을 알면 첫째 행만 새로운 전체로 봅니다.':'표의 네 칸은 두 결과의 결합 확률이며 합은 1입니다.';
  } else if(['summary','normal','sample','confidence','correlation'].includes(k)) {
    if(k==='normal') {
      const g=plane(w,{x0:-5,x1:5,y0:0,y1:1,xlabel:'자료값 x',ylabel:'확률밀도'});svg=close(g,g.path(x=>normalPDF(x,a,b)));rows=[['평균 μ',a],['표준편차 σ',b],['분산 σ²',b*b],['평균의 밀도 높이',normalPDF(a,a,b)]];caption='구간의 확률은 곡선 아래 넓이입니다. 한 점의 높이는 확률이 아닙니다.';
    } else if(k==='confidence') {
      const intervals=ciExperiment(n);const g=plane(w,{x0:35,x1:65,y0:0,y1:21,xlabel:'추정한 모평균 구간',ylabel:'반복 표집 번호'});let extra=seg(g.X(50),g.Y(0),g.X(50),g.Y(21),ORANGE,'stroke-dasharray="4 4"');
      intervals.slice(0,20).forEach((ci,i)=>{extra+=seg(g.X(ci.lo),g.Y(i+1),g.X(ci.hi),g.Y(i+1),ci.covers?TEAL:'#bf5c4c')+point(g.X(ci.mean),g.Y(i+1),ci.covers?TEAL:'#bf5c4c',3)});
      svg=close(g,extra);rows=[['고정된 모평균',50],['모표준편차 (알려짐)',10],['80번 중 포함 횟수',intervals.filter(c=>c.covers).length],['한 구간의 오차 한계',1.96*10/Math.sqrt(n)]];table=intervals.slice(0,20).map((v,i)=>[i+1,fmt(v.lo),fmt(v.hi),v.covers?'포함':'불포함']);headers=['표본 번호','아래 끝','위 끝','모평균'];caption='그림은 80개 구간 중 처음 20개를 보여 줍니다. 주황 세로선은 움직이지 않는 모평균 50입니다.';
    } else if(k==='correlation') {
      const random=rng(170),pts=Array.from({length:30},(_,i)=>({x:i/10,y:i/10+a*(random()-.5)*2}));const g=plane(w,{x0:0,x1:3,y0:-1,y1:4,xlabel:'관찰량 A',ylabel:'관찰량 B'});svg=close(g,pts.map(q=>point(g.X(q.x),g.Y(q.y),TEAL,4)).join(''));rows=[['자료의 성격','관계 설명용 생성 자료'],['관찰되는 경향','대체로 함께 증가'],['인과관계 증명 여부','이 그림만으로 판단 불가']];table=pts.slice(0,8).map(q=>[fmt(q.x),fmt(q.y)]);headers=['A','B'];caption='예시로 만든 자료이며 실제 아이스크림·사고 통계가 아닙니다.';
    } else {
      const values=k==='summary'?[2,3,3,4,a]:sampleNormal(n,Math.round(a)*19+seed,50,10),m=mean(values),v=variance(values),max=Math.max(...values,1),min=Math.min(0,...values);
      const g=plane(w,{x0:0,x1:values.length+1,y0:min,y1:max*1.12,xlabel:'자료 순서',ylabel:'자료값'});svg=close(g,values.map((val,i)=>point(g.X(i+1),g.Y(val),TEAL,4)).join('')+seg(g.X(0),g.Y(m),g.X(values.length+1),g.Y(m),ORANGE,'stroke-dasharray="4 4"'));
      rows=[['자료 수',values.length],['자료 평균',m],['자료 분산 (n으로 나눔)',v],['자료 표준편차',Math.sqrt(v)]];if(k==='sample')rows.push(['고정된 모평균',50],['표본평균의 이론 표준편차',10/Math.sqrt(n)]);
      table=values.slice(0,15).map((val,i)=>[i+1,fmt(val)]);headers=['자료 번호','값'];caption=k==='sample'?'평균 50, 표준편차 10의 정규모집단에서 뽑은 모의 표본입니다.':'주황 점선은 평균입니다. 먼 자료값 하나가 중심과 흩어짐을 어떻게 바꾸는지 보세요.';
    }
  }
  return {svg,rows,table:table.length?table:rows.map(([k,v])=>[k,fmt(v)]),headers,caption,legend,description};
}
