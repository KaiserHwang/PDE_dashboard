// scripts/build.mjs
// src/ 아래의 모듈형 물리·수치해석 엔진과 UI/CSS를 단일 무서버 모바일 웹앱 index.html로 빌드합니다.
// 이를 통해 GitHub Pages(https://kaiserhwang.github.io/PDE_dashboard/)는 물론
// 스마트폰에 index.html 파일 하나만 다운로드해 열어도(file://) 100% 완벽히 작동합니다.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

const jsFiles = [
  "src/curriculum.js",
  "src/solvers-ode.js",
  "src/solvers-pde1d.js",
  "src/solvers-pde2d.js",
  "src/renderer.js",
  "src/app.js",
];

let combinedJS = "";
for (const file of jsFiles) {
  let code = fs.readFileSync(path.join(root, file), "utf8");
  // ES module import/export 구문 제거하여 단일 IIFE 스코프 내에서 동작하도록 변환
  code = code.replace(/^\s*import\s+[\s\S]*?from\s+["'].*?["'];?\s*$/gm, "");
  code = code.replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, "$1 ");
  combinedJS += `\n// === ${file} ===\n` + code + "\n";
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#060b16" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="PhysiLab PDE" />
  <title>PhysiLab PDE Studio · 미분방정식 물리·유체역학 인터랙티브 실험실</title>
  <link rel="manifest" href="manifest.json" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <style>
${css}
  </style>
</head>
<body>
  <header class="studio-header">
    <div class="header-top">
      <div class="brand-title">
        <div class="brand-logo">∂</div>
        <div class="brand-text">
          <h1>PhysiLab PDE &amp; CFD Studio</h1>
          <span>물리학 상미분(ODE) &amp; 유체역학 편미분(1D/2D PDE) 수치해석 실험실</span>
        </div>
      </div>
      <div class="header-actions">
        <a href="https://github.com/KaiserHwang/PDE_dashboard" target="_blank" rel="noopener" class="ctrl-btn" style="text-decoration:none;">
          GitHub
        </a>
      </div>
    </div>
    <nav class="lab-pill-bar" id="labPillBar" aria-label="실험실 선택"></nav>
  </header>

  <main class="studio-container">
    <!-- 좌측 / 상단: 수식 배너 + 1D/2D/3D 실시간 캔버스 영역 -->
    <section class="simulation-column">
      <div class="equation-banner">
        <div class="eq-header-row">
          <span class="eq-badge" id="eqBadge">PDE · 파동 &amp; 이류</span>
          <div class="dim-switcher" id="dimSwitcher"></div>
        </div>
        <h2 class="eq-title" id="eqTitle">04. 파동·이류 결합 방정식</h2>
        <p class="eq-summary" id="eqSummary"></p>
        <div class="eq-math-box" id="eqMathBox"></div>
        <div class="term-toggle-bar" id="termToggleBar"></div>
      </div>

      <div class="canvas-card">
        <div class="transport-toolbar">
          <div class="btn-group">
            <button class="ctrl-btn" id="btnPlayPause">⏸ 일시정지</button>
            <button class="ctrl-btn" id="btnStep">⏭ 1스텝 Δt</button>
            <button class="ctrl-btn" id="btnReset">↺ 초기화</button>
          </div>
          <div class="btn-group">
            <select class="select-pill" id="fieldSelect" aria-label="관찰 물리량 선택"></select>
            <select class="select-pill" id="subModeSelect" aria-label="보조 차트 선택"></select>
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-box">
            <span class="kpi-label">무차원 시간</span>
            <span class="kpi-val" id="kpiTime">t = 0.000</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">현재 최댓값 / 상태</span>
            <span class="kpi-val" id="kpiMax">1.000</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">보존 적분 / 에너지</span>
            <span class="kpi-val" id="kpiCons">0.000</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">격자 · 수치 조건</span>
            <span class="kpi-val" id="kpiNum">2D N=72</span>
          </div>
        </div>

        <div class="canvas-main-wrap">
          <canvas id="mainCanvas" class="sim-canvas"></canvas>
        </div>

        <div class="canvas-sub-wrap">
          <canvas id="subCanvas" class="sim-canvas"></canvas>
        </div>
      </div>
    </section>

    <!-- 우측 / 하단: 프리셋 · 계수 슬라이더 · 항별 물리 분해 · 스텐실 현미경 · 수치해석 비교 -->
    <aside class="inspector-card">
      <div class="inspector-tabs">
        <button class="tab-btn active" data-tab="controls">🎛️ 실험 제어</button>
        <button class="tab-btn" data-tab="terms">🔬 항별 분해·격자</button>
        <button class="tab-btn" data-tab="numerics">⚖️ 수치해법·수렴</button>
        <button class="tab-btn" data-tab="guide">📘 물리해설·미션</button>
      </div>
      <div id="inspectorBody"></div>
    </aside>
  </main>

  <script>
(() => {
${combinedJS}
})();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "index.html"), html, "utf8");
console.log(`✅ index.html 빌드 완료 (${(Buffer.byteLength(html, "utf8") / 1024).toFixed(1)} KB)`);
