// src/renderer.js
// 고해상도(Retina/High-DPI) HTML5 Canvas 1D/2D/3D 과학 가시화 렌더러
// 2D 컬러맵 필드, 라그랑주 입자 추적, 속도 벡터장(Quiver), 3D 회전 서피스, x-t 특성선 다이어그램, 스텐실 현미경

export function sampleColormap(tNorm, mapName = "turbo") {
  const t = Math.max(0.0, Math.min(1.0, Number.isFinite(tNorm) ? tNorm : 0.5));

  if (mapName === "rdbu") {
    // Diverging Blue -> Dark/Neutral -> Red-Orange (와도, 파동 변위, 압력 섭동용)
    if (t < 0.5) {
      const s = t * 2.0;
      const r = Math.round(18 + s * (238 - 18));
      const g = Math.round(98 + s * (242 - 98));
      const b = Math.round(215 + s * (248 - 215));
      return [r, g, b];
    }
    const s = (t - 0.5) * 2.0;
    const r = Math.round(238 + s * (225 - 238));
    const g = Math.round(242 - s * (242 - 48));
    const b = Math.round(248 - s * (248 - 62));
    return [r, g, b];
  }

  if (mapName === "schlieren") {
    // 광학 슐리렌 흑백 명암 (고구배 영역이 밝은 은백색/시안빛으로 발광)
    const v = Math.pow(t, 0.75);
    const r = Math.round(14 + v * 235);
    const g = Math.round(18 + v * 238);
    const b = Math.round(26 + v * 245);
    return [r, g, b];
  }

  if (mapName === "ocean") {
    // 천수 방정식 수면용 (Deep Navy -> Teal -> Aqua -> White Foam)
    if (t < 0.5) {
      const s = t * 2;
      return [Math.round(10 + s * 15), Math.round(35 + s * 115), Math.round(90 + s * 110)];
    }
    const s = (t - 0.5) * 2;
    return [Math.round(25 + s * 215), Math.round(150 + s * 98), Math.round(200 + s * 55)];
  }

  // 기본 Viridis/Turbo 하이브리드 고대비 과학 컬러맵
  const stops = [
    [15, 23, 62],
    [28, 86, 168],
    [16, 165, 162],
    [110, 208, 88],
    [245, 196, 42],
    [239, 78, 42],
  ];
  const scaled = t * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const c0 = stops[idx];
  const c1 = stops[idx + 1];
  return [
    Math.round(c0[0] + frac * (c1[0] - c0[0])),
    Math.round(c0[1] + frac * (c1[1] - c0[1])),
    Math.round(c0[2] + frac * (c1[2] - c0[2])),
  ];
}

export function prepareCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(260, Math.floor(rect.width));
  const h = Math.max(180, Math.floor(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function drawGridAndAxes(ctx, pad, w, h, xMin, xMax, yMin, yMax, xLabel, yLabel) {
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  ctx.fillStyle = "#0b1221";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(pad.l, pad.t, pw, ph);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
  ctx.lineWidth = 1;
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#94a3b8";

  const nx = 5;
  for (let i = 0; i <= nx; i++) {
    const x = pad.l + (i / nx) * pw;
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ph);
    ctx.stroke();
    const val = xMin + (i / nx) * (xMax - xMin);
    ctx.textAlign = "center";
    ctx.fillText(val.toFixed(2), x, pad.t + ph + 16);
  }

  const ny = 4;
  for (let j = 0; j <= ny; j++) {
    const y = pad.t + (j / ny) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();
    const val = yMax - (j / ny) * (yMax - yMin);
    ctx.textAlign = "right";
    ctx.fillText(val.toFixed(2), pad.l - 6, y + 4);
  }

  // y=0 기준선
  if (yMin < 0 && yMax > 0) {
    const y0 = pad.t + ((yMax - 0) / (yMax - yMin)) * ph;
    ctx.strokeStyle = "rgba(226, 232, 240, 0.28)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, y0);
    ctx.lineTo(pad.l + pw, y0);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = "rgba(148, 163, 184, 0.32)";
  ctx.strokeRect(pad.l, pad.t, pw, ph);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 11px 'Pretendard', sans-serif";
  ctx.textAlign = "center";
  if (xLabel) ctx.fillText(xLabel, pad.l + pw / 2, h - 6);
  if (yLabel) {
    ctx.save();
    ctx.translate(13, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  return {
    pw,
    ph,
    toX: (xv) => pad.l + ((xv - xMin) / Math.max(xMax - xMin, 1e-9)) * pw,
    toY: (yv) => pad.t + ((yMax - yv) / Math.max(yMax - yMin, 1e-9)) * ph,
    fromX: (px) => xMin + ((px - pad.l) / Math.max(pw, 1)) * (xMax - xMin),
  };
}

function drawArrow(ctx, x1, y1, x2, y2, color, width = 2, label = "") {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const angle = Math.atan2(dy, dx);
  const head = Math.min(9, len * 0.35);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = "600 11px 'Pretendard', sans-serif";
    ctx.fillText(label, x2 + (dx >= 0 ? 6 : -6), y2 - 4);
  }
  ctx.restore();
}

/**
 * ODE 메인 캔버스 렌더링 (물리 기구 다이어그램 + 시간 파형 / 3D 로렌츠 / 2D 케플러 궤도)
 */
export function renderODEMain(canvas, sim, options = {}) {
  const { ctx, w, h } = prepareCanvas(canvas);
  const labId = sim.labId;
  const p = sim.params;
  const hist = sim.history;

  if (labId === "chaos_orbit") {
    if ((p.submode || "lorenz") === "kepler") {
      // 2D 케플러 행성 궤도 평면
      ctx.fillStyle = "#09101f";
      ctx.fillRect(0, 0, w, h);
      const cx = w * 0.54;
      const cy = h * 0.5;
      const scale = Math.min(w, h) * 0.28;

      // 배경 원형 그리드
      ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
      for (const r of [0.5, 1.0, 1.5]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 엄밀 케플러 타원 궤도
      const e = Math.min(Math.max(p.ecc ?? 0.5, 0), 0.85);
      const pSemi = 1 - e * e;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const phi = (k / 120) * Math.PI * 2;
        const r = pSemi / (1 + e * Math.cos(phi));
        const px = cx + r * Math.cos(phi) * scale;
        const py = cy - r * Math.sin(phi) * scale;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 다중 기법 비교 궤적 (Euler vs Verlet)
      if (options.compareSchemes) {
        const drawOrbitTrail = (arr, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          arr.forEach((pt, idx) => {
            const px = cx + pt.x * scale;
            const py = cy - pt.y * scale;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        };
        drawOrbitTrail(hist.euler, "rgba(245, 158, 11, 0.75)");
        drawOrbitTrail(hist.verlet, "rgba(16, 185, 129, 0.85)");
      }

      // 주 궤적
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      hist.primary.forEach((pt, idx) => {
        const px = cx + pt.x * scale;
        const py = cy - pt.y * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // 중심 항성
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
      grad.addColorStop(0, "#fef08a");
      grad.addColorStop(0.5, "#f59e0b");
      grad.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();

      // 현재 행성 위치 및 중력/속도 벡터
      const cur = sim.state;
      const px = cx + cur.x * scale;
      const py = cy - cur.y * scale;
      const rMag = Math.hypot(cur.x, cur.y);
      drawArrow(ctx, px, py, px + cur.vx * 28, py - cur.vy * 28, "#10b981", 2.2, "v");
      drawArrow(
        ctx,
        px,
        py,
        px - (cur.x / Math.max(rMag ** 3, 0.2)) * 22,
        py + (cur.y / Math.max(rMag ** 3, 0.2)) * 22,
        "#ef4444",
        2.2,
        "F_g"
      );

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px 'Pretendard', sans-serif";
      ctx.fillText(`케플러 중심력 궤도 (e=${e.toFixed(2)}) · 녹색 점선: 엄밀 타원`, 16, 24);
      return;
    }

    // 3D 로렌츠 열대류 카오스 어트랙터
    ctx.fillStyle = "#09101f";
    ctx.fillRect(0, 0, w, h);
    const yaw = options.rotYaw ?? 0.65;
    const pitch = options.rotPitch ?? 0.32;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const scale = Math.min(w, h) * 0.0145;
    const cx = w * 0.5;
    const cy = h * 0.55;

    const proj = (pt) => {
      const zShift = pt.z - 25;
      const x1 = pt.x * cosY - pt.y * sinY;
      const y1 = pt.x * sinY + pt.y * cosY;
      const y2 = y1 * cosP - zShift * sinP;
      return { px: cx + x1 * scale, py: cy - zShift * cosP * scale - y1 * sinP * scale * 0.5 + y2 * 0.1 };
    };

    const drawTrail3D = (arr, color, width) => {
      if (arr.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      arr.forEach((pt, idx) => {
        const { px, py } = proj(pt);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    drawTrail3D(hist.exact, "rgba(245, 158, 11, 0.82)", 1.9);
    drawTrail3D(hist.primary, "rgba(56, 189, 248, 0.92)", 2.3);

    const p1 = proj(sim.state);
    const p2 = proj(sim.twin);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(p1.px, p1.py, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(p2.px, p2.py, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 12px 'Pretendard', sans-serif";
    ctx.fillText("로렌츠 열대류 3D 어트랙터 (청색: 기준 궤적 / 주황: +10⁻⁴ 교란 궤적 · 드래그하여 3D 회전)", 14, 22);
    return;
  }

  // 상단 36%: 실시간 물리 메커니즘 애니메이션 (스프링-질량-힘벡터 또는 비선형 진자)
  // 하단 64%: 시간 궤적 x(t)
  const topH = Math.floor(h * 0.37);
  ctx.fillStyle = "#0b1221";
  ctx.fillRect(0, 0, w, h);

  if (labId === "oscillator") {
    // 스프링-댐퍼-질량 블록 및 실시간 힘 벡터 분해 표시
    const wallX = 42;
    const eqX = w * 0.52;
    const xScale = Math.min(w * 0.18, 95);
    const massX = Math.max(wallX + 36, Math.min(w - 40, eqX + sim.state.x * xScale));
    const midY = topH * 0.55;

    // 벽면 & 평형선
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallX, midY - 26);
    ctx.lineTo(wallX, midY + 26);
    ctx.stroke();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(eqX, 12);
    ctx.lineTo(eqX, topH - 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // 지그재그 스프링
    const coils = 12;
    const span = massX - 22 - wallX;
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wallX, midY);
    for (let i = 1; i <= coils; i++) {
      const xi = wallX + ((i - 0.5) / coils) * span;
      const yi = midY + (i % 2 === 0 ? -9 : 9);
      ctx.lineTo(xi, yi);
    }
    ctx.lineTo(massX - 22, midY);
    ctx.stroke();

    // 질량 블록
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(massX - 22, midY - 18, 44, 36, 7);
    ctx.fill();
    ctx.stroke();

    // 실시간 힘 화살표 (복원력, 감쇠력, 구동 외력)
    const terms = sim.getTermBreakdown();
    const fScale = 8.5;
    drawArrow(ctx, massX, midY - 10, massX + terms[0].value * fScale, midY - 10, "#10b981", 2.2, "F_복원");
    drawArrow(ctx, massX, midY + 2, massX + terms[1].value * fScale, midY + 2, "#f59e0b", 2.2, "F_감쇠");
    if (Math.abs(terms[2].value) > 0.02) {
      drawArrow(ctx, massX, midY + 14, massX + terms[2].value * fScale, midY + 14, "#ec4899", 2.2, "F_외력");
    }
  } else if (labId === "pendulum") {
    // 비선형 진자(실선) vs 소각도 선형 근사 진자(점선 유령) 실시간 물리 비교
    const pivotX = w * 0.5;
    const pivotY = topH * 0.25;
    const len = Math.min(topH * 0.62, 68);
    const th = sim.state.x;
    const thLin = sim.linearRef.x;

    // 선형 근사 유령 진자
    const lx = pivotX + len * Math.sin(thLin);
    const ly = pivotY + len * Math.cos(thLin);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(16, 185, 129, 0.55)";
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fill();

    // 실제 비선형 진자
    const bx = pivotX + len * Math.sin(th);
    const by = pivotY + len * Math.cos(th);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(bx, by, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'Pretendard', sans-serif";
    ctx.fillText(`실제 각도 θ = ${((th * 180) / Math.PI).toFixed(1)}° (녹색 점선: 선형 근사 sin θ ≈ θ)`, 14, 18);
  }

  // 하단 시간 파형 플롯
  const pad = { l: 48, r: 16, t: topH + 10, b: 28 };
  const tArr = hist.t;
  const tMin = tArr.length ? tArr[0] : 0;
  const tMax = Math.max(tMin + 2.0, tArr.length ? tArr[tArr.length - 1] : 2.0);

  let yMax = 1.5;
  for (const v of hist.primary) yMax = Math.max(yMax, Math.abs(v) * 1.15);
  yMax = Math.min(Math.max(yMax, 1.2), 12.0);

  const mapper = drawGridAndAxes(ctx, pad, w, h, tMin, tMax, -yMax, yMax, "시간 t", labId === "pendulum" ? "각도 θ (rad)" : "변위 x(t)");
  // 상단 물리 영역 다시 그리기 보존을 위해 상단 영역만 위에서 그림 -> drawGridAndAxes가 전체 배경을 덮지 않도록 유의!
  // 잠깐: drawGridAndAxes가 (0,0,w,h)를 칠하므로 상단 물리 다이어그램을 drawGridAndAxes 이후에 그리자!
  drawODEPhysicalHeader(ctx, w, topH, sim);

  const plotLine = (arr, color, width = 2.2, dashed = false) => {
    if (!arr || arr.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const px = mapper.toX(tArr[i]);
      const py = Math.max(pad.t, Math.min(h - pad.b, mapper.toY(arr[i])));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };

  if (options.compareSchemes) {
    plotLine(hist.euler, "#f59e0b", 1.7, false);
    plotLine(hist.verlet, "#a855f7", 1.7, false);
  }
  plotLine(hist.exact, "#10b981", 2.0, true);
  plotLine(hist.primary, "#38bdf8", 2.6, false);
}

function drawODEPhysicalHeader(ctx, w, topH, sim) {
  ctx.fillStyle = "#080f1d";
  ctx.fillRect(0, 0, w, topH);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.beginPath();
  ctx.moveTo(0, topH);
  ctx.lineTo(w, topH);
  ctx.stroke();

  const labId = sim.labId;
  const midY = topH * 0.56;

  if (labId === "oscillator") {
    const wallX = 44;
    const eqX = w * 0.52;
    const xScale = Math.min(w * 0.16, 85);
    const massX = Math.max(wallX + 38, Math.min(w - 42, eqX + sim.state.x * xScale));

    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallX, midY - 24);
    ctx.lineTo(wallX, midY + 24);
    ctx.stroke();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(eqX, 8);
    ctx.lineTo(eqX, topH - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    const coils = 12;
    const span = massX - 22 - wallX;
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wallX, midY);
    for (let i = 1; i <= coils; i++) {
      const xi = wallX + ((i - 0.5) / coils) * span;
      const yi = midY + (i % 2 === 0 ? -8 : 8);
      ctx.lineTo(xi, yi);
    }
    ctx.lineTo(massX - 22, midY);
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(massX - 22, midY - 17, 44, 34, 7);
    ctx.fill();
    ctx.stroke();

    const terms = sim.getTermBreakdown();
    const fScale = 6.5;
    drawArrow(ctx, massX, midY - 9, massX + terms[0].value * fScale, midY - 9, "#10b981", 2.2, "복원력");
    drawArrow(ctx, massX, midY + 2, massX + terms[1].value * fScale, midY + 2, "#f59e0b", 2.2, "감쇠력");
    if (Math.abs(terms[2].value) > 0.02) {
      drawArrow(ctx, massX, midY + 13, massX + terms[2].value * fScale, midY + 13, "#ec4899", 2.2, "구동외력");
    }

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "600 11px 'Pretendard', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("실시간 힘 벡터 분해 · 청색 실선: 수치해 / 녹색 점선: 엄밀 해석해", 12, 16);
  } else if (labId === "pendulum") {
    const pivotX = w * 0.5;
    const pivotY = topH * 0.24;
    const len = Math.min(topH * 0.62, 64);
    const th = sim.state.x;
    const thLin = sim.linearRef.x;

    const lx = pivotX + len * Math.sin(thLin);
    const ly = pivotY + len * Math.cos(thLin);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(16, 185, 129, 0.6)";
    ctx.beginPath();
    ctx.arc(lx, ly, 5.5, 0, Math.PI * 2);
    ctx.fill();

    const bx = pivotX + len * Math.sin(th);
    const by = pivotY + len * Math.cos(th);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "600 11px 'Pretendard', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`실시간 진자 비교: θ = ${((th * 180) / Math.PI).toFixed(1)}° (녹색 점선: 소각도 선형 근사 sin θ ≈ θ)`, 12, 16);
  }
}

/**
 * ODE 보조 캔버스 렌더링 (위상 공간 궤적 + 벡터장 / 공명 곡선 / 보존 에너지 진화)
 */
export function renderODESecondary(canvas, sim, resonanceData, mode = "phase") {
  const { ctx, w, h } = prepareCanvas(canvas);
  const pad = { l: 48, r: 16, t: 28, b: 30 };
  const hist = sim.history;
  const p = sim.params;

  if (mode === "resonance" && sim.labId === "oscillator" && resonanceData) {
    const maxAmp = Math.min(12.0, Math.max(...resonanceData.ampArr, 2.5));
    const mapper = drawGridAndAxes(ctx, pad, w, h, 0, 2.5, 0, maxAmp, "주파수비 r = ω_d / ω_0", "동적 증폭비 M(r)");

    // r = 1 공명 수직선
    const xRes = mapper.toX(1.0);
    ctx.strokeStyle = "rgba(236, 72, 153, 0.45)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xRes, pad.t);
    ctx.lineTo(xRes, h - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    resonanceData.rArr.forEach((r, idx) => {
      const px = mapper.toX(r);
      const py = Math.max(pad.t, mapper.toY(resonanceData.ampArr[idx]));
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 현재 운전 주파수비 마커
    const rCur = (p.omegad || 4.0) / Math.max(p.omega0 || 4.0, 0.1);
    const z = Math.max(p.zeta || 0.05, 0.025);
    const mCur = 1.0 / Math.sqrt((1 - rCur * rCur) ** 2 + (2 * z * rCur) ** 2);
    const cx = mapper.toX(Math.min(2.5, rCur));
    const cy = Math.max(pad.t, mapper.toY(mCur));
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 12px 'Pretendard', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`공명 응답 곡선 · 현재 ω_d/ω_0 = ${rCur.toFixed(2)} (증폭비 ${mCur.toFixed(2)}배)`, 12, 18);
    return;
  }

  if (mode === "energy" || sim.labId === "chaos_orbit") {
    const tArr = hist.t;
    const tMin = tArr[0] || 0;
    const tMax = Math.max(tMin + 1, tArr.at(-1) || 1);
    const allE = [...hist.energy, ...hist.energyEuler, ...hist.energyVerlet].filter(Number.isFinite);
    const eMin = Math.min(...allE, 0);
    const eMax = Math.max(...allE, eMin + 0.5);
    const mapper = drawGridAndAxes(
      ctx,
      pad,
      w,
      h,
      tMin,
      tMax,
      eMin - 0.05 * (eMax - eMin),
      eMax + 0.08 * (eMax - eMin),
      "시간 t",
      sim.labId === "chaos_orbit" && (p.submode || "lorenz") === "lorenz" ? "궤적 차이 |ΔX(t)|" : "역학적 에너지 E(t)"
    );

    const drawE = (arr, color) => {
      if (!arr || arr.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const px = mapper.toX(tArr[i]);
        const py = Math.max(pad.t, Math.min(h - pad.b, mapper.toY(arr[i])));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    drawE(hist.energyEuler, "#f59e0b");
    drawE(hist.energyVerlet, "#10b981");
    drawE(hist.energy, "#38bdf8");

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 12px 'Pretendard', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      sim.labId === "chaos_orbit" && (p.submode || "lorenz") === "lorenz"
        ? "나비효과 두 궤적 간 거리 |X₁(t) − X₂(t)|"
        : "적분기별 에너지 보존 비교 (청색: 현재 / 녹색: Verlet / 주황: Euler)",
      12,
      18
    );
    return;
  }

  // 위상 공간 (Phase Portrait: x vs v) + 배경 방향장 벡터
  const xMax = sim.labId === "pendulum" ? Math.PI * 1.35 : Math.max(2.0, ...hist.primary.map(Math.abs));
  const vMax = Math.max(4.5, ...hist.velocity.map(Math.abs));
  const mapper = drawGridAndAxes(
    ctx,
    pad,
    w,
    h,
    -xMax,
    xMax,
    -vMax,
    vMax,
    sim.labId === "pendulum" ? "각도 θ" : "변위 x",
    sim.labId === "pendulum" ? "각속도 dθ/dt" : "속도 v = dx/dt"
  );

  // 배경 위상 벡터장 및 단진자 Separatrix 표시
  const accelFn = sim.getAccelFn(false);
  for (let gx = -xMax * 0.85; gx <= xMax * 0.85; gx += xMax * 0.28) {
    for (let gv = -vMax * 0.8; gv <= vMax * 0.8; gv += vMax * 0.32) {
      const dx = gv;
      const dv = accelFn(gx, gv, sim.t);
      const mag = Math.hypot(dx, dv) || 1;
      const px = mapper.toX(gx);
      const py = mapper.toY(gv);
      drawArrow(ctx, px, py, px + (dx / mag) * 11, py - (dv / mag) * 11, "rgba(148, 163, 184, 0.25)", 1);
    }
  }

  // 단진자 Separatrix (왕복 진동과 연속 회전의 경계선 v = ±2 ω0 cos(θ/2))
  if (sim.labId === "pendulum" && (p.submode || "pendulum") === "pendulum") {
    for (const sign of [-1, 1]) {
      ctx.strokeStyle = "rgba(236, 72, 153, 0.42)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const th = -Math.PI + (i / 80) * (2 * Math.PI);
        const vSep = sign * 2 * (p.omega0 || 3.0) * Math.cos(th / 2);
        const px = mapper.toX(th);
        const py = mapper.toY(vSep);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  for (let i = 0; i < hist.primary.length; i++) {
    let xv = hist.primary[i];
    if (sim.labId === "pendulum") {
      xv = ((((xv + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    }
    const px = mapper.toX(xv);
    const py = mapper.toY(hist.velocity[i]);
    if (i === 0 || Math.abs(xv - hist.primary[i - 1]) > Math.PI) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  let curX = sim.state.x;
  if (sim.labId === "pendulum") {
    curX = ((((curX + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  }
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(mapper.toX(curX), mapper.toY(sim.state.v), 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px 'Pretendard', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    sim.labId === "pendulum"
      ? "위상 공간 (θ, dθ/dt) · 분홍 점선: 왕복/회전 경계 Separatrix"
      : "위상 공간 궤적 (x, v) · 닫힌 타원은 에너지 보존, 안쪽 나선은 소산",
    12,
    18
  );
}

/**
 * 1D PDE 메인 파형 캔버스 렌더링 (해석해, 다중 수치기법 동시 비교, 스텐실 프로브 크로스헤어 포함)
 */
export function renderPDE1DMain(canvas, sim, probeIdx, options = {}) {
  const { ctx, w, h } = prepareCanvas(canvas);
  const pad = { l: 48, r: 18, t: 32, b: 30 };
  const curves = sim.getCurrentCurves();
  const xArr = sim.x;

  let yMin = Infinity;
  let yMax = -Infinity;
  const scan = (arr) => {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < yMin) yMin = arr[i];
      if (arr[i] > yMax) yMax = arr[i];
    }
  };
  scan(curves.primary);
  scan(curves.initial);
  scan(curves.exact);
  if (curves.bathy) scan(curves.bathy);

  if (!Number.isFinite(yMin) || Math.abs(yMax - yMin) < 0.1) {
    yMin = -0.2;
    yMax = 1.2;
  } else {
    const span = yMax - yMin;
    yMin -= 0.12 * span;
    yMax += 0.16 * span;
  }

  const mapper = drawGridAndAxes(ctx, pad, w, h, 0, 1, yMin, yMax, "공간 위치 x", sim.activeField);

  // 바닥 지형 b(x) 채우기 (천수 방정식)
  if (curves.bathy) {
    ctx.fillStyle = "rgba(100, 116, 139, 0.45)";
    ctx.beginPath();
    ctx.moveTo(mapper.toX(0), mapper.toY(yMin));
    for (let i = 0; i < xArr.length; i++) {
      ctx.lineTo(mapper.toX(xArr[i]), mapper.toY(curves.bathy[i]));
    }
    ctx.lineTo(mapper.toX(1), mapper.toY(yMin));
    ctx.closePath();
    ctx.fill();
  }

  const drawCurve = (arr, color, width = 2.2, dashed = false, fillAlpha = 0) => {
    if (!arr) return;
    ctx.save();
    if (fillAlpha > 0) {
      ctx.fillStyle = color.replace(")", `, ${fillAlpha})`).replace("rgb", "rgba");
      ctx.beginPath();
      ctx.moveTo(mapper.toX(xArr[0]), mapper.toY(Math.max(0, yMin)));
      for (let i = 0; i < xArr.length; i++) {
        ctx.lineTo(mapper.toX(xArr[i]), mapper.toY(arr[i]));
      }
      ctx.lineTo(mapper.toX(xArr[xArr.length - 1]), mapper.toY(Math.max(0, yMin)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i < xArr.length; i++) {
      const px = mapper.toX(xArr[i]);
      const py = Math.max(pad.t, Math.min(h - pad.b, mapper.toY(arr[i])));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };

  if (curves.initial) drawCurve(curves.initial, "rgba(148, 163, 184, 0.45)", 1.5, true);
  if (options.compareSchemes && curves.comparisons) {
    for (const comp of curves.comparisons) {
      drawCurve(comp.data, comp.color, 1.9, false);
    }
  }
  if (curves.exact) drawCurve(curves.exact, "#10b981", 2.2, true);
  drawCurve(curves.primary, "rgb(56, 189, 248)", 2.8, false, 0.12);

  // 선택된 프로브 격자점 스텐실(i-1, i, i+1) 및 접선 기울기 표시
  const st = sim.getStencilAndTerms(probeIdx);
  const pxC = mapper.toX(st.x);
  const pyC = mapper.toY(st.uCenter);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pxC, pad.t);
  ctx.lineTo(pxC, h - pad.b);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const [idxOffset, col, rad] of [
    [-1, "#94a3b8", 4],
    [1, "#94a3b8", 4],
    [0, "#f59e0b", 6.5],
  ]) {
    const k = Math.max(0, Math.min(sim.n - 1, st.idx + idxOffset));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(mapper.toX(xArr[k]), mapper.toY(curves.primary[k]), rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 상단 범례 및 대류 속도 화살표 표시
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px 'Pretendard', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `${sim.activeField} (t = ${sim.t.toFixed(3)}) · 청색: 수치해${curves.exact ? " / 녹색 점선: 엄밀해" : ""} · 주황점: 스텐실 프로브 x=${st.x.toFixed(2)}`,
    12,
    19
  );
}

/**
 * 1D 시공간(x-t) 다이어그램 & 특성선(Characteristics) 또는 보존 진단 차트 렌더링
 */
export function renderPDE1DSecondary(canvas, sim, mode = "xt") {
  const { ctx, w, h } = prepareCanvas(canvas);
  const pad = { l: 48, r: 16, t: 28, b: 30 };

  if (mode === "von_neumann") {
    const vn = sim.vonNeumannData;
    if (!vn) return;
    const yMax = Math.max(1.25, ...vn.gPrimary, ...vn.gSecondary);
    const mapper = drawGridAndAxes(ctx, pad, w, h, 0, Math.PI, 0, yMax, "무차원 파수 위상 kΔx (0 → π)", "증폭 인자 |G(kΔx)|");

    // |G| = 1 안정성 한계선
    const y1 = mapper.toY(1.0);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, y1);
    ctx.lineTo(w - pad.r, y1);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawG = (arr, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      arr.forEach((v, i) => {
        const px = mapper.toX(vn.betaArr[i]);
        const py = Math.max(pad.t, Math.min(h - pad.b, mapper.toY(v)));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };
    drawG(vn.gSecondary, "#10b981");
    drawG(vn.gPrimary, "#f59e0b");

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 12px 'Pretendard', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Von Neumann 안정성 스펙트럼 · |G| > 1 이면 격자 진동 폭발`, 12, 18);
    return;
  }

  if (mode === "diagnostics") {
    const dh = sim.diagHistory;
    const tArr = dh.t;
    const tMin = tArr[0] || 0;
    const tMax = Math.max(tMin + 0.2, tArr.at(-1) || 0.2);
    const m0 = dh.mass[0] || 1;
    const e0 = dh.energy[0] || 1;
    const mapper = drawGridAndAxes(ctx, pad, w, h, tMin, tMax, 0, 1.25, "시간 t", "정규화 보존량 (초기값=1)");

    const drawNorm = (arr, ref, color) => {
      if (arr.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      arr.forEach((v, i) => {
        const px = mapper.toX(tArr[i]);
        const py = Math.max(pad.t, Math.min(h - pad.b, mapper.toY(v / Math.max(Math.abs(ref), 1e-6))));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };
    drawNorm(dh.mass, m0, "#10b981");
    drawNorm(dh.energy, e0, "#38bdf8");

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 12px 'Pretendard', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("시간에 따른 총 적분량(녹색 ∫u dx) 및 제곱 에너지(청색 ½∫u² dx) 변화", 12, 18);
    return;
  }

  // 기본: x-t 시공간 다이어그램 + 특성선(Characteristic Lines)
  const tMax = Math.max(0.15, sim.t);
  const tMin = sim.xtTimes[0] ?? 0;
  const mapper = drawGridAndAxes(ctx, pad, w, h, 0, 1, tMin, tMax, "공간 위치 x", "시간 t");

  const rows = sim.xtHistory.length;
  const cols = sim.n;
  if (rows > 1) {
    let zMin = Infinity;
    let zMax = -Infinity;
    for (const r of sim.xtHistory) {
      for (let i = 0; i < r.length; i++) {
        if (r[i] < zMin) zMin = r[i];
        if (r[i] > zMax) zMax = r[i];
      }
    }
    const span = Math.max(zMax - zMin, 1e-5);
    const cellW = mapper.pw / cols + 0.8;
    const cellH = mapper.ph / rows + 0.8;

    for (let r = 0; r < rows; r++) {
      const rowArr = sim.xtHistory[r];
      const py = pad.t + ((rows - 1 - r) / rows) * mapper.ph;
      for (let c = 0; c < cols; c++) {
        const norm = (rowArr[c] - zMin) / span;
        const [cr, cg, cb] = sampleColormap(norm, "turbo");
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(pad.l + (c / cols) * mapper.pw, py, cellW, cellH);
      }
    }
  }

  // 특성선(Characteristics) 오버레이:
  // Burgers: x(t) = x0 + u0(x0)*t (교차하며 충격파 형성!)
  // Wave-Convection: x(t) = x0 + (U0 ± c)*t
  // Euler: x = 0.5 + (u-c)t, u*t, (u+c)t
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, mapper.pw, mapper.ph);
  ctx.clip();

  if (sim.labId === "burgers" && sim.u0) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.1;
    const step = Math.max(1, Math.floor(sim.n / 16));
    for (let i = 0; i < sim.n; i += step) {
      const x0 = sim.x[i];
      const slope = sim.u0[i];
      ctx.beginPath();
      ctx.moveTo(mapper.toX(x0), mapper.toY(tMin));
      ctx.lineTo(mapper.toX(x0 + slope * (tMax - tMin)), mapper.toY(tMax));
      ctx.stroke();
    }
  } else if (sim.labId === "euler") {
    const p = sim.params;
    const ex = riemannExact1D([0.5], 0.1, p.gamma ?? 1.4, p.rhoL ?? 1, p.pL ?? 1, p.rhoR ?? 0.125, p.pR ?? 0.1);
    const cL = Math.sqrt(((p.gamma ?? 1.4) * (p.pL ?? 1)) / (p.rhoL ?? 1));
    const cR = Math.sqrt(((p.gamma ?? 1.4) * (p.pR ?? 0.1)) / (p.rhoR ?? 0.125));
    const rays = [
      { speed: -cL, color: "#38bdf8", label: "팽창파 u-c" },
      { speed: ex.uStar, color: "#f59e0b", label: "접촉면 u*" },
      { speed: cR * 1.45, color: "#ef4444", label: "충격파 S" },
    ];
    for (const ray of rays) {
      ctx.strokeStyle = ray.color;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(mapper.toX(0.5), mapper.toY(0));
      ctx.lineTo(mapper.toX(0.5 + ray.speed * tMax), mapper.toY(tMax));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px 'Pretendard', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    sim.labId === "burgers"
      ? "x–t 시공간 지도 & 특성선 x(t)=x₀+u₀(x₀)t (직선들이 교차하는 곳에서 충격파 탄생)"
      : sim.labId === "euler"
      ? "x–t 시공간 파동 다이어그램 (좌측 팽창파 · 중앙 접촉면 · 우측 충격파)"
      : "x–t 시공간 지도 (기울어진 띠의 기울기 = 이류/파동 전파 속도 dx/dt)",
    12,
    18
  );
}

/**
 * 2D PDE 메인 캔버스 렌더링 (2D 컬러맵 필드 + 속도 벡터장 + 라그랑주 입자 + 도플러/마하콘 기하 오버레이 OR 3D 회전 서피스)
 */
export function renderPDE2DMain(canvas, sim, probeI, probeJ, options = {}) {
  const { ctx, w, h } = prepareCanvas(canvas);
  const n = sim.n;
  const fieldArr = sim.getPrimaryFieldArray();

  let zMin = Infinity;
  let zMax = -Infinity;
  for (let k = 0; k < fieldArr.length; k++) {
    const v = fieldArr[k];
    if (v < zMin) zMin = v;
    if (v > zMax) zMax = v;
  }
  if (!Number.isFinite(zMin) || Math.abs(zMax - zMin) < 1e-6) {
    zMin = -1;
    zMax = 1;
  }

  const diverging =
    (zMin < -0.05 && zMax > 0.05) ||
    sim.activeField.includes("와도") ||
    sim.activeField.includes("변위") ||
    sim.activeField.includes("염료");
  if (diverging) {
    const lim = Math.max(Math.abs(zMin), Math.abs(zMax), 0.1);
    zMin = -lim;
    zMax = lim;
  }

  const mapName = sim.activeField.includes("슐리렌")
    ? "schlieren"
    : sim.labId === "shallow_water" && sim.activeField.includes("수면")
    ? "ocean"
    : diverging
    ? "rdbu"
    : "turbo";

  // 3D 서피스 뷰 모드
  if (options.view3D) {
    render3DSurface(ctx, w, h, sim, fieldArr, zMin, zMax, mapName, options);
    return;
  }

  ctx.fillStyle = "#080f1d";
  ctx.fillRect(0, 0, w, h);

  const pad = { l: 42, r: 58, t: 32, b: 28 };
  const size = Math.min(w - pad.l - pad.r, h - pad.t - pad.b);
  const ox = pad.l + (w - pad.l - pad.r - size) * 0.5;
  const oy = pad.t + (h - pad.t - pad.b - size) * 0.5;

  // 오프스크린 캔버스에 n x n 픽셀 생성 후 부드럽게 확대
  if (!canvas._offscreen || canvas._offscreen.width !== n) {
    const off = document.createElement("canvas");
    off.width = n;
    off.height = n;
    canvas._offscreen = off;
  }
  const offCtx = canvas._offscreen.getContext("2d");
  const imgData = offCtx.createImageData(n, n);
  const data = imgData.data;
  const span = Math.max(zMax - zMin, 1e-9);

  for (let j = 0; j < n; j++) {
    const rowFlip = n - 1 - j;
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const pIdx = (rowFlip * n + i) * 4;
      if (sim.obstacle[k]) {
        data[pIdx] = 51;
        data[pIdx + 1] = 65;
        data[pIdx + 2] = 85;
        data[pIdx + 3] = 255;
        continue;
      }
      const norm = (fieldArr[k] - zMin) / span;
      const [r, g, b] = sampleColormap(norm, mapName);
      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = 255;
    }
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas._offscreen, ox, oy, size, size);
  ctx.restore();

  // 원기둥 장애물 윤곽선 강조
  if (sim.labId === "navier_stokes" && (sim.params.scenario || "cylinder") === "cylinder") {
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox + 0.26 * size, oy + 0.5 * size, 0.075 * size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 라그랑주 유체 입자 추적(Lagrangian Tracer Particles) 오버레이
  if (options.showParticles !== false) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 1.3;
    for (const pt of sim.particles) {
      const px = ox + pt.x * size;
      const py = oy + (1 - pt.y) * size;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - pt.vx * 6, py + pt.vy * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 속도 벡터장(Quiver Arrows) 오버레이
  if (options.showVectors !== false) {
    const stride = Math.max(4, Math.floor(n / 11));
    for (let j = Math.floor(stride / 2); j < n; j += stride) {
      for (let i = Math.floor(stride / 2); i < n; i += stride) {
        if (sim.obstacle[j * n + i]) continue;
        const { ux, vy } = sim.sampleVelocity(sim.x[i], sim.y[j]);
        const mag = Math.hypot(ux, vy);
        if (mag < 1e-3) continue;
        const px = ox + sim.x[i] * size;
        const py = oy + (1 - sim.y[j]) * size;
        const scale = Math.min(16, (size / 14) * Math.min(mag, 1.5));
        drawArrow(
          ctx,
          px,
          py,
          px + (ux / mag) * scale,
          py - (vy / mag) * scale,
          "rgba(255, 255, 255, 0.65)",
          1.2
        );
      }
    }
  }

  // 이류-파동 결합 모드: 파원 및 초음속 마하 원뿔(Mach Cone) 기하선 표시
  if (sim.labId === "wave_convection" && (sim.params.submode || "advection") === "convected_wave") {
    const sx = ox + (sim.sourceX ?? 0.35) * size;
    const sy = oy + (1 - (sim.sourceY ?? 0.5)) * size;
    const cx = sim.toggles.convectionOn ? sim.params.cx ?? 1.0 : 0.0;
    const cy = sim.toggles.convectionOn ? sim.params.cy ?? 0.0 : 0.0;
    const uMag = Math.hypot(cx, cy);
    const wc = Math.max(sim.params.waveC ?? 1.0, 0.05);
    const mach = uMag / wc;

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();

    if (mach > 1.02) {
      const flowAngle = Math.atan2(-cy, cx);
      const mu = Math.asin(1.0 / mach);
      ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(flowAngle + sgn * mu) * size * 0.75,
          sy + Math.sin(flowAngle + sgn * mu) * size * 0.75
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  // 프로브 크로스헤어 및 단면선 표시
  const pxProbe = ox + sim.x[probeI] * size;
  const pyProbe = oy + (1 - sim.y[probeJ]) * size;
  ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(ox, pyProbe);
  ctx.lineTo(ox + size, pyProbe);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pxProbe, pyProbe, 6.5, 0, Math.PI * 2);
  ctx.stroke();

  // 우측 컬러바
  const cbX = ox + size + 12;
  const cbW = 12;
  for (let row = 0; row < size; row++) {
    const norm = 1 - row / size;
    const [r, g, b] = sampleColormap(norm, mapName);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(cbX, oy + row, cbW, 1.5);
  }
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.strokeRect(cbX, oy, cbW, size);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(zMax.toFixed(2), cbX + cbW + 4, oy + 9);
  ctx.fillText(zMin.toFixed(2), cbX + cbW + 4, oy + size);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.strokeRect(ox, oy, size, size);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px 'Pretendard', sans-serif";
  ctx.fillText(
    `${sim.activeField} (t=${sim.t.toFixed(3)}) · 화면을 터치/드래그하여 파원·열원·소용돌이 주입`,
    12,
    19
  );

  // 캔버스 좌표 변환 헬퍼 저장 (터치 이벤트용)
  canvas._plotRect = { ox, oy, size };
}

function render3DSurface(ctx, w, h, sim, fieldArr, zMin, zMax, mapName, options) {
  ctx.fillStyle = "#080f1d";
  ctx.fillRect(0, 0, w, h);

  const n = sim.n;
  const step = Math.max(1, Math.floor(n / 34));
  const yaw = options.rotYaw ?? 0.68;
  const pitch = options.rotPitch ?? 0.55;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  const scale = Math.min(w, h) * 0.62;
  const cx = w * 0.5;
  const cy = h * 0.56;
  const span = Math.max(zMax - zMin, 1e-6);

  const project = (xNorm, yNorm, zNorm) => {
    const X = xNorm - 0.5;
    const Y = yNorm - 0.5;
    const Z = (zNorm - 0.5) * 0.48;
    const rx = X * cosY - Y * sinY;
    const ry = X * sinY + Y * cosY;
    const sx = cx + rx * scale;
    const sy = cy + (ry * sinP - Z * cosP) * scale;
    return { sx, sy, depth: ry };
  };

  // 뒤에서 앞으로 쿼드 메쉬 정렬 및 페인터 렌더링
  const quads = [];
  for (let j = 0; j < n - step; j += step) {
    for (let i = 0; i < n - step; i += step) {
      const v00 = (fieldArr[j * n + i] - zMin) / span;
      const v10 = (fieldArr[j * n + (i + step)] - zMin) / span;
      const v11 = (fieldArr[(j + step) * n + (i + step)] - zMin) / span;
      const v01 = (fieldArr[(j + step) * n + i] - zMin) / span;
      const avg = 0.25 * (v00 + v10 + v11 + v01);

      const p00 = project(sim.x[i], sim.y[j], v00);
      const p10 = project(sim.x[i + step], sim.y[j], v10);
      const p11 = project(sim.x[i + step], sim.y[j + step], v11);
      const p01 = project(sim.x[i], sim.y[j + step], v01);

      quads.push({ p00, p10, p11, p01, avg, depth: p00.depth + p11.depth });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);

  for (const q of quads) {
    const [r, g, b] = sampleColormap(q.avg, mapName);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.32)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(q.p00.sx, q.p00.sy);
    ctx.lineTo(q.p10.sx, q.p10.sy);
    ctx.lineTo(q.p11.sx, q.p11.sy);
    ctx.lineTo(q.p01.sx, q.p01.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px 'Pretendard', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`3D 공간 분포 서피스 (${sim.activeField}) · 화면을 드래그하여 3D 시점 회전`, 12, 19);
}

/**
 * 2D 보조 캔버스: 프로브 수평 단면 파형 (y = y_probe) 실시간 비교
 */
export function renderPDE2DSlice(canvas, sim, probeI, probeJ) {
  const { ctx, w, h } = prepareCanvas(canvas);
  const pad = { l: 48, r: 16, t: 28, b: 30 };
  const n = sim.n;
  const fieldArr = sim.getPrimaryFieldArray();

  let yMin = Infinity;
  let yMax = -Infinity;
  for (let k = 0; k < fieldArr.length; k++) {
    if (fieldArr[k] < yMin) yMin = fieldArr[k];
    if (fieldArr[k] > yMax) yMax = fieldArr[k];
  }
  if (!Number.isFinite(yMin) || Math.abs(yMax - yMin) < 0.05) {
    yMin = -0.5;
    yMax = 1.0;
  } else {
    const sp = yMax - yMin;
    yMin -= 0.1 * sp;
    yMax += 0.12 * sp;
  }

  const mapper = drawGridAndAxes(
    ctx,
    pad,
    w,
    h,
    0,
    1,
    yMin,
    yMax,
    "x 위치",
    `y = ${sim.y[probeJ].toFixed(2)} 단면`
  );

  // 초기 단면 점선
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = mapper.toX(sim.x[i]);
    const py = mapper.toY(sim.u0[probeJ * n + i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 현재 단면 실선
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = mapper.toX(sim.x[i]);
    const py = Math.max(pad.t, Math.min(h - pad.b, mapper.toY(fieldArr[probeJ * n + i])));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  const curVal = fieldArr[probeJ * n + probeI];
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(mapper.toX(sim.x[probeI]), mapper.toY(curVal), 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px 'Pretendard', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`2D 필드의 1D 수평 단면 (y = ${sim.y[probeJ].toFixed(2)}) · 회색 점선: 초기 분포`, 12, 18);
}
