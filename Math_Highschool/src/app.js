import {GROUPS,LESSONS,LESSON_MAP,STARTER_PATH,GLOSSARY} from './content.js';
import {renderVisual,escapeHTML,fmt} from './visuals.js';
const E=escapeHTML;

const STORE='math-highschool-v1';
export const lessonComplete=entry=>!!entry&&entry.self===true&&typeof entry.note==='string'&&entry.note.trim().length>=12&&Array.isArray(entry.answers)&&entry.answers.length===3&&entry.answers.every((v,i)=>v===entry.expected?.[i]);
export function normalizeEntries(saved) {
  const result={};if(!saved||typeof saved!=='object'||Array.isArray(saved))return result;
  const legacy=Object.create(null);
  if(saved._legacy&&typeof saved._legacy==='object'&&!Array.isArray(saved._legacy))for(const key of Object.keys(saved._legacy))legacy[key]=saved._legacy[key];
  for(const key of Object.keys(saved))if(key!=='_legacy'&&!Object.hasOwn(LESSON_MAP,key))legacy[key]=saved[key];
  for(const lesson of LESSONS){const value=saved[lesson.id];if(!value)continue;if(typeof value!=='object'||Array.isArray(value)){legacy[lesson.id]=value;continue;}
    result[lesson.id]={note:typeof value.note==='string'?value.note.slice(0,2000):'',prediction:typeof value.prediction==='string'?value.prediction.slice(0,250):'',self:value.self===true,wrongAttempts:lesson.checks.map((_,i)=>Number.isInteger(value.wrongAttempts?.[i])?Math.max(0,Math.min(999,value.wrongAttempts[i])):0),attempts:lesson.checks.map((_,i)=>Number.isInteger(value.attempts?.[i])?Math.max(0,Math.min(999,value.attempts[i])):0),answers:lesson.checks.map((q,i)=>Number.isInteger(value.answers?.[i])&&value.answers[i]>=0&&value.answers[i]<q.options.length?value.answers[i]:null),expected:lesson.checks.map(q=>q.correct)};
  }if(Object.keys(legacy).length)result._legacy=legacy;return result;
}
export function loadSavedEntries(storage,now=Date.now()) {
  let raw;
  try{raw=storage.getItem(STORE);if(raw===null)return {entries:{},canSave:true};}catch{return {entries:{},canSave:false};}
  try{const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('이전 형식');return {entries:normalizeEntries(parsed),canSave:true};}
  catch{try{const backupKey=`${STORE}-backup-${now}`;storage.setItem(backupKey,raw);storage.setItem(STORE,'{}');return {entries:{},canSave:true,backupKey};}catch{return {entries:{},canSave:false,backupBlocked:true};}}
}
const ordered=()=>GROUPS.flatMap(g=>LESSONS.filter(l=>l.group===g.id));
const groupOf=l=>GROUPS.find(g=>g.id===l.group);
const icon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24 Q14 24 15 14 T27 7" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="15" cy="16" r="3" fill="currentColor"/><path d="M6 5v22h22" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/></svg>';

export class MathApp {
  constructor(root) {
    this.root=root;this.params={};this.seed=1;this.filter='all';this.query='';this.currentId=null;this.storageAvailable=true;
    try {const loaded=loadSavedEntries(localStorage);this.entries=loaded.entries;this.storageAvailable=loaded.canSave;this.backupBlocked=loaded.backupBlocked===true;}catch{this.entries={};this.storageAvailable=false;}
    this.shell();
    window.addEventListener('hashchange',()=>this.route());
    let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(this.currentId)this.updateVisual();},100)});
    this.route();
  }
  entry(id) {
    const lesson=LESSON_MAP[id];
    if(!this.entries[id]||typeof this.entries[id]!=='object'||Array.isArray(this.entries[id]))this.entries[id]={answers:[null,null,null],attempts:[0,0,0],note:'',self:false};
    const e=this.entries[id];e.expected=lesson.checks.map(c=>c.correct);
    if(!Array.isArray(e.answers))e.answers=[null,null,null];
    if(!Array.isArray(e.wrongAttempts))e.wrongAttempts=[0,0,0];
    if(!Array.isArray(e.attempts))e.attempts=[0,0,0];
    if(typeof e.note!=='string')e.note='';
    return e;
  }
  persist() {if(!this.backupBlocked)try{localStorage.setItem(STORE,JSON.stringify(this.entries));this.storageAvailable=true;}catch{this.storageAvailable=false;}this.updateProgress();}
  count() {return LESSONS.filter(l=>lessonComplete(this.entries[l.id])).length;}
  shell() {
    this.root.innerHTML=`<a class="skip-link" href="#main">본문으로 바로가기</a>
    <header class="topbar"><a class="brand" href="#home">${icon}<span>수학 개념 탐험실<small>MATH, ONE IDEA AT A TIME</small></span></a>
      <nav aria-label="주요 메뉴"><a href="#catalog">전체 개념</a><a href="#map">개념 지도</a><a href="#notes">배움 노트 <span data-note-count>0</span></a></nav>
      <button class="menu-button" id="menuButton" aria-expanded="false" aria-controls="sidebar">☰ <span>분야</span></button></header>
    <div class="app-grid"><aside id="sidebar" class="sidebar"><a class="side-home" href="#home">⌂ 탐험의 시작</a><a class="side-starter" href="#lesson=variable">처음부터 차근차근 <span>→</span></a>
      <div class="side-heading">수학의 15가지 풍경</div><nav aria-label="수학 분야">${GROUPS.map((g,i)=>`<a class="side-group" href="#group=${g.id}" data-group="${g.id}"><span class="group-index">${String(i+1).padStart(2,'0')}</span><span>${g.title}</span><small>${LESSONS.filter(l=>l.group===g.id).length}</small></a>`).join('')}</nav>
      <div class="side-progress"><span>내 설명과 확인을 마친 개념</span><strong><b data-count>0</b> / ${LESSONS.length}</strong><div class="progress-track"><i id="globalProgress"></i></div><small>속도보다 이해, 한 번에 한 개념씩.</small></div><a class="side-glossary" href="#glossary">Aa · 수학의 말 사전</a></aside>
      <main id="main" tabindex="-1"></main></div><footer class="site-footer"><span>수학을 이해하는 자신만의 속도로.</span><span>2022 개정 핵심 개념 · <span id="buildLabel"></span></span></footer><div class="sr-only" id="announce" role="status" aria-live="polite"></div>`;
    document.getElementById('menuButton').onclick=()=>{const open=document.body.classList.toggle('sidebar-open');document.getElementById('menuButton').setAttribute('aria-expanded',String(open));};
    this.root.querySelector('.skip-link').onclick=e=>{e.preventDefault();document.getElementById('main').focus({preventScroll:false});};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('sidebar-open')){document.body.classList.remove('sidebar-open');document.getElementById('menuButton').setAttribute('aria-expanded','false');document.getElementById('menuButton').focus();}});
    document.getElementById('sidebar').addEventListener('click',e=>{if(e.target.closest('a')){document.body.classList.remove('sidebar-open');document.getElementById('menuButton').setAttribute('aria-expanded','false');}});
    document.getElementById('buildLabel').textContent=typeof window.MATH_BUILD==='string'?`v1 · ${window.MATH_BUILD}`:'미리보기';
    this.updateProgress();
  }
  updateProgress() {
    const count=this.count();document.querySelectorAll('[data-count]').forEach(e=>e.textContent=count);
    document.querySelectorAll('[data-note-count]').forEach(e=>e.textContent=LESSONS.filter(l=>this.entries[l.id]?.note?.trim()).length);
    const bar=document.getElementById('globalProgress');if(bar)bar.style.width=`${100*count/LESSONS.length}%`;
    const status=document.getElementById('lessonStatus');
    if(status&&this.currentId){const e=this.entry(this.currentId),correct=e.answers.filter((v,i)=>v===e.expected[i]).length;status.textContent=lessonComplete(e)?'✓ 확인 완료 · 자기점검 포함':`확인 질문 ${correct}/3 · 내 설명 ${e.note.trim().length>=12?'작성됨':'작성 전'}`;status.classList.toggle('done',lessonComplete(e));}
    const save=document.getElementById('saveStatus');if(save)save.textContent=this.storageAvailable?'이 브라우저에 자동 저장돼요. 기록을 보관하려면 배움 노트를 내려받으세요.':'현재 브라우저에 저장할 수 없어요. 배움 노트에서 기록을 내려받아 보관하세요.';
  }
  route() {
    const raw=location.hash.slice(1)||'home',params=new URLSearchParams(raw),id=params.get('lesson'),group=params.get('group');
    this.currentId=null;
    document.querySelectorAll('.side-group').forEach(a=>a.classList.remove('active'));
    if(id&&LESSON_MAP[id]){this.lesson(id);document.querySelector(`[data-group="${LESSON_MAP[id].group}"]`)?.classList.add('active');}
    else if(group&&GROUPS.some(g=>g.id===group)){this.filter=group;this.catalog();document.querySelector(`[data-group="${group}"]`)?.classList.add('active');}
    else if(raw==='catalog'){this.filter='all';this.catalog();}
    else if(raw==='map')this.map();
    else if(raw==='notes')this.notes();
    else if(raw==='glossary')this.glossary();
    else this.home();
    document.body.classList.remove('sidebar-open');document.getElementById('menuButton').setAttribute('aria-expanded','false');
    this.updateProgress();window.scrollTo({top:0,behavior:'auto'});
    const main=document.getElementById('main');main.focus({preventScroll:true});
    document.title=(this.currentId?`${LESSON_MAP[this.currentId].title} · `:'')+'수학 개념 탐험실';
  }
  home() {
    const main=document.getElementById('main');
    main.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">공식 앞에, 이해가 먼저</span><h1>수학이 조금씩<br><em>말이 되기 시작하는 곳.</em></h1><p>왜 이런 식을 쓸까? 그래프는 무슨 말을 할까?<br>직접 움직이고, 설명하고, 연결하며 알아가요.</p><div class="hero-actions"><a class="button primary" href="#lesson=variable">차근차근 시작하기 <span>→</span></a><a class="text-link" href="#catalog">궁금한 개념 찾아보기 ↗</a></div><div class="hero-meta"><span>${LESSONS.length}개의 개념 탐험</span><i></i><span>설치 없이, 휴대폰에서도</span></div></div>
      <div class="hero-art" aria-hidden="true"><svg viewBox="0 0 400 320"><defs><pattern id="heroGrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#dfe6df" stroke-width=".8"/></pattern></defs><rect x="20" y="20" width="360" height="270" rx="20" fill="#eef2e9"/><rect x="40" y="40" width="320" height="220" fill="url(#heroGrid)"/><path d="M50 240H350M80 270V50" stroke="#a5b3a5" fill="none"/><path d="M80 240 Q180 240 310 60" fill="none" stroke="#1e7a6f" stroke-width="4"/><path d="M150 242L320 72" stroke="#c77849" stroke-width="2.5" stroke-dasharray="7 5"/><circle cx="226" cy="167" r="7" fill="#c77849" stroke="white" stroke-width="3"/><rect x="236" y="184" width="115" height="40" rx="10" fill="white"/><text x="249" y="209" fill="#426b5c" font-size="15">변화를 읽는 눈</text><text x="105" y="83" fill="#617764" font-size="24" font-style="italic">f(x)</text></svg><div class="art-note">점을 움직이면, 생각도 움직여요.</div></div></section>
      <section class="how-row"><div><span>01</span><b>먼저 예상하고</b><p>지금 무엇이 궁금한가요?</p></div><div><span>02</span><b>직접 바꿔 보고</b><p>그림과 숫자를 연결해요.</p></div><div><span>03</span><b>내 말로 설명해요</b><p>조건과 반례도 확인해요.</p></div></section>
      <section class="starter-banner"><div><span class="eyebrow">길을 몰라도 괜찮아요</span><h2>함수에서 미분·적분까지, 하나의 이야기로.</h2><p>입력과 결과 → 그래프의 기울기 → 순간의 변화 → 전체의 누적</p></div><a class="button outline" href="#lesson=function">추천 경로 보기 →</a></section>
      <div class="section-heading"><div><span class="eyebrow">EXPLORE THE IDEAS</span><h2>어떤 수학이 궁금한가요?</h2></div><a href="#map" class="text-link">개념 사이의 연결 보기 ↗</a></div>
      <section class="group-grid">${GROUPS.map((g,i)=>`<a class="group-card" href="#group=${g.id}"><div class="card-top"><span>${String(i+1).padStart(2,'0')}</span><small>${g.course}</small></div><h3>${g.title}</h3><p>${g.subtitle}</p><div class="card-bottom">${LESSONS.filter(l=>l.group===g.id).length}개 탐험 <span>↗</span></div></a>`).join('')}</section>
      <section class="learning-note"><h3>수식이 익숙하지 않아도 괜찮아요.</h3><p>정의와 기호는 실험 뒤에 천천히 만납니다. 막히는 말은 사전과 미리 알면 좋은 개념으로 연결해요. 학습 완료는 질문 확인과 내 설명을 함께 기록하며, 이해를 자동으로 보증하는 점수는 아닙니다.</p></section>`;
  }
  lessonCard(l) {const done=lessonComplete(this.entries[l.id]);return `<a class="lesson-card ${done?'finished':''}" href="#lesson=${l.id}"><span class="lesson-card-status">${done?'✓ 확인 완료':'○ 탐험할 개념'}</span><h3>${E(l.title)}</h3><p>${E(l.question)}</p><span class="lesson-card-link">생각해 보기 →</span></a>`;}
  catalog() {
    const main=document.getElementById('main'),selected=GROUPS.find(g=>g.id===this.filter);
    main.innerHTML=`<header class="page-heading"><span class="eyebrow">FIND YOUR NEXT QUESTION</span><h1>${selected?selected.title:'궁금한 개념을 찾아요.'}</h1><p>${selected?selected.subtitle:'배우는 과목이나 궁금한 말로 찾아보세요. 모르는 개념으로 돌아가도 괜찮아요.'}</p></header>
    <div class="search-row"><label class="search-box"><span aria-hidden="true">⌕</span><input type="search" id="conceptSearch" placeholder="예: 기울기, 로그, 확률, 미적분" aria-label="개념 검색" value="${E(this.query)}"></label><label class="filter-label">분야<select id="groupFilter"> <option value="all">모든 분야</option>${GROUPS.map(g=>`<option value="${g.id}" ${this.filter===g.id?'selected':''}>${g.title}</option>`).join('')}</select></label></div><p id="searchCount" class="muted" role="status"></p><section id="lessonGrid" class="lesson-grid"></section>`;
    document.getElementById('conceptSearch').oninput=e=>{this.query=e.target.value;this.filterCards();};
    document.getElementById('groupFilter').onchange=e=>{this.filter=e.target.value;this.filterCards();};
    this.filterCards();
  }
  filterCards() {
    const q=this.query.trim().toLowerCase(),items=ordered().filter(l=>(this.filter==='all'||l.group===this.filter)&&[l.title,l.definition,l.rule,groupOf(l).course].join(' ').toLowerCase().includes(q));
    document.getElementById('lessonGrid').innerHTML=items.length?items.map(l=>this.lessonCard(l)).join(''):'<div class="empty-card">찾는 말이 아직 보이지 않아요. 더 짧은 말로 검색하거나 다른 분야를 선택해 보세요.</div>';
    document.getElementById('searchCount').textContent=`${items.length}개의 개념`;
  }
  lesson(id) {
    this.currentId=id;const l=LESSON_MAP[id],group=groupOf(l),entry=this.entry(id);
    if(!this.params[id])this.params[id]=Object.fromEntries(l.controls.map(c=>[c.key,c.value]));
    const sequence=STARTER_PATH.includes(id)?STARTER_PATH:ordered().filter(x=>x.group===l.group).map(x=>x.id),index=sequence.indexOf(id),next=sequence[index+1],previous=sequence[index-1];
    document.getElementById('main').innerHTML=`<div class="breadcrumbs"><a href="#home">시작</a><span>/</span><a href="#group=${l.group}">${group.title}</a><span>/</span><span>${group.course}</span></div>
      <header class="lesson-heading"><div class="lesson-tags"><span class="pill">${group.title}</span><span>${STARTER_PATH.includes(id)?`추천 경로 ${index+1} / ${STARTER_PATH.length}`:'분야별 개념 탐험'}</span><button id="copyLesson" class="small-link">이 개념 주소 복사</button></div><h1>${E(l.title)}</h1><p class="big-question">${E(l.question)}</p></header>
      ${l.prereqs.length?`<div class="prerequisites"><span>미리 알면 좋아요</span>${l.prereqs.map(id=>`<a href="#lesson=${id}">${E(LESSON_MAP[id].title)} ↗</a>`).join('')}</div>`:''}
      <div class="lesson-workspace"><section class="panel experiment"><div class="panel-heading"><span class="step-marker">01</span><div><h2>먼저 예상하고, 직접 바꿔 봐요.</h2><p>무엇이 달라질지 생각한 뒤 그림과 숫자를 비교하세요.</p></div></div>
        <label class="prediction-label" for="prediction">내 예상 한 줄 <span>정답을 보기 전, 짧게 남겨도 좋아요.</span></label><input id="prediction" class="prediction-input" maxlength="250" placeholder="이 값을 바꾸면…" value="${E(entry.prediction||'')}">
        <figure id="visualFigure"><div id="visualCanvas" class="visual-canvas"></div><figcaption id="visualLegend"></figcaption></figure>
        <div class="controls">${l.controls.map(c=>c.options?`<label for="control_${c.key}" class="control"><span>${E(c.label)}</span><select id="control_${c.key}" data-control="${c.key}">${c.options.map(([v,label])=>`<option value="${v}" ${this.params[id][c.key]===v?'selected':''}>${E(label)}</option>`).join('')}</select></label>`:`<label for="control_${c.key}" class="control"><span>${E(c.label)}<output id="value_${c.key}">${fmt(this.params[id][c.key])} ${E(c.unit)}</output></span><input type="range" id="control_${c.key}" data-control="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${this.params[id][c.key]}"></label>`).join('')}</div>
        <div class="experiment-actions"><button id="resetExperiment" class="button quiet">↺ 처음 설정</button>${['probability','sample'].includes(l.kind)?'<button id="repeatExperiment" class="button outline">↻ 새 표본으로 다시 실험</button>':''}<button id="exportExperiment" class="small-link">실험 표 내려받기 ↓</button></div>
        <details class="table-details"><summary>그림과 숫자 표를 함께 보기</summary><div id="dataTable" class="table-scroll"></div></details>
        <details class="rule-details"><summary>그림에 사용한 수학 규칙</summary><p id="visualCaption"></p></details></section>
        <aside class="panel observation"><div class="panel-heading"><span class="step-marker warm">02</span><h2>숫자에서 뜻을 읽어요.</h2></div><dl id="readings" class="readings"></dl><div class="insight"><span>왜 이런 모습일까요?</span><p>${E(l.because)}</p></div><div class="condition-note"><b>이 조건도 함께 확인해요.</b><p>${E(l.condition)}</p></div></aside></div>
      <details class="panel formal"><summary><span class="step-marker">03</span> 수학의 말과 식으로 정리해요.</summary><div class="formal-content"><p class="definition">${E(l.definition)}</p><div class="formula">${E(l.rule)}</div><p><b>성립 조건</b> · ${E(l.condition)}</p><div class="misconception"><span>이런 생각은 다시 확인해요</span><p>“${E(l.wrong)}”</p><p class="muted">위 정의와 조건을 이용해 왜 틀렸는지 설명해 보세요.</p></div></div></details>
      <section class="panel understanding"><div class="panel-heading"><span class="step-marker">04</span><div><h2>새로운 상황에서도 알아볼까요?</h2><p>설명 찾기 · 예측하기 · 구별하고 적용하기</p></div></div><div class="question-grid">${l.checks.map((c,qi)=>`<fieldset class="check-card"><legend><span>${qi+1}</span>${E(c.prompt)}</legend>${c.options.map((o,oi)=>`<button class="answer-option ${entry.answers[qi]===oi?'selected':''}" data-question="${qi}" data-option="${oi}" aria-pressed="${entry.answers[qi]===oi}"><span>${String.fromCharCode(65+oi)}</span>${E(o)}</button>`).join('')}<p class="feedback" id="feedback_${qi}" role="status"></p></fieldset>`).join('')}</div></section>
      <section class="panel explain-panel"><div class="panel-heading"><span class="step-marker warm">05</span><div><h2>이제, 내 말로 설명해요.</h2><p>${E(l.explain)}</p></div></div><label class="sr-only" for="myExplanation">나의 개념 설명</label><textarea id="myExplanation" maxlength="2000" rows="4" placeholder="처음 보는 친구에게 설명한다면…">${E(entry.note)}</textarea><details class="self-rubric"><summary>내 설명을 점검할 기준</summary><ul><li>무엇을 뜻하는지 말했나요? ${E(l.definition)}</li><li>왜 그런지 이유나 예를 들었나요? ${E(l.because)}</li><li>항상 성립하는지 조건을 확인했나요? ${E(l.condition)}</li></ul></details><label class="self-check"><input id="selfCheck" type="checkbox" ${entry.self?'checked':''}><span>내 설명에 뜻·이유 또는 예·성립 조건이 담겼는지 스스로 확인했어요.</span></label><div id="lessonStatus" class="lesson-status"></div><p class="muted small">질문 3개를 모두 확인하고, 12자 이상의 설명과 자기점검을 남기면 확인 완료로 기록합니다. 설명의 정답을 자동 채점하지 않습니다.</p><p id="saveStatus" class="muted small"></p></section>
      <nav class="lesson-navigation" aria-label="다음 학습"><a class="button quiet" href="${previous?'#lesson='+previous:'#group='+l.group}">← ${previous?'이전 개념':'분야로 돌아가기'}</a><a class="button primary" href="${next?'#lesson='+next:'#map'}">${next?'다음: '+E(LESSON_MAP[next].title):'다른 개념과 연결하기'} →</a></nav>`;
    document.querySelectorAll('[data-control]').forEach(input=>input.addEventListener('input',e=>{
      const key=e.target.dataset.control,value=Number(e.target.value);this.params[id][key]=value;
      const control=l.controls.find(c=>c.key===key);const output=document.getElementById(`value_${key}`);if(output)output.textContent=`${fmt(value)} ${control.unit}`;this.updateVisual();
    }));
    document.getElementById('prediction').oninput=e=>{entry.prediction=e.target.value;this.persist();};
    document.getElementById('myExplanation').oninput=e=>{entry.note=e.target.value;this.persist();};
    document.getElementById('selfCheck').onchange=e=>{entry.self=e.target.checked;this.persist();};
    document.querySelectorAll('[data-question]').forEach(button=>button.onclick=()=>{const qi=Number(button.dataset.question),oi=Number(button.dataset.option);entry.answers[qi]=oi;entry.attempts[qi]=Math.min(999,(entry.attempts[qi]||0)+1);if(oi!==l.checks[qi].correct)entry.wrongAttempts[qi]=Math.min(999,(entry.wrongAttempts[qi]||0)+1);this.feedback(qi);this.persist();});
    document.getElementById('resetExperiment').onclick=()=>{this.params[id]=Object.fromEntries(l.controls.map(c=>[c.key,c.value]));this.lesson(id);};
    document.getElementById('repeatExperiment')?.addEventListener('click',()=>{this.seed++;this.updateVisual();});
    document.getElementById('copyLesson').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);document.getElementById('announce').textContent='개념 주소를 복사했어요.';}catch{document.getElementById('announce').textContent='주소창의 주소를 직접 복사해 주세요.';}};
    document.getElementById('exportExperiment').onclick=()=>this.exportExperiment();
    l.checks.forEach((_,i)=>this.feedback(i));this.updateVisual();this.updateProgress();
  }
  feedback(index) {
    const lesson=LESSON_MAP[this.currentId],e=this.entry(lesson.id),c=lesson.checks[index],choice=e.answers[index],target=document.getElementById(`feedback_${index}`);
    const attempted=Number.isInteger(choice)&&choice>=0&&choice<c.options.length;
    target.textContent=attempted?(choice===c.correct?`맞아요. ${c.reason}`:(e.wrongAttempts[index]||0)>=2?`다시 확인해요. ${c.reason}`:'다시 생각해 볼까요? 정의와 성립 조건을 펼쳐 보고, 실험의 숫자나 다른 예를 확인한 뒤 한 번 더 골라 보세요.') :'';target.className=`feedback ${attempted?(choice===c.correct?'correct':'retry'):''}`;
    document.querySelectorAll(`[data-question="${index}"]`).forEach(button=>{const active=Number(button.dataset.option)===choice;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
  }
  updateVisual() {
    if(!this.currentId)return;const container=document.getElementById('visualCanvas');if(!container)return;
    const visual=renderVisual(LESSON_MAP[this.currentId],this.params[this.currentId],container.getBoundingClientRect().width||600,this.seed);this.visual=visual;
    container.innerHTML=visual.svg;const svg=container.querySelector('svg');svg?.setAttribute('aria-label',visual.description);
    const lesson=LESSON_MAP[this.currentId],xControl=lesson.controls.find(c=>c.key==='x');
    if(visual.probe&&xControl&&svg){svg.dataset.interactive='true';svg.onclick=event=>{const rect=svg.getBoundingClientRect(),inside=(event.clientX-rect.left)/rect.width*visual.probe.width,left=visual.probe.left,right=visual.probe.right;if(inside<left||inside>visual.probe.width-right)return;const raw=visual.probe.x0+(inside-left)/(visual.probe.width-left-right)*(visual.probe.x1-visual.probe.x0),value=Math.max(xControl.min,Math.min(xControl.max,xControl.min+Math.round((raw-xControl.min)/xControl.step)*xControl.step));this.params[this.currentId].x=Number(value.toFixed(8));document.getElementById('control_x').value=value;document.getElementById('value_x').textContent=`${fmt(value)} ${xControl.unit}`;this.updateVisual();};}
    document.getElementById('visualLegend').textContent=visual.legend;
    document.getElementById('visualCaption').textContent=visual.caption;
    document.getElementById('readings').innerHTML=visual.rows.map(([key,value])=>`<div><dt>${E(key)}</dt><dd>${E(fmt(value))}</dd></div>`).join('');
    document.getElementById('dataTable').innerHTML=`<table><caption class="sr-only">${E(LESSON_MAP[this.currentId].title)}의 실험 값 (소수는 반올림)</caption><thead><tr>${visual.headers.map(h=>`<th scope="col">${E(h)}</th>`).join('')}</tr></thead><tbody>${visual.table.map(row=>`<tr class="${visual.tableHighlight!==undefined&&Number(String(row[0]).replaceAll(',',''))===visual.tableHighlight?'active-reading':''}">${row.map(value=>`<td>${E(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  download(name,data,type) {const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  exportExperiment() {const quote=v=>'"'+String(v).replaceAll('"','""')+'"',rows=[this.visual.headers,...this.visual.table],csv=rows.map(row=>row.map(quote).join(',')).join('\r\n');this.download(`${this.currentId}_experiment.csv`,'\ufeff'+csv,'text/csv;charset=utf-8');}
  map() {
    const paths=[['관계에서 변화로',['variable','function','line','secant','limit','derivative','fundamental']],['가능성에서 추정으로',['set','counting','combination','probability','conditional','binomial','sample','confidence']],['위치에서 공간으로',['distance','line','circle','unitcircle','vector','dot','space']],['반복과 무한의 연결',['exponential','log','geometric','seqlimit','series','rectangles']]];
    document.getElementById('main').innerHTML=`<header class="page-heading"><span class="eyebrow">CONNECT THE IDEAS</span><h1>따로 배운 수학이,<br>서로 이어지기 시작해요.</h1><p>화살표는 이해를 이어 가는 추천 연결입니다. 반드시 이 순서로만 배워야 한다는 뜻은 아니에요.</p></header><section class="map-list">${paths.map(([name,ids])=>`<article class="panel map-row"><h2>${name}</h2><div class="map-nodes">${ids.map((id,i)=>`${i?'<span class="map-arrow" aria-hidden="true">→</span>':''}<a href="#lesson=${id}" class="map-node">${E(LESSON_MAP[id].title)}</a>`).join('')}</div></article>`).join('')}</section><section class="learning-note"><h3>연결의 중심 질문</h3><p>함수는 ‘무엇과 무엇이 연결되는가’, 미분은 ‘어떻게 변하는가’, 적분은 ‘변화를 얼마나 모았는가’를 묻습니다. 확률은 가능성을, 통계는 자료에서 판단하는 방법을 더해 줍니다.</p></section>`;
  }
  notes() {
    const notes=ordered().filter(l=>this.entries[l.id]?.note?.trim());
    document.getElementById('main').innerHTML=`<header class="page-heading"><span class="eyebrow">YOUR OWN WORDS</span><h1>수학을 내 말로<br>설명한 순간들.</h1><p>학습 기록은 이 브라우저에 저장됩니다. 다른 기기에서는 자동으로 이어지지 않으니 필요한 기록은 내려받아 보관하세요.</p></header><div class="notes-summary"><span>설명 ${notes.length}개 · 확인 완료 ${this.count()}개</span><button class="button outline" id="downloadNotes">배움 노트 내려받기 ↓</button></div><section class="notes-grid">${notes.length?notes.map(l=>`<article class="panel note-card"><span class="pill">${groupOf(l).title}</span><h2><a href="#lesson=${l.id}">${E(l.title)} ↗</a></h2><p class="note-text">${E(this.entries[l.id].note)}</p><small>${lessonComplete(this.entries[l.id])?'✓ 질문과 자기점검 완료':'설명을 남겼어요 · 확인 질문도 이어서 해보세요.'}</small></article>`).join(''):'<div class="empty-card"><h2>아직 비어 있는 탐험 노트예요.</h2><p>개념 화면의 ‘내 말로 설명해요’에 생각을 남겨 보세요.</p><a class="button primary" href="#lesson=function">함수부터 설명해 보기 →</a></div>'}</section>`;
    document.getElementById('downloadNotes').onclick=()=>this.download('나의_수학_개념_노트.json',JSON.stringify({format:1,build:window.MATH_BUILD||'preview',savedAt:new Date().toISOString(),lessons:notes.map(l=>({id:l.id,title:l.title,prediction:this.entries[l.id].prediction||'',explanation:this.entries[l.id].note,correctChecks:this.entries[l.id].answers.filter((v,i)=>v===l.checks[i].correct).length,selfChecked:this.entries[l.id].self===true,confirmed:lessonComplete(this.entries[l.id])}))},null,2),'application/json');
  }
  glossary() {
    document.getElementById('main').innerHTML=`<header class="page-heading"><span class="eyebrow">A SMALL MATH DICTIONARY</span><h1>낯선 말이 나와도,<br>여기서 다시 만나요.</h1><p>쉬운 말로 뜻을 확인하고, 해당 개념의 실험으로 이어 가세요.</p></header><label class="search-box"><span aria-hidden="true">⌕</span><input type="search" id="glossarySearch" aria-label="수학 용어 검색" placeholder="뜻을 알고 싶은 말"></label><div id="glossaryList" class="glossary-list"></div>`;
    const all=[...GLOSSARY,...LESSONS.map(l=>[l.title,l.definition,l.id])];
    const update=q=>{document.getElementById('glossaryList').innerHTML=all.filter(([term,definition])=>(term+' '+definition).includes(q)).map(([term,definition,id])=>`<article><h2>${E(term)}</h2><p>${E(definition)}</p><a href="#lesson=${id}">실험으로 이해하기 →</a></article>`).join('')||'<p>찾는 말이 없어요. 짧은 단어로 다시 찾아보세요.</p>';};
    document.getElementById('glossarySearch').oninput=e=>update(e.target.value.trim());update('');
  }
}

if(typeof document!=='undefined')window.addEventListener('DOMContentLoaded',()=>{window.mathApp=new MathApp(document.getElementById('app'));});
