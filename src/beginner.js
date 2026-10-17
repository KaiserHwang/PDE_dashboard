// 고1 입문 과정: 예상 → 관찰 → 숫자로 확인 → 수학의 이름 붙이기.
// 계산 함수는 DOM과 분리하여 해석해·보존법칙으로 검증한다.

export const INTRO_LESSONS = [
  {
    id: "slope", title: "변화의 빠르기", short: "변화율", scene: "움직이는 자동차",
    question: "같은 1초 동안 더 멀리 가면, 그래프에서는 무엇이 달라질까요?",
    goal: "변화율을 ‘변화량 ÷ 시간 간격’으로 읽을 수 있어요.",
    observation: "▶ 재생을 누르고 자동차의 위치와 그래프의 기울기를 함께 보세요. 두 점을 잇는 주황색 선은 그 시간 구간의 평균 속력을 보여 줍니다.",
    controls: [{key:"speed", label:"처음 속력", min:1, max:5, step:0.5, value:2, unit:"m/s"}],
    choices: ["기울기가 더 커져요", "기울기가 항상 0이 돼요", "그래프에서 알 수 없어요"], answer:0,
    feedback: "위치 변화량을 시간 간격으로 나누면 평균 속력입니다. 같은 시간에 더 멀리 가는 그래프는 더 가파릅니다.",
    formula: "평균 변화율 = (나중 값 − 처음 값) ÷ (나중 시간 − 처음 시간)",
    notation: "이 시간 간격을 아주 짧게 좁혀서 한 순간의 변화율을 생각하는 것이 ‘미분’의 출발점입니다. Δ(델타)는 두 값의 차이라는 뜻이에요.",
    takeaway: "그래프의 기울기는 변화의 빠르기를 나타냅니다.",
  },
  {
    id: "cooling", title: "한 값이 시간에 따라 변할 때", short: "상미분의 출발", scene: "식어 가는 차 한 잔",
    question: "뜨거운 차는 처음과 나중 중 언제 더 빨리 식을까요?",
    goal: "현재 온도로 다음 온도를 예상하고, 상미분방정식의 뜻을 이해해요.",
    observation: "차 전체의 온도를 하나의 값으로 생각해 봅시다. 재생한 뒤 ‘지금의 온도’와 ‘다음 온도’를 비교하세요. 같은 길이의 시간 구간을 비교합니다.",
    controls: [{key:"rate", label:"식는 빠르기", min:0.05, max:0.35, step:0.05, value:0.15, unit:"/분"},
      {key:"interval", label:"예측할 시간 간격", min:0.25, max:1, step:0.25, value:0.5, unit:"분"}],
    choices: ["주변 온도와 차이가 큰 처음", "주변 온도와 차이가 작은 나중", "처음부터 끝까지 똑같이"], answer:0,
    feedback: "이 모형에서는 차와 공기의 온도차가 클수록 더 빠르게 식습니다. 주변 온도에 가까워지면 온도차와 냉각 속도가 함께 작아집니다.",
    formula: "다음 온도 ≈ 지금 온도 + 온도 변화율 × 짧은 시간",
    notation: "온도를 T(t)라고 쓰면 ‘시간 t에 따른 온도’라는 뜻입니다. dT/dt는 그 온도의 순간 변화율이에요. 이처럼 하나의 독립변수(여기서는 시간)에 대한 변화율을 연결한 식을 상미분방정식, ODE라고 합니다.",
    takeaway: "현재 값과 변화 규칙으로 조금 뒤의 값을 계산할 수 있습니다.",
  },
  {
    id: "partial", title: "시간을 고정할까, 위치를 고정할까?", short: "편미분의 출발", scene: "따뜻한 금속 막대",
    question: "막대의 ‘가운데가 얼마나 뜨거운가’와 ‘지금 얼마나 빨리 식는가’는 같은 질문일까요?",
    goal: "위치에 따른 변화와 시간에 따른 변화를 구별해요.",
    observation: "왼쪽 그래프는 시간을 멈추고 위치별 온도를 봅니다. 오른쪽 그래프는 주황색으로 표시한 한 위치를 정하고 시간별 온도를 봅니다. 위치 슬라이더와 시간 슬라이더를 각각 움직여 보세요.",
    controls: [],
    choices: ["한 위치를 정하고 시간에 따른 온도를 봐요", "한 시각을 정하고 여러 위치의 온도를 봐요", "위치와 시간을 동시에 바꿔요"], answer:0,
    quiz: "한 지점의 ‘식는 빠르기’를 알아보려면 어떻게 관찰해야 할까요?",
    feedback: "위치를 고정해야 시간에 따른 변화만 볼 수 있습니다. 반대로 시간을 고정하고 옆 지점과 비교하면 위치에 따른 변화를 볼 수 있어요.",
    formula: "시간 변화율: 같은 위치에서 온도차 ÷ 시간차\n공간 변화율: 같은 시각에서 온도차 ÷ 거리차",
    notation: "T(x,t)는 위치 x와 시간 t에 따라 달라지는 온도입니다. 여러 독립변수 중 하나만 바꾸어 보는 미분을 편미분이라고 해요. ∂T/∂t는 위치를 고정한 시간 변화율, ∂T/∂x는 시간을 고정한 위치 변화율입니다. 그 변화율들을 연결한 식이 편미분방정식, PDE입니다.",
    takeaway: "편미분을 읽을 때는 무엇을 바꾸고 무엇을 고정했는지 먼저 확인합니다.",
  },
  {
    id: "heat", title: "이웃을 보면 열의 이동이 보여요", short: "두 번 미분", scene: "막대에서 퍼지는 열",
    question: "가운데 온도가 양옆의 평균보다 높으면, 잠시 뒤 어떻게 될까요?",
    goal: "2차 공간미분을 ‘중앙과 이웃 평균의 차이’로 이해해요.",
    observation: "막대의 온도는 이웃끼리 열을 주고받으며 변합니다. 주황색 위치를 옮겨 봉우리와 옆 부분을 비교하세요. 그래프가 평탄해지는 과정에 주목하세요.",
    controls: [{key:"alpha", label:"열이 퍼지는 빠르기", min:0.5, max:5, step:0.5, value:2, unit:"cm²/s"}],
    choices: ["가운데 온도가 내려가요", "가운데 온도가 올라가요", "반드시 그대로예요"], answer:0,
    feedback: "양옆이 상대적으로 차가우면 가운데에서 열이 빠져나갑니다. 반대로 중앙이 양옆 평균보다 차가우면 열이 들어옵니다. 두 이웃이 한쪽은 더 뜨겁고 다른 쪽은 더 차가울 수도 있으므로 평균과 비교합니다.",
    formula: "온도 변화율 ≈ 퍼짐 계수 × (왼쪽 온도 − 2 × 중앙 온도 + 오른쪽 온도) ÷ (격자 간격)²",
    notation: "위치에 대한 기울기를 한 번 더 미분한 것을 2차 공간미분이라고 합니다. 이웃 평균과 중앙의 차이가 그 미분을 계산하는 단서예요. 열 방정식 Tₜ = αTₓₓ는 ‘공간에서의 굽음이 시간에 따른 온도 변화를 정한다’고 읽습니다.",
    takeaway: "봉우리가 낮아지고 낮은 부분이 따뜻해지면서 온도차가 완화됩니다.",
  },
  {
    id: "wave", title: "위치의 변화와 속도의 변화", short: "두 번 미분과 물결", scene: "잡아당겼다 놓은 줄",
    question: "줄이 가장 위에 있을 때 움직임이 잠깐 멈춰도, 왜 다시 아래로 움직일까요?",
    goal: "1차 시간미분은 속도, 2차 시간미분은 가속도라는 연결을 이해해요.",
    observation: "줄의 양끝을 고정하고, 위로 잡아당긴 뒤 정지 상태에서 놓았습니다. 가운데 점의 위치와 움직임의 방향을 관찰하세요. 재생을 멈추고 한 걸음씩 확인해도 좋습니다.",
    controls: [{key:"waveSpeed", label:"줄에서 변화가 전달되는 속력", min:10, max:40, step:5, value:20, unit:"cm/s"}],
    choices: ["줄을 평평하게 되돌리는 힘이 속도를 바꾸기 때문", "속도가 0이면 모든 힘도 0이기 때문", "시간이 지나면 저절로 위치가 사라지기 때문"], answer:0,
    feedback: "그 순간 속도가 0이어도 줄을 되돌리는 힘은 남아 있습니다. 힘이 속도를 바꾸는 정도를 가속도라고 해요. 그래서 줄은 아래로 움직이기 시작합니다.",
    formula: "위치의 시간 변화율 = 속도\n속도의 시간 변화율 = 가속도\n줄의 굽음 → 되돌리는 힘 → 가속도",
    notation: "파동 방정식 qₜₜ = c²qₓₓ의 왼쪽은 변위의 2차 시간미분, 즉 가속도입니다. 열 방정식에서는 공간의 굽음이 온도 변화율을 정했지만, 여기서는 가속도를 정합니다. 이 차이 때문에 줄은 평평해지는 데서 멈추지 않고 진동합니다.",
    takeaway: "속도가 0인 순간에도 속도의 변화율인 가속도는 0이 아닐 수 있습니다.",
  },
  {
    id: "plate", title: "막대에서 넓은 판으로", short: "2차원과 다음 탐구", scene: "넓은 금속판의 열",
    question: "막대에서 판으로 바꾸면, 열을 주고받는 이웃은 어떻게 늘어날까요?",
    goal: "좌우뿐 아니라 위아래의 이웃도 고려하는 2차원 공간을 이해해요.",
    observation: "밝은 곳이 뜨거운 부분입니다. 재생하면서 열이 네 방향으로 퍼지는 것을 보세요. 판을 누르면 그 지점과 네 이웃의 온도를 확인할 수 있어요.",
    controls: [{key:"alpha", label:"열이 퍼지는 빠르기", min:0.5, max:3, step:0.5, value:1.5, unit:"cm²/s"}],
    choices: ["좌우와 위아래 온도를 함께 비교해요", "시간 변화는 더 이상 없어져요", "모든 지점이 즉시 같은 온도가 돼요"], answer:0,
    feedback: "막대는 좌우 두 이웃을 보았지만, 판에서는 위아래 두 이웃도 봅니다. 각 지점에서 이런 교환을 반복하면 넓은 판의 열이 퍼지는 모습을 계산할 수 있어요.",
    formula: "중앙의 변화 = 좌우 이웃의 영향 + 위아래 이웃의 영향",
    notation: "판의 온도는 T(x,y,t)로 씁니다. x와 y는 공간의 두 방향이고 t는 시간입니다. 열 방정식은 Tₜ = α(Tₓₓ + Tᵧᵧ)입니다. 2차원은 공간 방향이 두 개라는 뜻이고, 2차 미분은 미분을 두 번 했다는 뜻으로 서로 다른 말입니다.",
    takeaway: "상미분·편미분·2차 미분·2차원은 각각 다른 뜻입니다.",
  },
];

function introCoolingFrames(params) {
  const interval = params.interval ?? 0.5, rate = params.rate ?? 0.15;
  const frames = [], end = 20;
  let temperature = 80;
  for (let i = 0; i <= Math.round(end / interval); i++) {
    const t = i * interval;
    frames.push({t, value:temperature, exact:20 + 60 * Math.exp(-rate * t)});
    temperature += interval * (-rate * (temperature - 20));
  }
  return {frames, dt:interval};
}

export function buildIntroHeat(params = {}, plate = false) {
  const n = plate ? 25 : 21, dx = plate ? 1 : 2;
  const alpha = params.alpha ?? (plate ? 1.5 : 2);
  const x = Array.from({length:n}, (_, i) => i * dx);
  let values = new Float64Array(plate ? n * n : n);
  for (let j = 0; j < (plate ? n : 1); j++) {
    for (let i = 0; i < n; i++) {
      const r2 = plate ? (x[i] - 12)**2 + (x[j] - 12)**2 : (x[i] - 20)**2;
      values[j * n + i] = 20 + 60 * Math.exp(-r2 / (plate ? 12 : 32));
    }
  }
  const fixBoundary = arr => {
    for (let j = 0; j < (plate ? n : 1); j++) for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1 || (plate && (j === 0 || j === n - 1))) arr[j*n+i] = 20;
    }
  };
  fixBoundary(values);
  const interval = plate ? 0.1 : 0.25, end = plate ? 8 : 20;
  const frames = [{t:0, values:values.slice()}];
  const substeps = Math.ceil(interval / ((plate ? 0.2 : 0.4) * dx**2 / alpha));
  const dt = interval / substeps;
  for (let frame = 1; frame <= Math.round(end / interval); frame++) {
    for (let step = 0; step < substeps; step++) {
      const next = values.slice();
      if (plate) {
        for (let j = 1; j < n-1; j++) for (let i = 1; i < n-1; i++) {
          const k = j*n+i;
          next[k] += alpha*dt/dx**2 * (values[k-1]+values[k+1]+values[k-n]+values[k+n]-4*values[k]);
        }
      } else {
        for (let i = 1; i < n-1; i++) next[i] += alpha*dt/dx**2 * (values[i-1]-2*values[i]+values[i+1]);
      }
      values = next;
    }
    frames.push({t:frame*interval, values:values.slice()});
  }
  return {frames, x, dx, dt, n, alpha};
}

export function buildIntroWave(params = {}) {
  const n=61, dx=100/(n-1), speed=params.waveSpeed ?? 20, interval=0.05;
  const x=Array.from({length:n}, (_, i)=>i*dx);
  let q=Float64Array.from(x, xx=>3*Math.sin(Math.PI*xx/100)), v=new Float64Array(n);
  q[0]=q[n-1]=0;
  const frames=[{t:0, values:q.slice(), velocity:v.slice()}];
  const substeps=Math.ceil(interval/(0.5*dx/speed)), dt=interval/substeps;
  for(let frame=1;frame<=160;frame++) {
    for(let step=0;step<substeps;step++) {
      const vh=v.slice(), next=q.slice();
      for(let i=1;i<n-1;i++) {
        vh[i] += 0.5*dt*speed**2*(q[i-1]-2*q[i]+q[i+1])/dx**2;
        next[i] += dt*vh[i];
      }
      v=vh.slice();
      for(let i=1;i<n-1;i++) v[i] += 0.5*dt*speed**2*(next[i-1]-2*next[i]+next[i+1])/dx**2;
      q=next;
    }
    frames.push({t:frame*interval, values:q.slice(), velocity:v.slice()});
  }
  return {frames,x,dx,dt,n,speed};
}

export function buildIntroData(id, params = {}) {
  if(id === "slope") {
    const speed=params.speed ?? 2, accelerating=!!params.accelerating;
    return {frames:Array.from({length:17}, (_,i)=>({t:i/2, value:speed*i/2+(accelerating ? 0.3*(i/2)**2 : 0)})), dt:0.5};
  }
  if(id === "cooling") return introCoolingFrames(params);
  if(id === "wave") return buildIntroWave(params);
  return buildIntroHeat(params, id === "plate");
}

// Canvas의 CSS 폭을 기준으로 축을 배치한다. DPR은 글자 선명도에만 사용한다.
function introCanvas(canvas) {
  const {width, height}=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio || 1;
  canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
  const ctx=canvas.getContext("2d"); ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,width,height);
  return {ctx,w:width,h:height};
}

function introLinePlot(canvas, x, series, bounds, point, secant) {
  const {ctx,w,h}=introCanvas(canvas), p={l:53,r:19,t:29,b:46};
  const X=xx=>p.l+(w-p.l-p.r)*(xx-bounds.x0)/(bounds.x1-bounds.x0);
  const Y=yy=>h-p.b-(h-p.t-p.b)*(yy-bounds.y0)/(bounds.y1-bounds.y0);
  ctx.font="12px sans-serif"; ctx.fillStyle="#56677a";
  for(let i=0;i<=4;i++) {
    const yy=bounds.y0+(bounds.y1-bounds.y0)*i/4;
    ctx.strokeStyle="#e7edf2";ctx.beginPath();ctx.moveTo(p.l,Y(yy));ctx.lineTo(w-p.r,Y(yy));ctx.stroke();
    ctx.textAlign="right";ctx.fillText(Number(yy.toFixed(1)),p.l-7,Y(yy)+4);
    const xx=bounds.x0+(bounds.x1-bounds.x0)*i/4;
    ctx.textAlign="center";ctx.fillText(Number(xx.toFixed(1)),X(xx),h-p.b+20);
  }
  for(const s of series) {
    ctx.strokeStyle=s.color;ctx.lineWidth=s.dashed ? 1.8 : 2.8;ctx.setLineDash(s.dashed ? [5,5] : []);
    ctx.beginPath();s.y.forEach((yy,i)=>i ? ctx.lineTo(X(x[i]),Y(yy)) : ctx.moveTo(X(x[i]),Y(yy)));ctx.stroke();ctx.setLineDash([]);
  }
  if(secant) {
    ctx.strokeStyle="#c46b14";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(secant[0][0]),Y(secant[0][1]));ctx.lineTo(X(secant[1][0]),Y(secant[1][1]));ctx.stroke();
    for(const [xx,yy] of secant) {ctx.fillStyle="#c46b14";ctx.beginPath();ctx.arc(X(xx),Y(yy),5,0,2*Math.PI);ctx.fill();}
  }
  if(point) {
    ctx.setLineDash([4,4]);ctx.strokeStyle="#d28a3e";ctx.beginPath();ctx.moveTo(X(point[0]),p.t);ctx.lineTo(X(point[0]),h-p.b);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#c46b14";ctx.beginPath();ctx.arc(X(point[0]),Y(point[1]),6,0,2*Math.PI);ctx.fill();
  }
  ctx.fillStyle="#374c60";ctx.textAlign="left";ctx.fillText(bounds.ylabel,8,16);
  ctx.textAlign="center";ctx.fillText(bounds.xlabel,w/2,h-6);
}

export class BeginnerApp {
  constructor(root, onAdvanced) {
    this.root=root; this.onAdvanced=onAdvanced; this.lessonIndex=0; this.index=0;
    this.params={}; this.probe=10;this.probeY=12;this.playing=false;this.lastFrame=0;
    this.resize=()=>this.draw(); window.addEventListener("resize",this.resize);
    this.loadLesson(0);
    const tick=now=>{
      if(this.playing && !this.root.hidden && now-this.lastFrame>160) {
        this.lastFrame=now;
        if(this.index<this.data.frames.length-1) this.index++;
        else this.playing=false;
        this.updateScene();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  loadLesson(index) {
    this.lessonIndex=index; this.lesson=INTRO_LESSONS[index];this.index=0;this.playing=false;
    this.params=Object.fromEntries(this.lesson.controls.map(c=>[c.key,c.value]));
    this.probe=this.lesson.id === "wave" ? 30 : this.lesson.id === "plate" ? 12 : 10;
    this.probeY=12;this.data=buildIntroData(this.lesson.id,this.params);this.render();
  }

  render() {
    const lesson=this.lesson, id=lesson.id, spatial=!['slope','cooling'].includes(id);
    this.root.innerHTML=`
      <div class="learn-shell">
        <header class="learn-header"><a href="#" class="learn-brand" aria-label="처음 단계로">변화 탐험실 <span>고1을 위한 수학 × 물리</span></a><button class="learn-link" id="openAdvanced">심화 실험실 ↗</button></header>
        <section class="learn-welcome"><span class="learn-eyebrow">미분을 아직 배우지 않았어도 괜찮아요</span><h1>변하는 모습을 보고,<br class="learn-mobile-break"> 수학의 뜻을 찾아봐요.</h1><p>한 번에 한 가지 질문만 탐구합니다. 예상하고 → 움직여 보고 → 숫자로 확인해 보세요.</p></section>
        <nav class="learn-path" aria-label="기초 학습 순서">${INTRO_LESSONS.map((l,i)=>`<button class="learn-step ${i===this.lessonIndex?'selected':''}" data-lesson="${i}" ${i===this.lessonIndex?'aria-current="step"':''}><span>${i+1}</span>${l.short}</button>`).join('')}</nav>
        <main>
          <section class="learn-question"><span class="learn-eyebrow">STEP ${this.lessonIndex+1} / 6 · ${lesson.scene}</span><h2>${lesson.title}</h2><p class="learn-big-question">${lesson.question}</p><p class="learn-goal">이번에 알아볼 것 · ${lesson.goal}</p></section>
          <div class="learn-workspace">
            <section class="learn-card learn-experiment"><h3>① 직접 관찰해요</h3><p>${lesson.observation}</p>
              ${id==='slope'?'<div class="learn-motion"><button data-motion="steady" class="selected">속력 일정</button><button data-motion="accelerating">점점 빨라짐</button></div>':''}
              <div class="learn-physical" id="introPhysical" aria-live="off"></div>
              <div class="learn-chart-heading" id="introPlotHeading"></div><canvas id="introMainCanvas" aria-label="실험의 그래프 또는 온도 지도" role="img"></canvas>
              ${id==='partial'?'<div class="learn-chart-heading">같은 위치에서 시간별 온도 보기 <span>위치를 고정했어요</span></div><canvas id="introTimeCanvas" aria-label="선택한 위치의 온도와 시간 그래프" role="img"></canvas>':''}
              <div class="learn-legend" id="introLegend"></div>
              <div class="learn-transport"><button class="learn-primary" id="introPlay">▶ 재생</button><button id="introStep">한 걸음 →</button><button id="introReset">처음으로 ↺</button><output id="introClock"></output></div>
              <label class="learn-control" for="introTimeline"><span>시간을 골라 보기 <output id="introTimeValue"></output></span><input id="introTimeline" type="range" min="0" max="${this.data.frames.length-1}" step="1" value="0"></label>
              ${spatial?`<label class="learn-control" for="introProbe"><span>관찰할 위치 x <output id="introProbeValue"></output></span><input id="introProbe" type="range" min="1" max="${this.data.n-2}" step="1" value="${this.probe}"></label>`:''}
              ${id==='plate'?`<label class="learn-control" for="introProbeY"><span>관찰할 위치 y <output id="introProbeYValue"></output></span><input id="introProbeY" type="range" min="1" max="${this.data.n-2}" step="1" value="${this.probeY}"></label>`:''}
              ${lesson.controls.map(c=>`<label class="learn-control" for="introControl_${c.key}"><span>${c.label}<output id="introControlValue_${c.key}">${c.value} ${c.unit}</output></span><input id="introControl_${c.key}" type="range" data-intro-param="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"></label>`).join('')}
              ${lesson.controls.length?'<p class="learn-note">계수를 바꾸면 처음 상태에서 다시 계산합니다. 같은 시간으로 이동해 바꾸기 전과 비교해 보세요.</p>':''}
              <p class="learn-note" id="introBoundary"></p>
            </section>
            <aside class="learn-card learn-notebook"><h3>② 숫자로 확인해요</h3><div id="introNumbers" aria-live="off"></div><div class="learn-reading" id="introReading"></div>
              <section class="learn-quiz"><h3>③ 내 생각을 확인해요</h3><p>${lesson.quiz || lesson.question}</p><div class="learn-answers">${lesson.choices.map((c,i)=>`<button data-answer="${i}" aria-pressed="false">${c}</button>`).join('')}</div><p id="introFeedback" role="status"></p></section>
            </aside>
          </div>
          <details class="learn-card learn-math"><summary>④ 이제 수식과 용어로 연결해 보기</summary><div class="learn-formula">${lesson.formula.replaceAll('\n','<br>')}</div><p>${lesson.notation}</p>${this.extraMath()}</details>
          <section class="learn-wrapup"><span>이 단계에서 기억할 한 문장</span><p>${lesson.takeaway}</p><div class="learn-navigation"><button id="introPrevious" ${this.lessonIndex===0?'disabled':''}>← 이전 단계</button><button class="learn-primary" id="introNext">${this.lessonIndex===5?'처음부터 다시 탐험하기 ↺':'다음 단계 →'}</button></div></section>
          ${this.lessonIndex===5?'<section class="learn-next"><h3>물결과 열에서 유체로</h3><p>흐르는 물은 따뜻한 물질을 옮기고, 온도차는 열을 퍼뜨립니다. 심화 과정에서는 이 두 움직임을 연결하고, 물의 속도와 압력까지 함께 생각합니다. 오일러·나비에–스토크스 방정식은 그다음에 만날 주제예요.</p><button id="introAdvancedEnd">심화 과정 둘러보기 ↗</button></section>':''}
        </main><footer class="learn-footer">기초 모형으로 관찰합니다 · 차는 전체 온도가 같다고 가정하고, 막대·판의 가장자리는 20°C로 유지합니다.</footer>
      </div>`;
    this.bind();this.updateScene();
  }

  extraMath() {
    const id=this.lesson.id;
    if(id==='cooling') return `<p class="learn-note">계산 규칙: 온도 변화율 = −식는 계수 × (차의 온도 − 20°C). 주황색은 이 규칙을 작은 시간마다 반복한 근삿값, 회색 점선은 같은 모형의 연속 해입니다. 시간 간격을 줄이면 두 곡선이 가까워지는지 비교해 보세요.</p>`;
    if(['partial','heat','plate'].includes(id)) return `<p class="learn-note">공간 이산화는 막대나 판을 점들의 모임으로 나누는 일이고, 시간 이산화는 짧은 시간마다 온도를 갱신하는 일입니다. 이웃의 현재 온도로 다음 온도를 계산하고 이 과정을 반복합니다. 지금 계산의 공간 간격은 ${this.data.dx} cm, 내부 시간 간격은 ${this.data.dt.toFixed(4)}초입니다.</p>`;
    if(id==='wave') return '<p class="learn-note">공간을 작은 점으로 나누고, 각 점의 위치와 속도를 짧은 시간마다 갱신합니다. 이 예제는 마찰이 없는 줄이어서 진동이 이어집니다. 위치와 속도를 모두 알아야 다음 운동을 계산할 수 있어요.</p>';
    return '<p class="learn-note">평균 변화율은 두 점 사이의 기울기입니다. 이 값이 언제나 한 순간의 속력과 같지는 않아요. 시간 간격을 좁혀 순간 변화율에 다가갑니다.</p>';
  }

  bind() {
    const $=s=>this.root.querySelector(s);
    $('.learn-brand').onclick=e=>{e.preventDefault();this.loadLesson(0)};
    this.root.querySelectorAll('[data-lesson]').forEach(btn=>btn.onclick=()=>this.loadLesson(Number(btn.dataset.lesson)));
    $('#openAdvanced').onclick=()=>this.openAdvanced();
    $('#introAdvancedEnd')?.addEventListener('click',()=>this.openAdvanced());
    $('#introPlay').onclick=()=>{
      if(this.index===this.data.frames.length-1)this.index=0;
      this.playing=!this.playing;this.lastFrame=performance.now();this.updateScene();
    };
    $('#introStep').onclick=()=>{this.playing=false;this.index=Math.min(this.index+1,this.data.frames.length-1);this.updateScene()};
    $('#introReset').onclick=()=>{this.playing=false;this.index=0;this.updateScene()};
    $('#introTimeline').oninput=e=>{this.playing=false;this.index=Number(e.target.value);this.updateScene()};
    $('#introProbe')?.addEventListener('input',e=>{this.probe=Number(e.target.value);this.updateScene()});
    $('#introProbeY')?.addEventListener('input',e=>{this.probeY=Number(e.target.value);this.updateScene()});
    this.root.querySelectorAll('[data-intro-param]').forEach(input=>input.oninput=e=>{
      const key=e.target.dataset.introParam;this.params[key]=Number(e.target.value);
      const control=this.lesson.controls.find(c=>c.key===key);$(`#introControlValue_${key}`).textContent=`${e.target.value} ${control.unit}`;
      this.data=buildIntroData(this.lesson.id,this.params);this.playing=false;this.index=0;
      $('#introTimeline').max=this.data.frames.length-1;
      $('.learn-math').querySelectorAll('p.learn-note').forEach(p=>p.remove());
      $('.learn-math').insertAdjacentHTML('beforeend',this.extraMath());
      this.updateScene();
    });
    this.root.querySelectorAll('[data-motion]').forEach(btn=>btn.onclick=()=>{
      this.params.accelerating=btn.dataset.motion==='accelerating';
      this.root.querySelectorAll('[data-motion]').forEach(b=>b.classList.toggle('selected',b===btn));
      this.data=buildIntroData('slope',this.params);this.index=0;this.playing=false;this.updateScene();
    });
    this.root.querySelectorAll('[data-answer]').forEach(btn=>btn.onclick=()=>{
      const correct=Number(btn.dataset.answer)===this.lesson.answer;
      this.root.querySelectorAll('[data-answer]').forEach(b=>{b.classList.toggle('chosen',b===btn);b.setAttribute('aria-pressed',String(b===btn))});
      $('#introFeedback').textContent=(correct?'맞아요. ':'다시 관찰해 볼까요? ')+this.lesson.feedback;
      $('#introFeedback').className=correct?'correct':'try-again';
    });
    $('#introPrevious').onclick=()=>this.loadLesson(Math.max(0,this.lessonIndex-1));
    $('#introNext').onclick=()=>{this.loadLesson((this.lessonIndex+1)%INTRO_LESSONS.length);this.root.querySelector('.learn-question').scrollIntoView({block:'start',behavior:'smooth'})};
    $('#introMainCanvas').onclick=e=>{
      if(this.lesson.id!=='plate')return;
      const rect=e.target.getBoundingClientRect(), pr=this.plateRect;
      if(!pr)return;
      this.probe=Math.max(1,Math.min(this.data.n-2,Math.floor((e.clientX-rect.left-pr.x)/pr.size*this.data.n)));
      this.probeY=Math.max(1,Math.min(this.data.n-2,this.data.n-1-Math.floor((e.clientY-rect.top-pr.y)/pr.size*this.data.n)));
      $('#introProbe').value=this.probe;$('#introProbeY').value=this.probeY;this.updateScene();
    };
  }

  openAdvanced() {this.playing=false;this.onAdvanced();}

  updateScene() {
    if(this.root.hidden)return;
    const $=s=>this.root.querySelector(s), id=this.lesson.id, data=this.data, f=data.frames[this.index];
    $('#introPlay').textContent=this.playing?'Ⅱ 잠깐 멈춤':'▶ 재생';
    $('#introClock').textContent=`${f.t.toFixed(2)} ${id==='cooling'?'분':'초'}`;
    $('#introTimeValue').textContent=$('#introClock').textContent;
    $('#introTimeline').value=this.index;
    if($('#introProbeValue'))$('#introProbeValue').textContent=`${data.x[this.probe].toFixed(1)} cm`;
    if($('#introProbeYValue'))$('#introProbeYValue').textContent=`${data.x[this.probeY].toFixed(1)} cm`;
    const num=(title,value)=>`<div class="learn-number"><span>${title}</span><strong>${value}</strong></div>`;
    let numbers='', reading='', physical='', boundary='';
    const next=data.frames[Math.min(this.index+1,data.frames.length-1)], previous=data.frames[Math.max(this.index-1,0)];
    const comparison=this.index<data.frames.length-1?next:previous;
    if(id==='slope') {
      const dt=Math.abs(comparison.t-f.t), distance=Math.abs(comparison.value-f.value), rate=distance/dt;
      numbers=num('지금 위치',`${f.value.toFixed(2)} m`)+num('두 시각의 차이',`${dt.toFixed(1)}초`)+num('위치 변화량',`${distance.toFixed(2)} m`)+num('평균 변화율',`${rate.toFixed(2)} m/s`);
      reading=`${distance.toFixed(2)} m ÷ ${dt.toFixed(1)}초 = ${rate.toFixed(2)} m/s<br>‘${Math.min(f.t,comparison.t).toFixed(1)}초부터 ${Math.max(f.t,comparison.t).toFixed(1)}초까지’의 평균 속력입니다.`;
      const max=data.frames.at(-1).value;
      physical=`<div class="learn-road"><span style="left:${8+80*f.value/max}%" aria-hidden="true">🚗</span></div><p>출발점에서 ${f.value.toFixed(1)} m 이동했어요.</p>`;
      boundary='자동차는 한 방향으로만 움직입니다. 주황색 두 점 사이의 평균 속력과 한 순간의 속력을 구별해 보세요.';
    } else if(id==='cooling') {
      const rate=-(this.params.rate)*(f.value-20), dt=data.dt, predicted=f.value+rate*dt;
      numbers=num('차의 온도',`${f.value.toFixed(2)} °C`)+num('주변 공기',`20.00 °C`)+num('지금의 온도차',`${(f.value-20).toFixed(2)} °C`)+num('현재 규칙으로 다음 값 예측',`${predicted.toFixed(2)} °C`);
      reading=`지금의 변화율은 ${rate.toFixed(2)} °C/분입니다.<br>${f.value.toFixed(2)} + (${rate.toFixed(2)}) × ${dt} ≈ ${predicted.toFixed(2)} °C<br>음수는 온도가 내려간다는 뜻이에요.`;
      physical=`<div class="learn-cup" style="--tea-color:hsl(${28+120*(80-f.value)/60} 65% 48%)">☕<strong>${f.value.toFixed(1)}°C</strong><span>공기는 20°C</span></div>`;
      boundary='차 전체의 온도가 같다고 가정합니다. 주변 공기는 20°C로 유지되고, 증발 등은 생략한 냉각 모형입니다.';
    } else if(id==='partial') {
      const i=this.probe, deltaT=(comparison.values[i]-f.values[i])/(comparison.t-f.t);
      const spatial=(f.values[i+1]-f.values[i-1])/(2*data.dx);
      numbers=num('고정해서 관찰할 위치',`${data.x[i]} cm`)+num('현재 온도',`${f.values[i].toFixed(2)} °C`)+num('시간 변화율 근사',`${deltaT.toFixed(3)} °C/s`)+num('공간 변화율 근사',`${spatial.toFixed(3)} °C/cm`);
      reading='시간 변화율의 단위는 °C/s, 공간 변화율의 단위는 °C/cm입니다. 온도를 시간으로 나누었는지 거리로 나누었는지가 달라요.<br>온도가 높은 곳이라도 그 순간의 온도 변화율이 클 수도, 작을 수도 있어요.';
      boundary='막대의 양끝은 20°C입니다. 표시한 시간 변화율은 이웃한 두 저장 시각의 평균, 공간 변화율은 좌우 두 점 사이의 평균입니다.';
    } else if(id==='heat' || id==='plate') {
      const k=id==='plate'?this.probeY*data.n+this.probe:this.probe, u=f.values;
      const neighbours=id==='plate'?[u[k-1],u[k+1],u[k-data.n],u[k+data.n]]:[u[k-1],u[k+1]];
      const average=neighbours.reduce((a,b)=>a+b,0)/neighbours.length;
      const tendency=data.alpha*neighbours.length*(average-u[k])/data.dx**2;
      numbers=num('중앙 온도',`${u[k].toFixed(2)} °C`)+num(`${neighbours.length}개 이웃의 평균`,`${average.toFixed(2)} °C`)+num('이웃 평균 − 중앙',`${(average-u[k]).toFixed(3)} °C`)+num('계산한 온도 변화율',`${tendency.toFixed(3)} °C/s`);
      reading=`<div class="learn-neighbours">${id==='plate'?`위 ${u[k+data.n].toFixed(1)}°C<br>`:''}왼쪽 ${u[k-1].toFixed(1)}°C · <b>중앙 ${u[k].toFixed(1)}°C</b> · 오른쪽 ${u[k+1].toFixed(1)}°C${id==='plate'?`<br>아래 ${u[k-data.n].toFixed(1)}°C`:''}</div>${tendency<-1e-6?'중앙이 이웃 평균보다 높아서 식는 방향입니다.':tendency>1e-6?'중앙이 이웃 평균보다 낮아서 따뜻해지는 방향입니다.':'중앙과 이웃 평균이 거의 같아, 이 순간의 변화가 작습니다.'}`;
      boundary=`가장자리는 20°C로 유지됩니다. 색과 세로축 범위를 고정하여 실제로 식는 정도를 비교합니다. 격자 간격은 ${data.dx} cm입니다.`;
    } else if(id==='wave') {
      const i=this.probe, q=f.values, v=f.velocity, a=data.speed**2*(q[i-1]-2*q[i]+q[i+1])/data.dx**2;
      numbers=num('지켜보는 위치',`${data.x[i].toFixed(1)} cm`)+num('평형선에서의 높이',`${q[i].toFixed(2)} cm`)+num('움직이는 속도',`${v[i].toFixed(2)} cm/s`)+num('속도의 변화율 · 가속도',`${a.toFixed(2)} cm/s²`);
      reading=`속도의 부호: +는 위로, −는 아래로 움직입니다.<br>지금 가속도는 ${a<0?'아래':a>0?'위':'변화 없음'} 방향입니다. ${Math.abs(v[i])<0.01&&Math.abs(a)>0.01?'지금은 거의 멈췄어도 가속도는 남아 있어요.':'위치·속도·가속도가 서로 다른 값임을 확인해 보세요.'}`;
      boundary='양끝 고정, 처음 속도 0, 마찰 없음. 세로축은 줄의 변위이며 물 전체의 유동을 계산한 예제는 아닙니다.';
    }
    $('#introNumbers').innerHTML=numbers;$('#introReading').innerHTML=reading;$('#introPhysical').innerHTML=physical;$('#introPhysical').hidden=!physical;$('#introBoundary').textContent=boundary;
    $('#introPlotHeading').innerHTML=id==='plate'?'금속판의 온도 <span>색 범위 20~80°C · 눌러서 위치 선택</span>':id==='partial'?'같은 시각에서 위치별 온도 보기 <span>시간을 고정했어요</span>':id==='wave'?'같은 시각의 줄 모양 <span>주황색 점을 지켜보세요</span>':id==='heat'?'같은 시각의 온도 분포 <span>주황색 점과 이웃을 비교하세요</span>':'시간과 함께 변하는 값';
    $('#introLegend').innerHTML=id==='cooling'?'<span class="orange">━ 한 걸음씩 계산한 온도</span><span>┄ 연속 냉각 모형의 해</span>':id==='plate'?'<span>차가움 20°C</span><span class="learn-colorbar"></span><span>뜨거움 80°C</span>':id==='slope'?'<span class="teal">━ 시간별 위치</span><span class="orange">● 두 시각의 값과 그 사이 기울기</span>':'<span>┄ 처음 모습</span><span class="teal">━ 현재 모습</span><span class="orange">● 관찰하는 값</span>';
    this.draw();
  }

  draw() {
    if(this.root.hidden || !this.data)return;
    const $=s=>this.root.querySelector(s), canvas=$('#introMainCanvas');if(!canvas)return;
    const id=this.lesson.id, data=this.data, f=data.frames[this.index], all=data.frames;
    if(id==='slope' || id==='cooling') {
      const next=this.index<all.length-1?all[this.index+1]:all[this.index-1];
      introLinePlot(canvas,all.map(a=>a.t),id==='slope'?[{y:all.map(a=>a.value),color:'#087f8c'}]:[
        {y:all.map(a=>a.exact),color:'#8d9aa8',dashed:true},{y:all.map(a=>a.value),color:'#c46b14'}],
        {x0:0,x1:all.at(-1).t,y0:0,y1:id==='slope'?Math.max(10,Math.ceil(all.at(-1).value*1.08/5)*5):100,xlabel:id==='slope'?'시간 (초)':'시간 (분)',ylabel:id==='slope'?'위치 (m)':'온도 (°C)'},[f.t,f.value],id==='slope'?[[f.t,f.value],[next.t,next.value]]:null);
    } else if(id==='plate') {
      const {ctx,w,h}=introCanvas(canvas), size=Math.min(w-72,h-48), left=(w-size)/2-8, top=15, cell=size/data.n;
      this.plateRect={x:left,y:top,size};
      for(let j=0;j<data.n;j++)for(let i=0;i<data.n;i++) {
        const value=f.values[j*data.n+i], a=Math.max(0,Math.min(1,(value-20)/60));
        ctx.fillStyle=`hsl(${215-190*a} ${65+15*a}% ${92-44*a}%)`;
        ctx.fillRect(left+i*cell,top+(data.n-1-j)*cell,cell+0.4,cell+0.4);
      }
      ctx.strokeStyle='#714413';ctx.lineWidth=2;ctx.strokeRect(left+this.probe*cell,top+(data.n-1-this.probeY)*cell,cell,cell);
      ctx.font='12px sans-serif';ctx.fillStyle='#374c60';ctx.textAlign='center';ctx.fillText('x: 0 → 24 cm',left+size/2,top+size+22);
      ctx.save();ctx.translate(left-13,top+size/2);ctx.rotate(-Math.PI/2);ctx.fillText('y: 0 → 24 cm',0,0);ctx.restore();
    } else {
      const wave=id==='wave', maxX=data.x.at(-1);
      introLinePlot(canvas,data.x,[{y:all[0].values,color:'#9daab7',dashed:true},{y:f.values,color:'#087f8c'}],
        {x0:0,x1:maxX,y0:wave?-3.5:15,y1:wave?3.5:85,xlabel:'위치 (cm)',ylabel:wave?'줄의 변위 (cm)':'온도 (°C)'},[data.x[this.probe],f.values[this.probe]]);
      if(id==='partial')introLinePlot($('#introTimeCanvas'),all.map(a=>a.t),[{y:all.map(a=>a.values[this.probe]),color:'#087f8c'}],
        {x0:0,x1:all.at(-1).t,y0:15,y1:85,xlabel:'시간 (초)',ylabel:'온도 (°C)'},[f.t,f.values[this.probe]]);
    }
  }
}
