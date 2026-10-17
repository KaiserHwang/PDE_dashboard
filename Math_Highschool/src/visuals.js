import {fmt,binomial,normalPDF,normalCDF,sampleNormal,mean,ci,choose,factorial,sum} from './math.js';
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BLUE='#345bca',TEAL='#237e72',ORANGE='#bb663e',GRAY='#81909e';
let clipId=0;
const tickFmt=x=>Number(x.toFixed(1)).toLocaleString('ko-KR',{maximumFractionDigits:1});
const text=(x,y,s,a='')=>'<text x="'+x+'" y="'+y+'" '+a+'>'+esc(s)+'</text>';
const line=(x1,y1,x2,y2,c=GRAY,a='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.5" '+a+'/>';
const dot=(x,y,c=ORANGE)=>'<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="'+c+'" stroke="white" stroke-width="1.5"/>';
const start=(w,h,label)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(label)+'" style="font:12px system-ui;fill:#496171">';
function plot(w,{x0=-3,x1=3,y0=-4,y1=6,h=290,label='함수 그래프',xlabel='입력 x',ylabel='값',ticks=null}={}){
 const pad={l:47,r:18,t:32,b:42},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,id='p'+(++clipId),X=x=>pad.l+(x-x0)/(x1-x0)*pw,Y=y=>h-pad.b-(y-y0)/(y1-y0)*ph;
 let svg=start(w,h,label)+'<defs><clipPath id="'+id+'"><rect x="'+pad.l+'" y="'+pad.t+'" width="'+pw+'" height="'+ph+'"/></clipPath></defs>';
 for(let i=0;i<=4;i++){const x=x0+(x1-x0)*i/4,y=y0+(y1-y0)*i/4;svg+=line(pad.l,Y(y),w-pad.r,Y(y),'#e2e8ed')+text(pad.l-7,Y(y)+4,tickFmt(y),'text-anchor="end"');if(!ticks)svg+=line(X(x),pad.t,X(x),h-pad.b,'#e2e8ed')+text(X(x),h-pad.b+20,fmt(x),'text-anchor="middle"');}
 if(ticks)for(const t of ticks){const v=typeof t==='number'?t:t.value;svg+=line(X(v),pad.t,X(v),h-pad.b,'#e2e8ed')+text(X(v),h-pad.b+20,typeof t==='number'?fmt(t):t.label,'text-anchor="middle"');}
 if(x0<=0&&x1>=0)svg+=line(X(0),pad.t,X(0),h-pad.b,'#a4b4c0');
 if(y0<=0&&y1>=0)svg+=line(pad.l,Y(0),w-pad.r,Y(0),'#a4b4c0');
 svg+=text(pad.l,18,ylabel)+text(w/2,h-5,xlabel,'text-anchor="middle"');
 const path=(fn,c=BLUE,dashed=false)=>{let d='',prev=null;for(let i=0;i<=400;i++){const x=x0+(x1-x0)*i/400,y=fn(x),yp=Y(y);if(!Number.isFinite(yp)||Math.abs(yp)>1e5){prev=null;continue;}const jump=prev!==null&&Math.abs(yp-prev)>ph*1.4;d+=(prev===null||jump?'M':'L')+X(x).toFixed(2)+','+yp.toFixed(2)+' ';prev=yp;}return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2.4" clip-path="url(#'+id+')" '+(dashed?'stroke-dasharray="5 4"':'')+'/>';};
 return {svg,X,Y,path,w,h,x0,x1,y0,y1,id,left:pad.l,right:w-pad.r,top:pad.t,bottom:h-pad.b};
}
const end=(g,body='')=>g.svg+body+'</svg>';
const area=(g,fn,a,b,n=40)=>{let s='';const dx=(b-a)/n;for(let i=0;i<n;i++){const x=a+i*dx,y=fn(x);if(Number.isFinite(y))s+='<rect x="'+g.X(x)+'" y="'+Math.min(g.Y(0),g.Y(y))+'" width="'+Math.abs(g.X(x+dx)-g.X(x))+'" height="'+Math.abs(g.Y(y)-g.Y(0))+'" fill="'+(y>=0?'#bdd3ed':'#f2cbb3')+'" stroke="white" stroke-width=".3" clip-path="url(#'+g.id+')"/>';}return s;};
function bars(w,values,labels,title,color=BLUE){const max=Math.max(...values,0),min=Math.min(...values,0),span=Math.max(max-min,1e-6),g=plot(w,{x0:-.5,x1:values.length-.5,y0:min-span*.12,y1:max+span*.25,h:290,xlabel:title,ylabel:'값',ticks:labels.map((label,value)=>({value,label}))});let svg='';values.forEach((v,i)=>{const width=(g.right-g.left)/values.length*.55;svg+='<rect x="'+(g.X(i)-width/2)+'" y="'+Math.min(g.Y(v),g.Y(0))+'" width="'+width+'" height="'+Math.abs(g.Y(0)-g.Y(v))+'" fill="'+color+'" opacity=".8"/>'+text(g.X(i),g.Y(v)+(v<0?17:-7),fmt(v),'text-anchor="middle"');});return end(g,svg);}

function tableDiagram(w,headers,rows,label){const cols=headers.length,cw=(w-16)/cols,chars=Math.max(3,Math.floor((cw-10)/8)),wrapped=[headers,...rows].map(row=>row.map(v=>{const str=String(v),lines=[];for(let i=0;i<str.length;i+=chars)lines.push(str.slice(i,i+chars));return lines;})),heights=wrapped.map(row=>Math.max(...row.map(c=>c.length))*17+22),h=45+sum(heights);let s=start(w,h,label),top=20;wrapped.forEach((row,i)=>{row.forEach((lines,j)=>{s+='<rect x="'+(8+j*cw)+'" y="'+top+'" width="'+cw+'" height="'+heights[i]+'" fill="'+(i===0?'#e8eef9':j===0?'#f0f4f6':'white')+'" stroke="#cbd7df"/>';lines.forEach((v,k)=>s+=text(8+(j+.5)*cw,top+22+k*17,v,'text-anchor="middle" font-size="12"'));});top+=heights[i];});return s+'</svg>';}

const table=(headers,rows,extra={})=>({headers,table:rows,rows:[],legend:'',...extra});
export const KINDS=new Set('polynomial quadratic transform absolute power log-rules exponential logarithm unitcircle trig triangle arithmetic geometric sigma telescoping recurrence induction limit continuity secant differentiable derivative tangent mvt sign extrema cubic-roots motion antiderivative integral accumulation area distance counting repeated identical multiset binomial-theorem dice union conditional independence trials distribution moments binomial density normal approximation sampling confidence proportion'.split(' '));
export function renderRep(lesson,p={},width=650){
 p={...(lesson.representation.defaults||{}),...p};
 const w=Math.max(280,Math.min(820,width)),k=lesson.representation.kind,id=lesson.id,x=p.x??1,a=p.a??1,b=p.b??0,n=Math.round(p.n??6);
 const defaults={caption:lesson.representation.caption,description:lesson.representation.task,legend:'표와 그림은 예를 관찰하는 도구입니다. 일반적인 이유는 앞 단계의 설명과 연결하세요.'};
 let v;
 if(['B3','B4','B10'].includes(id)){
  if(id==='B10'){const values=[1,2,3].map(t=>a*t+b),m=mean(values),v0=sum(values.map(t=>(t-m)**2))/3;return {...defaults,...table(['자료 번호','원자료','변환한 자료'],values.map((t,i)=>[i+1,i+1,fmt(t)]),{svg:bars(w,values,['1번','2번','3번'],'자료 번호'),rows:[['평균',m],['분산',v0],['표준편차',Math.sqrt(v0)]],caption:'동일 빈도의 자료1,2,3 → a×자료+b. 분산은 자료 개수3으로 나눕니다.'})};}
  const fn=id==='B3'?t=>a*t+b:t=>t*t-1,g=plot(w,{x0:-3,x1:3,y0:-Math.max(4,3*Math.abs(a)+Math.abs(b)),y1:Math.max(10,3*Math.abs(a)+Math.abs(b)),ylabel:id==='B3'?'y=mx+b':'P(x)=x²−1'});
  return {...defaults,...table(['입력 x','출력'],[-2,-1,0,1,2].map(t=>[t,fn(t)]),{svg:end(g,g.path(fn)),rows:id==='B3'?[['기울기 m',a],['y절편',b]]:[['P(−1)',0],['P(1)',0],['인수분해','(x+1)(x−1)']],caption:id==='B3'?'m은 출력 변화량/입력 변화량, b는 x=0의 출력':'P(a)=0이면 x−a가 인수입니다.'})};
 }
 if(k==='density'){
  const L=p.a??1,fraction=p.b??.5,g=plot(w,{x0:-.2*L,x1:1.2*L,y0:0,y1:1.4/L,ylabel:'확률밀도',xlabel:'확률변수의 값'}),fn=t=>t>=0&&t<=L?1/L:0;
  return {...defaults,...table(['구간','밀도 높이','구간 확률'],[['[0,L]',fmt(1/L),1],['[0,'+fmt(fraction*L)+']',fmt(1/L),fmt(fraction)],['한 점',fmt(1/L),0]],{svg:end(g,area(g,fn,0,fraction*L,50)+g.path(fn)),rows:[['구간 길이 L',L],['밀도 높이',1/L],['음영 확률',fraction]],caption:'[0,L] 균등분포. 높이1/L × 폭L = 전체확률1. 밀도 높이는1보다 클 수 있습니다.'})};
 }
 if(k==='binomial-theorem'){
  const count=Math.round(p.n??5),values=Array.from({length:count+1},(_,r)=>choose(count,r));return {...defaults,...table(['선택한 x의 수 k','xᵏ 계수'],values.map((t,i)=>[i,t]),{svg:bars(w,values,values.map((_,i)=>String(i)),'x의 지수 k'),rows:[['차수 n',count],['모든 계수 합',2**count],['전개식의 항 수',count+1]],caption:'(1+x)ⁿ의 계수입니다. 각 계수는 x를 고를 자리 수이며 확률이 아닙니다.'})};
 }
 if(k==='approximation'){
  const count=Math.round(p.n??40),prob=p.p??.5,mu=count*prob,variance=count*prob*(1-prob),sig=Math.sqrt(variance),pmf=binomial(count,prob),g=plot(w,{x0:-1,x1:count+1,y0:0,y1:Math.max(...pmf)*1.25,ylabel:'확률질량 / 근사 밀도',xlabel:'성공 횟수 k'});let body='';const bw=Math.abs(g.X(1)-g.X(0))*.8;pmf.forEach((p,i)=>body+='<rect x="'+(g.X(i)-bw/2)+'" y="'+g.Y(p)+'" width="'+bw+'" height="'+(g.Y(0)-g.Y(p))+'" fill="#b7c9ed"/>');body+=g.path(t=>normalPDF(t,mu,sig),ORANGE);return {...defaults,...table(['값 k','이항 확률질량','근사 밀도(점확률 아님)'],[Math.floor(mu-sig),Math.round(mu),Math.ceil(mu+sig)].map(i=>[i,fmt(pmf[i]??0),fmt(normalPDF(i,mu,sig))]),{svg:end(g,body),rows:[['평균 np',mu],['분산 np(1−p)',variance],['np, n(1−p)',fmt(mu)+', '+fmt(count-mu)]],caption:'파란 막대: 이항분포 점확률 · 주황: 평균과 분산을 맞춘 정규밀도. 정규분포의 확률은 구간 넓이로 근사하며 두 높이가 정확히 같지는 않습니다.',legend:'시행 수가 크고 p가0이나1에 너무 가깝지 않을 때 모양을 비교합니다.'})};
 }
 if(id==='B7'){
  const g=plot(w,{x0:0,x1:4,y0:-.5,y1:2.5,h:230,ylabel:'진리집합의 포함 관계',xlabel:'실수 x'});
  const body=line(g.X(1),g.Y(1.5),g.X(4),g.Y(1.5),TEAL,'stroke-width="7"')+line(g.X(2),g.Y(.5),g.X(4),g.Y(.5),BLUE,'stroke-width="7"')+
   '<circle cx="'+g.X(1)+'" cy="'+g.Y(1.5)+'" r="4" fill="white" stroke="'+TEAL+'" stroke-width="2"/><circle cx="'+g.X(2)+'" cy="'+g.Y(.5)+'" r="4" fill="white" stroke="'+BLUE+'" stroke-width="2"/>'+
   text(g.X(.2),g.Y(1.5)-12,'Q: x>1')+text(g.X(.2),g.Y(.5)-12,'P: x>2')+dot(g.X(1.5),g.Y(1.5),ORANGE)+text(g.X(1.5),g.Y(1.5)-15,'역의 반례 1.5','text-anchor="middle"');
  return {...defaults,...table(['입력 x','P: x>2','Q: x>1'],[0,1,1.5,2,3].map(x=>[x,x>2?'참':'거짓',x>1?'참':'거짓']),{svg:end(g,body),rows:[['포함 관계','P ⊂ Q'],['P⇒Q','참'],['Q⇒P','거짓: 1.5가 반례']],legend:'초록 Q · 파랑 P · 빈 원은 경계 미포함. 진리집합의 포함으로 충분·필요조건을 읽으세요.'})};
 }
 if(id==='B9'){
  const cell=Math.min((w-55)/6,38),left=(w-cell*6)/2,top=42,h=top+cell*6+35;let s=start(w,h,'같은 가능성의 두 주사위 순서쌍 36개, 합8과 한눈3 비교');
  for(let a=1;a<=6;a++){s+=text(left-13,top+(a-.5)*cell+4,a,'text-anchor="middle"')+text(left+(a-.5)*cell,top-12,a,'text-anchor="middle"');for(let b=1;b<=6;b++){const hit=a+b===8,three=a===3||b===3;s+='<rect x="'+(left+(b-1)*cell)+'" y="'+(top+(a-1)*cell)+'" width="'+cell+'" height="'+cell+'" fill="'+(hit?'#d6e2ff':'#fafbfc')+'" stroke="'+(three?TEAL:'#c5d2dc')+'" stroke-width="'+(three?2:1)+'"/>'+text(left+(b-.5)*cell,top+(a-.5)*cell+4,a+','+b,'text-anchor="middle" font-size="12"');}}
  s+=text(w/2,h-8,'행: 첫째 주사위 / 열: 둘째 주사위','text-anchor="middle"');
  return {...defaults,...table(['사건','순서쌍 수','전체 36개 중 비율'],[['합이 8',5,'5/36'],['적어도 한 눈이 3',11,'11/36'],['두 조건 모두',2,'2/36']],{svg:s+'</svg>',rows:[['전체 순서쌍',36],['합이 8',5],['3이 하나 이상',11]],legend:'파란 칸: 합8 · 초록 테두리: 한 눈이3. 둘 다인 칸은2개입니다.'})};
 }
 if(['sign','extrema','cubic-roots'].includes(k)){
  const f=t=>t*t*t-3*a*t,df=t=>3*t*t-3*a,x0=-3.1,x1=3.1,m=Math.max(8,Math.abs(f(x0)),Math.abs(f(x1)),a>0?2*a**1.5:0)+1;
  const g=plot(w,{x0,x1,y0:-m,y1:m,h:245,label:'원함수 f의 높이',ylabel:'원함수 f(x)'}),d=plot(w,{x0,x1,y0:Math.min(-4,-3*a-1),y1:Math.max(12,29-3*a),h:230,label:'도함수의 높이가 원함수 기울기',ylabel:'도함수 f′(x)'});
  const top=end(g,g.path(f)+(k==='cubic-roots'?g.path(()=>b,ORANGE,true):'')+line(g.X(x),g.top,g.X(x),g.bottom,ORANGE,'stroke-dasharray="3 4"')+dot(g.X(x),g.Y(f(x))));
  const lower=end(d,d.path(df,TEAL)+line(d.X(x),d.top,d.X(x),d.bottom,ORANGE,'stroke-dasharray="3 4"')+dot(d.X(x),d.Y(df(x))));
  const roots=a>0?[-Math.sqrt(a),Math.sqrt(a)]:a===0?[0]:[];
  v=table(['입력 구간 또는 경계','f′ 부호','원함수 변화','극값 판정'],a>0?[['x < '+fmt(roots[0]),'+','증가',''],['x = '+fmt(roots[0]),'0','증가 → 감소','극대'],[fmt(roots[0])+' < x < '+fmt(roots[1]),'−','감소',''],['x = '+fmt(roots[1]),'0','감소 → 증가','극소'],['x > '+fmt(roots[1]),'+','증가','']]:a===0?[['x < 0','+','증가',''],['x = 0','0','증가 → 증가','극값 없음'],['x > 0','+','증가','']]:[['모든 실수 x','+','증가','극값 없음']],{svg:start(w,475,'위: 원함수 / 아래: 도함수, 같은 입력을 나란히 비교')+'<g>'+top.replace(/^<svg[^>]*>|<\/svg>$/g,'')+'</g><g transform="translate(0 245)">'+lower.replace(/^<svg[^>]*>|<\/svg>$/g,'')+'</g></svg>',rows:[['관찰 입력',x],['f′(x): 접선 기울기',df(x)],['극값 후보',roots.map(fmt).join(', ')||'없음'],...(k==='cubic-roots'?[['수평선 높이 k',b],['서로 다른 교점 수',a<=0?1:Math.abs(b)<2*a**1.5?3:Math.abs(b)===2*a**1.5?2:1]]:[])],caption:'f(x)=x³−3ax, f′(x)=3x²−3a',legend:'파랑: 원함수 높이 · 초록: 도함수 높이 · 주황: 같은 입력. 도함수의 부호를 원함수의 증가·감소와 연결하세요.'});
 }else if(k==='conditional'){
  const rows=[['질병 있음',9,1,10],['질병 없음',99,891,990],['합계',108,892,1000]],headers=['인원','양성','음성','합계'];
  v=table(headers,rows,{svg:tableDiagram(w,headers,rows,'검사 결과 인원표. 셀의 면적은 인원에 비례하지 않습니다.'),rows:[['양성 중 질병자', '9/108 = 1/12'],['질병자 중 양성','9/10'],['양성 중 비질병자','99/108 = 11/12']],caption:'조건이 양성이면 전체는 1000명이 아니라 양성 108명',legend:'인원표이며 면적비례 그림이 아닙니다. 세로로 조건을 좁힌 뒤 공통 인원을 새 전체로 나누세요.'});
 }else if(['secant','tangent','derivative','differentiable','mvt'].includes(k)){
  const f=k==='differentiable'?t=>Math.abs(t):t=>t*t,h=p.h??.5,slope=k==='differentiable'?(x===0?0:Math.sign(x)):2*x;
  const g=plot(w,{x0:-2.6,x1:3.6,y0:k==='differentiable'?-.8:-3,y1:k==='differentiable'?4:14,ylabel:k==='differentiable'?'f(x)=|x|':'f(x)=x²'});let s=g.path(f);
  if(k==='secant'){const yh=f(x+h),y=f(x);s+=line(g.X(x),g.Y(y),g.X(x+h),g.Y(yh),ORANGE)+dot(g.X(x),g.Y(y))+dot(g.X(x+h),g.Y(yh));}
  else if(k==='mvt'){const c=1;s+=g.path(t=>2*t-1,ORANGE,true)+line(g.X(0),g.Y(0),g.X(2),g.Y(4),TEAL)+dot(g.X(c),g.Y(1));}
  else if(k==='differentiable'&&x===0)s+=g.path(t=>t,ORANGE,true)+g.path(t=>-t,TEAL,true)+dot(g.X(0),g.Y(0));
  else s+=g.path(t=>f(x)+slope*(t-x),ORANGE,true)+dot(g.X(x),g.Y(f(x)));
  v=table(['간격 h','왼쪽 평균 변화율','오른쪽 평균 변화율'],[1,.5,.1,.01,.001].map(t=>[t,fmt((f(x)-f(x-t))/t),fmt((f(x+t)-f(x))/t)]),{svg:end(g,s),rows:[['관찰 입력',x],...(k==='secant'?[['입력 간격 h',h],['현재 평균변화율',(f(x+h)-f(x))/h]]:[]),['함숫값',f(x)],['미분계수',k==='differentiable'&&x===0?'존재하지 않음':slope]],caption:k==='mvt'?'x²의 [0,2] 평균 기울기 2 = x=1의 미분계수 2':k==='secant'?'평균 변화율 = (f(x+h)−f(x))/h':'접선: y−f(x₀)=f′(x₀)(x−x₀)',legend:'파랑: 원함수 · 주황: 할선 또는 접선 · h는 0이 아닌 값으로 접근합니다.'});
 }else if(['limit','continuity'].includes(k)){
  const value=p.a??3,probe=p.x??.5,fn=k==='limit'?t=>t===1?NaN:t+1:t=>t<0?-1:t>0?1:NaN,target=k==='limit'?1:0,g=plot(w,{x0:-2,x1:3,y0:-3,y1:6,ylabel:'주변 값과 지정한 점의 값'});
  let s=g.path(fn)+dot(g.X(target),g.Y(value),ORANGE);for(const yy of k==='limit'?[2]:[-1,1])s+='<circle cx="'+g.X(target)+'" cy="'+g.Y(yy)+'" r="5" fill="white" stroke="'+BLUE+'" stroke-width="2"/>';
  s+=dot(g.X(probe),g.Y(probe===target?value:fn(probe)),TEAL);
  const inputs=k==='limit'?[.9,.99,.999,1,1.001,1.01,1.1]:[-.1,-.01,-.001,0,.001,.01,.1];
  v=table(['입력 x','함숫값','기준점까지 거리'],inputs.map(t=>[t,t===target?value:fmt(fn(t)),fmt(Math.abs(t-target))]),{svg:end(g,s),rows:[['지정한 점의 값',value],['양쪽 극한',k==='limit'?2:'존재하지 않음'],['현재 입력의 값',probe===target?value:fn(probe)]],caption:k==='limit'?'x≠1에서 f(x)=x+1, f(1)=a':'x<0에서 −1, x>0에서 1, f(0)=a',legend:'빈 원: 주변 접근값 · 주황 점: 지정한 점의 값 · 초록 점: 현재 입력'});
 }else if(['integral','area','accumulation','distance','antiderivative','motion'].includes(k)){
  const endPoint=p.b??2,c=p.a??0;
  const f=['area','distance','motion'].includes(k)?t=>t-1:t=>t*t;
  const g=plot(w,{x0:-.3,x1:3.3,y0:-2,y1:11,ylabel:k==='motion'?'위치 s(t)=t²/2−t':k==='antiderivative'?'원시함수 F(x)=x³/3+C':'함숫값 / 부호 있는 누적',xlabel:k==='motion'||k==='distance'?'시간 t':'입력 x'});
  let s='';
  if(k==='motion')s+=g.path(t=>t*t/2-t)+g.path(t=>t-1,TEAL,true);
  else if(k==='antiderivative')s+=g.path(t=>t**3/3+c)+g.path(t=>t*t,TEAL,true);
  else{s+=area(g,f,0,endPoint,Math.round(p.n??30))+g.path(f);if(k==='accumulation')s+=g.path(t=>t**3/3,TEAL,true)+dot(g.X(endPoint),g.Y(endPoint**3/3),TEAL);}
  const value=['area','distance','motion'].includes(k)?endPoint**2/2-endPoint:endPoint**3/3,distance=endPoint<=1?endPoint-endPoint**2/2:.5+(endPoint-1)**2/2;
  v=table(['구간 끝 b','부호 있는 누적','거리 또는 넓이'],[.5,1,1.5,2,2.5,3].map(t=>[t,fmt(['area','distance','motion'].includes(k)?t*t/2-t:t**3/3),fmt(['area','distance','motion'].includes(k)?t<=1?t-t*t/2:.5+(t-1)**2/2:t**3/3)]),{svg:end(g,s),rows:[['구간 끝',endPoint],...(k==='antiderivative'?[['적분상수 C',c],['현재 원시함수 값',endPoint**3/3+c]]:[]),...(k==='motion'?[['현재 속도',endPoint-1],['현재 가속도',1]]:k==='accumulation'?[['누적함수의 현재 기울기',endPoint**2]]:[]),['부호 있는 누적',value],['절댓값 누적',['area','distance','motion'].includes(k)?distance:value]],caption:k==='antiderivative'?'상수 C가 달라도 도함수 x²는 같습니다.':k==='accumulation'?'F(b)=∫₀ᵇx²dx=b³/3, F′(b)=b²':'부호 있는 누적과 양수로 더한 크기를 구별하세요.',legend:k==='antiderivative'?'파랑: 원시함수 · 초록 점선: 도함수':k==='motion'?'파랑: 위치 · 초록 점선: 속도':'직사각형은 왼쪽 끝값으로 그린 근사 · 표와 누적값은 정확한 적분 · 파랑: 적분할 함수 · 초록: 누적 함수(있는 경우)'});
 }else if(['exponential','logarithm','log-rules','power'].includes(k)){
  const base=p.a??2,t=p.x??2,goodBase=base>0&&base!==1;
  if(k==='log-rules'){const a=p.a??2,b=p.b??4;v=table(['a','b','log₂a+log₂b','log₂(ab)','log₂(a+b)'],[[a,b,fmt(Math.log2(a)+Math.log2(b)),fmt(Math.log2(a*b)),fmt(Math.log2(a+b))]],{rows:[['곱의 로그',Math.log2(a*b)],['로그의 합',Math.log2(a)+Math.log2(b)],['합의 로그',Math.log2(a+b)]]});v.svg=tableDiagram(w,v.headers,v.table,'곱의 로그와 합의 로그 비교');}
  else if(k==='power'){const b=p.a??4,rows=[-2,-1,-.5,0,.5,1,2].map(t=>[t,fmt(b**t)]);v=table(['지수 r','양수 밑 a의 r제곱'],rows,{svg:bars(w,rows.map(r=>Number(String(r[1]).replace(/,/g,''))),rows.map(r=>String(r[0])),'지수 r'),rows:[['밑 a',b],['a⁰',1],['a^(1/2)',Math.sqrt(b)]],caption:'양수 밑에서 지수법칙을 유지하며 지수를 확장합니다.'});}
  else if(!goodBase){const msg=base===1?(k==='exponential'?'밑1이면 상수함수이므로 이 지수함수의 밑 조건에서 제외합니다.':'밑1은 로그의 밑으로 쓸 수 없습니다.'):'밑은 양수여야 합니다.';v=table(['조건','현재 상태'],[['밑 a > 0',base>0?'충족':'불충족'],['밑 a ≠ 1',base!==1?'충족':'불충족']],{svg:tableDiagram(w,['현재 밑','판정'],[[base,msg]],'지수·로그함수의 밑 조건 확인'),rows:[['현재 밑',base],['조건 확인',msg]],caption:'밑 > 0, 밑 ≠ 1인 값으로 바꾸어 관찰하세요.'});}
  else {const fn=k==='exponential'?q=>base**q:q=>q>0&&goodBase?Math.log(q)/Math.log(base):NaN,max=k==='exponential'?Math.max(base**-2,base**3,3):5,g=plot(w,{x0:k==='exponential'?-2:-.5,x1:k==='exponential'?3:5,y0:k==='exponential'?-.5:-5,y1:max*1.15,ylabel:k==='exponential'?'출력 aˣ':'출력 logₐx'});let s=g.path(fn);if(Number.isFinite(fn(t))&&t>=g.x0&&t<=g.x1&&fn(t)>=g.y0&&fn(t)<=g.y1)s+=dot(g.X(t),g.Y(fn(t)));v=table(['입력 x','출력'],(k==='exponential'?[-2,-1,0,1,2,3]:[.25,.5,1,2,4]).map(t=>[t,fmt(fn(t))]),{svg:end(g,s),rows:[['밑',base],['현재 입력',t],['현재 출력',fn(t)]],caption:'밑 > 0, 밑 ≠ 1. 밑이 1보다 작은 경우 감소 방향을 확인하세요.'});}
 }else if(['trig','unitcircle','triangle'].includes(k)){
  if(k==='unitcircle'){const angle=p.x??1,side=Math.min(w,340),cx=w/2,cy=165,r=105,h=330;s: {const px=cx+r*Math.cos(angle),py=cy-r*Math.sin(angle);v=table(['각(라디안)','cos θ','sin θ'],[0,Math.PI/6,Math.PI/4,Math.PI/3,Math.PI/2,Math.PI].map(t=>[fmt(t),fmt(Math.cos(t)),fmt(Math.sin(t))]),{svg:start(w,h,'단위원 위 점의 좌표')+'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#f3f6fc" stroke="#a8bbd6"/>'+line(cx-r-25,cy,cx+r+25,cy)+line(cx,cy-r-25,cx,cy+r+25)+line(cx,cy,px,py,BLUE)+line(px,cy,px,py,TEAL)+dot(px,py)+text(cx,24,'반지름 1 · 가로 cos θ / 세로 sin θ','text-anchor="middle"')+'</svg>',rows:[['라디안',angle],['cos θ',Math.cos(angle)],['sin θ',Math.sin(angle)]],caption:'cos²θ+sin²θ=1, 같은 동경은 θ+2kπ'});}}
  else if(k==='triangle'){const C=p.x??60,ar=p.a??3,br=p.b??4,c=Math.sqrt(ar*ar+br*br-2*ar*br*Math.cos(C*Math.PI/180)),rawX=ar*Math.cos(C*Math.PI/180),rawY=ar*Math.sin(C*Math.PI/180),loX=Math.min(0,rawX),hiX=Math.max(br,rawX),scale=Math.min((w-90)/(hiX-loX),180/Math.max(rawY,.01)),ax=45-loX*scale,ay=240,bx=ax+br*scale,cx=ax+rawX*scale,cy=ay-rawY*scale;v=table(['끼인각 C','c²','넓이'],[30,60,90,120].map(t=>[t,fmt(ar*ar+br*br-2*ar*br*Math.cos(t*Math.PI/180)),fmt(ar*br*Math.sin(t*Math.PI/180)/2)]),{svg:start(w,290,'두 변과 끼인각으로 삼각형 결정')+'<path d="M'+ax+','+ay+'L'+bx+','+ay+'L'+cx+','+cy+'Z" fill="#edf2fc" stroke="'+BLUE+'" stroke-width="2"/>'+text(ax+8,ay-10,C+'°')+text((ax+bx)/2,ay+23,'b='+br,'text-anchor="middle"')+text(cx+10,cy-10,'a='+ar)+'</svg>',rows:[['셋째 변 c',c],['넓이',ar*br*Math.sin(C*Math.PI/180)/2],['끼인각',C]],caption:'c²=a²+b²−2ab cos C, 넓이=(ab sin C)/2'});}
  else {const amp=p.a??1,freq=p.b??1,shift=p.x??0,fn=t=>amp*Math.sin(freq*(t-shift)),g=plot(w,{x0:-2*Math.PI,x1:2*Math.PI,y0:-3.5,y1:3.5,xlabel:'각 입력(라디안)',ylabel:'삼각함수의 값',ticks:[{value:-2*Math.PI,label:'−2π'},{value:-Math.PI,label:'−π'},0,{value:Math.PI,label:'π'},{value:2*Math.PI,label:'2π'}]});v=table(['입력','함숫값'],[0,Math.PI/2,Math.PI,3*Math.PI/2,2*Math.PI].map(t=>[fmt(t),fmt(fn(t))]),{svg:end(g,g.path(fn)+g.path(t=>Math.cos(t),TEAL,true)),rows:[['진폭',Math.abs(amp)],['주기',2*Math.PI/Math.abs(freq)],['오른쪽 이동량',shift]],caption:'y=a sin(b(x−h)), 주기=2π/|b|',legend:'파랑: 조절한 사인 · 초록 점선: 기준 cos x'});}
 }else if(['arithmetic','geometric','sigma','telescoping','recurrence','induction'].includes(k)){
  const count=Math.round(p.n??6),first=p.a??2,step=p.r??2,terms=Array.from({length:count},(_,i)=>k==='geometric'?first*step**i:k==='sigma'?(i+1)**2:k==='telescoping'?1/((i+1)*(i+2)):k==='recurrence'?first+step*i:k==='induction'?i+1:first+step*i),partial=terms.map((_,i)=>sum(terms.slice(0,i+1)));
  v=table(['항 번호 n','항 aₙ','앞 n항 합 Sₙ'],terms.map((t,i)=>[i+1,fmt(t),fmt(partial[i])]),{svg:bars(w,terms,terms.map((_,i)=>String(i+1)),'항 번호 n'),rows:[['항 수',count],['마지막 항',terms.at(-1)],['앞 n항 합',partial.at(-1)]],caption:k==='sigma'?'Σ k²: 먼저 무엇을 더하는지 항을 펼쳐 읽으세요.':k==='telescoping'?'1/[k(k+1)] = 1/k − 1/(k+1)':k==='induction'?'처음이 성립하고, 앞 단계의 참에서 다음 단계의 참을 연결해야 합니다.':'항의 규칙과 합의 규칙을 구별하세요.'});
 }else if(['normal','density','approximation','sampling','confidence','proportion'].includes(k)){
  const mu=p.mu??50,sigma=p.sigma??10,count=Math.round(p.n??25);
  if(k==='confidence'){const xbar=p.xbar??50,z=p.z??1.96,bounds=ci(xbar,sigma,count,z);const samples=Array.from({length:30},(_,i)=>{const sample=sampleNormal(count,100+i*31,mu,sigma),m=mean(sample);return {m,range:ci(m,sigma,count,z)};});const lo=mu-3*sigma,hi=mu+3*sigma,h=360,X=x=>40+(x-lo)/(hi-lo)*(w-60);let s=start(w,h,'모평균은 고정되고 표본에 따라 신뢰구간이 달라짐')+line(X(mu),25,X(mu),320,ORANGE,'stroke-dasharray="4 4"');samples.forEach((v,i)=>{const y=30+i*9.5,c=v.range[0]<=mu&&v.range[1]>=mu?BLUE:ORANGE;s+=line(X(v.range[0]),y,X(v.range[1]),y,c);});s+=text(w/2,350,'세로 점선: 고정된 모평균 · 각 가로선: 다른 표본의 구간','text-anchor="middle"');v=table(['표본 번호','표본평균','구간 하한','구간 상한'],samples.slice(0,6).map((v,i)=>[i+1,fmt(v.m),fmt(v.range[0]),fmt(v.range[1])]),{svg:s+'</svg>',rows:[['관찰 표본의 평균',xbar],['이 표본의 구간',fmt(bounds[0])+' ~ '+fmt(bounds[1])],['구간 폭',bounds[1]-bounds[0]]],caption:'정규모집단·모표준편차를 아는 경우 x̄ ± zσ/√n. 반복 방법의 포함 비율을 해석합니다.'});}
  else if(k==='proportion'){const phat=p.p??.5,z=p.z??1.96,margin=z*Math.sqrt(phat*(1-phat)/count);v=table(['표본 크기','표본비율','근사 구간 하한','근사 구간 상한'],[100,400,900,1600].map(n=>{const m=z*Math.sqrt(phat*(1-phat)/n);return [n,phat,fmt(phat-m),fmt(phat+m)];}),{svg:bars(w,[1,2,3,4].map(i=>1.96*Math.sqrt(phat*(1-phat)/(100*i*i))),['100','400','900','1600'],'표본 크기별 오차 한계'),rows:[['표본 크기',count],['표본비율',phat],['근사 오차 한계',margin]],caption:'큰 임의 표본에서 p̂ ± z√[p̂(1−p̂)/n]. 작은 표본에는 기계적으로 적용하지 않습니다.'});}
  else if(k==='sampling'){const sig=sigma/Math.sqrt(count),g=plot(w,{x0:mu-3*sigma,x1:mu+3*sigma,y0:0,y1:normalPDF(mu,mu,sig)*1.15,ylabel:'정규모집단과 표본평균의 밀도'});v=table(['표본 크기 n','모표준편차 σ','표본평균 표준편차'],[1,4,16,25,100].map(n=>[n,sigma,fmt(sigma/Math.sqrt(n))]),{svg:end(g,g.path(t=>normalPDF(t,mu,sigma),GRAY)+g.path(t=>normalPDF(t,mu,sig),BLUE)),rows:[['표본 크기',count],['표본평균의 평균',mu],['표본평균의 표준편차',sig]],caption:'정규모집단의 독립 표본: X̄도 정규분포, E(X̄)=μ, SD(X̄)=σ/√n',legend:'회색: 모집단 · 파랑: 표본평균의 분포. 높이는 확률이 아닌 밀도입니다.'});}
  else{const lo=p.x??mu-sigma,hi=p.b??mu+sigma,g=plot(w,{x0:mu-4*sigma,x1:mu+4*sigma,y0:0,y1:normalPDF(mu,mu,sigma)*1.2,ylabel:'확률밀도(한 점의 확률 아님)'});let s=area(g,t=>normalPDF(t,mu,sigma),lo,hi,60)+g.path(t=>normalPDF(t,mu,sigma));v=table(['관찰값','표준점수 Z','평균에서 관찰값까지 넓이'],[mu-sigma,mu,mu+sigma,mu+2*sigma].map(t=>[t,fmt((t-mu)/sigma),fmt(Math.abs(normalCDF((t-mu)/sigma)-.5))]),{svg:end(g,s),rows:[['구간 하한',lo],['구간 상한',hi],['음영 넓이(근사)',normalCDF((hi-mu)/sigma)-normalCDF((lo-mu)/sigma)]],caption:'Z=(X−μ)/σ, 확률은 곡선 아래 구간 넓이. 수치 넓이는 근사입니다.'});}
 }else if(['binomial','trials','binomial-theorem','approximation'].includes(k)){
  const count=Math.round(p.n??6),prob=p.p??.5,values=binomial(count,prob);
  v=table(['성공 횟수 k','확률 P(X=k)'],values.map((v,i)=>[i,fmt(v)]),{svg:bars(w,values,values.map((_,i)=>String(i)),'성공 횟수 k'),rows:[['평균',count*prob],['분산',count*prob*(1-prob)],['확률의 합',sum(values)]],caption:'독립·동일 성공 확률 조건의 이항분포. 일반적인 비복원 추출에는 적용하지 않습니다.'});
 }else if(['distribution','moments'].includes(k)){
  const grouped=new Map();[0,1,2].forEach((x,i)=>{const y=(p.a??1)*x+(p.b??0);grouped.set(y,(grouped.get(y)||0)+[.25,.5,.25][i]);});const entries=[...grouped].sort((a,b)=>a[0]-b[0]),transformed=entries.map(e=>e[0]),probabilities=entries.map(e=>e[1]),m=sum(transformed.map((x,i)=>x*probabilities[i])),variance=sum(transformed.map((x,i)=>(x-m)**2*probabilities[i]));
  v=table(['가능한 값','확률','값×확률'],transformed.map((x,i)=>[x,probabilities[i],x*probabilities[i]]),{svg:bars(w,probabilities,transformed.map(String),'확률변수의 값'),rows:[['기댓값',m],['분산',variance],['확률의 합',1]],caption:'기댓값은 확률을 가중치로 한 평균. aX+b의 분산은 a²V(X)입니다.'});
 }else if(k==='dice'){
  const counts=Array.from({length:11},()=>0);for(let i=1;i<=6;i++)for(let j=1;j<=6;j++)counts[i+j-2]++;
  v=table(['두 눈의 합','해당 순서쌍 수','확률'],counts.map((c,i)=>[i+2,c,c+'/36']),{svg:bars(w,counts,counts.map((_,i)=>String(i+2)),'두 주사위 눈의 합'),rows:[['전체 순서쌍',36],['합 7의 경우',6],['합 2의 경우',1]],caption:'동일 가능성의 단위는 합의 값 11개가 아니라 순서쌍 36개입니다.'});
 }else if(['counting','repeated','identical','multiset','binomial-theorem','union','independence'].includes(k)){
  const count=Math.round(p.n??4),r=Math.round(p.r??2);let rows,headers;
  if(k==='repeated'){rows=[[count,r,count**r],[count,r+1,count**(r+1)]];headers=['선택 종류','자리 수','중복 허용 경우의 수'];}
  else if(k==='identical'){rows=[['AAB',6,2,3],['AABB',24,4,6],['AABC',24,2,12]];headers=['배열 대상','모두 구별 n!','중복 횟수','나눈 뒤'];}
  else if(k==='multiset'){rows=[[count,r,choose(count+r-1,r)],[count,r+1,choose(count+r,r+1)]];headers=['종류 n','고를 수 r','중복조합'];}
  else if(k==='union'){rows=[['사건 A',12],['사건 B',10],['공통 A∩B',4],['하나 이상 A∪B',18]];headers=['사건','전체 30명 중 인원'];}
  else if(k==='independence'){rows=[['독립인 두 동전 앞면','1/2','1/2','1/4'],['같은 주사위 짝수/홀수','1/2','1/2','0']];headers=['상황','P(A)','P(B)','P(A∩B)'];}
  else {rows=[[count,r,factorial(count)/factorial(count-r),choose(count,r)]];headers=['전체 n','고르는 수 r','순서 있음','순서 없음'];}
  v=table(headers,rows,{svg:tableDiagram(w,headers,rows,'경우의 수와 사건 조건 비교'),rows:rows.slice(0,3).map(row=>[String(row[0]),row.at(-1)]),caption:'무엇을 같은 경우로 세는지, 중복과 순서를 먼저 정하세요.'});
 }else{
  const fn=k==='absolute'?t=>Math.abs(t-a):k==='transform'?t=>(t-a)**2+b:k==='quadratic'?id==='B5'?t=>t*t+(p.b??2)*t+(p.c??1):t=>t*t-2*t+a:t=>t*t;
  const ys=Array.from({length:67},(_,i)=>fn(-3.3+i*.1)),max=Math.max(...ys,10),g=plot(w,{x0:-3.3,x1:3.3,y0:Math.min(-3,...ys)-1,y1:max+2,ylabel:'함숫값'});
  v=table(['입력 x','출력 f(x)'],[-3,-2,-1,0,1,2,3].map(t=>[t,fmt(fn(t))]),{svg:end(g,g.path(fn)+(lesson.representation.controls?.some(c=>c.key==='x')?dot(g.X(x),g.Y(fn(x))):'')),rows:id==='B5'?[['판별식 D',(p.b??2)**2-4*(p.c??1)],['D의 부호',Math.sign((p.b??2)**2-4*(p.c??1))],['x축과 관계',(p.b??2)**2-4*(p.c??1)>0?'두 점에서 만남':(p.b??2)**2-4*(p.c??1)===0?'접함':'만나지 않음']]:[['입력',x],['함숫값',fn(x)]],caption:k==='transform'?'y=(x−a)²+b':k==='absolute'?'y=|x−a|':k==='quadratic'?id==='B5'?'y=x²+bx+c, D=b²−4c':'y=x²−2x+a':'y=x²'});
 }
 return {...defaults,...v};
}
