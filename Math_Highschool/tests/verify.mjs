import assert from 'node:assert/strict';
import fs from 'node:fs';
import katex from 'katex';
import {LESSONS,LESSON_MAP,COURSES} from '../src/content.js';
import {gradeAnswer,validAnswer,rationalEqual,rational,poly,derivative} from '../src/math.js';
import {renderRep,KINDS} from '../src/visuals.js';
import {STORE,DAY,emptyState,recordFor,markHelp,submitAnswer,initialEvidence,allCorrect,finishLesson,beginReview,finishReview,reviewHelp,dailyQueue,localDay,effectiveNow,normalizeState,loadState,mergeState,instanceFingerprint} from '../src/state.js';
import {makeReview,SPACE} from '../src/retrieval.js';
const release=process.argv.includes('--release');let count=0;
const test=(n,f)=>{f();console.log('PASS '+(++count)+' · '+n);};
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,String(a)+' != '+b);
const walkStrings=(v,fn)=>{if(typeof v==='string')fn(v);else if(v&&typeof v==='object')Object.values(v).forEach(x=>walkStrings(x,fn));};
test('콘텐츠 계약과 문항별 답·오답의 구별',()=>{
 const ids=new Set();
 for(const l of LESSONS){
  assert.ok(!ids.has(l.id));ids.add(l.id);assert.equal(l.entry.length,2);assert.equal(l.checks.length,l.course==='bridge'?4:8);assert.ok(l.why.join('').length>=150,l.id);assert.ok(l.conditions.length>=2);assert.ok(l.derivation.length>=3);assert.ok(l.example.steps.length>=3);assert.ok(l.misconceptions.length>=(l.course==='bridge'?2:3));assert.ok(KINDS.has(l.representation.kind),l.id);
  for(const q of [...l.entry,l.faded,...l.checks]){assert.ok(q.prompt&&q.reason&&q.hint,q.id);assert.ok(gradeAnswer(q,q.answer),q.id);for(const w of q.wrong??[])assert.ok(!gradeAnswer(q,w.value),q.id);if(q.type==='choice'){assert.equal(q.options.length,3,q.id);assert.equal(q.feedback.length,3,q.id);assert.ok(q.options.every(x=>typeof x==='string'));}assert.ok(!ids.has(q.id));ids.add(q.id);}
  for(const c of l.representation.controls||[])assert.ok(c.min<=c.value&&c.value<=c.max);
 }
});
test('모든 수식의 KaTeX 문법 검사',()=>{for(const l of LESSONS)walkStrings(l,s=>{assert.equal((s.match(/\$/g)||[]).length%2,0,l.id+' unmatched $');for(const m of s.matchAll(/\$([^$]+)\$/g))katex.renderToString(m[1],{throwOnError:true,strict:'ignore',trust:false});});});
test('유리수 정확값·구간 경계·집합 순서 무관 채점',()=>{assert.ok(rationalEqual('2/5','4/10'));assert.ok(rationalEqual('0.4','2/5'));assert.ok(!rationalEqual('0.33','1/3'));assert.equal(rational('1/0'),null);assert.equal(rational('alert(1)'),null);const q={type:'interval',answer:{lo:-3,loIncl:true,hi:3,hiIncl:true}};assert.ok(gradeAnswer(q,q.answer));assert.ok(!gradeAnswer(q,{...q.answer,loIncl:false}));assert.ok(gradeAnswer({type:'set',answer:[-1,3]},'3,-1'));assert.ok(!gradeAnswer({type:'set',answer:[-1,3]},'3,1'));});
test('전체 레슨 그림과 최소·최대·혼합 설정 및 조작 반영',()=>{
 for(const l of LESSONS){const controls=l.representation.controls||[],configs=[Object.fromEntries(controls.map(c=>[c.key,c.value]))];for(let mask=0;mask<2**controls.length;mask++)configs.push(Object.fromEntries(controls.map((c,i)=>[c.key,mask&(1<<i)?c.max:c.min])));
  for(const p of configs)for(const w of [280,700]){const v=renderRep(l,p,w);assert.ok(v.svg.startsWith('<svg'),l.id);assert.ok(!/NaN|Infinity|undefined/.test(v.svg),l.id);for(const row of v.table)assert.equal(row.length,v.headers.length,l.id);assert.ok(v.rows.length>=2,l.id);}
  for(const c of controls){const p=Object.fromEntries(controls.map(c=>[c.key,c.value])),a=renderRep(l,{...p,[c.key]:c.min}),b=renderRep(l,{...p,[c.key]:c.max});assert.notEqual(a.svg+JSON.stringify(a.rows),b.svg+JSON.stringify(b.rows),l.id+' inert '+c.key);}
 }
});
test('복습 유한 공간: 유효한 답·오답 충돌 없음·각각 최소8변형',()=>{
 for(const l of LESSONS){const keys=[new Set(),new Set()];for(let seed=0;seed<SPACE;seed++){const qs=makeReview(l.id,seed);assert.equal(qs.length,2);qs.forEach((q,i)=>{assert.ok(gradeAnswer(q,q.answer),q.id);keys[i].add(instanceFingerprint(q));for(const w of q.wrong||[])assert.ok(!gradeAnswer(q,w.value),q.id);walkStrings(q,s=>{for(const m of s.matchAll(/\$([^$]+)\$/g))katex.renderToString(m[1],{throwOnError:true,strict:'ignore',trust:false});});});}assert.ok(keys.every(k=>k.size>=8),l.id);}
});
test('C11 복습: 근 좌우 부호·경계 직접 대입 독립 검산',()=>{
 for(let seed=0;seed<SPACE;seed++){const [q,t]=makeReview('C11',seed),{h,k,u}=q.template.params,r=h+1+k,fn=x=>(x-h)*(x-r)**2,extrema=[h,r].filter(x=>fn(x-.001)*fn(x+.001)<0);assert.ok(gradeAnswer(q,extrema));const {m}=t.template.params;const {lo,hi}=t.answer;for(const a of [lo,hi,(lo+hi)/2]){const min=-a/3;assert.ok(3*min*min+2*a*min+3*m*m>=-1e-8);}for(const a of [lo-1,hi+1]){const min=-a/3;assert.ok(3*min*min+2*a*min+3*m*m<0);}}
});
test('P8 복습: 주사위·구별한 공 전수 나열 독립 검산',()=>{
 for(let seed=0;seed<SPACE;seed++){const [q,t]=makeReview('P8',seed),match=q.prompt.match(/합이 (\d+).*한 눈이 (\d+)/),total=Number(match[1]),face=Number(match[2]);let den=0,num=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(a+b===total){den++;if(a===face||b===face)num++;}assert.ok(gradeAnswer(q,num+'/'+den));const {u,v}=t.template.params;den=0;num=0;for(let a=0;a<u+v;a++)for(let b=0;b<u+v;b++)if(a!==b&&b<u){den++;if(a<u)num++;}assert.ok(gradeAnswer(t,num+'/'+den));}
});
test('고정 C11/P8 수치 과제 독립 계산·전수 나열 검산',()=>{
 const c=LESSON_MAP.C11,p=LESSON_MAP.P8;near(poly(derivative([1,-3,-9,2]),-1),0);near(poly([1,-3,-9,2],-1),7);near(poly([1,0,-12,5],-2),21);assert.ok(gradeAnswer(c.checks[0],7));assert.ok(gradeAnswer(c.checks[6],[3]));let den=0,num=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(a+b===8){den++;if(a===3||b===3)num++;}assert.ok(gradeAnswer(p.checks[0],num+'/'+den));assert.ok(gradeAnswer(p.checks[1],'2/9'));assert.ok(gradeAnswer(p.checks[2],'1/2'));assert.ok(gradeAnswer(p.checks[6],'5/12'));
});
const lesson=LESSON_MAP.C11;
const fill=(s,l,now)=>{const e=recordFor(s,l.id);for(const q of l.checks)submitAnswer(e,q,q.answer,now);return e;};
test('최초·힌트·교정 구분, 설명 길이를 증거로 삼지 않음',()=>{
 let s=emptyState(),e=fill(s,lesson,1);assert.ok(initialEvidence(e,lesson));assert.ok(allCorrect(e,lesson));s=emptyState();e=recordFor(s,lesson.id);for(const q of lesson.checks.filter(q=>q.role==='basic'))markHelp(e,q);for(const q of lesson.checks)submitAnswer(e,q,q.answer,1);assert.ok(!initialEvidence(e,lesson));e.note='아무리 길게 적어도'.repeat(100);assert.ok(!initialEvidence(e,lesson));
});
test('가상 날짜: 1→3→7일·서로 다른 변형과 날짜로 지연 확인',()=>{
 const s=emptyState(),t=new Date(2026,9,17,23,59).getTime();fill(s,lesson,t);assert.ok(finishLesson(s,lesson,t));const r=s.records.C11.review;assert.equal(localDay(r.due),localDay(t)+1);assert.equal(new Date(r.due).getHours(),0);
 for(const days of [3,7,21]){const now=r.due,ctx=beginReview(s,lesson,makeReview,now),oldKeys=[...r.seen];assert.equal(new Set(oldKeys).size,oldKeys.length);const result=finishReview(s,lesson,ctx.token,ctx.items,ctx.items.map(q=>q.answer),now);assert.ok(result.independent);assert.equal(localDay(r.due),localDay(now)+days);}
 assert.ok(r.delayed);assert.ok(localDay(s.lastSeen)-localDay(t)>=7);
});
test('실패·힌트·조기 연습은 독립 증거 제외, 3회 실패는 2일 뒤',()=>{
 const s=emptyState(),t=new Date(2026,9,1,12).getTime();fill(s,lesson,t);finishLesson(s,lesson,t);const r=s.records.C11.review;let ctx=beginReview(s,lesson,makeReview,t),result=finishReview(s,lesson,ctx.token,ctx.items,ctx.items.map(q=>q.answer),t);assert.ok(result.practice);assert.equal(r.stage,0);
 for(let i=0;i<3;i++){const now=r.due;ctx=beginReview(s,lesson,makeReview,now);reviewHelp(s,'C11');result=finishReview(s,lesson,ctx.token,ctx.items,ctx.items.map(q=>q.answer),now);assert.ok(!result.independent);assert.equal(r.stage,0);assert.equal(localDay(r.due),localDay(now)+(i===2?2:1));}
 assert.ok(!r.delayed);assert.equal(finishReview(s,lesson,ctx.token,ctx.items,ctx.items.map(q=>q.answer),r.due).accepted,false);
});
test('초기 증거 없이도 다음날 복습, 새 응답으로 재확인',()=>{
 const s=emptyState(),t=new Date(2026,9,1,12).getTime(),e=recordFor(s,'C11');for(const q of lesson.checks.filter(q=>q.role==='basic'))markHelp(e,q);for(const q of lesson.checks)submitAnswer(e,q,q.answer,t);finishLesson(s,lesson,t);assert.equal(e.initialAt,0);assert.ok(e.review.needsWork);const now=e.review.due,ctx=beginReview(s,lesson,makeReview,now);finishReview(s,lesson,ctx.token,ctx.items,ctx.items.map(q=>q.answer),now);assert.equal(e.initialAt,now);assert.equal(e.review.stage,1);
});
test('시계 역행 무시와 하루12문항 상한',()=>{
 const s=emptyState(),t=new Date(2026,9,1).getTime();assert.equal(effectiveNow(s,t),t);assert.equal(effectiveNow(s,t-DAY),t);const e=recordFor(s,'C11');e.review={due:t,history:Array.from({length:6},()=>({at:t,practice:false}))};assert.equal(dailyQueue(s,LESSONS,t).remainingPairs,0);assert.equal(dailyQueue(s,LESSONS,t).lessons.length,0);
});
test('저장 왕복·원문 중복 백업 방지·백업 실패 시 덮어쓰기 중지',()=>{
 const s=emptyState();fill(s,lesson,1);s.records.C11.note='<script>test</script>';const a=normalizeState(s,LESSONS),b=normalizeState(JSON.parse(JSON.stringify(a)),LESSONS);assert.deepEqual(b,a);
 const data=new Map([[STORE,'{bad']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};loadState(storage,LESSONS,123);loadState(storage,LESSONS,124);assert.equal([...data.keys()].filter(k=>k.includes('-backup-')).length,1);assert.equal(data.get(STORE+'-backup-123'),'{bad');
 const blocked=loadState({getItem:()=>'{bad',setItem:()=>{throw Error('quota');}},LESSONS);assert.ok(blocked.blocked);
 const incoming=emptyState();recordFor(incoming,'C11').note='가져온 다른 설명';const merged=mergeState(a,incoming,LESSONS);assert.equal(merged.records.C11.note,'<script>test</script>');assert.equal(merged.records.C11.importedNote,'가져온 다른 설명');
});
test('형식 오류를 오답으로 기록하지 않고 공간 집합·무한대 처리',()=>{const q={type:'set',answer:[3]};assert.ok(!gradeAnswer(q,'0 3'));assert.ok(gradeAnswer(q,' 3 '));assert.ok(!validAnswer(q,'x=3'));assert.ok(!validAnswer({type:'interval'},{lo:'abc',hi:3}));assert.ok(validAnswer({type:'interval'},{lo:'−∞',hi:'inf'}));const e=recordFor(emptyState(),'C11');assert.equal(submitAnswer(e,q,'x=3',1),null);assert.equal(Object.keys(e.attempts).length,0);});
test('시작 전 연습 날짜 경계와 40회 일정·소진 재사용',()=>{for(const l of LESSONS){const s=emptyState(),t=new Date(2026,9,1,12).getTime();fill(s,l,t);finishLesson(s,l,t);const r=s.records[l.id].review;const early=beginReview(s,l,makeReview,t);const fresh=beginReview(s,l,makeReview,r.due+1);assert.notEqual(early.token,fresh.token);for(let i=0;i<40;i++){const at=r.due,ctx=beginReview(s,l,makeReview,at);assert.ok(!ctx.exhausted,l.id);if(i%4===0)reviewHelp(s,l.id);finishReview(s,l,ctx.token,ctx.items,ctx.items.map(q=>q.answer),at);assert.ok(r.due>at,l.id);const practice=beginReview(s,l,makeReview,at);finishReview(s,l,practice.token,practice.items,practice.items.map(q=>q.answer),at);}assert.ok(r.history.filter(h=>h.reused).every(h=>!h.independent));}});
test('부호표와 판별식 해석이 표시됨',()=>{for(const [a,labels]of [[1,['극대','극소']],[0,['극값 없음']],[-1,['극값 없음']]]){const v=renderRep(lesson,{a});for(const label of labels)assert.ok(JSON.stringify(v.table).includes(label));}const b=renderRep(LESSON_MAP.B5,{b:4,c:4});assert.deepEqual(b.rows[0],['판별식 D',0]);assert.ok(JSON.stringify(b.rows).includes('접함'));});
test('모든65개 복습 템플릿 각각40쌍 이상과 실제 소진 재사용 검증',()=>{for(const [prefix,n]of Object.entries({A:18,C:20,P:17,B:10}))for(let i=1;i<=n;i++){const id=prefix+i,pairs=new Set();for(let seed=0;seed<SPACE;seed++)pairs.add(makeReview(id,seed).map(instanceFingerprint).join('|'));assert.ok(pairs.size>=40,id+':'+pairs.size);}const s=emptyState(),t=new Date(2026,9,1,12).getTime();fill(s,lesson,t);finishLesson(s,lesson,t);const fake=(_id,seed)=>[0,1].map(i=>({id:'tiny'+i,prompt:'tiny '+i+' '+seed%2,type:'numeric',answer:seed%2}));fake.space=2;let reused=0;for(let i=0;i<8;i++){const r=s.records.C11.review,at=r.due,ctx=beginReview(s,lesson,fake,at);assert.ok(!ctx.exhausted);const result=finishReview(s,lesson,ctx.token,ctx.items,ctx.items.map(q=>q.answer),at);if(ctx.reused){reused++;assert.ok(!result.independent);}assert.ok(r.due>at);}assert.ok(reused>0);assert.ok(!s.records.C11.review.delayed);});
test('확장 그림의 실제 수학 모델: 계수·밀도·상수변환·직선',()=>{
const model=(id,kind)=>({id,representation:{kind,task:'test',caption:'test',controls:[]}});
const coeff=renderRep(model('P5','binomial-theorem'),{n:5});assert.equal(coeff.table.reduce((sum,row)=>sum+row[1],0),32);assert.equal(coeff.table[2][1],10);
const density=renderRep(model('P12','density'),{a:.25,b:.5});assert.equal(density.rows[1][1],4);assert.equal(density.rows[2][1],.5);
const mass=renderRep(model('P10','moments'),{a:0,b:7});assert.equal(mass.table.length,1);assert.equal(mass.table[0][1],1);assert.equal(mass.rows[1][1],0);
const data=renderRep(model('B10','moments'),{a:-2,b:7});near(data.rows[0][1],3);near(data.rows[1][1],8/3);
const line=renderRep(model('B3','polynomial'),{a:2,b:3});assert.equal(line.table.find(r=>r[0]===2)[1],7);
});
test('전체 복습 TeX의 두자리 첨자와 새C12모형 독립 검산',()=>{for(const l of LESSONS)for(let seed=0;seed<SPACE;seed++){for(const q of makeReview(l.id,seed)){for(const text of [q.prompt,...(q.options||[])])for(const m of text.matchAll(/\$([^$]+)\$/g))assert.ok(!/[_^][+-]?\d{2,}/.test(m[1]),q.id+' '+m[1]);}const [a,b]=makeReview('C12',seed),{u,v}=b.template.params;assert.ok(gradeAnswer(b,poly([1,0,-3*u*u,v],-u)));assert.ok(gradeAnswer(a,{lo:'-inf',loIncl:false,hi:-u,hiIncl:false}));}});
test('빈 단계·적용 수치문항의 주요 오답과 목표 태그',()=>{for(const l of LESSONS)for(const q of [l.faded,...l.checks]){if(q.type!=='choice')assert.ok(q.wrong?.length,q.id);for(const tag of q.tags||[])if(tag)assert.ok(l.misconceptions.some(m=>m.id===tag),q.id+' '+tag);}});
if(release)test('최종65레슨·9영역 연결, 순환·없는 선수 연결 없음',()=>{
 assert.equal(LESSONS.length,65);const coverage=JSON.parse(fs.readFileSync(new URL('../docs/coverage.json',import.meta.url),'utf8'));for(const [id,codes]of Object.entries(coverage.lesson_codes))assert.deepEqual([...LESSON_MAP[id].standards].sort(),[...codes].sort(),id+' standards');assert.equal(coverage.verified_codes.length,54);assert.deepEqual([...new Set(LESSONS.flatMap(l=>l.standards))].sort(),coverage.verified_codes);for(const c of COURSES.filter(c=>c.id!=='bridge'))for(const [unit]of c.units)assert.ok(LESSONS.some(l=>l.course===c.id&&l.unit===unit));
 const visit=(id,stack=[])=>{assert.ok(LESSON_MAP[id],id);assert.ok(!stack.includes(id),'cycle '+stack.join(','));LESSON_MAP[id].prereqs.forEach(p=>visit(p,[...stack,id]));};LESSONS.forEach(l=>visit(l.id));
});
console.log('\n'+count+' verification groups passed · '+LESSONS.length+' lessons · '+SPACE+' finite review indices each');
