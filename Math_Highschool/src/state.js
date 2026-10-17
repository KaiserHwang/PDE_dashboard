import {gradeAnswer,validAnswer} from './math.js';
export const STORE='suneung-concepts-v2';
export const DAY=86400000;
export const INTERVALS=[1,3,7,21];
export const localDay=at=>{const d=new Date(at);return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY);};
export const daysLater=(at,n)=>{const d=new Date(at);d.setDate(d.getDate()+n);d.setHours(0,0,0,0);return d.getTime();};
export const emptyState=()=>({version:2,records:{},diagnostic:{},lastSeen:0,archive:{}});
export const fingerprint=q=>{let h=2166136261;for(const c of JSON.stringify([q.prompt,q.options,q.answer,q.type]))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(36);};
export function effectiveNow(state,now=Date.now()){state.lastSeen=Math.max(Number.isFinite(state.lastSeen)?state.lastSeen:0,Number.isFinite(now)?now:0);return state.lastSeen;}
export const instanceFingerprint=q=>fingerprint({...q,options:q.type==='choice'?[...q.options].sort():q.options,answer:q.type==='choice'?q.options[q.answer]:q.answer});
export function recordFor(state,id){return state.records[id]??=( {prediction:'',note:'',claims:[],attempts:{},step:0,viewedAt:0,finishedAt:0,initialAt:0,review:null} );}
export function attemptFor(record,q){const signature=fingerprint(q),old=record.attempts[q.id];if(old&&old.signature===signature)return old;if(old)(record.previousItems??=[]).push({id:q.id,...old});return record.attempts[q.id]={signature,helpUsed:false,first:null,latest:null,history:[]};}
export function markHelp(record,q){attemptFor(record,q).helpUsed=true;}
export function submitAnswer(record,q,answer,now=Date.now(),confidence='normal'){
  if(!validAnswer(q,answer))return null;
  const a=attemptFor(record,q),attempt={answer,correct:gradeAnswer(q,answer),at:now,helped:a.helpUsed||a.first!==null||q.role==='faded',confidence:['high','normal','unsure'].includes(confidence)?confidence:'normal'};
  if(!a.first){a.first={...attempt};if(!attempt.correct&&!attempt.helped&&q.role!=='entry'){
    const match=q.type==='choice'?q.tags?.[answer]:q.wrong?.find(w=>gradeAnswer({...q,answer:w.value},answer))?.tag;
    if(match){const signals=record.signals??={},sig=signals[match]??={items:[]};if(!sig.items.includes(q.id))sig.items.push(q.id);sig.count=sig.items.length;}
    if(confidence==='high')record.highWrong=true;
  }}a.latest=attempt;a.history.push(attempt);if(a.history.length>20)a.history=a.history.slice(-20);return attempt;
}
export function currentAttempts(record,lesson){return lesson.checks.map(q=>{const a=record?.attempts?.[q.id];return a?.signature===fingerprint(q)?a:null;});}
export function initialEvidence(record,lesson){if(!allCorrect(record,lesson))return false;const roles=['basic','transfer'];return roles.every(role=>lesson.checks.some((q,i)=>q.role===role&&currentAttempts(record,lesson)[i]?.first?.correct&&!currentAttempts(record,lesson)[i]?.first?.helped));}
export function allCorrect(record,lesson){return lesson.checks.every((q,i)=>currentAttempts(record,lesson)[i]?.latest?.correct);}
export function finishLesson(state,lesson,now=Date.now()){
  const at=effectiveNow(state,now),e=recordFor(state,lesson.id);if(!allCorrect(e,lesson))return false;
  if(!e.finishedAt)e.finishedAt=at;if(initialEvidence(e,lesson)&&!e.initialAt)e.initialAt=at;
  if(!e.review)e.review={stage:0,due:daysLater(at,1),cycleStart:at,round:0,pending:null,history:[],seen:[],delayed:false,needsWork:!e.initialAt,consecutiveFail:0};return true;
}
export function evidenceLabel(record,lesson){if(record?.review?.needsWork)return '다시 볼 부분';if(record?.review?.delayed)return '지연 확인';if(initialEvidence(record,lesson)||record?.initialAt)return '초기 독립 증거';if(record?.finishedAt)return '교정 확인';if(record?.viewedAt||Object.keys(record?.attempts??{}).length)return '학습 중';return '미시작';}
export function beginReview(state,lesson,makeItems,now=Date.now()){
  const at=effectiveNow(state,now),e=recordFor(state,lesson.id),r=e.review;if(!r)return null;
  r.seen??=[];r.practiceSeen??=[];
  if(r.pending&&r.pending.createdAt<r.due&&at>=r.due){r.history.push({at,practice:true,abandoned:true,independent:false,keys:r.pending.keys});r.seen=[...new Set([...r.seen,...r.pending.keys])];r.pending=null;r.round++;}
  if(!r.pending){
    const isDue=at>=r.due,seen=isDue?r.seen:r.practiceSeen;
    const base=(Math.floor(at/1000)+r.round*7919+lesson.id.split('').reduce((s,c)=>s+c.charCodeAt(0),0)*97)>>>0;
    let selected=null,fallback=null,best=Infinity;
    for(let offset=0;offset<(makeItems.space??144);offset++){
      const seed=(base+offset)>>>0,items=makeItems(lesson.id,seed,r.stage),keys=items.map(instanceFingerprint);
      if(new Set(keys).size!==2)continue;
      const age=Math.max(...keys.map(key=>seen.lastIndexOf(key)));
      if(age<best){best=age;fallback={seed,keys,reused:isDue};}
      if(keys.every(key=>!seen.includes(key))){selected={seed,keys,reused:false};break;}
    }
    selected??=fallback;if(!selected)return {exhausted:true};
    r.pending={token:lesson.id+'-'+selected.seed+'-'+r.round,seed:selected.seed,stage:r.stage,createdAt:at,helpUsed:false,keys:selected.keys,reused:selected.reused};
    if(isDue)r.seen=[...r.seen.filter(key=>!selected.keys.includes(key)),...selected.keys];else r.practiceSeen=[...r.practiceSeen.filter(key=>!selected.keys.includes(key)),...selected.keys];
  }
  return {...r.pending,items:makeItems(lesson.id,r.pending.seed,r.pending.stage),due:r.due,isDue:at>=r.due&&r.pending.createdAt>=r.due};
}
export function reviewHelp(state,id){const p=state.records[id]?.review?.pending;if(p)p.helpUsed=true;}
export function finishReview(state,lesson,token,items,answers,now=Date.now()){
  const at=effectiveNow(state,now),e=recordFor(state,lesson.id),r=e.review,p=r?.pending;
  if(!p||p.token!==token)return {accepted:false,reason:'이 복습은 이미 기록되었어요.'};
  if(items.length!==2||answers.length!==2||answers.some((a,i)=>!validAnswer(items[i],a)))return {accepted:false,reason:'두 문항에 모두 답해 주세요.'};
  const correct=items.map((q,i)=>gradeAnswer(q,answers[i])),isDue=at>=r.due&&p.createdAt>=r.due,success=correct.every(Boolean)&&!p.helpUsed,independent=success&&isDue&&!p.reused;
  const result={token,at,seed:p.seed,stage:p.stage,answers,correct,helped:p.helpUsed,practice:!isDue,independent,reused:!!p.reused,keys:p.keys,templates:items.map(q=>q.template)};
  r.history.push(result);if(r.history.length>80)r.history=r.history.slice(-80);r.round++;r.pending=null;
  if(!isDue)return {accepted:true,practice:true,independent:false,correct};
  if(success){if(independent&&!e.initialAt)e.initialAt=at;r.needsWork=false;r.consecutiveFail=0;e.highWrong=false;r.stage=Math.min(3,r.stage+1);if(independent&&p.stage>=2&&localDay(at)-localDay(r.cycleStart)>=7&&localDay(at)-localDay(e.initialAt)>=7&&new Set(r.history.filter(h=>h.independent&&h.at>=r.cycleStart).map(h=>localDay(h.at))).size>=2)r.delayed=true;r.due=daysLater(at,INTERVALS[r.stage]);}
  else{r.stage=0;r.consecutiveFail=(r.consecutiveFail||0)+1;r.due=daysLater(at,r.consecutiveFail>=3?2:1);r.cycleStart=at;r.delayed=false;r.needsWork=true;}
  return {accepted:true,practice:false,independent,reused:!!p.reused,correct};
}
export function dueLessons(state,lessons,now=Date.now()){const at=Math.max(state.lastSeen||0,now);return lessons.filter(l=>state.records[l.id]?.review?.due<=at).sort((a,b)=>{const x=state.records[a.id].review,y=state.records[b.id].review;return Number(!!y.needsWork)-Number(!!x.needsWork)||Number(!!state.records[b.id].highWrong)-Number(!!state.records[a.id].highWrong)||x.due-y.due;});}
export function dailyQueue(state,lessons,now=Date.now()){
  const at=Math.max(state.lastSeen||0,now),today=new Date(at).toLocaleDateString('sv-SE'),done=Object.values(state.records).flatMap(e=>e.review?.history??[]).filter(h=>!h.practice&&new Date(h.at).toLocaleDateString('sv-SE')===today).length;
  const due=dueLessons(state,lessons,at),queue=[],remaining=[...due];let course=null;
  while(remaining.length&&queue.length<Math.max(0,6-done)){let i=remaining.findIndex(l=>l.course!==course);if(i<0)i=0;const [l]=remaining.splice(i,1);queue.push(l);course=l.course;}
  return {lessons:queue,completedPairs:done,remainingPairs:Math.max(0,6-done),dueCount:due.length};
}
const cleanString=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const validTime=v=>Number.isFinite(v)&&v>=0&&v<1e15?v:0;
function cleanAttempt(a){if(!a||typeof a!=='object')return null;const answer=typeof a.answer==='number'&&Number.isFinite(a.answer)?a.answer:Array.isArray(a.answer)?a.answer.slice(0,20).filter(Number.isFinite):a.answer&&typeof a.answer==='object'?{lo:cleanString(String(a.answer.lo),50),hi:cleanString(String(a.answer.hi),50),loIncl:a.answer.loIncl===true,hiIncl:a.answer.hiIncl===true}:cleanString(a.answer,300);return {answer,correct:a.correct===true,at:validTime(a.at),helped:a.helped===true,confidence:['high','normal','unsure'].includes(a.confidence)?a.confidence:'normal'};}
export function normalizeState(saved,lessons){
  if(!saved||saved.version!==2||typeof saved.records!=='object'||!saved.records||Array.isArray(saved.records))throw new Error('지원하는 학습 기록 형식이 아닙니다.');
  const out=emptyState(),ids=new Set(lessons.map(l=>l.id));out.lastSeen=validTime(saved.lastSeen);
  if(saved.archive&&typeof saved.archive==='object'&&!Array.isArray(saved.archive))for(const [id,v]of Object.entries(saved.archive))if(!['__proto__','constructor','prototype'].includes(id))Object.defineProperty(out.archive,id,{value:v,writable:true,enumerable:true,configurable:true});
  for(const [id,v]of Object.entries({...out.archive,...saved.records})){
    if(ids.has(id))delete out.archive[id];
    if(['__proto__','constructor','prototype'].includes(id))continue;
    if(!ids.has(id)||!v||typeof v!=='object'||Array.isArray(v)){Object.defineProperty(out.archive,id,{value:v,writable:true,enumerable:true,configurable:true});continue;}
    const e=recordFor(out,id);e.prediction=cleanString(v.prediction,1500);e.note=cleanString(v.note,5000);e.claims=Array.isArray(v.claims)?v.claims.slice(0,10).map(x=>x===true):[];e.step=Number.isInteger(v.step)?Math.max(0,Math.min(6,v.step)):0;e.viewedAt=validTime(v.viewedAt);e.finishedAt=validTime(v.finishedAt);e.initialAt=validTime(v.initialAt);
    if(v.attempts&&typeof v.attempts==='object')for(const [key,a]of Object.entries(v.attempts).slice(0,100))if(a&&typeof a==='object'&&!['__proto__','constructor','prototype'].includes(key))e.attempts[key]={signature:cleanString(a.signature,100),helpUsed:a.helpUsed===true,first:cleanAttempt(a.first),latest:cleanAttempt(a.latest),history:Array.isArray(a.history)?a.history.slice(-20).map(cleanAttempt).filter(Boolean):[]};
    if(Array.isArray(v.previousItems))e.previousItems=v.previousItems.slice(-100);
    if(v.review&&typeof v.review==='object'){const r=v.review;e.review={stage:Number.isInteger(r.stage)?Math.max(0,Math.min(3,r.stage)):0,due:validTime(r.due),cycleStart:validTime(r.cycleStart),round:Number.isInteger(r.round)?Math.max(0,Math.min(1e6,r.round)):0,pending:null,seen:Array.isArray(r.seen)?[...new Set(r.seen.filter(x=>typeof x==='string'&&x.length<100))].slice(0,4000):[],practiceSeen:Array.isArray(r.practiceSeen)?r.practiceSeen.filter(x=>typeof x==='string').slice(-4000):[],history:Array.isArray(r.history)?r.history.slice(-80).filter(h=>h&&validTime(h.at)).map(h=>({...h,at:validTime(h.at),independent:h.independent===true,practice:h.practice===true,reused:h.reused===true})):[],delayed:r.delayed===true,needsWork:r.needsWork===true,consecutiveFail:Number.isInteger(r.consecutiveFail)?Math.max(0,Math.min(100,r.consecutiveFail)):0};if(r.pending&&typeof r.pending.token==='string'&&Number.isInteger(r.pending.seed))e.review.pending={token:r.pending.token.slice(0,100),seed:r.pending.seed>>>0,stage:e.review.stage,createdAt:validTime(r.pending.createdAt),helpUsed:r.pending.helpUsed===true,reused:r.pending.reused===true,keys:Array.isArray(r.pending.keys)?r.pending.keys.slice(0,2):[]};}
    e.highWrong=v.highWrong===true;if(v.signals&&typeof v.signals==='object'){e.signals={};for(const [tag,sig]of Object.entries(v.signals).slice(0,100))if(/^[A-Z0-9-]+$/.test(tag)&&sig&&Array.isArray(sig.items)){const items=[...new Set(sig.items.filter(x=>typeof x==='string').map(x=>x.slice(0,100)))].slice(0,100);e.signals[tag]={items,count:items.length};}}
    if(typeof v.importedNote==='string')e.importedNote=v.importedNote.slice(0,5000);
  }
  if(saved.diagnostic&&typeof saved.diagnostic==='object'&&!Array.isArray(saved.diagnostic))for(const [id,a]of Object.entries(saved.diagnostic))if(/^D\d+$/.test(id)&&Number.isInteger(a)&&a>=0&&a<=4)out.diagnostic[id]=a;
  return out;
}
export function loadState(storage,lessons,now=Date.now()){
  let raw;try{raw=storage.getItem(STORE);}catch{return {state:emptyState(),writable:false,message:'브라우저 저장을 사용할 수 없어요. 노트를 파일로 내려받아 주세요.'};}
  if(raw===null)return {state:emptyState(),writable:true,message:''};
  try{return {state:normalizeState(JSON.parse(raw),lessons),writable:true,message:''};}
  catch{try{const key=STORE+'-backup-'+now;storage.setItem(key,raw);storage.setItem(STORE,JSON.stringify(emptyState()));return {state:emptyState(),writable:true,message:'이전 기록을 읽을 수 없어 원문을 별도 백업했어요. 노트에서 원문을 내려받을 수 있어요.'};}catch{return {state:emptyState(),writable:false,blocked:true,message:'기록을 읽거나 백업할 수 없어 기존 기록의 덮어쓰기를 중지했어요. 현재 노트를 파일로 보관해 주세요.'};}}
}
export function mergeState(current,incoming,lessons){const out=normalizeState(current,lessons),data=normalizeState(incoming,lessons);for(const [id,v]of Object.entries(data.records)){const e=out.records[id];if(!e){out.records[id]=v;continue;}if(v.note&&v.note!==e.note){if(!e.note)e.note=v.note;else e.importedNote=v.note;}if(!e.prediction)e.prediction=v.prediction;for(const [key,a]of Object.entries(v.attempts)){const old=e.attempts[key];if(!old){e.attempts[key]=a;continue;}if(old.signature!==a.signature){(e.previousItems??=[]).push({id:key,...a});continue;}const candidates=[old.first,a.first].filter(Boolean).sort((x,y)=>x.at-y.at),latest=[old.latest,a.latest].filter(Boolean).sort((x,y)=>y.at-x.at);old.first=candidates[0]??null;old.latest=latest[0]??null;old.helpUsed||=a.helpUsed;old.history=[...old.history,...a.history].sort((x,y)=>x.at-y.at).filter((x,i,all)=>i===0||JSON.stringify(x)!==JSON.stringify(all[i-1])).slice(-20);}if(!e.review&&v.review)e.review=v.review;else if(e.review&&v.review){(e.importedSchedules??=[]).push(v.review);e.review.due=Math.min(e.review.due,v.review.due);e.review.seen=[...new Set([...e.review.seen,...v.review.seen])];}e.finishedAt=e.finishedAt&&v.finishedAt?Math.min(e.finishedAt,v.finishedAt):e.finishedAt||v.finishedAt;e.initialAt=e.initialAt&&v.initialAt?Math.min(e.initialAt,v.initialAt):e.initialAt||v.initialAt;}
  for(const [id,v]of Object.entries(data.archive))if(!Object.hasOwn(out.archive,id))Object.defineProperty(out.archive,id,{value:v,writable:true,enumerable:true,configurable:true});out.lastSeen=Math.max(out.lastSeen,data.lastSeen);return out;}
