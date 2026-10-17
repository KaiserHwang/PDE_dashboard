// 기초 과정의 수치 결과를 해석해와 물리적 성질에 대조한다.
import assert from "node:assert/strict";
import { buildIntroData } from "../src/beginner.js";

let passed = 0;
function verify(condition, name) {
  assert.ok(condition, name);
  console.log(`PASS ${++passed} · ${name}`);
}

const car = buildIntroData("slope", {speed:3});
verify(car.frames.every(f=>Math.abs(f.value-3*f.t)<1e-12), "일정 속력: 거리 = 속력 × 시간");
const accelerating = buildIntroData("slope", {speed:2, accelerating:true});
const firstSpeed = (accelerating.frames[1].value-accelerating.frames[0].value)/0.5;
const lastSpeed = (accelerating.frames.at(-1).value-accelerating.frames.at(-2).value)/0.5;
verify(lastSpeed>firstSpeed, "가속하는 자동차의 평균 속력 증가");

const coolingError = interval => {
  const result = buildIntroData("cooling", {rate:0.15,interval});
  return Math.abs(result.frames.at(-1).value-result.frames.at(-1).exact);
};
verify(coolingError(0.25)<coolingError(0.5)*0.6, "냉각: 시간 간격을 줄이면 연속 해에 가까워짐");
for(const rate of [0.05,0.35]) {
  const {frames} = buildIntroData("cooling", {rate,interval:1});
  verify(frames.every((f,i)=>f.value>=20&&(!i||f.value<=frames[i-1].value)), `냉각 계수 ${rate}: 주변 온도를 넘지 않는 단조 감소`);
}

for(const id of ["heat","plate"]) {
  const plate = id==="plate";
  for(const alpha of [0.5,plate?3:5]) {
    const {frames} = buildIntroData(id,{alpha});
    verify(frames.every(f=>f.values.every(t=>Number.isFinite(t)&&t>=20-1e-10&&t<=80+1e-10)), `${id}, α=${alpha}: 온도 최솟값·최댓값 유지`);
    const excess=frames.map(f=>f.values.reduce((sum,t)=>sum+t-20,0));
    verify(excess.every((v,i)=>!i||v<=excess[i-1]+1e-8), `${id}, α=${alpha}: 찬 고정 경계를 통한 열 방출`);
  }
  const d=buildIntroData(id), f=d.frames.find(frame=>Math.abs(frame.t-1)<1e-10);
  const width=plate?12:32, center=plate?12:20;
  let squared=0;
  for(let k=0;k<f.values.length;k++) {
    const i=k%d.n,j=Math.floor(k/d.n);
    const r2=(d.x[i]-center)**2+(plate?(d.x[j]-center)**2:0);
    // 초기에 경계 영향이 작은 Gaussian 확산의 무한 영역 해와 대조.
    const exact=20+60*(width/(width+4*d.alpha*f.t))**(plate?1:0.5)*Math.exp(-r2/(width+4*d.alpha*f.t));
    squared+=(f.values[k]-exact)**2;
  }
  verify(Math.sqrt(squared/f.values.length)<0.1, `${id}: 1초 Gaussian 확산 해와 온도 RMSE < 0.1°C`);
}

for(const speed of [10,40]) {
  const d=buildIntroData("wave",{waveSpeed:speed});
  let error=0;
  for(const f of d.frames)for(let i=0;i<d.n;i++) {
    const exact=3*Math.sin(Math.PI*d.x[i]/100)*Math.cos(Math.PI*speed*f.t/100);
    error=Math.max(error,Math.abs(f.values[i]-exact));
  }
  verify(error<0.004, `파속 ${speed}: 정재파 해석해와 변위 오차 < 0.004cm`);
}
console.log(`\n기초 과정 ${passed}개 검증 통과`);
