// src/app.js
// PhysiLab PDE & Fluid Dynamics Interactive Studio v2.0 — 메인 인터랙티브 컨트롤러

import { LABS, LAB_MAP } from "./curriculum.js";
import { ODESimulator, computeResonanceCurve } from "./solvers-ode.js";
import { PDE1DSimulator, computeVonNeumannCurve, runConvergenceStudy1D } from "./solvers-pde1d.js";
import { PDE2DSimulator } from "./solvers-pde2d.js";
import {
  renderODEMain,
  renderODESecondary,
  renderPDE1DMain,
  renderPDE1DSecondary,
  renderPDE2DMain,
  renderPDE2DSlice,
} from "./renderer.js";

const CONTROL_SCHEMAS = {
  oscillator: [
    { key: "zeta", label: "감쇠비 ζ (Damping Ratio)", min: 0.0, max: 1.6, step: 0.02 },
    { key: "omega0", label: "고유 각진동수 ω₀", min: 1.0, max: 8.0, step: 0.2 },
    { key: "F0", label: "외력 구동 진폭 F₀", min: 0.0, max: 2.5, step: 0.1 },
    { key: "omegad", label: "외력 구동 주파수 ω_d", min: 0.5, max: 8.0, step: 0.1 },
    { key: "dt", label: "시간 적분 간격 Δt", min: 0.005, max: 0.06, step: 0.005 },
    {
      key: "scheme",
      label: "수치 적분 기법",
      type: "select",
      options: [
        { value: "rk4", label: "RK4 (4차 룬게-쿠타 · 고정밀)" },
        { value: "verlet", label: "Velocity Verlet (심플렉틱 에너지 보존)" },
        { value: "euler", label: "Forward Euler (1차 명시적 · 에너지 발산 관찰)" },
      ],
    },
  ],
  pendulum: [
    {
      key: "submode",
      label: "비선형 동역학 모형",
      type: "select",
      options: [
        { value: "pendulum", label: "비선형 대각도 단진자 (sin θ vs θ)" },
        { value: "vanderpol", label: "Van der Pol 자려 진동 (Limit Cycle)" },
        { value: "duffing", label: "Duffing 이중 우물 비선형 진동" },
      ],
    },
    { key: "theta0", label: "초기 각도/변위 θ₀ (rad)", min: 0.1, max: 3.08, step: 0.04 },
    { key: "omegaInit", label: "초기 각속도 ω(0)", min: 0.0, max: 8.0, step: 0.2 },
    { key: "omega0", label: "고유 진동 계수 ω₀", min: 1.0, max: 5.0, step: 0.2 },
    { key: "zeta", label: "감쇠 / 비선형 이득 계수 ζ", min: 0.0, max: 1.5, step: 0.02 },
    { key: "F0", label: "주기 외력 진폭 F₀", min: 0.0, max: 1.5, step: 0.05 },
    {
      key: "scheme",
      label: "시간 적분 기법",
      type: "select",
      options: [
        { value: "verlet", label: "Velocity Verlet (심플렉틱 보존)" },
        { value: "rk4", label: "RK4 (4차 룬게-쿠타)" },
        { value: "euler", label: "Forward Euler (1차 명시적)" },
      ],
    },
  ],
  chaos_orbit: [
    {
      key: "submode",
      label: "물리 시스템 선택",
      type: "select",
      options: [
        { value: "lorenz", label: "로렌츠 열대류 카오스 어트랙터 (3D)" },
        { value: "kepler", label: "케플러 중심력 행성 궤도 역학 (2D)" },
      ],
    },
    { key: "rho", label: "레일리 수 ρ (열대류 온도차 구동)", min: 5.0, max: 45.0, step: 0.5 },
    { key: "sigma", label: "프란틀 수 σ (점성/열확산 비)", min: 2.0, max: 20.0, step: 0.5 },
    { key: "ecc", label: "케플러 궤도 이심률 e", min: 0.0, max: 0.8, step: 0.05 },
    { key: "dt", label: "시간 적분 간격 Δt", min: 0.005, max: 0.03, step: 0.002 },
    {
      key: "scheme",
      label: "수치 적분 기법",
      type: "select",
      options: [
        { value: "verlet", label: "Symplectic Verlet (케플러 각운동량 보존)" },
        { value: "rk4", label: "RK4 (4차 룬게-쿠타)" },
        { value: "euler", label: "Forward Euler (1차 · 궤도 붕괴 실증)" },
      ],
    },
  ],
  wave_convection: [
    {
      key: "submode",
      label: "파동·이류 방정식 모드",
      type: "select",
      options: [
        { value: "advection", label: "선형 이류 수송 (u_t + c·∇u = 0)" },
        { value: "convected_wave", label: "이류-파동 결합 (도플러 편이 & 초음속 마하콘)" },
        { value: "swirl", label: "회전 와류 속도장 이류 (2D Swirling Convection)" },
        { value: "classical_wave", label: "고전 2차 파동 방정식 (u_tt = c²∇²u)" },
      ],
    },
    { key: "cx", label: "x방향 대류 유속 c_x (또는 U₀)", min: -2.0, max: 2.0, step: 0.05 },
    { key: "cy", label: "y방향 대류 유속 c_y (2D 대류 방향)", min: -1.5, max: 1.5, step: 0.05 },
    { key: "waveC", label: "매질 내 파동 속도 c", min: 0.2, max: 1.8, step: 0.05 },
    {
      key: "profile",
      label: "초기 파형 / 파원 형태",
      type: "select",
      options: [
        { value: "gaussian", label: "가우시안 파속 (Gaussian Pulse)" },
        { value: "pulse_train", label: "연속 파원 방출 (도플러/마하 원뿔 관찰용)" },
        { value: "combo", label: "가우시안 + 사각 계단 복합 파형 (기법 비교용)" },
        { value: "double", label: "이중 파원 간섭 (Double Source)" },
        { value: "step", label: "불연속 사각 펄스 (Square Step)" },
      ],
    },
    {
      key: "scheme",
      label: "수치 이산화 기법",
      type: "select",
      options: [
        { value: "muscl", label: "TVD MUSCL + Superbee (2차 무진동 고정밀)" },
        { value: "lw", label: "Lax–Wendroff (2차 · 분산 진동 관찰)" },
        { value: "upwind", label: "1차 Upwind (풍상차분 · 수치 확산 관찰)" },
      ],
    },
    { key: "cfl", label: "CFL 안정성 배율", min: 0.15, max: 0.98, step: 0.05 },
  ],
  conv_diff: [
    { key: "ux", label: "x방향 대류 유속 u_x", min: -1.8, max: 1.8, step: 0.05 },
    { key: "uy", label: "y방향 대류 유속 u_y (2D)", min: -1.5, max: 1.5, step: 0.05 },
    { key: "alpha", label: "열/물질 확산계수 α (Diffusivity)", min: 0.0, max: 0.08, step: 0.002 },
    {
      key: "profile",
      label: "초기 온도/농도 분포",
      type: "select",
      options: [
        { value: "gaussian", label: "단일 열원 가우시안 플룸" },
        { value: "double", label: "이중 열원 병합 (Double Hotspots)" },
        { value: "step", label: "급격한 사각 계단 분포" },
        { value: "sine", label: "사인 고유모드 (해석해 감쇠 검증)" },
      ],
    },
    {
      key: "bc",
      label: "경계 조건 (Boundary Condition)",
      type: "select",
      options: [
        { value: "periodic", label: "주기 경계 (Periodic)" },
        { value: "fixed", label: "양끝 온도 0 고정 (Dirichlet)" },
        { value: "insulated", label: "양끝 단열 경계 ∂T/∂n=0 (열량 보존)" },
      ],
    },
    {
      key: "scheme",
      label: "수치 기법",
      type: "select",
      options: [
        { value: "upwind", label: "풍상차분 + 명시적 확산 (안정)" },
        { value: "cn", label: "Crank–Nicolson 반암시적 (1D 시간 2차)" },
        { value: "central", label: "중앙차분 (고 Pe_Δx 격자 진동 관찰)" },
      ],
    },
  ],
  burgers: [
    { key: "nu", label: "동점성계수 ν (충격파 두께 완충)", min: 0.0, max: 0.05, step: 0.001 },
    { key: "dirAngle", label: "2D 충격파 진행 각도 (°)", min: 0, max: 90, step: 5 },
    {
      key: "profile",
      label: "초기 유속 파형",
      type: "select",
      options: [
        { value: "sine", label: "사인파 → N-파 충격파 전이" },
        { value: "step", label: "계단 충격파 (Rankine-Hugoniot 속도 검증)" },
        { value: "gaussian", label: "가우시안 비대칭 가파름 (Steepening)" },
      ],
    },
    {
      key: "scheme",
      label: "수치 플럭스 기법",
      type: "select",
      options: [
        { value: "muscl", label: "2차 보존형 MUSCL + SSP-RK2" },
        { value: "rusanov", label: "1차 보존형 Rusanov (수치 소산 큼)" },
        { value: "nonconservative", label: "비보존형 u·u_x (잘못된 충격파 속도 실증!)" },
      ],
    },
    { key: "cfl", label: "CFL 배율", min: 0.2, max: 0.85, step: 0.05 },
  ],
  shallow_water: [
    { key: "g", label: "중력가속도 계수 g (파속 c=√gh)", min: 0.5, max: 3.0, step: 0.1 },
    { key: "bathyAmp", label: "수중 언덕 지형 높이 b_max", min: 0.0, max: 0.5, step: 0.05 },
    { key: "meanFlow", label: "배경 개수로 유속 U₀ (대류 효과)", min: -0.8, max: 0.8, step: 0.05 },
    { key: "coriolis", label: "코리올리 회전 계수 f (2D)", min: 0.0, max: 1.5, step: 0.1 },
    {
      key: "profile",
      label: "초기 수면 상태",
      type: "select",
      options: [
        { value: "dambreak", label: "댐 붕괴 (Dam Break 불연속 수면)" },
        { value: "gaussian", label: "가우시안 수면 파문 / 쓰나미" },
      ],
    },
    {
      key: "bc",
      label: "경계 조건",
      type: "select",
      options: [
        { value: "reflective", label: "반사 수조 벽면 (Reflective Walls)" },
        { value: "periodic", label: "주기 경계 (Periodic Channel)" },
      ],
    },
  ],
  euler: [
    { key: "pR", label: "저압부 초기 압력 p_R (충격파 강도 제어)", min: 0.02, max: 0.5, step: 0.02 },
    { key: "pL", label: "고압부 초기 압력 p_L", min: 0.5, max: 3.0, step: 0.1 },
    { key: "gamma", label: "이상기체 비열비 γ", min: 1.2, max: 1.67, step: 0.01 },
    {
      key: "scheme",
      label: "유한체적 재구성 기법",
      type: "select",
      options: [
        { value: "muscl", label: "2차 MUSCL + Minmod + SSP-RK2" },
        { value: "rusanov", label: "1차 Rusanov / Lax–Friedrichs" },
      ],
    },
    { key: "cfl", label: "CFL 수", min: 0.2, max: 0.75, step: 0.05 },
  ],
  navier_stokes: [
    {
      key: "scenario",
      label: "2D 유체역학 시나리오",
      type: "select",
      options: [
        { value: "cylinder", label: "원기둥 장애물 & 카르만 와류열 (Kármán Street)" },
        { value: "kh", label: "Kelvin–Helmholtz 전단층 소용돌이 불안정성" },
        { value: "taylor", label: "Taylor–Green 와류 격자 (엄밀 해석해 검증)" },
        { value: "dipole", label: "쌍극자 와류 제트 충돌 (Vortex Dipole)" },
      ],
    },
    { key: "nu", label: "동점성계수 ν (낮을수록 고 레이놀즈 수 Re)", min: 0.0, max: 0.015, step: 0.0005 },
    { key: "uInlet", label: "배경 유입 유속 U₀", min: 0.3, max: 1.8, step: 0.1 },
    { key: "cfl", label: "CFL 시간 배율", min: 0.2, max: 0.75, step: 0.05 },
  ],
};

export class StudioApp {
  constructor() {
    this.activeLabId = "wave_convection"; // 사용자의 핵심 예시인 1D/2D 파동·이류 방정식을 기본 첫 화면으로 설정
    this.activeDim = "2D";
    this.view3D = false;
    this.secondaryMode = "xt"; // 'xt', 'diagnostics', 'von_neumann', 'phase', 'resonance', 'energy'
    this.activeTab = "controls"; // 'controls', 'terms', 'numerics', 'guide'
    this.running = true;
    this.speedMult = 1;
    this.compareSchemes = true;
    this.showVectors = true;
    this.showParticles = true;
    this.touchInjectMode = true;

    this.rotYaw = 0.68;
    this.rotPitch = 0.52;
    this.probeIdx1D = 75;
    this.probeI2D = 32;
    this.probeJ2D = 32;

    this.toggles = {
      convectionOn: true,
      diffusionOn: true,
      nonlinearOn: true,
      sourceOn: true,
      dampingOn: true,
      restoringOn: true,
      drivingOn: true,
    };

    this.paramsByLab = {};
    for (const lab of LABS) {
      this.paramsByLab[lab.id] = { ...lab.presets[0].params };
    }

    this.initDOM();
    this.selectLab(this.activeLabId);
    this.startLoop();
  }

  initDOM() {
    this.mainCanvas = document.getElementById("mainCanvas");
    this.subCanvas = document.getElementById("subCanvas");
    this.bindCanvasEvents();

    // 재생/일시정지/초기화/스텝 버튼
    document.getElementById("btnPlayPause").addEventListener("click", () => {
      this.running = !this.running;
      this.updateTransportButtons();
    });
    document.getElementById("btnStep").addEventListener("click", () => {
      this.running = false;
      this.stepSimulation(1);
      this.renderFrame();
      this.updateInspectorLive();
      this.updateTransportButtons();
    });
    document.getElementById("btnReset").addEventListener("click", () => {
      this.rebuildSimulator();
    });
    document.getElementById("fieldSelect").addEventListener("change", (e) => {
      if (this.sim) {
        this.sim.activeField = e.target.value;
        this.renderFrame();
      }
    });
    document.getElementById("subModeSelect").addEventListener("change", (e) => {
      this.secondaryMode = e.target.value;
      this.renderFrame();
    });

    // 인스펙터 탭 전환
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        this.renderInspectorTab();
      });
    });

    window.addEventListener("resize", () => this.renderFrame());
  }

  bindCanvasEvents() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const handlePointer = (clientX, clientY, isMove = false) => {
      const rect = this.mainCanvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      // 3D 회전 모드 (3D 서피스 또는 로렌츠 3D 어트랙터)
      const isLorenz3D =
        this.activeLabId === "chaos_orbit" &&
        (this.paramsByLab.chaos_orbit.submode || "lorenz") === "lorenz";

      if (this.view3D || isLorenz3D) {
        if (isMove) {
          this.rotYaw += (clientX - lastX) * 0.01;
          this.rotPitch = Math.max(0.15, Math.min(1.35, this.rotPitch + (clientY - lastY) * 0.01));
        }
        lastX = clientX;
        lastY = clientY;
        return;
      }

      if (this.activeDim === "2D" && this.sim instanceof PDE2DSimulator) {
        const pr = this.mainCanvas._plotRect || { ox: 42, oy: 32, size: Math.min(rect.width, rect.height) - 70 };
        const xNorm = Math.max(0.02, Math.min(0.98, (px - pr.ox) / Math.max(pr.size, 1)));
        const yNorm = Math.max(0.02, Math.min(0.98, 1.0 - (py - pr.oy) / Math.max(pr.size, 1)));

        this.probeI2D = Math.max(1, Math.min(this.sim.n - 2, Math.floor(xNorm * this.sim.n)));
        this.probeJ2D = Math.max(1, Math.min(this.sim.n - 2, Math.floor(yNorm * this.sim.n)));

        if (this.touchInjectMode) {
          const dxNorm = isMove ? (clientX - lastX) / Math.max(pr.size, 1) : 0;
          const dyNorm = isMove ? -(clientY - lastY) / Math.max(pr.size, 1) : 0;
          this.sim.injectImpulse2D(xNorm, yNorm, dxNorm, dyNorm);
        }
      } else if (this.activeDim === "1D" && this.sim instanceof PDE1DSimulator) {
        const xNorm = Math.max(0.02, Math.min(0.98, (px - 48) / Math.max(rect.width - 66, 1)));
        this.probeIdx1D = Math.max(1, Math.min(this.sim.n - 2, Math.floor(xNorm * this.sim.n)));
        if (this.touchInjectMode && !isMove) {
          this.sim.injectPulse(xNorm, 0.38, 0.045);
        }
      }

      lastX = clientX;
      lastY = clientY;
      this.renderFrame();
      this.updateInspectorLive();
    };

    this.mainCanvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      this.mainCanvas.setPointerCapture(e.pointerId);
      handlePointer(e.clientX, e.clientY, false);
    });
    this.mainCanvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      handlePointer(e.clientX, e.clientY, true);
    });
    this.mainCanvas.addEventListener("pointerup", () => {
      dragging = false;
    });
  }

  renderLabPills() {
    const bar = document.getElementById("labPillBar");
    bar.innerHTML = LABS.map(
      (lab) => `
      <button class="lab-pill ${lab.id === this.activeLabId ? "active" : ""}" data-lab="${lab.id}">
        <span class="num">${lab.num}</span>
        <span>${lab.short}</span>
      </button>
    `
    ).join("");

    bar.querySelectorAll(".lab-pill").forEach((btn) => {
      btn.addEventListener("click", () => this.selectLab(btn.dataset.lab));
    });
  }

  selectLab(labId) {
    this.activeLabId = labId;
    const lab = LAB_MAP[labId];
    if (!lab.dims.includes(this.activeDim)) {
      this.activeDim = lab.defaultDim;
    }
    this.view3D = false;
    this.secondaryMode = this.activeDim === "ODE" ? (labId === "oscillator" ? "resonance" : "phase") : "xt";

    this.renderLabPills();
    this.renderEquationHeader();
    this.rebuildSimulator();
  }

  renderEquationHeader() {
    const lab = LAB_MAP[this.activeLabId];
    document.getElementById("eqBadge").textContent = `${lab.category} · ${lab.badge}`;
    document.getElementById("eqTitle").textContent = `${lab.num}. ${lab.name}`;
    document.getElementById("eqSummary").textContent = lab.summary;

    const mathBox = document.getElementById("eqMathBox");
    if (window.katex) {
      try {
        window.katex.render(lab.latexMain, mathBox, { displayMode: true, throwOnError: false });
      } catch {
        mathBox.textContent = lab.latexMain;
      }
    } else {
      mathBox.textContent = lab.latexMain;
    }

    // 차원 전환 버튼 (ODE vs 1D / 2D / 3D 표면)
    const dimWrap = document.getElementById("dimSwitcher");
    if (lab.dims.includes("ODE")) {
      dimWrap.innerHTML = `<button class="dim-btn active">0D · 시간 동역학 & 위상공간</button>`;
    } else {
      dimWrap.innerHTML = `
        <button class="dim-btn ${this.activeDim === "1D" && !this.view3D ? "active" : ""}" data-dim="1D">1D 단면 파형</button>
        <button class="dim-btn ${this.activeDim === "2D" && !this.view3D ? "active" : ""}" data-dim="2D">2D 평면 필드</button>
        <button class="dim-btn ${this.view3D ? "active" : ""}" data-dim="3D">3D 입체 표면</button>
      `;
      dimWrap.querySelectorAll(".dim-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.dataset.dim;
          if (target === "3D") {
            this.activeDim = "2D";
            this.view3D = true;
          } else {
            this.activeDim = target;
            this.view3D = false;
          }
          this.renderEquationHeader();
          this.rebuildSimulator();
        });
      });
    }

    this.renderTermToggles();
  }

  renderTermToggles() {
    const bar = document.getElementById("termToggleBar");
    const isODE = this.activeDim === "ODE";

    const items = isODE
      ? [
          { key: "restoringOn", label: "복원력항 (-ω₀²x)" },
          { key: "dampingOn", label: "감쇠항 (-2ζω₀v)" },
          { key: "drivingOn", label: "구동 외력항 (F₀cos ωt)" },
          { key: "nonlinearOn", label: "비선형항 (sin θ / xz)" },
        ]
      : [
          { key: "convectionOn", label: "이류/대류항 (Convection c·∇u)" },
          { key: "diffusionOn", label: "확산/점성/파동항 (∇²u)" },
          { key: "nonlinearOn", label: "비선형 대류항 (u·∇u)" },
          { key: "sourceOn", label: "파원/지형 원천항 (Source)" },
        ];

    bar.innerHTML =
      `<span style="font-size:11.5px;color:#94a3b8;font-weight:700;">실시간 미분항 스위치:</span>` +
      items
        .map(
          (it) => `
        <div class="term-chip ${this.toggles[it.key] ? "on" : ""}" data-tkey="${it.key}">
          <span class="dot"></span>
          <span>${it.label}</span>
        </div>
      `
        )
        .join("");

    bar.querySelectorAll(".term-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const k = chip.dataset.tkey;
        this.toggles[k] = !this.toggles[k];
        if (this.sim) {
          this.sim.toggles[k] = this.toggles[k];
        }
        this.renderTermToggles();
        this.updateInspectorLive();
      });
    });
  }

  rebuildSimulator() {
    const p = this.paramsByLab[this.activeLabId];
    if (this.activeDim === "ODE") {
      this.sim = new ODESimulator(this.activeLabId, p, this.toggles);
      if (this.activeLabId === "oscillator") {
        this.resonanceData = computeResonanceCurve(p.omega0 || 4.0, p.zeta ?? 0.1, p.F0 ?? 1.0);
      }
    } else if (this.activeDim === "1D") {
      const effectiveLab = this.activeLabId === "navier_stokes" ? "burgers" : this.activeLabId;
      this.sim = new PDE1DSimulator(effectiveLab, p, this.toggles);
      this.sim.vonNeumannData = computeVonNeumannCurve(effectiveLab, p);
      this.probeIdx1D = Math.floor(this.sim.n * 0.45);
    } else {
      this.sim = new PDE2DSimulator(this.activeLabId, p, this.toggles);
      this.probeI2D = Math.floor(this.sim.n * 0.5);
      this.probeJ2D = Math.floor(this.sim.n * 0.5);
    }

    this.populateToolbarSelectors();
    this.renderInspectorTab();
    this.renderFrame();
    this.updateInspectorLive();
  }

  populateToolbarSelectors() {
    const fSel = document.getElementById("fieldSelect");
    const sSel = document.getElementById("subModeSelect");

    if (this.activeDim === "ODE") {
      fSel.innerHTML = `<option value="state">상태 궤적 x(t)</option>`;
      if (this.activeLabId === "oscillator") {
        sSel.innerHTML = `
          <option value="resonance" ${this.secondaryMode === "resonance" ? "selected" : ""}>공명 응답 곡선 M(ω_d/ω_0)</option>
          <option value="phase" ${this.secondaryMode === "phase" ? "selected" : ""}>위상 공간 궤적 (x, v)</option>
          <option value="energy" ${this.secondaryMode === "energy" ? "selected" : ""}>적분기별 역학적 에너지 E(t)</option>
        `;
      } else {
        sSel.innerHTML = `
          <option value="phase" ${this.secondaryMode === "phase" ? "selected" : ""}>위상 공간 & 벡터장 (θ, ω)</option>
          <option value="energy" ${this.secondaryMode === "energy" ? "selected" : ""}>에너지 보존 / 나비효과 발산</option>
        `;
      }
    } else {
      const names = this.sim.fieldNames || ["물리량"];
      fSel.innerHTML = names
        .map((n) => `<option value="${n}" ${n === this.sim.activeField ? "selected" : ""}>관찰: ${n}</option>`)
        .join("");

      if (this.activeDim === "1D") {
        sSel.innerHTML = `
          <option value="xt" ${this.secondaryMode === "xt" ? "selected" : ""}>x–t 시공간 지도 & 특성선</option>
          <option value="diagnostics" ${this.secondaryMode === "diagnostics" ? "selected" : ""}>질량·에너지 보존 진단 곡선</option>
          <option value="von_neumann" ${this.secondaryMode === "von_neumann" ? "selected" : ""}>Von Neumann 증폭 인자 |G(kΔx)|</option>
        `;
      } else {
        sSel.innerHTML = `
          <option value="slice">프로브 수평 단면 파형 (y = y_probe)</option>
        `;
      }
    }
    this.updateTransportButtons();
  }

  updateTransportButtons() {
    const playBtn = document.getElementById("btnPlayPause");
    playBtn.innerHTML = this.running ? "⏸ 일시정지" : "▶ 실시간 재생";
    playBtn.classList.toggle("primary", !this.running);
  }

  stepSimulation(mult = 1) {
    if (!this.sim) return;
    if (this.activeDim === "ODE") {
      this.sim.step(2 * mult);
    } else if (this.activeDim === "1D") {
      this.sim.step(2 * mult);
    } else {
      this.sim.step(1 * mult);
    }
  }

  renderFrame() {
    if (!this.sim) return;

    if (this.activeDim === "ODE") {
      renderODEMain(this.mainCanvas, this.sim, {
        compareSchemes: this.compareSchemes,
        rotYaw: this.rotYaw,
        rotPitch: this.rotPitch,
      });
      renderODESecondary(this.subCanvas, this.sim, this.resonanceData, this.secondaryMode);
    } else if (this.activeDim === "1D") {
      renderPDE1DMain(this.mainCanvas, this.sim, this.probeIdx1D, {
        compareSchemes: this.compareSchemes,
      });
      renderPDE1DSecondary(this.subCanvas, this.sim, this.secondaryMode);
    } else {
      renderPDE2DMain(this.mainCanvas, this.sim, this.probeI2D, this.probeJ2D, {
        view3D: this.view3D,
        showVectors: this.showVectors,
        showParticles: this.showParticles,
        rotYaw: this.rotYaw,
        rotPitch: this.rotPitch,
      });
      renderPDE2DSlice(this.subCanvas, this.sim, this.probeI2D, this.probeJ2D);
    }

    this.updateKPIStrip();
  }

  updateKPIStrip() {
    const kpiTime = document.getElementById("kpiTime");
    const kpiMax = document.getElementById("kpiMax");
    const kpiCons = document.getElementById("kpiCons");
    const kpiNum = document.getElementById("kpiNum");

    kpiTime.textContent = `t = ${this.sim.t.toFixed(3)}`;

    if (this.activeDim === "ODE") {
      const eCur = this.sim.history.energy.at(-1) || 0;
      kpiMax.textContent =
        this.activeLabId === "chaos_orbit" && (this.sim.params.submode || "lorenz") === "lorenz"
          ? `x = ${this.sim.state.x.toFixed(2)}`
          : `x = ${this.sim.state.x.toFixed(3)}`;
      kpiCons.textContent = `E = ${eCur.toFixed(3)}`;
      kpiNum.textContent = `${(this.sim.params.scheme || "rk4").toUpperCase()} (Δt=${(this.sim.params.dt || 0.02).toFixed(3)})`;
    } else {
      const dh = this.sim.diagHistory;
      const maxV = dh.maxVal.at(-1) ?? 0;
      const massV = dh.mass.at(-1) ?? 0;
      kpiMax.textContent = `${maxV.toFixed(3)}`;
      kpiCons.textContent = `${massV.toFixed(4)}`;
      kpiNum.textContent = `${this.activeDim} N=${this.sim.n} (CFL=${(this.sim.params.cfl || 0.6).toFixed(2)})`;
    }
  }

  renderInspectorTab() {
    const body = document.getElementById("inspectorBody");
    const lab = LAB_MAP[this.activeLabId];
    const p = this.paramsByLab[this.activeLabId];

    if (this.activeTab === "controls") {
      const presetsHTML = lab.presets
        .map(
          (pr) => `
          <button class="preset-btn" data-preset="${pr.id}">
            ⚡ ${pr.label}
          </button>
        `
        )
        .join("");

      const schema = CONTROL_SCHEMAS[this.activeLabId] || [];
      const controlsHTML = schema
        .map((item) => {
          const val = p[item.key] ?? 0;
          if (item.type === "select") {
            return `
              <div class="control-group">
                <div class="control-header"><span>${item.label}</span></div>
                <select class="select-pill" style="width:100%" data-param="${item.key}">
                  ${item.options
                    .map(
                      (opt) =>
                        `<option value="${opt.value}" ${opt.value === val ? "selected" : ""}>${opt.label}</option>`
                    )
                    .join("")}
                </select>
              </div>
            `;
          }
          return `
            <div class="control-group">
              <div class="control-header">
                <span>${item.label}</span>
                <span class="control-val" id="val_${item.key}">${Number(val).toFixed(item.step < 0.01 ? 3 : 2)}</span>
              </div>
              <input type="range" min="${item.min}" max="${item.max}" step="${item.step}" value="${val}" data-param="${item.key}" />
            </div>
          `;
        })
        .join("");

      const extraToggles =
        this.activeDim === "2D"
          ? `
        <div class="btn-group" style="margin-top:10px;">
          <button class="ctrl-btn ${this.showVectors ? "active-toggle" : ""}" id="btnToggleVec">↗ 속도 벡터장 표시</button>
          <button class="ctrl-btn ${this.showParticles ? "active-toggle" : ""}" id="btnTogglePt">✦ 유체 입자(Particle) 추적</button>
        </div>
      `
          : `
        <div class="btn-group" style="margin-top:10px;">
          <button class="ctrl-btn ${this.compareSchemes ? "active-toggle" : ""}" id="btnToggleComp">⚖️ 다중 수치기법 동시 비교선</button>
        </div>
      `;

      body.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:6px;">원터치 물리 실험 프리셋</div>
        <div class="preset-grid">${presetsHTML}</div>
        <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:6px;">방정식 계수 · 유속 · 수치기법 제어</div>
        ${controlsHTML}
        ${extraToggles}
      `;

      body.querySelectorAll(".preset-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pr = lab.presets.find((item) => item.id === btn.dataset.preset);
          if (!pr) return;
          this.paramsByLab[this.activeLabId] = { ...this.paramsByLab[this.activeLabId], ...pr.params };
          if (pr.dim) {
            this.activeDim = pr.dim;
            this.view3D = false;
          }
          this.renderEquationHeader();
          this.rebuildSimulator();
        });
      });

      body.querySelectorAll("[data-param]").forEach((inp) => {
        const handler = () => {
          const key = inp.dataset.param;
          const val = inp.tagName === "SELECT" ? inp.value : parseFloat(inp.value);
          this.paramsByLab[this.activeLabId][key] = val;
          const badge = document.getElementById(`val_${key}`);
          if (badge && typeof val === "number") {
            badge.textContent = val.toFixed( parseFloat(inp.step) < 0.01 ? 3 : 2 );
          }

          if (this.sim) {
            this.sim.params[key] = val;
          }
          // 초기조건이나 시나리오 변경 시 즉시 재초기화
          if (["profile", "submode", "scenario", "bc", "theta0", "omegaInit", "ecc", "pR", "pL"].includes(key)) {
            this.rebuildSimulator();
          } else if (this.activeLabId === "oscillator") {
            const pCur = this.paramsByLab.oscillator;
            this.resonanceData = computeResonanceCurve(pCur.omega0, pCur.zeta, pCur.F0);
          }
        };
        inp.addEventListener("input", handler);
        inp.addEventListener("change", handler);
      });

      const vecBtn = document.getElementById("btnToggleVec");
      if (vecBtn) {
        vecBtn.addEventListener("click", () => {
          this.showVectors = !this.showVectors;
          vecBtn.classList.toggle("active-toggle", this.showVectors);
          this.renderFrame();
        });
      }
      const ptBtn = document.getElementById("btnTogglePt");
      if (ptBtn) {
        ptBtn.addEventListener("click", () => {
          this.showParticles = !this.showParticles;
          ptBtn.classList.toggle("active-toggle", this.showParticles);
          this.renderFrame();
        });
      }
      const compBtn = document.getElementById("btnToggleComp");
      if (compBtn) {
        compBtn.addEventListener("click", () => {
          this.compareSchemes = !this.compareSchemes;
          compBtn.classList.toggle("active-toggle", this.compareSchemes);
          this.renderFrame();
        });
      }
      return;
    }

    if (this.activeTab === "terms") {
      body.innerHTML = `
        <div class="question-callout">
          💡 <strong>실시간 미분항 물리 분해기:</strong> 캔버스를 터치/클릭하여 프로브 지점을 옮기면, 그 격자점에서 작동하는 1차 기울기(이류)와 2차 곡률(확산/파동)의 실시간 값을 분해해 보여줍니다.
        </div>
        <div id="liveTermContainer" class="term-breakdown-list"></div>
        <div id="liveStencilContainer" style="margin-top:14px;"></div>
      `;
      this.updateInspectorLive();
      return;
    }

    if (this.activeTab === "numerics") {
      body.innerHTML = `
        <div class="question-callout">
          ⚖️ <strong>수치해석과 물리적 거동:</strong> 이산화 기법(Upwind vs Lax–Wendroff vs MUSCL, 또는 Euler vs Verlet vs RK4)에 따라 수치 확산(봉우리 감소)과 수치 분산(잔물결 진동)이 어떻게 달라지는지 확인하세요.
        </div>
        <div class="btn-group" style="margin-bottom:12px;">
          <button class="ctrl-btn primary" id="btnRunConvergence">📐 격자 수렴성 실험 실행 (Δx → 0)</button>
          <button class="ctrl-btn ${this.compareSchemes ? "active-toggle" : ""}" id="btnRaceToggle">🏁 다중 기법 동시 주행 ON/OFF</button>
        </div>
        <div id="convergenceResultBox"></div>
        <div style="margin-top:12px;font-size:12.5px;color:#cbd5e1;line-height:1.6;">
          <strong>핵심 수치해석 가이드:</strong>
          <ul style="padding-left:18px;margin:6px 0;">
            <li><strong>수치 확산 (Numerical Diffusion):</strong> 1차 Upwind 기법은 테일러 전개 시 <code style="color:#38bdf8">ν_num = ½|c|Δx(1−CFL)</code> 만큼의 인공 점성항을 만들어 물리적 확산이 0이어도 봉우리를 완만하게 깎습니다.</li>
            <li><strong>수치 분산 (Numerical Dispersion):</strong> 2차 Lax–Wendroff는 진폭 감쇠는 적지만 고주파 파수 성분의 전파 속도가 뒤처져 급격한 경계 뒤쪽에 비물리적 잔물결(Gibbs 진동)을 만듭니다.</li>
            <li><strong>TVD MUSCL (제한자 기법):</strong> 매끄러운 구간에서는 2차 정확도를 유지하고, 급경사 충격파 부근에서만 기울기를 제한(Superbee/Minmod)하여 진동 없이 날카로운 전선을 보존합니다.</li>
          </ul>
        </div>
      `;

      const runBtn = document.getElementById("btnRunConvergence");
      const resBox = document.getElementById("convergenceResultBox");
      const renderConvTable = () => {
        const targetLab = this.activeDim === "ODE" ? "wave_convection" : this.activeLabId === "navier_stokes" ? "conv_diff" : this.activeLabId;
        const rows = runConvergenceStudy1D(targetLab, this.paramsByLab[targetLab]);
        resBox.innerHTML = `
          <table class="data-table">
            <thead>
              <tr><th>격자 수 N</th><th>격자 간격 Δx</th><th>해석해 오차 RMSE</th><th>관측 수렴 차수 p</th></tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>N = ${r.gridN}</td>
                  <td>${r.dx.toFixed(4)}</td>
                  <td>${r.rmse.toExponential(3)}</td>
                  <td style="color:#10b981;font-weight:700;">${r.order}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `;
      };
      renderConvTable();
      runBtn.addEventListener("click", renderConvTable);

      document.getElementById("btnRaceToggle").addEventListener("click", (e) => {
        this.compareSchemes = !this.compareSchemes;
        e.currentTarget.classList.toggle("active-toggle", this.compareSchemes);
        this.renderFrame();
      });
      return;
    }

    // guide 탭
    body.innerHTML = `
      <div class="question-callout">
        ❓ <strong>핵심 물리 질문:</strong><br/>${lab.keyQuestion}
      </div>
      <div style="font-size:12.5px;font-weight:700;color:#94a3b8;margin-bottom:8px;">방정식의 각 항을 물리적 동작으로 읽기</div>
      ${lab.terms
        .map(
          (t) => `
        <div class="term-row" style="margin-bottom:8px;border-left:3px solid ${t.color}">
          <div style="font-weight:700;color:${t.color};font-size:13px;">${t.name}</div>
          <div class="term-desc" style="margin-top:3px;">${t.role}</div>
        </div>
      `
        )
        .join("")}
      <div style="font-size:12.5px;font-weight:700;color:#94a3b8;margin:14px 0 8px;">추천 인터랙티브 실험 미션</div>
      ${lab.missions.map((m, idx) => `<div class="mission-box"><strong>미션 ${idx + 1}.</strong> ${m}</div>`).join("")}
      <div class="btn-group" style="margin-top:12px;">
        <button class="ctrl-btn" id="btnExportPNG">📸 현재 시뮬레이션 PNG 저장</button>
        <button class="ctrl-btn" id="btnExportCSV">📄 현재 프로파일 CSV 저장</button>
      </div>
    `;

    document.getElementById("btnExportPNG")?.addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = `${this.activeLabId}_${this.activeDim}.png`;
      link.href = this.mainCanvas.toDataURL("image/png");
      link.click();
    });

    document.getElementById("btnExportCSV")?.addEventListener("click", () => {
      let csv = "index,value\n";
      if (this.activeDim === "1D" && this.sim instanceof PDE1DSimulator) {
        const arr = this.sim.getCurrentCurves().primary;
        csv = "x,value\n" + Array.from(arr).map((v, i) => `${this.sim.x[i].toFixed(5)},${v}`).join("\n");
      } else if (this.activeDim === "2D" && this.sim instanceof PDE2DSimulator) {
        const arr = this.sim.getPrimaryFieldArray();
        csv = "i,j,value\n";
        for (let j = 0; j < this.sim.n; j++) {
          for (let i = 0; i < this.sim.n; i++) {
            csv += `${i},${j},${arr[j * this.sim.n + i]}\n`;
          }
        }
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${this.activeLabId}_${this.activeDim}_data.csv`;
      link.click();
    });
  }

  updateInspectorLive() {
    if (this.activeTab !== "terms" || !this.sim) return;
    const termBox = document.getElementById("liveTermContainer");
    const stencilBox = document.getElementById("liveStencilContainer");
    if (!termBox || !stencilBox) return;

    let terms = [];
    if (this.activeDim === "ODE") {
      terms = this.sim.getTermBreakdown();
      stencilBox.innerHTML = "";
    } else if (this.activeDim === "1D") {
      const info = this.sim.getStencilAndTerms(this.probeIdx1D);
      terms = info.terms;
      stencilBox.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:6px;">
          1D 3점 유한차분/유한체적 스텐실 현미경 (x = ${info.x.toFixed(3)})
        </div>
        <div class="stencil-grid-5pt">
          <div class="stencil-cell">i−1<br/><strong>${info.uLeft.toFixed(3)}</strong></div>
          <div class="stencil-cell center">i (중심)<br/><strong>${info.uCenter.toFixed(3)}</strong></div>
          <div class="stencil-cell">i+1<br/><strong>${info.uRight.toFixed(3)}</strong></div>
        </div>
        <div style="font-size:12px;color:#cbd5e1;text-align:center;">
          1차 공간미분(기울기 ∂f/∂x) = <strong style="color:#38bdf8">${info.grad.toFixed(3)}</strong> ·
          2차 공간미분(곡률 ∂²f/∂x²) = <strong style="color:#10b981">${info.lap.toFixed(3)}</strong>
        </div>
      `;
    } else {
      const info = this.sim.getStencilAndTerms2D(this.probeI2D, this.probeJ2D);
      terms = info.terms;
      stencilBox.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:6px;">
          2D 5점 라플라시안·이류 스텐실 현미경 (x=${info.x.toFixed(2)}, y=${info.y.toFixed(2)})
        </div>
        <div class="stencil-grid-5pt">
          <div class="stencil-cell empty"></div>
          <div class="stencil-cell">위 (j+1)<br/><strong>${info.u.toFixed(3)}</strong></div>
          <div class="stencil-cell empty"></div>
          <div class="stencil-cell">좌 (i−1)<br/><strong>${info.l.toFixed(3)}</strong></div>
          <div class="stencil-cell center">중심 (i,j)<br/><strong>${info.c.toFixed(3)}</strong></div>
          <div class="stencil-cell">우 (i+1)<br/><strong>${info.r.toFixed(3)}</strong></div>
          <div class="stencil-cell empty"></div>
          <div class="stencil-cell">아래 (j−1)<br/><strong>${info.d.toFixed(3)}</strong></div>
          <div class="stencil-cell empty"></div>
        </div>
        <div style="font-size:12px;color:#cbd5e1;text-align:center;">
          ∇f = (<strong style="color:#38bdf8">${info.gx.toFixed(2)}, ${info.gy.toFixed(2)}</strong>) ·
          2D 라플라시안 ∇²f = <strong style="color:#10b981">${info.lap.toFixed(2)}</strong>
        </div>
      `;
    }

    const maxAbs = Math.max(1e-4, ...terms.map((t) => Math.abs(t.value)));
    termBox.innerHTML = terms
      .map((t) => {
        const pct = Math.min(100, Math.round((Math.abs(t.value) / maxAbs) * 100));
        return `
          <div class="term-row">
            <div class="term-row-head">
              <span style="color:${t.color}">${t.name}</span>
              <span style="font-family:'JetBrains Mono',monospace;color:#fff;">
                ${t.value >= 0 ? "+" : ""}${t.value.toFixed(4)}
              </span>
            </div>
            <div class="term-bar-track">
              <div class="term-bar-fill" style="width:${pct}%;background:${t.color}"></div>
            </div>
            <div class="term-desc">${t.desc}</div>
          </div>
        `;
      })
      .join("");
  }

  startLoop() {
    let frameCounter = 0;
    const tick = () => {
      if (this.running) {
        this.stepSimulation(1);
        this.renderFrame();
        frameCounter++;
        if (frameCounter % 6 === 0) {
          this.updateInspectorLive();
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.studioApp = new StudioApp();
});
