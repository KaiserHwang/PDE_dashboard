import {N,M} from './lesson-schema.js';
// 반복되는 문항 구조만 묶는다. 개념 설명·조건·문항·오답 이유는 각 레슨에서 직접 작성한다.
export const numberQ=(role,prompt,answer,reason,hint,wrong,feedback,tag='M1')=>N(role,prompt,answer,reason,hint,wrong===undefined?[]:[{value:wrong,feedback,tag}]);
export const pickQ=(role,prompt,options,reasons,hint,tags=[null,null])=>M(role,prompt,options,0,reasons[0],hint,reasons,[null,...tags]);
export function errorSet(text,locations,locationReasons,reasons,reasonFeedback,repair,hint){return [pickQ('error-location',text+'\n처음 잘못된 단계는?',locations,locationReasons,hint),pickQ('error',text+'\n그 단계가 잘못된 이유는?',reasons,reasonFeedback,hint),{...repair,prompt:text+'\n'+repair.prompt,role:'repair'}];}
const ERROR_TARGET={"A4": 1, "A5": 3, "A6": 1, "A7": 1, "A8": 2, "A9": 1, "A10": 1, "A11": 1, "A12": 2, "A13": 1, "A14": 2, "A15": 1, "A16": 1, "A17": 1, "A18": 3, "C3": 1, "C4": 2, "C5": 1, "C7": 1, "C8": 2, "C9": 1, "C10": 1, "C12": 1, "C13": 1, "C14": 1, "C15": 1, "C16": 2, "C17": 1, "C18": 1, "C19": 1, "C20": 1, "P4": 2, "P9": 1, "P10": 2, "P11": 2, "P12": 1, "P13": 1, "P14": 2, "P15": 1, "P16": 1, "P17": 2};
export function concept(l){
 for(const q of [...l.entry,l.faded,...l.checks]){if(['error-location','error'].includes(q.role)&&q.type==='choice')q.tags=q.options.map((_,i)=>i===q.answer?null:ERROR_TARGET[l.id]?'M'+ERROR_TARGET[l.id]:null);if(q.tags)q.tags=q.tags.map(t=>t?.startsWith('M')?l.id+'-'+t:t);if(q.wrong)q.wrong=q.wrong.map(w=>({...w,tag:w.tag?.startsWith('M')?l.id+'-'+w.tag:w.tag}));}
 return {minutes:25,...l};
}
