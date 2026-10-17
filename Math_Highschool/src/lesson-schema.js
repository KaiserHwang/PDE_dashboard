import {KNOWN_ERRORS} from './known-errors.js';
import {seeded} from './math.js';
// 문항의 이유/힌트/오답 피드백은 작성자가 명시한다. 정의 문장을 정답으로 자동 삽입하지 않는다.
export const N=(role,prompt,answer,reason,hint,wrong=[],unit='')=>({type:'numeric',role,prompt,answer,reason,hint,wrong,unit});
export const M=(role,prompt,options,answer,reason,hint,feedback,tags=[])=>({type:'choice',role,prompt,options,answer,reason,hint,feedback,tags});
export const control=(key,label,min,max,step,value,unit='')=>({key,label,min,max,step,value,unit});
export function finalizeLesson(l){
  const question=(q,id)=>{
    const base={...q,...(q.type!=='choice'&&!q.wrong?.length&&KNOWN_ERRORS[id]?{wrong:[KNOWN_ERRORS[id]]}:{}),id,support:q.support??l.prereqs[0]??l.id};
    if(q.type!=='choice')return base;
    let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619);
    const order=q.options.map((_,i)=>i),random=seeded(hash>>>0);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    return {...base,options:order.map(i=>q.options[i]),feedback:order.map(i=>q.feedback[i]),tags:order.map(i=>q.tags?.[i]??null),answer:order.indexOf(q.answer)};
  };
  const aliases={prob:'probability',counting:'count',stat:'statistics',exp:'explog',seq:'sequence'};
  return {...l,unit:aliases[l.unit]??l.unit,minutes:l.minutes??25,scope:l.course==='bridge'?'선수 연결':'공통 수능 핵심',entry:l.entry.map((q,i)=>question(q,l.id+'-entry-'+i)),faded:question(l.faded,l.id+'-faded'),checks:l.checks.map((q,i)=>question(q,l.id+'-check-'+i))};
}
export const R=(role,prompt,answer,reason,hint,wrong=[],unit='')=>({type:'rational',role,prompt,answer,reason,hint,wrong,unit});
export const I=(role,prompt,answer,reason,hint,wrong=[])=>({type:'interval',role,prompt,answer,reason,hint,wrong});
export const S=(role,prompt,answer,reason,hint,wrong=[])=>({type:'set',role,prompt,answer,reason,hint,wrong});
