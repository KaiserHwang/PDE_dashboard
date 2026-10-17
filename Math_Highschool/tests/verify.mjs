import assert from 'node:assert/strict';
import {LESSONS,LESSON_MAP,GROUPS,STARTER_PATH} from '../src/content.js';
import {GRAPH_KINDS,VISUAL_KINDS,renderVisual,escapeHTML} from '../src/visuals.js';
import {choose,factorial,matmul,binomial,normalPDF,integrate,graphModel,modelReport,confidence,ciExperiment,mean,variance,rectangleSum,sum} from '../src/math.js';
import {normalizeEntries,lessonComplete,loadSavedEntries} from '../src/app.js';
let tests=0;
const check=(name,fn)=>{fn();tests++;console.log(`PASS ${tests} · ${name}`);};
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
check('69개 개념과 15개 분야의 내용 및 선행 연결',()=>{
  assert.equal(LESSONS.length,69);assert.equal(new Set(LESSONS.map(l=>l.id)).size,69);
  for(const g of GROUPS)assert.ok(LESSONS.some(l=>l.group===g.id));
  for(const l of LESSONS){for(const key of ['question','definition','wrong','rule','because','condition','explain'])assert.ok(l[key]?.length>5,`${l.id}.${key}`);assert.equal(l.checks.length,3);assert.ok(VISUAL_KINDS.has(l.kind),l.id);for(const p of l.prereqs)assert.ok(LESSON_MAP[p]);for(const q of l.checks){assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(q.correct>=0&&q.correct<3);assert.ok(q.reason.length>5);}}
  const visit=(id,stack=[])=>{assert.ok(!stack.includes(id),'선행 개념 순환');LESSON_MAP[id].prereqs.forEach(p=>visit(p,[...stack,id]));};LESSONS.forEach(l=>visit(l.id));STARTER_PATH.forEach(id=>assert.ok(LESSON_MAP[id]));
});
check('모든 개념의 기본·최소·최대·혼합 설정에서 유효한 그림과 표',()=>{
  for(const l of LESSONS){const configs=[Object.fromEntries(l.controls.map(c=>[c.key,c.value]))];for(let mask=0;mask<2**l.controls.length;mask++)configs.push(Object.fromEntries(l.controls.map((c,i)=>[c.key,mask&(1<<i)?c.max:c.min])));
    for(const p of configs)for(const width of [320,760]){const v=renderVisual(l,p,width);assert.ok(v.svg.startsWith('<svg'),l.id);assert.ok(!/NaN|Infinity|undefined/.test(v.svg),l.id);assert.ok(v.rows.length>=2,l.id);assert.ok(v.table.length>0,l.id);for(const row of v.rows)if(typeof row[1]==='number')assert.ok(Number.isFinite(row[1]),l.id);for(const row of v.table)assert.equal(row.length,v.headers.length,l.id);}}
});
check('정의역: 분모 0·음수 제곱근·로그 입력',()=>{assert.ok(Number.isNaN(graphModel('rational',{a:1}).fn(1)));near(graphModel('rational',{a:1}).fn(1.01),100,1e-8);assert.ok(Number.isNaN(graphModel('radical',{a:2}).fn(1)));near(graphModel('radical',{a:2}).fn(6),2);assert.ok(Number.isNaN(graphModel('log',{a:2}).fn(0)));near(graphModel('log',{a:2}).fn(8),3);});
check('극한의 주변값과 별도로 지정한 함숫값',()=>{near(graphModel('limit',{a:3}).fn(.99),1.99);const rows=modelReport('limit',{a:3});assert.equal(rows.find(r=>r[0]==='x→1의 극한')[1],2);assert.equal(rows.find(r=>r[0]==='지정한 f(1)')[1],3);assert.equal(rows.find(r=>r[0]==='1에서 연속?')[1],'아니요');});
check('평균 변화율의 극한 및 접선 기울기',()=>{near(modelReport('secant',{x:1,h:.1})[2][1],2.1);near(modelReport('secant',{x:1,h:.001})[2][1],2.001);near(graphModel('derivative',{x:2}).tangent.slope,4);});
check('합성·곱·지수함수 미분과 수치 차분 비교',()=>{for(const kind of ['chain','product','expderiv']){const m=graphModel(kind,{a:2});for(const x of [-.5,0,.8]){const numeric=(m.fn(x+1e-5)-m.fn(x-1e-5))/2e-5;near(numeric,m.other(x),1e-7);}}});
check('불연속과 미분 불가능한 점의 구별',()=>{assert.notEqual(graphModel('continuity').fn(-.01),graphModel('continuity').fn(.01));const m=graphModel('corner');near((m.fn(-.01)-m.fn(0))/-.01,-1);near((m.fn(.01)-m.fn(0))/.01,1);assert.equal(modelReport('stationary')[2][1],'아님');});
check('직사각형 근사합 수렴: x²의 정확한 적분 8/3',()=>{const err=n=>Math.abs(sum(rectangleSum(x=>x*x,0,2,n).map(r=>r.y*r.width))-8/3);assert.ok(err(40)<err(10));near(integrate(x=>x*x,0,2,2000),8/3,1e-6);});
check('정적분·넓이·변위·이동 거리의 차이',()=>{near(modelReport('signed',{b:1})[0][1],0);near(modelReport('signed',{b:1})[1][1],1);near(modelReport('motion',{b:2})[1][1],0);near(modelReport('motion',{b:2})[2][1],1);});
check('치환·부분적분·두 곡선 넓이·회전체 부피',()=>{near(integrate(x=>2*x*Math.cos(x*x),0,1,2000),Math.sin(1),1e-7);near(integrate(x=>x*Math.exp(x),0,1,2000),1,1e-7);near(modelReport('between',{b:1})[2][1],1/6);near(modelReport('volume',{b:2})[2][1],8*Math.PI/3);});
check('경우의 수·확률분포의 정규화',()=>{assert.equal(factorial(5),120);assert.equal(choose(5,2),10);for(const n of [4,8,12])for(const p of [.1,.5,.9])near(sum(binomial(n,p)),1);near(integrate(x=>normalPDF(x),-8,8,8000),1,1e-8);});
check('행렬 곱의 순서',()=>{const A=[[2,0],[0,1]],B=[[1,1],[0,1]];assert.deepEqual(matmul(A,B),[[2,2],[0,1]]);assert.deepEqual(matmul(B,A),[[2,1],[0,1]]);});
check('평균·분산·신뢰구간의 폭과 표집 변동',()=>{near(mean([0,10]),5);near(mean([5,5]),5);near(variance([0,10]),25);near(variance([5,5]),0);const a=confidence(50,10,25),b=confidence(50,10,100);near((a[1]-a[0])/(b[1]-b[0]),2);const samples=ciExperiment();assert.ok(new Set(samples.map(s=>s.mean)).size>70);assert.ok(samples.some(s=>!s.covers));});
check('소속·조건부확률·독립성의 계산',()=>{const l=LESSON_MAP.conditional,p={a:40,b:.5},v=renderVisual(l,p,400);near(v.rows.find(r=>r[0]==='P(B|A)')[1],.5);near(v.rows.find(r=>r[0]==='P(A|B)')[1],20/35);const independent=renderVisual(LESSON_MAP.independence,{a:0}),copied=renderVisual(LESSON_MAP.independence,{a:1});near(independent.rows[2][1],.25);near(copied.rows[2][1],.5);});
check('자기점검 기록은 질문 정답·설명·확인을 모두 요구',()=>{const l=LESSON_MAP.function,e={note:'입력 하나에 출력 하나를 정하는 규칙이다.',answers:l.checks.map(q=>q.correct),expected:l.checks.map(q=>q.correct),self:true};assert.ok(lessonComplete(e));assert.ok(!lessonComplete({...e,self:false}));assert.ok(!lessonComplete({...e,note:'짧음'}));assert.ok(!lessonComplete({...e,answers:[null,null,null]}));});
check('잘못 저장된 형식 정리와 사용자 텍스트 보호',()=>{assert.deepEqual(normalizeEntries(null),{});assert.equal(normalizeEntries({function:'bad'})._legacy.function,'bad');const entries=normalizeEntries({function:{answers:[99,null,2],note:'<script>alert(1)</script>',self:'true',expected:[0,0,0]}});assert.equal(entries.function.answers[0],null);assert.equal(entries.function.self,false);assert.deepEqual(entries.function.expected,LESSON_MAP.function.checks.map(q=>q.correct));assert.ok(!escapeHTML(entries.function.note).includes('<script>'));});
check('리뷰 회귀: 극한·연속의 현재 입력이 그림과 판독값을 바꾼다',()=>{for(const id of ['limit','continuity']){const l=LESSON_MAP[id],a=renderVisual(l,{a:3,x:-.5}),b=renderVisual(l,{a:3,x:1.5});assert.notEqual(a.svg,b.svg);assert.notDeepEqual(a.rows,b.rows);}const t=renderVisual(LESSON_MAP.limit,{a:3,x:.99}).table;assert.ok(t.some(r=>Number(r[0])===.999&&Number(r[1])===1.999));assert.ok(t.some(r=>Number(r[0])===1.001));});
check('리뷰 회귀: 회전체 단면과 부분합을 실제로 표시',()=>{const volume=renderVisual(LESSON_MAP.volume,{b:2});assert.equal((volume.svg.match(/<ellipse /g)||[]).length,9);near(Number(volume.table.at(-1)[2]),4*Math.PI,1e-4);near(volume.rows[2][1],8*Math.PI/3);const series=renderVisual(LESSON_MAP.series,{r:.5,n:10});near(Number(series.table.at(-1)[2]),1.998046875,1e-10);assert.ok(Number(series.table.at(-1)[3])>0);});
check('리뷰 회귀: 미분 접근 표·도함수·누적 넓이',()=>{const v=renderVisual(LESSON_MAP.secant,{x:1,h:.01});assert.deepEqual(v.table.map(r=>Number(r[2])),[3,2.5,2.1,2.01,2.001]);assert.ok(renderVisual(LESSON_MAP.fundamental,{x:3}).svg.includes('fill-opacity=".7"'));const d=graphModel('derivativegraph',{x:0});assert.deepEqual(d.secondaryMarker,[0,-3]);assert.equal(graphModel('system',{a:0,b:-2}).marker[0],-3);});
check('리뷰 회귀: 역함수 동일 축척과 음수 식 표시',()=>{for(const width of [320,760]){const v=renderVisual(LESSON_MAP.inverse,{a:1.5,b:-2},width);near(v.axes.xUnit,v.axes.yUnit);}for(const l of LESSONS){const p=Object.fromEntries(l.controls.map(c=>[c.key,c.min]));assert.ok(!/[+−-]\s*-/.test(renderVisual(l,p).caption),l.id);}});
check('리뷰 회귀: 다른 오개념과 선행 문항의 범위',()=>{const distractors=LESSONS.map(l=>l.checks[0].options.filter((_,i)=>i!==l.checks[0].correct));assert.ok(distractors.flat().every(s=>typeof s==='string'&&s.length>5));assert.equal(new Set(distractors.map(d=>d[1])).size,69);assert.ok(!LESSON_MAP.chain.checks[2].prompt.includes('ln'));});
check('리뷰 회귀: 손상 원문 백업과 미래 버전 기록 보존',()=>{const data=new Map([['math-highschool-v1','{bad']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},loaded=loadSavedEntries(storage,123);assert.equal(data.get(loaded.backupKey),'{bad');assert.ok(loaded.canSave);const legacy=normalizeEntries({future_lesson:{note:'이전 기록'}});assert.equal(legacy._legacy.future_lesson.note,'이전 기록');const blocked=loadSavedEntries({getItem:()=>'{bad',setItem:()=>{throw new Error('quota');}});assert.ok(blocked.backupBlocked);});
check('2차 리뷰 회귀: 모든 그래프 관찰점이 실제 플롯 안에 표시',()=>{
  for(const l of LESSONS.filter(l=>GRAPH_KINDS.has(l.kind))){
    const configs=[Object.fromEntries(l.controls.map(c=>[c.key,c.value]))];
    for(let mask=0;mask<2**l.controls.length;mask++)configs.push(Object.fromEntries(l.controls.map((c,i)=>[c.key,mask&(1<<i)?c.max:c.min])));
    for(const p of configs)for(const width of [320,760]){
      const v=renderVisual(l,p,width),rect=v.svg.match(/<clipPath[^>]*><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/),[x,y,w,h]=rect.slice(1).map(Number);
      for(const circle of v.svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)){
        const cx=Number(circle[1]),cy=Number(circle[2]);assert.ok(cx>=x-1e-8&&cx<=x+w+1e-8&&cy>=y-1e-8&&cy<=y+h+1e-8,`${l.id} ${JSON.stringify(p)} (${cx},${cy})`);
      }
      if(l.id==='exponential')assert.ok(v.svg.includes('<circle '));
    }
  }
});
check('2차 리뷰 회귀: 계수와 범례, 백업 중복, 오답 횟수 정규화',()=>{
  for(const kind of ['variable','polynomial','system','inverse','trig','chain','expderiv'])for(const a of [-1,0,1,2]){
    if(kind==='inverse'&&a<=0)continue;
    assert.ok(!/\b1x|\+ 0\b|-\d/.test(graphModel(kind,{a,b:0}).formula),kind);
  }
  for(const l of LESSONS.filter(l=>GRAPH_KINDS.has(l.kind)))for(const endpoint of ['value','min','max']){const p=Object.fromEntries(l.controls.map(c=>[c.key,c[endpoint]])),v=renderVisual(l,p);assert.ok(!/-\d/.test(v.caption),l.id);assert.ok(!/-\d/.test(v.rows.flat().filter(x=>typeof x==='string').join(' ')),l.id);}
  assert.ok(renderVisual(LESSON_MAP.derivativegraph,{x:-2}).legend.includes('파랑 점의 높이'));
  assert.ok(renderVisual(LESSON_MAP.fundamental,{x:2}).legend.includes('주황 점: 높이 f(x)'));
  const data=new Map([['math-highschool-v1','{bad']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  loadSavedEntries(storage,1);loadSavedEntries(storage,2);assert.equal(data.size,2);assert.equal(data.get('math-highschool-v1'),'{}');
  assert.deepEqual(normalizeEntries({derivative:{wrongAttempts:[1,9999,-2]}}).derivative.wrongAttempts,[1,999,0]);
});
console.log(`\n${tests}개 검증 묶음 통과 · ${LESSONS.length}개 개념의 전 설정 조합 포함`);
