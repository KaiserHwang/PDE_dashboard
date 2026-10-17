// src/solvers-pde2d.js
// 2D 편미분방정식 (파동·이류, 도플러/마하콘, 대류·확산, 2D Burgers, 2D 천수, 2D 압축성 Euler, 2D Navier-Stokes)
// 실시간 시뮬레이션, 라그랑주 유체 입자 추적(Particle Advection), 5점 스텐실 및 항별 물리 분해 엔진

import { minmod } from "./solvers-pde1d.js";

export class PDE2DSimulator {
  constructor(labId, params, toggles = {}) {
    this.labId = labId;
    this.params = { ...params };
    this.toggles = {
      convectionOn: true,
      diffusionOn: true,
      nonlinearOn: true,
      sourceOn: true,
      ...toggles,
    };
    this.reset();
  }

  reset() {
    const p = this.params;
    this.t = 0.0;
    this.stepCount = 0;
    this.n = Math.max(36, Math.min(96, Math.round(p.gridN || 68)));
    const n = this.n;
    this.dx = 1.0 / n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      this.x[i] = (i + 0.5) * this.dx;
      this.y[i] = (i + 0.5) * this.dx;
    }

    const size = n * n;
    this.u = new Float64Array(size);
    this.v = new Float64Array(size); // 보조 속도 또는 파동 시간미분
    this.w = new Float64Array(size); // 와도 ω 또는 두 번째 보조장
    this.pField = new Float64Array(size); // 압력 p 또는 수심
    this.psi = new Float64Array(size); // 유선함수 ψ 또는 지형 b
    this.dye = new Float64Array(size); // 염료 농도 또는 마하수
    this.schlieren = new Float64Array(size); // 가상 슐리렌 |∇ρ|
    this.obstacle = new Uint8Array(size); // 원기둥 등 고체 장애물 마스크
    this.u0 = new Float64Array(size);

    this.diagHistory = { t: [], mass: [], energy: [], rmse: [], maxVal: [] };
    this.initParticles(220);

    if (this.labId === "wave_convection") {
      this.initWaveConvection2D();
    } else if (this.labId === "conv_diff") {
      this.initConvDiff2D();
    } else if (this.labId === "burgers") {
      this.initBurgers2D();
    } else if (this.labId === "shallow_water") {
      this.initShallowWater2D();
    } else if (this.labId === "euler") {
      this.initEuler2D();
    } else if (this.labId === "navier_stokes") {
      this.initNavierStokes2D();
    }

    this.u0.set(this.getPrimaryFieldArray());
    this.recordDiagnostics();
  }

  idx(i, j) {
    const n = this.n;
    const ii = ((i % n) + n) % n;
    const jj = ((j % n) + n) % n;
    return jj * n + ii;
  }

  idxClamp(i, j) {
    const n = this.n;
    const ii = Math.max(0, Math.min(n - 1, i));
    const jj = Math.max(0, Math.min(n - 1, j));
    return jj * n + ii;
  }

  initParticles(count = 220) {
    this.particles = [];
    for (let k = 0; k < count; k++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: 0,
        vy: 0,
        age: Math.floor(Math.random() * 100),
      });
    }
  }

  advectParticles(dt) {
    const n = this.n;
    for (const pt of this.particles) {
      const { ux, vy } = this.sampleVelocity(pt.x, pt.y);
      pt.vx = ux;
      pt.vy = vy;
      pt.x += dt * ux;
      pt.y += dt * vy;
      pt.age++;

      if (this.labId === "navier_stokes" && (this.params.scenario || "cylinder") === "cylinder") {
        if (pt.x > 1.0 || pt.x < 0.0 || pt.y < 0.02 || pt.y > 0.98 || pt.age > 240) {
          pt.x = 0.02 + Math.random() * 0.05;
          pt.y = 0.15 + Math.random() * 0.7;
          pt.age = 0;
        }
        // 장애물 내부 충돌 시 재배치
        const gi = Math.floor(pt.x * n);
        const gj = Math.floor(pt.y * n);
        if (this.obstacle[this.idxClamp(gi, gj)]) {
          pt.x = 0.02;
          pt.y = 0.2 + Math.random() * 0.6;
        }
      } else {
        pt.x = ((pt.x % 1.0) + 1.0) % 1.0;
        pt.y = ((pt.y % 1.0) + 1.0) % 1.0;
      }
    }
  }

  sampleVelocity(xNorm, yNorm) {
    const n = this.n;
    const p = this.params;
    const tg = this.toggles;
    if (!tg.convectionOn) return { ux: 0, vy: 0 };

    if (this.labId === "wave_convection") {
      if ((p.submode || "advection") === "swirl") {
        const omega = p.cx ?? 1.2;
        return { ux: -omega * (yNorm - 0.5), vy: omega * (xNorm - 0.5) };
      }
      return { ux: p.cx ?? 1.0, vy: p.cy ?? 0.5 };
    }
    if (this.labId === "conv_diff") {
      return { ux: p.ux ?? 0.8, vy: p.uy ?? 0.3 };
    }
    const i = Math.max(0, Math.min(n - 1, Math.floor(xNorm * n)));
    const j = Math.max(0, Math.min(n - 1, Math.floor(yNorm * n)));
    const k = j * n + i;
    if (this.labId === "burgers" || this.labId === "navier_stokes") {
      return { ux: this.u[k], vy: this.v[k] };
    }
    if (this.labId === "shallow_water") {
      const h = Math.max(this.pField[k], 1e-4);
      return { ux: this.u[k] / h, vy: this.v[k] / h };
    }
    if (this.labId === "euler") {
      const rho = Math.max(this.pField[k], 1e-4);
      return { ux: this.u[k] / rho, vy: this.v[k] / rho };
    }
    return { ux: 0, vy: 0 };
  }

  initWaveConvection2D() {
    const n = this.n;
    const p = this.params;
    const prof = p.profile || "gaussian";
    const sub = p.submode || "advection";
    this.sourceX = 0.35;
    this.sourceY = 0.5;

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.x[i];
        const y = this.y[j];
        const k = j * n + i;
        if (prof === "pulse_train" && sub === "convected_wave") {
          const r2 = (x - this.sourceX) ** 2 + (y - this.sourceY) ** 2;
          this.u[k] = 0.5 * Math.exp(-r2 / 0.0025);
        } else if (prof === "double") {
          const g1 = Math.exp(-(((x - 0.35) ** 2 + (y - 0.38) ** 2) / 0.008));
          const g2 = 0.85 * Math.exp(-(((x - 0.65) ** 2 + (y - 0.62) ** 2) / 0.008));
          this.u[k] = g1 + g2;
        } else if (prof === "step") {
          this.u[k] = Math.abs(x - 0.38) < 0.13 && Math.abs(y - 0.42) < 0.13 ? 1.0 : 0.0;
        } else if (prof === "sine") {
          this.u[k] = Math.sin(2 * Math.PI * x) * Math.sin(2 * Math.PI * y);
        } else {
          const r2 = (x - 0.38) ** 2 + (y - 0.42) ** 2;
          this.u[k] = Math.exp(-r2 / 0.009);
        }
        this.v[k] = 0.0;
      }
    }
    this.fieldNames =
      sub === "convected_wave"
        ? ["파동 변위 φ(x,y,t)", "파동 변화율 ψ = Dφ/Dt"]
        : ["스칼라 농도 u(x,y,t)"];
    this.activeField = this.fieldNames[0];
  }

  initConvDiff2D() {
    const n = this.n;
    const prof = this.params.profile || "gaussian";
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.x[i];
        const y = this.y[j];
        const k = j * n + i;
        if (prof === "double") {
          this.u[k] =
            Math.exp(-(((x - 0.32) ** 2 + (y - 0.42) ** 2) / 0.007)) +
            0.85 * Math.exp(-(((x - 0.66) ** 2 + (y - 0.58) ** 2) / 0.007));
        } else if (prof === "sine") {
          this.u[k] = Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
        } else if (prof === "step") {
          this.u[k] = Math.hypot(x - 0.35, y - 0.45) < 0.15 ? 1.0 : 0.0;
        } else {
          this.u[k] = Math.exp(-(((x - 0.32) ** 2 + (y - 0.45) ** 2) / 0.008));
        }
      }
    }
    this.fieldNames = ["온도/농도 T(x,y,t)"];
    this.activeField = "온도/농도 T(x,y,t)";
  }

  initBurgers2D() {
    const n = this.n;
    const p = this.params;
    const theta = ((p.dirAngle ?? 35) * Math.PI) / 180;
    const cx = Math.cos(theta);
    const cy = Math.sin(theta);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.x[i];
        const y = this.y[j];
        const k = j * n + i;
        let mag = 0;
        if ((p.profile || "gaussian") === "sine") {
          mag = 0.35 + 0.55 * Math.sin(2 * Math.PI * x) * Math.sin(2 * Math.PI * y);
        } else {
          const r2 = (x - 0.36) ** 2 + (y - 0.38) ** 2;
          mag = 0.15 + 1.15 * Math.exp(-r2 / 0.014);
        }
        this.u[k] = mag * cx;
        this.v[k] = mag * cy;
        this.w[k] = mag;
      }
    }
    this.fieldNames = ["속력 |u|", "x 유속 u", "y 유속 v", "속도 구배 |∇u| (충격전선)"];
    this.activeField = "속력 |u|";
  }

  initShallowWater2D() {
    const n = this.n;
    const p = this.params;
    const bAmp = p.bathyAmp ?? 0.0;
    const meanU = p.meanFlow ?? 0.0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.x[i];
        const y = this.y[j];
        const k = j * n + i;
        const b = bAmp * Math.exp(-(((x - 0.58) ** 2 + (y - 0.5) ** 2) / 0.018));
        this.psi[k] = b; // 바닥 지형 b(x,y)
        let eta = 1.0;
        if ((p.profile || "dambreak") === "dambreak") {
          const r = Math.hypot(x - 0.5, y - 0.5);
          eta = r < 0.22 ? 1.65 : 0.85;
        } else {
          const r2 = (x - 0.35) ** 2 + (y - 0.5) ** 2;
          eta = 1.0 + 0.65 * Math.exp(-r2 / 0.01);
        }
        const h = Math.max(0.15, eta - b);
        this.pField[k] = h; // 수심 h
        this.u[k] = h * meanU; // hu
        this.v[k] = 0.0; // hv
        this.w[k] = eta; // 수면 높이 η = h + b
      }
    }
    this.fieldNames = ["수면 높이 η = h+b", "수심 h", "유속 크기 |u|", "프루드 수 Fr"];
    this.activeField = "수면 높이 η = h+b";
  }

  initEuler2D() {
    const n = this.n;
    const p = this.params;
    const g = p.gamma ?? 1.4;
    const rhoL = p.rhoL ?? 1.0;
    const pL = p.pL ?? 2.0;
    const rhoR = p.rhoR ?? 0.125;
    const pR = p.pR ?? 0.1;

    // pField: ρ, u: ρu, v: ρv, w: E
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.x[i];
        const y = this.y[j];
        const k = j * n + i;
        const r = Math.hypot(x - 0.5, y - 0.5);
        const inside = r < 0.23;
        const rho = inside ? rhoL : rhoR;
        const pr = inside ? pL : pR;
        this.pField[k] = rho;
        this.u[k] = 0.0;
        this.v[k] = 0.0;
        this.w[k] = pr / (g - 1);
      }
    }
    this.updateEulerDerived2D();
    this.fieldNames = ["밀도 ρ", "압력 p", "가상 슐리렌 |∇ρ|", "마하수 M", "속력 |u|"];
    this.activeField = "밀도 ρ";
  }

  initNavierStokes2D() {
    const n = this.n;
    const scenario = this.params.scenario || "cylinder";
    this.obstacle.fill(0);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = this.x[i];
        const y = this.y[j];
        const k = j * n + i;

        if (scenario === "taylor") {
          this.w[k] = 4 * Math.PI * Math.sin(2 * Math.PI * x) * Math.sin(2 * Math.PI * y);
          this.dye[k] = Math.sin(2 * Math.PI * x) * Math.sin(2 * Math.PI * y);
        } else if (scenario === "kh") {
          // Kelvin-Helmholtz 이중 전단층
          const delta = 0.042;
          const uShear = y < 0.5 ? Math.tanh((y - 0.25) / delta) : Math.tanh((0.75 - y) / delta);
          const vPert = 0.06 * Math.sin(4 * Math.PI * x);
          this.u[k] = uShear;
          this.v[k] = vPert;
          this.dye[k] = y > 0.25 && y < 0.75 ? 1.0 : 0.1;
        } else if (scenario === "dipole") {
          const r1 = (x - 0.4) ** 2 + (y - 0.43) ** 2;
          const r2 = (x - 0.4) ** 2 + (y - 0.57) ** 2;
          this.w[k] = 28 * Math.exp(-r1 / 0.0045) - 28 * Math.exp(-r2 / 0.0045);
          this.dye[k] = Math.exp(-r1 / 0.006) - Math.exp(-r2 / 0.006);
        } else {
          // 원기둥 장애물 (Flow Past Cylinder — Kármán Vortex Street)
          const rCyl = Math.hypot(x - 0.26, y - 0.5);
          if (rCyl < 0.075) {
            this.obstacle[k] = 1;
          }
          // 초기 비대칭 미세 교란으로 카르만 와류열 조기 유도
          const wakePert = Math.exp(-(((x - 0.36) ** 2 + (y - 0.52) ** 2) / 0.005));
          this.w[k] = 6.5 * wakePert * Math.sin(2 * Math.PI * y);
          this.dye[k] = Math.exp(-(((y - 0.5) / 0.08) ** 2)) * (x < 0.25 ? 1.0 : 0.2);
        }
      }
    }

    if (scenario === "kh") {
      // 속도장으로부터 초기 와도 ω = v_x - u_y 계산
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const vx = (this.v[this.idx(i + 1, j)] - this.v[this.idx(i - 1, j)]) / (2 * this.dx);
          const uy = (this.u[this.idx(i, j + 1)] - this.u[this.idx(i, j - 1)]) / (2 * this.dx);
          this.w[j * n + i] = vx - uy;
        }
      }
    }

    this.solveNavierVelocityAndPressure(35);
    this.fieldNames =
      scenario === "cylinder"
        ? ["염료 농도 Dye", "와도 ω (소용돌이)", "속력 |u|", "압력 p", "유선함수 ψ"]
        : ["와도 ω (소용돌이)", "속력 |u|", "염료 농도 Dye", "압력 p", "유선함수 ψ"];
    this.activeField = this.fieldNames[0];
  }

  /**
   * 캔버스 터치/드래그로 2D 필드에 직접 파원, 열원, 수면 파문 또는 소용돌이 제트 주입!
   */
  injectImpulse2D(xNorm, yNorm, dxNorm = 0, dyNorm = 0) {
    const n = this.n;
    const x0 = Math.max(0.04, Math.min(0.96, xNorm));
    const y0 = Math.max(0.04, Math.min(0.96, yNorm));

    if (this.labId === "wave_convection" && (this.params.submode || "advection") === "convected_wave") {
      this.sourceX = x0;
      this.sourceY = y0;
    }

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const rx = this.x[i] - x0;
        const ry = this.y[j] - y0;
        const r2 = rx * rx + ry * ry;
        if (r2 > 0.015) continue;
        const k = j * n + i;
        const g = Math.exp(-r2 / 0.0028);

        if (this.labId === "wave_convection" || this.labId === "conv_diff") {
          this.u[k] = Math.min(1.8, this.u[k] + 0.65 * g);
        } else if (this.labId === "burgers") {
          this.u[k] += 0.5 * g;
          this.v[k] += 0.3 * g;
        } else if (this.labId === "shallow_water") {
          this.pField[k] += 0.45 * g;
          this.w[k] = this.pField[k] + this.psi[k];
        } else if (this.labId === "euler") {
          this.pField[k] += 0.4 * g;
          this.w[k] += 0.8 * g;
        } else if (this.labId === "navier_stokes") {
          if (this.obstacle[k]) continue;
          const curlImpulse = (dxNorm * ry - dyNorm * rx) * 420;
          this.w[k] += (curlImpulse !== 0 ? curlImpulse : 12.0) * g;
          this.dye[k] = Math.min(1.5, this.dye[k] + 0.85 * g);
        }
      }
    }
  }

  solveNavierVelocityAndPressure(iters = 18) {
    const n = this.n;
    const dx2 = this.dx * this.dx;
    const psi = this.psi;
    const w = this.w;
    const scenario = this.params.scenario || "cylinder";
    const uInlet = this.toggles.convectionOn ? this.params.uInlet ?? 1.0 : 0.0;

    // 1) 포아송 방정식 ∇²ψ = -ω (Red-Black Gauss-Seidel 가속)
    const omegaSOR = 1.65;
    for (let it = 0; it < iters; it++) {
      for (let color = 0; color < 2; color++) {
        for (let j = 0; j < n; j++) {
          for (let i = (j + color) % 2; i < n; i += 2) {
            const k = j * n + i;
            const avg =
              0.25 *
              (psi[this.idx(i + 1, j)] +
                psi[this.idx(i - 1, j)] +
                psi[this.idx(i, j + 1)] +
                psi[this.idx(i, j - 1)] +
                dx2 * w[k]);
            psi[k] = (1 - omegaSOR) * psi[k] + omegaSOR * avg;
          }
        }
      }
    }

    // 2) 속도장 복원 u = ∂ψ/∂y + U_mean, v = -∂ψ/∂x
    const meanU = scenario === "cylinder" ? uInlet : 0.0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        if (this.obstacle[k]) {
          this.u[k] = 0.0;
          this.v[k] = 0.0;
          continue;
        }
        this.u[k] = (psi[this.idx(i, j + 1)] - psi[this.idx(i, j - 1)]) / (2 * this.dx) + meanU;
        this.v[k] = -(psi[this.idx(i + 1, j)] - psi[this.idx(i - 1, j)]) / (2 * this.dx);
      }
    }

    // 3) 압력 포아송 방정식 ∇²p = 2(u_x v_y - u_y v_x)
    const rhsP = new Float64Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const ux = (this.u[this.idx(i + 1, j)] - this.u[this.idx(i - 1, j)]) / (2 * this.dx);
        const uy = (this.u[this.idx(i, j + 1)] - this.u[this.idx(i, j - 1)]) / (2 * this.dx);
        const vx = (this.v[this.idx(i + 1, j)] - this.v[this.idx(i - 1, j)]) / (2 * this.dx);
        const vy = (this.v[this.idx(i, j + 1)] - this.v[this.idx(i, j - 1)]) / (2 * this.dx);
        rhsP[j * n + i] = -2.0 * (ux * vy - uy * vx);
      }
    }

    const pArr = this.pField;
    for (let it = 0; it < 10; it++) {
      let meanP = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          pArr[k] =
            0.25 *
            (pArr[this.idx(i + 1, j)] +
              pArr[this.idx(i - 1, j)] +
              pArr[this.idx(i, j + 1)] +
              pArr[this.idx(i, j - 1)] -
              dx2 * rhsP[k]);
          meanP += pArr[k];
        }
      }
      meanP /= n * n;
      for (let k = 0; k < n * n; k++) pArr[k] -= meanP;
    }
  }

  stepWaveConvection2D(dt) {
    const n = this.n;
    const dx = this.dx;
    const p = this.params;
    const sub = p.submode || "advection";
    const cx = this.toggles.convectionOn ? p.cx ?? 1.0 : 0.0;
    const cy = this.toggles.convectionOn ? p.cy ?? 0.5 : 0.0;

    if (sub === "convected_wave" || sub === "classical_wave") {
      // 2D 이류-파동 결합 방정식:
      // ∂_t φ = - (U_x ∂_x φ + U_y ∂_y φ) + ψ
      // ∂_t ψ = - (U_x ∂_x ψ + U_y ∂_y ψ) + c^2 (∂_xx φ + ∂_yy φ) + Source
      const ux = sub === "classical_wave" ? 0 : cx;
      const uy = sub === "classical_wave" ? 0 : cy;
      const wc = this.toggles.diffusionOn ? p.waveC ?? 1.0 : 0.0;
      const bc = p.bc || "absorbing";

      const nextPhi = new Float64Array(n * n);
      const nextPsi = new Float64Array(n * n);

      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          const kL = bc === "periodic" ? this.idx(i - 1, j) : this.idxClamp(i - 1, j);
          const kR = bc === "periodic" ? this.idx(i + 1, j) : this.idxClamp(i + 1, j);
          const kD = bc === "periodic" ? this.idx(i, j - 1) : this.idxClamp(i, j - 1);
          const kU = bc === "periodic" ? this.idx(i, j + 1) : this.idxClamp(i, j + 1);

          const phix = ux >= 0 ? (this.u[k] - this.u[kL]) / dx : (this.u[kR] - this.u[k]) / dx;
          const phiy = uy >= 0 ? (this.u[k] - this.u[kD]) / dx : (this.u[kU] - this.u[k]) / dx;
          const psix = ux >= 0 ? (this.v[k] - this.v[kL]) / dx : (this.v[kR] - this.v[k]) / dx;
          const psiy = uy >= 0 ? (this.v[k] - this.v[kD]) / dx : (this.v[kU] - this.v[k]) / dx;

          const lapPhi = (this.u[kR] + this.u[kL] + this.u[kU] + this.u[kD] - 4 * this.u[k]) / (dx * dx);

          // 도플러 및 마하 원뿔 모드를 위한 연속 파원 (Pulse Train 모드)
          let source = 0;
          if ((p.profile || "pulse_train") === "pulse_train" && this.toggles.sourceOn) {
            const r2 = (this.x[i] - this.sourceX) ** 2 + (this.y[j] - this.sourceY) ** 2;
            source = 45.0 * Math.exp(-r2 / 0.0012) * Math.sin(24.0 * this.t);
          }

          // 가장자리 스펀지 흡수층 (반사 방지)
          let sponge = 0.0;
          if (bc === "absorbing") {
            const distEdge = Math.min(this.x[i], 1 - this.x[i], this.y[j], 1 - this.y[j]);
            if (distEdge < 0.09) {
              sponge = 12.0 * ((0.09 - distEdge) / 0.09) ** 2;
            }
          }

          const psiNew = this.v[k] + dt * (-ux * psix - uy * psiy + wc * wc * lapPhi + source - sponge * this.v[k]);
          const phiNew = this.u[k] + dt * (-ux * phix - uy * phiy + psiNew - 0.5 * sponge * this.u[k]);

          nextPsi[k] = psiNew;
          nextPhi[k] = phiNew;
        }
      }
      this.u = nextPhi;
      this.v = nextPsi;
      return;
    }

    // 2D 순수 이류 / 회전 와류장 이류 (Semi-Lagrangian + MUSCL 보존형 선택)
    const nextU = new Float64Array(n * n);
    const scheme = p.scheme || "muscl";
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        let vx = cx;
        let vy = cy;
        if (sub === "swirl") {
          const omega = cx;
          vx = -omega * (this.y[j] - 0.5);
          vy = omega * (this.x[i] - 0.5);
        }

        if (scheme === "upwind") {
          const ux =
            vx >= 0
              ? (this.u[k] - this.u[this.idx(i - 1, j)]) / dx
              : (this.u[this.idx(i + 1, j)] - this.u[k]) / dx;
          const uy =
            vy >= 0
              ? (this.u[k] - this.u[this.idx(i, j - 1)]) / dx
              : (this.u[this.idx(i, j + 1)] - this.u[k]) / dx;
          nextU[k] = this.u[k] - dt * (vx * ux + vy * uy);
        } else {
          // 2차 Lax-Wendroff / TVD 보정
          const kL = this.idx(i - 1, j);
          const kR = this.idx(i + 1, j);
          const kD = this.idx(i, j - 1);
          const kU = this.idx(i, j + 1);
          const Cx = (vx * dt) / dx;
          const Cy = (vy * dt) / dx;
          const advX = -0.5 * Cx * (this.u[kR] - this.u[kL]) + 0.5 * Cx * Cx * (this.u[kR] - 2 * this.u[k] + this.u[kL]);
          const advY = -0.5 * Cy * (this.u[kU] - this.u[kD]) + 0.5 * Cy * Cy * (this.u[kU] - 2 * this.u[k] + this.u[kD]);
          nextU[k] = this.u[k] + advX + advY;
        }
      }
    }
    this.u = nextU;
  }

  stepConvDiff2D(dt) {
    const n = this.n;
    const dx = this.dx;
    const p = this.params;
    const bc = p.bc || "periodic";
    const ux = this.toggles.convectionOn ? p.ux ?? 0.8 : 0.0;
    const uy = this.toggles.convectionOn ? p.uy ?? 0.3 : 0.0;
    const alpha = this.toggles.diffusionOn ? Math.max(p.alpha ?? 0.02, 0.0) : 0.0;

    const nextU = new Float64Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        if (bc === "fixed" && (i === 0 || i === n - 1 || j === 0 || j === n - 1)) {
          nextU[k] = 0.0;
          continue;
        }
        const kL = bc === "periodic" ? this.idx(i - 1, j) : this.idxClamp(i - 1, j);
        const kR = bc === "periodic" ? this.idx(i + 1, j) : this.idxClamp(i + 1, j);
        const kD = bc === "periodic" ? this.idx(i, j - 1) : this.idxClamp(i, j - 1);
        const kU = bc === "periodic" ? this.idx(i, j + 1) : this.idxClamp(i, j + 1);

        const gx = ux >= 0 ? (this.u[k] - this.u[kL]) / dx : (this.u[kR] - this.u[k]) / dx;
        const gy = uy >= 0 ? (this.u[k] - this.u[kD]) / dx : (this.u[kU] - this.u[k]) / dx;
        const lap = (this.u[kR] + this.u[kL] + this.u[kU] + this.u[kD] - 4 * this.u[k]) / (dx * dx);

        nextU[k] = this.u[k] + dt * (-ux * gx - uy * gy + alpha * lap);
      }
    }
    this.u = nextU;
  }

  stepBurgers2D(dt) {
    const n = this.n;
    const dx = this.dx;
    const nu = this.toggles.diffusionOn ? Math.max(this.params.nu ?? 0.006, 0.0) : 0.0;
    const nonlin = this.toggles.nonlinearOn ? 1.0 : 0.0;

    const nextU = new Float64Array(n * n);
    const nextV = new Float64Array(n * n);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const kL = this.idx(i - 1, j);
        const kR = this.idx(i + 1, j);
        const kD = this.idx(i, j - 1);
        const kU = this.idx(i, j + 1);

        const uC = this.u[k];
        const vC = this.v[k];

        const ux = uC >= 0 ? (uC - this.u[kL]) / dx : (this.u[kR] - uC) / dx;
        const uy = vC >= 0 ? (uC - this.u[kD]) / dx : (this.u[kU] - uC) / dx;
        const vx = uC >= 0 ? (vC - this.v[kL]) / dx : (this.v[kR] - vC) / dx;
        const vy = vC >= 0 ? (vC - this.v[kD]) / dx : (this.v[kU] - vC) / dx;

        const lapU = (this.u[kR] + this.u[kL] + this.u[kU] + this.u[kD] - 4 * uC) / (dx * dx);
        const lapV = (this.v[kR] + this.v[kL] + this.v[kU] + this.v[kD] - 4 * vC) / (dx * dx);

        nextU[k] = uC + dt * (-nonlin * (uC * ux + vC * uy) + nu * lapU);
        nextV[k] = vC + dt * (-nonlin * (uC * vx + vC * vy) + nu * lapV);
        this.w[k] = Math.hypot(nextU[k], nextV[k]);
        this.dye[k] = Math.hypot(ux, uy);
      }
    }
    this.u = nextU;
    this.v = nextV;
  }

  stepShallowWater2D(dt) {
    const n = this.n;
    const dx = this.dx;
    const g = this.params.g ?? 1.5;
    const fCor = this.params.coriolis ?? 0.0;
    const bc = this.params.bc || "reflective";

    const h = this.pField;
    const hu = this.u;
    const hv = this.v;
    const b = this.psi;

    const nextH = new Float64Array(n * n);
    const nextHU = new Float64Array(n * n);
    const nextHV = new Float64Array(n * n);

    const getCell = (ii, jj) => {
      if (bc === "periodic") {
        const k = this.idx(ii, jj);
        return { h: h[k], hu: hu[k], hv: hv[k] };
      }
      let ci = ii;
      let cj = jj;
      let sx = 1;
      let sy = 1;
      if (ci < 0) {
        ci = 0;
        sx = -1;
      } else if (ci >= n) {
        ci = n - 1;
        sx = -1;
      }
      if (cj < 0) {
        cj = 0;
        sy = -1;
      } else if (cj >= n) {
        cj = n - 1;
        sy = -1;
      }
      const k = cj * n + ci;
      return { h: h[k], hu: sx * hu[k], hv: sy * hv[k] };
    };

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const cC = getCell(i, j);
        const cL = getCell(i - 1, j);
        const cR = getCell(i + 1, j);
        const cD = getCell(i, j - 1);
        const cU = getCell(i, j + 1);

        const fluxX = (L, R) => {
          const uL = L.hu / Math.max(L.h, 1e-4);
          const vL = L.hv / Math.max(L.h, 1e-4);
          const uR = R.hu / Math.max(R.h, 1e-4);
          const vR = R.hv / Math.max(R.h, 1e-4);
          const sMax = Math.max(Math.abs(uL) + Math.sqrt(g * L.h), Math.abs(uR) + Math.sqrt(g * R.h));
          return {
            fh: 0.5 * (L.hu + R.hu) - 0.5 * sMax * (R.h - L.h),
            fhu: 0.5 * (L.hu * uL + 0.5 * g * L.h * L.h + R.hu * uR + 0.5 * g * R.h * R.h) - 0.5 * sMax * (R.hu - L.hu),
            fhv: 0.5 * (L.hu * vL + R.hu * vR) - 0.5 * sMax * (R.hv - L.hv),
          };
        };

        const fluxY = (D, U) => {
          const uD = D.hu / Math.max(D.h, 1e-4);
          const vD = D.hv / Math.max(D.h, 1e-4);
          const uU = U.hu / Math.max(U.h, 1e-4);
          const vU = U.hv / Math.max(U.h, 1e-4);
          const sMax = Math.max(Math.abs(vD) + Math.sqrt(g * D.h), Math.abs(vU) + Math.sqrt(g * U.h));
          return {
            gh: 0.5 * (D.hv + U.hv) - 0.5 * sMax * (U.h - D.h),
            ghu: 0.5 * (D.hv * uD + U.hv * uU) - 0.5 * sMax * (U.hu - D.hu),
            ghv: 0.5 * (D.hv * vD + 0.5 * g * D.h * D.h + U.hv * vU + 0.5 * g * U.h * U.h) - 0.5 * sMax * (U.hv - D.hv),
          };
        };

        const fxR = fluxX(cC, cR);
        const fxL = fluxX(cL, cC);
        const fyU = fluxY(cC, cU);
        const fyD = fluxY(cD, cC);

        const bx = this.toggles.sourceOn ? (b[this.idxClamp(i + 1, j)] - b[this.idxClamp(i - 1, j)]) / (2 * dx) : 0;
        const by = this.toggles.sourceOn ? (b[this.idxClamp(i, j + 1)] - b[this.idxClamp(i, j - 1)]) / (2 * dx) : 0;

        nextH[k] = Math.max(0.08, cC.h - (dt / dx) * (fxR.fh - fxL.fh + fyU.gh - fyD.gh));
        nextHU[k] = cC.hu - (dt / dx) * (fxR.fhu - fxL.fhu + fyU.ghu - fyD.ghu) + dt * (-g * cC.h * bx + fCor * cC.hv);
        nextHV[k] = cC.hv - (dt / dx) * (fxR.fhv - fxL.fhv + fyU.ghv - fyD.ghv) + dt * (-g * cC.h * by - fCor * cC.hu);

        this.w[k] = nextH[k] + b[k];
      }
    }

    this.pField = nextH;
    this.u = nextHU;
    this.v = nextHV;
  }

  stepEuler2D(dt) {
    const n = this.n;
    const dx = this.dx;
    const g = this.params.gamma ?? 1.4;

    const rho = this.pField;
    const rhou = this.u;
    const rhov = this.v;
    const E = this.w;

    const nextRho = new Float64Array(n * n);
    const nextRU = new Float64Array(n * n);
    const nextRV = new Float64Array(n * n);
    const nextE = new Float64Array(n * n);

    const getCell = (ii, jj) => {
      const k = this.idxClamp(ii, jj);
      const r = Math.max(1e-4, rho[k]);
      const u = rhou[k] / r;
      const v = rhov[k] / r;
      const eTot = E[k];
      const p = Math.max(1e-4, (g - 1) * (eTot - 0.5 * r * (u * u + v * v)));
      const c = Math.sqrt((g * p) / r);
      return { r, ru: rhou[k], rv: rhov[k], E: eTot, u, v, p, c };
    };

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const cC = getCell(i, j);
        const cL = getCell(i - 1, j);
        const cR = getCell(i + 1, j);
        const cD = getCell(i, j - 1);
        const cU = getCell(i, j + 1);

        const fluxX = (L, R) => {
          const s = Math.max(Math.abs(L.u) + L.c, Math.abs(R.u) + R.c);
          return {
            f0: 0.5 * (L.ru + R.ru) - 0.5 * s * (R.r - L.r),
            f1: 0.5 * (L.ru * L.u + L.p + R.ru * R.u + R.p) - 0.5 * s * (R.ru - L.ru),
            f2: 0.5 * (L.ru * L.v + R.ru * R.v) - 0.5 * s * (R.rv - L.rv),
            f3: 0.5 * (L.u * (L.E + L.p) + R.u * (R.E + R.p)) - 0.5 * s * (R.E - L.E),
          };
        };

        const fluxY = (D, U) => {
          const s = Math.max(Math.abs(D.v) + D.c, Math.abs(U.v) + U.c);
          return {
            g0: 0.5 * (D.rv + U.rv) - 0.5 * s * (U.r - D.r),
            g1: 0.5 * (D.rv * D.u + U.rv * U.u) - 0.5 * s * (U.ru - D.ru),
            g2: 0.5 * (D.rv * D.v + D.p + U.rv * U.v + U.p) - 0.5 * s * (U.rv - D.rv),
            g3: 0.5 * (D.v * (D.E + D.p) + U.v * (U.E + U.p)) - 0.5 * s * (U.E - D.E),
          };
        };

        const fxR = fluxX(cC, cR);
        const fxL = fluxX(cL, cC);
        const fyU = fluxY(cC, cU);
        const fyD = fluxY(cD, cC);

        nextRho[k] = Math.max(1e-4, cC.r - (dt / dx) * (fxR.f0 - fxL.f0 + fyU.g0 - fyD.g0));
        nextRU[k] = cC.ru - (dt / dx) * (fxR.f1 - fxL.f1 + fyU.g1 - fyD.g1);
        nextRV[k] = cC.rv - (dt / dx) * (fxR.f2 - fxL.f2 + fyU.g2 - fyD.g2);
        nextE[k] = Math.max(1e-4, cC.E - (dt / dx) * (fxR.f3 - fxL.f3 + fyU.g3 - fyD.g3));
      }
    }

    this.pField = nextRho;
    this.u = nextRU;
    this.v = nextRV;
    this.w = nextE;
    this.updateEulerDerived2D();
  }

  updateEulerDerived2D() {
    const n = this.n;
    const dx = this.dx;
    const g = this.params.gamma ?? 1.4;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const r = Math.max(1e-4, this.pField[k]);
        const u = this.u[k] / r;
        const v = this.v[k] / r;
        const pr = Math.max(1e-4, (g - 1) * (this.w[k] - 0.5 * r * (u * u + v * v)));
        const c = Math.sqrt((g * pr) / r);
        this.psi[k] = pr; // 압력 저장
        this.dye[k] = Math.hypot(u, v) / c; // 마하수 저장

        const rx = (this.pField[this.idxClamp(i + 1, j)] - this.pField[this.idxClamp(i - 1, j)]) / (2 * dx);
        const ry = (this.pField[this.idxClamp(i, j + 1)] - this.pField[this.idxClamp(i, j - 1)]) / (2 * dx);
        this.schlieren[k] = Math.pow(Math.hypot(rx, ry), 0.65);
      }
    }
  }

  stepNavierStokes2D(dt) {
    const n = this.n;
    const dx = this.dx;
    const nu = this.toggles.diffusionOn ? Math.max(this.params.nu ?? 0.0018, 0.0) : 0.0;
    const advScale = this.toggles.convectionOn && this.toggles.nonlinearOn ? 1.0 : 0.0;
    const scenario = this.params.scenario || "cylinder";

    const nextW = new Float64Array(n * n);
    const nextDye = new Float64Array(n * n);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const kL = this.idx(i - 1, j);
        const kR = this.idx(i + 1, j);
        const kD = this.idx(i, j - 1);
        const kU = this.idx(i, j + 1);

        const uC = this.u[k];
        const vC = this.v[k];

        // 와도 이류 + 점성 확산
        const wx = uC >= 0 ? (this.w[k] - this.w[kL]) / dx : (this.w[kR] - this.w[k]) / dx;
        const wy = vC >= 0 ? (this.w[k] - this.w[kD]) / dx : (this.w[kU] - this.w[k]) / dx;
        const lapW = (this.w[kR] + this.w[kL] + this.w[kU] + this.w[kD] - 4 * this.w[k]) / (dx * dx);

        nextW[k] = this.w[k] + dt * (-advScale * (uC * wx + vC * wy) + nu * lapW);

        // 염료 이류 + 약한 분자 확산
        const cx = uC >= 0 ? (this.dye[k] - this.dye[kL]) / dx : (this.dye[kR] - this.dye[k]) / dx;
        const cy = vC >= 0 ? (this.dye[k] - this.dye[kD]) / dx : (this.dye[kU] - this.dye[k]) / dx;
        const lapC = (this.dye[kR] + this.dye[kL] + this.dye[kU] + this.dye[kD] - 4 * this.dye[k]) / (dx * dx);
        nextDye[k] = this.dye[k] + dt * (-advScale * (uC * cx + vC * cy) + 0.25 * nu * lapC);

        // 원기둥 시나리오: 입구 염료 연속 분사 및 원기둥 경계 와도 생성(Brinkman Penalization)
        if (scenario === "cylinder") {
          if (i < 4) {
            const jet1 = Math.exp(-(((this.y[j] - 0.44) / 0.045) ** 2));
            const jet2 = Math.exp(-(((this.y[j] - 0.56) / 0.045) ** 2));
            nextDye[k] = jet1 - 0.85 * jet2;
            nextW[k] = 0.0;
          }
          const rCyl = Math.hypot(this.x[i] - 0.26, this.y[j] - 0.5);
          if (rCyl < 0.075) {
            nextW[k] = 0.0;
            nextDye[k] = 0.0;
          } else if (rCyl < 0.095) {
            // 원기둥 표면 경계층 전단 와도 생성 + 미세 비대칭 발진 유도
            const angle = Math.atan2(this.y[j] - 0.5, this.x[i] - 0.26);
            const shedTrigger = 0.25 * Math.sin(4.5 * this.t);
            nextW[k] += dt * (-18.0 * Math.sin(angle) + shedTrigger);
          }
        }
      }
    }

    this.w = nextW;
    this.dye = nextDye;
    this.solveNavierVelocityAndPressure(14);
  }

  computeStableDt() {
    const p = this.params;
    const cfl = Math.max(0.1, Math.min(0.95, p.cfl || 0.55));
    const dx = this.dx;

    if (this.labId === "wave_convection") {
      const cx = Math.abs(p.cx ?? 1.0);
      const cy = Math.abs(p.cy ?? 0.5);
      const wc = (p.submode || "advection") === "convected_wave" ? Math.abs(p.waveC ?? 1.0) : 0;
      return (cfl * dx) / Math.max(cx + cy + 1.42 * wc, 0.2);
    }
    if (this.labId === "conv_diff") {
      const ux = Math.abs(p.ux ?? 0.8);
      const uy = Math.abs(p.uy ?? 0.3);
      const alpha = Math.max(p.alpha ?? 0.02, 0.0);
      return cfl / Math.max((ux + uy) / dx + (4 * alpha) / (dx * dx), 0.2);
    }
    if (this.labId === "burgers") {
      return (cfl * dx) / 2.2;
    }
    if (this.labId === "shallow_water") {
      const g = p.g ?? 1.5;
      return (cfl * dx) / Math.max(2.2 * Math.sqrt(g * 1.6), 0.5);
    }
    if (this.labId === "euler") {
      return (cfl * dx) / 3.2;
    }
    if (this.labId === "navier_stokes") {
      return (cfl * dx) / 2.4;
    }
    return 0.004;
  }

  step(numSubsteps = 1) {
    for (let s = 0; s < numSubsteps; s++) {
      const dt = this.computeStableDt();
      this.lastDt = dt;
      if (this.labId === "wave_convection") this.stepWaveConvection2D(dt);
      else if (this.labId === "conv_diff") this.stepConvDiff2D(dt);
      else if (this.labId === "burgers") this.stepBurgers2D(dt);
      else if (this.labId === "shallow_water") this.stepShallowWater2D(dt);
      else if (this.labId === "euler") this.stepEuler2D(dt);
      else if (this.labId === "navier_stokes") this.stepNavierStokes2D(dt);

      this.advectParticles(dt);
      this.t += dt;
      this.stepCount++;
    }
    this.recordDiagnostics();
  }

  getPrimaryFieldArray() {
    const f = this.activeField;
    if (this.labId === "wave_convection") {
      return f.includes("변화율") ? this.v : this.u;
    }
    if (this.labId === "conv_diff") {
      return this.u;
    }
    if (this.labId === "burgers") {
      if (f === "x 유속 u") return this.u;
      if (f === "y 유속 v") return this.v;
      if (f.includes("충격전선")) return this.dye;
      return this.w;
    }
    if (this.labId === "shallow_water") {
      if (f === "수심 h") return this.pField;
      if (f.includes("유속") || f.includes("Fr")) {
        const out = new Float64Array(this.n * this.n);
        const g = this.params.g ?? 1.5;
        for (let k = 0; k < out.length; k++) {
          const h = Math.max(this.pField[k], 1e-4);
          const spd = Math.hypot(this.u[k] / h, this.v[k] / h);
          out[k] = f.includes("Fr") ? spd / Math.sqrt(g * h) : spd;
        }
        return out;
      }
      return this.w;
    }
    if (this.labId === "euler") {
      if (f === "압력 p") return this.psi;
      if (f.includes("슐리렌")) return this.schlieren;
      if (f === "마하수 M") return this.dye;
      if (f.includes("속력")) {
        const out = new Float64Array(this.n * this.n);
        for (let k = 0; k < out.length; k++) {
          const r = Math.max(this.pField[k], 1e-4);
          out[k] = Math.hypot(this.u[k] / r, this.v[k] / r);
        }
        return out;
      }
      return this.pField;
    }
    if (this.labId === "navier_stokes") {
      if (f.includes("와도")) return this.w;
      if (f.includes("염료")) return this.dye;
      if (f.includes("압력")) return this.pField;
      if (f.includes("유선")) return this.psi;
      const out = new Float64Array(this.n * this.n);
      for (let k = 0; k < out.length; k++) {
        out[k] = Math.hypot(this.u[k], this.v[k]);
      }
      return out;
    }
    return this.u;
  }

  recordDiagnostics() {
    const arr = this.getPrimaryFieldArray();
    const dA = this.dx * this.dx;
    let mass = 0;
    let energy = 0;
    let maxVal = -Infinity;
    for (let k = 0; k < arr.length; k++) {
      mass += arr[k] * dA;
      energy += 0.5 * arr[k] * arr[k] * dA;
      if (arr[k] > maxVal) maxVal = arr[k];
    }

    let rmse = 0;
    if (this.labId === "navier_stokes" && (this.params.scenario || "cylinder") === "taylor") {
      const nu = this.toggles.diffusionOn ? this.params.nu ?? 0.005 : 0.0;
      const decay = Math.exp(-8 * Math.PI * Math.PI * nu * this.t);
      let s2 = 0;
      for (let j = 0; j < this.n; j++) {
        for (let i = 0; i < this.n; i++) {
          const ex = 4 * Math.PI * Math.sin(2 * Math.PI * this.x[i]) * Math.sin(2 * Math.PI * this.y[j]) * decay;
          const diff = this.w[j * this.n + i] - ex;
          s2 += diff * diff;
        }
      }
      rmse = Math.sqrt(s2 / (this.n * this.n));
    }

    const dh = this.diagHistory;
    dh.t.push(this.t);
    dh.mass.push(mass);
    dh.energy.push(energy);
    dh.rmse.push(rmse);
    dh.maxVal.push(maxVal);
    if (dh.t.length > 240) {
      dh.t.shift();
      dh.mass.shift();
      dh.energy.shift();
      dh.rmse.shift();
      dh.maxVal.shift();
    }
  }

  /**
   * 2D 선택한 격자점 (probeI, probeJ)에서 5점 스텐실 값 및 각 PDE 항의 실시간 수치 분해 반환
   */
  getStencilAndTerms2D(probeI, probeJ) {
    const n = this.n;
    const i = Math.max(1, Math.min(n - 2, probeI));
    const j = Math.max(1, Math.min(n - 2, probeJ));
    const arr = this.getPrimaryFieldArray();
    const dx = this.dx;

    const c = arr[j * n + i];
    const l = arr[j * n + (i - 1)];
    const r = arr[j * n + (i + 1)];
    const d = arr[(j - 1) * n + i];
    const u = arr[(j + 1) * n + i];

    const gx = (r - l) / (2 * dx);
    const gy = (u - d) / (2 * dx);
    const dxx = (r - 2 * c + l) / (dx * dx);
    const dyy = (u - 2 * c + d) / (dx * dx);
    const lap = dxx + dyy;

    const { ux, vy } = this.sampleVelocity(this.x[i], this.y[j]);
    const advTerm = -(ux * gx + vy * gy);

    const p = this.params;
    let terms = [];
    if (this.labId === "wave_convection") {
      const sub = p.submode || "advection";
      const wc = p.waveC ?? 1.0;
      const mach = wc > 1e-5 ? Math.hypot(ux, vy) / wc : 0;
      terms = [
        { name: "x방향 이류 (-c_x ∂u/∂x)", value: -ux * gx, color: "#38bdf8", desc: "수평 유속과 x기울기의 곱" },
        { name: "y방향 이류 (-c_y ∂u/∂y)", value: -vy * gy, color: "#f59e0b", desc: "수직 유속과 y기울기의 곱" },
        {
          name: sub === "convected_wave" ? "2D 파동 라플라시안 (c²∇²φ)" : "총 대류 변화율 (-c·∇u)",
          value: sub === "convected_wave" ? wc * wc * lap : advTerm,
          color: "#10b981",
          desc: sub === "convected_wave" ? "2D 공간 곡률이 만드는 파동 복원 가속도" : "현재 격자점의 순간 시간 변화율 ∂u/∂t",
        },
        {
          name: "유동 마하수 (M = |U₀|/c)",
          value: mach,
          color: "#ec4899",
          desc: mach > 1 ? `초음속 이류 (마하각 μ = ${((Math.asin(1 / mach) * 180) / Math.PI).toFixed(1)}°)` : "아음속 도플러 전파 영역 (M < 1)",
        },
      ];
    } else if (this.labId === "conv_diff") {
      const alpha = this.toggles.diffusionOn ? p.alpha ?? 0.02 : 0.0;
      const pe = alpha > 1e-6 ? Math.hypot(ux, vy) / alpha : 999;
      terms = [
        { name: "2D 대류 수송 (-u·∇T)", value: advTerm, color: "#f59e0b", desc: "속도장과 온도 구배 내적에 의한 열 이동" },
        { name: "2D 열확산 (α∇²T)", value: alpha * lap, color: "#10b981", desc: "x·y 두 방향 곡률 합에 의한 열 평탄화" },
        { name: "총 온도 변화율 (∂T/∂t)", value: advTerm + alpha * lap, color: "#38bdf8", desc: "대류항 + 확산항의 알짜 변화율" },
        { name: "무차원 페클레 수 (Pe = |u|L/α)", value: pe, color: "#a855f7", desc: "1보다 클수록 대류 플룸이 지배적" },
      ];
    } else if (this.labId === "navier_stokes") {
      const nu = this.toggles.diffusionOn ? p.nu ?? 0.002 : 0.0;
      const re = nu > 1e-6 ? Math.max(Math.hypot(ux, vy), p.uInlet || 1.0) / nu : 9999;
      terms = [
        { name: "비선형 이류 (-u·∇ω)", value: advTerm, color: "#f59e0b", desc: "유도 속도장이 소용돌이를 하류로 운반" },
        { name: "점성 응력 확산 (ν∇²ω)", value: nu * lap, color: "#10b981", desc: "점성이 날카로운 와도 구배를 소산" },
        { name: "국소 압력 (p)", value: this.pField[j * n + i], color: "#38bdf8", desc: "소용돌이 중심은 저압(<0), 정체점은 고압(>0)" },
        { name: "유동 레이놀즈 수 (Re)", value: re, color: "#ec4899", desc: "관성력 대비 점성력의 비 (Re = UL/ν)" },
      ];
    } else {
      terms = [
        { name: "2D 이류 기여 (-u·∇f)", value: advTerm, color: "#f59e0b", desc: "국소 유속에 의한 대류 수송 변화율" },
        { name: "x방향 곡률 (∂²f/∂x²)", value: dxx, color: "#38bdf8", desc: "좌우 이웃과의 2차 미분" },
        { name: "y방향 곡률 (∂²f/∂y²)", value: dyy, color: "#10b981", desc: "상하 이웃과의 2차 미분" },
        { name: "2D 라플라시안 (∇²f)", value: lap, color: "#a855f7", desc: "4개 이웃 평균과 중심의 차이" },
      ];
    }

    return {
      i,
      j,
      x: this.x[i],
      y: this.y[j],
      c,
      l,
      r,
      d,
      u,
      gx,
      gy,
      dxx,
      dyy,
      lap,
      terms,
    };
  }
}
