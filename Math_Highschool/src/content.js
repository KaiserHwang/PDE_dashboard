import {lessons as slice} from './courses/slice.js';
import {lessons as bridges} from './courses/bridges.js';
import {lessons as statistics} from './courses/statistics.js';
import {lessons as algebra} from './courses/algebra.js';
import {lessons as calculus} from './courses/calculus.js';
import {finalizeLesson} from './lesson-schema.js';
export const COURSES=[
 {id:'algebra',title:'대수',subtitle:'지수와 로그에서 삼각함수, 수열의 논리까지',units:[['explog','지수함수와 로그함수'],['trig','삼각함수'],['sequence','수열']]},
 {id:'calc',title:'미적분Ⅰ',subtitle:'극한에서 변화율, 그래프와 누적의 연결까지',units:[['limit','함수의 극한과 연속'],['diff','미분'],['integral','적분']]},
 {id:'stats',title:'확률과 통계',subtitle:'경우를 세는 기준에서 조건부확률과 추정까지',units:[['count','경우의 수'],['probability','확률'],['statistics','통계']]},
 {id:'bridge',title:'선수 개념 연결',subtitle:'막힌 부분을 짧게 돌아보고 본 학습으로',units:[['bridge','선수 개념']]}
];
const STATS_ORDER=['P1','P2','P3','P5','P6','P7','P8','P4','P9','P10','P11','P12','P13','P17','P14','P15','P16'];
export const LESSONS=[...slice,...bridges,...statistics,...algebra,...calculus].map(finalizeLesson).sort((a,b)=>COURSES.findIndex(c=>c.id===a.course)-COURSES.findIndex(c=>c.id===b.course)||(a.course==='stats'?STATS_ORDER.indexOf(a.id)-STATS_ORDER.indexOf(b.id):Number(a.id.slice(1))-Number(b.id.slice(1))));
export const LESSON_MAP=Object.fromEntries(LESSONS.map(l=>[l.id,l]));
export const COURSE_MAP=Object.fromEntries(COURSES.map(c=>[c.id,c]));
export const courseOf=l=>COURSE_MAP[l.course];
export const unitTitle=l=>courseOf(l)?.units.find(u=>u[0]===l.unit)?.[1]??l.unit;
export const STEP_NAMES=['먼저 생각하기','이유 이해하기','조건과 반례','표현 연결하기','풀이 따라가기','스스로 적용하기','내 말로 정리'];
