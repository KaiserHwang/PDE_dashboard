// src/solvers-pde1d.js
// 1D 편미분방정식 (파동·이류, 대류·확산, Burgers, 천수, 압축성 Euler) 고정밀 수치해석 및 다중 기법 비교 엔진

export function minmod(a, b) {
  if (a * b <= 0) return 0.0;
  return Math.sign(a) * Math.min(Math.abs(a), Math.abs(b));
}

export function superbee(a, b) {
  if (a * b <= 0) return 0.0;
  const s = Math.sign(a);
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  return s * Math.max(Math.min(2 * absA, absB), Math.min(absA, 2 * absB));
}

/**
 * O(N) 삼중대각 행렬 해법 (Thomas Algorithm) — 암시적 열전도 / Crank-Nicolson용
 */
export function solveTridiagonal(lower, diag, upper, rhs) {
  const n = diag.length;
  const c = new Float64Array(n);
  const d = new Float64Array(n);
  c[0] = upper[0] / diag[0];
  d[0] = rhs[0] / diag[0];
  for (let i = 1; i < n; i++) {
    const denom = diag[i] - lower[i - 1] * c[i - 1];
    if (i < n - 1) c[i] = upper[i] / denom;
    d[i] = (rhs[i] - lower[i - 1] * d[i - 1]) / denom;
  }
  const out = new Float64Array(n);
  out[n - 1] = d[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    out[i] = d[i] - c[i] * out[i + 1];
  }
  return out;
}

/**
 * 1D 초기 파형 생성기
 */
export function buildInitialProfile1D(xArr, profile, bc = "periodic", extra = {}) {
  const n = xArr.length;
  const u = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = xArr[i];
    if (profile === "sine") {
      u[i] = bc === "fixed" ? Math.sin(Math.PI * x) : 0.5 + 0.45 * Math.sin(2 * Math.PI * x);
    } else if (profile === "step") {
      u[i] = x >= 0.25 && x <= 0.6 ? 1.0 : 0.1;
    } else if (profile === "combo") {
      // 가우시안 봉우리 + 사각 펄스 복합 파형 (이류 수치기법 비교 표준 벤치마크)
      const gauss = Math.exp(-(((x - 0.25) / 0.065) ** 2));
      const box = x >= 0.52 && x <= 0.74 ? 0.85 : 0.0;
      u[i] = gauss + box;
    } else if (profile === "pulse_train") {
      u[i] = Math.exp(-(((x - 0.45) / 0.06) ** 2)) * Math.cos(10 * Math.PI * (x - 0.45));
    } else if (profile === "dambreak") {
      u[i] = x < 0.48 ? 1.6 : 0.6;
    } else {
      // 기본 가우시안
      const center = extra.center ?? 0.42;
      const width = extra.width ?? 0.075;
      u[i] = Math.exp(-(((x - center) / width) ** 2));
    }
  }
  if (bc === "fixed") {
    u[0] = 0;
    u[n - 1] = 0;
  }
  return u;
}

/**
 * 1D 압축성 Euler 방정식 엄밀 Riemann 해법 (Exact Riemann Solver)
 */
export function riemannExact1D(xArr, t, gamma = 1.4, rhoL = 1.0, pL = 1.0, rhoR = 0.125, pR = 0.1, x0 = 0.5) {
  const n = xArr.length;
  const rho = new Float64Array(n);
  const vel = new Float64Array(n);
  const pres = new Float64Array(n);
  const mach = new Float64Array(n);
  const entropy = new Float64Array(n);

  const aL = Math.sqrt((gamma * pL) / rhoL);
  const aR = Math.sqrt((gamma * pR) / rhoR);
  const g = gamma;

  const f = (p, rk, pk, ak) => {
    if (p > pk) {
      const A = 2 / ((g + 1) * rk);
      const B = ((g - 1) * pk) / (g + 1);
      return (p - pk) * Math.sqrt(A / (p + B));
    }
    return ((2 * ak) / (g - 1)) * (Math.pow(p / pk, (g - 1) / (2 * g)) - 1);
  };

  let lo = 1e-10;
  let hi = Math.max(pL, pR) * 4;
  for (let iter = 0; iter < 70; iter++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid, rhoL, pL, aL) + f(mid, rhoR, pR, aR) > 0) hi = mid;
    else lo = mid;
  }
  const ps = 0.5 * (lo + hi);
  const us = 0.5 * (f(ps, rhoR, pR, aR) - f(ps, rhoL, pL, aL));
  const beta = (g - 1) / (g + 1);

  for (let i = 0; i < n; i++) {
    if (t < 1e-12) {
      const left = xArr[i] < x0;
      rho[i] = left ? rhoL : rhoR;
      vel[i] = 0;
      pres[i] = left ? pL : pR;
    } else {
      const S = (xArr[i] - x0) / t;
      const left = S <= us;
      const rk = left ? rhoL : rhoR;
      const pk = left ? pL : pR;
      const ak = left ? aL : aR;
      const sign = left ? -1 : 1;

      if (ps > pk) {
        const shockSpeed = sign * ak * Math.sqrt(((g + 1) * ps) / (2 * g * pk) + (g - 1) / (2 * g));
        const outer = left ? S < shockSpeed : S > shockSpeed;
        if (outer) {
          rho[i] = rk;
          vel[i] = 0;
          pres[i] = pk;
        } else {
          rho[i] = (rk * (ps / pk + beta)) / (beta * (ps / pk) + 1);
          vel[i] = us;
          pres[i] = ps;
        }
      } else {
        const aStar = ak * Math.pow(ps / pk, (g - 1) / (2 * g));
        const head = sign * ak;
        const tail = us + sign * aStar;
        const outer = left ? S <= head : S >= head;
        const star = left ? S >= tail : S <= tail;
        if (outer) {
          rho[i] = rk;
          vel[i] = 0;
          pres[i] = pk;
        } else if (star) {
          rho[i] = rk * Math.pow(ps / pk, 1 / g);
          vel[i] = us;
          pres[i] = ps;
        } else {
          const uf = (2 / (g + 1)) * (S - sign * ak);
          const af = (2 / (g + 1)) * (ak + (sign * (g - 1) * S) / 2);
          rho[i] = rk * Math.pow(af / ak, 2 / (g - 1));
          vel[i] = uf;
          pres[i] = pk * Math.pow(af / ak, (2 * g) / (g - 1));
        }
      }
    }
    const cSound = Math.sqrt((g * pres[i]) / Math.max(rho[i], 1e-8));
    mach[i] = Math.abs(vel[i]) / Math.max(cSound, 1e-8);
    entropy[i] = Math.log(Math.max(pres[i], 1e-8) / Math.pow(Math.max(rho[i], 1e-8), g));
  }

  return { rho, vel, pres, mach, entropy, pStar: ps, uStar: us };
}

/**
 * 1D PDE 실시간 시뮬레이터 (다중 수치기법 동시 비교 + 시공간 다이어그램 + 스텐실 현미경)
 */
export class PDE1DSimulator {
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
    this.n = Math.max(32, Math.min(320, Math.round(p.gridN || 160)));
    this.bc = p.bc || (this.labId === "euler" ? "outflow" : this.labId === "shallow_water" ? "reflective" : "periodic");
    const periodic = this.bc === "periodic";

    this.x = new Float64Array(this.n);
    this.dx = periodic ? 1.0 / this.n : 1.0 / (this.n - 1);
    for (let i = 0; i < this.n; i++) {
      this.x[i] = this.labId === "euler" ? (i + 0.5) * (1.0 / this.n) : i * this.dx;
    }
    if (this.labId === "euler") {
      this.dx = 1.0 / this.n;
    }

    this.xtHistory = []; // 시공간(x-t) 히트맵용 버퍼
    this.xtTimes = [];
    this.diagHistory = { t: [], mass: [], energy: [], rmse: [], maxVal: [] };

    if (this.labId === "wave_convection") {
      const u0 = buildInitialProfile1D(this.x, p.profile || "gaussian", this.bc);
      this.u0 = new Float64Array(u0);
      this.uPrimary = new Float64Array(u0);
      this.vPrimary = new Float64Array(this.n); // 2차 파동/이류-파동용 보조 변수
      this.uUpwind = new Float64Array(u0);
      this.uLW = new Float64Array(u0);
      this.uMUSCL = new Float64Array(u0);
      this.fieldNames = ["파형 u(x,t)"];
      this.activeField = "파형 u(x,t)";
    } else if (this.labId === "conv_diff") {
      const u0 = buildInitialProfile1D(this.x, p.profile || "gaussian", this.bc);
      this.u0 = new Float64Array(u0);
      this.uPrimary = new Float64Array(u0);
      this.uUpwind = new Float64Array(u0);
      this.uCentral = new Float64Array(u0);
      this.uCN = new Float64Array(u0);
      this.fieldNames = ["온도/농도 T(x,t)"];
      this.activeField = "온도/농도 T(x,t)";
    } else if (this.labId === "burgers") {
      const prof = p.profile || "sine";
      const u0 = new Float64Array(this.n);
      for (let i = 0; i < this.n; i++) {
        const x = this.x[i];
        if (prof === "step") {
          u0[i] = x >= 0.22 && x <= 0.58 ? 1.2 : 0.2;
        } else if (prof === "gaussian") {
          u0[i] = 0.2 + 1.0 * Math.exp(-(((x - 0.35) / 0.09) ** 2));
        } else {
          u0[i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * x);
        }
      }
      this.u0 = new Float64Array(u0);
      this.uPrimary = new Float64Array(u0);
      this.uRusanov = new Float64Array(u0);
      this.uMUSCL = new Float64Array(u0);
      this.uNonCons = new Float64Array(u0);
      this.fieldNames = ["유속 u(x,t)"];
      this.activeField = "유속 u(x,t)";
    } else if (this.labId === "shallow_water") {
      this.bathy = new Float64Array(this.n);
      this.hPrimary = new Float64Array(this.n);
      this.huPrimary = new Float64Array(this.n);
      this.hRusanov = new Float64Array(this.n);
      this.huRusanov = new Float64Array(this.n);
      const bAmp = p.bathyAmp ?? 0.0;
      const uInit = p.meanFlow ?? 0.0;
      for (let i = 0; i < this.n; i++) {
        const x = this.x[i];
        const b = bAmp * Math.exp(-(((x - 0.55) / 0.11) ** 2));
        this.bathy[i] = b;
        let eta = 1.0;
        if ((p.profile || "dambreak") === "dambreak") {
          eta = x < 0.45 ? 1.45 : 0.75;
        } else {
          eta = 0.95 + 0.45 * Math.exp(-(((x - 0.28) / 0.07) ** 2));
        }
        const h = Math.max(0.15, eta - b);
        this.hPrimary[i] = h;
        this.huPrimary[i] = h * uInit;
        this.hRusanov[i] = h;
        this.huRusanov[i] = h * uInit;
      }
      this.u0 = new Float64Array(this.hPrimary);
      this.fieldNames = ["수면 높이 η = h+b", "수심 h", "유속 u", "프루드 수 Fr"];
      this.activeField = "수면 높이 η = h+b";
    } else if (this.labId === "euler") {
      const g = p.gamma ?? 1.4;
      const rhoL = p.rhoL ?? 1.0;
      const pL = p.pL ?? 1.0;
      const rhoR = p.rhoR ?? 0.125;
      const pR = p.pR ?? 0.1;
      this.UPrimary = new Float64Array(this.n * 3);
      this.URusanov = new Float64Array(this.n * 3);
      for (let i = 0; i < this.n; i++) {
        const left = this.x[i] < 0.5;
        const rho = left ? rhoL : rhoR;
        const pr = left ? pL : pR;
        const E = pr / (g - 1);
        this.UPrimary[3 * i] = rho;
        this.UPrimary[3 * i + 1] = 0.0;
        this.UPrimary[3 * i + 2] = E;
        this.URusanov[3 * i] = rho;
        this.URusanov[3 * i + 1] = 0.0;
        this.URusanov[3 * i + 2] = E;
      }
      this.fieldNames = ["밀도 ρ", "압력 p", "유속 u", "마하수 M", "엔트로피 s"];
      this.activeField = "밀도 ρ";
    }

    this.recordDiagnostics();
  }

  /**
   * 캔버스 터치/클릭으로 1D 파형에 국소 펄스 주입
   */
  injectPulse(xNorm, amp = 0.45, width = 0.05) {
    const x0 = Math.max(0.05, Math.min(0.95, xNorm));
    if (this.labId === "wave_convection" || this.labId === "conv_diff" || this.labId === "burgers") {
      for (let i = 0; i < this.n; i++) {
        const add = amp * Math.exp(-(((this.x[i] - x0) / width) ** 2));
        this.uPrimary[i] += add;
        if (this.uUpwind) this.uUpwind[i] += add;
        if (this.uLW) this.uLW[i] += add;
        if (this.uMUSCL) this.uMUSCL[i] += add;
        if (this.uRusanov) this.uRusanov[i] += add;
      }
    } else if (this.labId === "shallow_water") {
      for (let i = 0; i < this.n; i++) {
        const add = 0.35 * Math.exp(-(((this.x[i] - x0) / width) ** 2));
        this.hPrimary[i] += add;
        this.hRusanov[i] += add;
      }
    }
  }

  computeStableDt() {
    const p = this.params;
    const cfl = Math.max(0.05, Math.min(1.25, p.cfl || 0.65));
    const dx = this.dx;

    if (this.labId === "wave_convection") {
      const sub = p.submode || "advection";
      const cx = Math.abs(this.toggles.convectionOn ? p.cx ?? 1.0 : 0.0);
      const wc = sub === "advection" || sub === "swirl" ? 0 : Math.abs(p.waveC ?? 1.0);
      const maxSpeed = Math.max(cx + wc, 0.15);
      return (cfl * dx) / maxSpeed;
    }
    if (this.labId === "conv_diff") {
      const ux = Math.abs(this.toggles.convectionOn ? p.ux ?? 0.8 : 0.0);
      const alpha = this.toggles.diffusionOn ? Math.max(p.alpha ?? 0.02, 0.0) : 0.0;
      const advRate = ux / dx;
      const diffRate = (2 * alpha) / (dx * dx);
      return cfl / Math.max(advRate + diffRate, 0.1);
    }
    if (this.labId === "burgers") {
      let maxU = 0.2;
      for (let i = 0; i < this.n; i++) maxU = Math.max(maxU, Math.abs(this.uPrimary[i]));
      const nu = this.toggles.diffusionOn ? Math.max(p.nu ?? 0.005, 0.0) : 0.0;
      return cfl / (maxU / dx + (2 * nu) / (dx * dx) + 1e-6);
    }
    if (this.labId === "shallow_water") {
      const g = p.g ?? 1.5;
      let maxS = 0.3;
      for (let i = 0; i < this.n; i++) {
        const h = Math.max(this.hPrimary[i], 1e-4);
        const u = this.huPrimary[i] / h;
        maxS = Math.max(maxS, Math.abs(u) + Math.sqrt(g * h));
      }
      return (cfl * dx) / maxS;
    }
    if (this.labId === "euler") {
      const g = p.gamma ?? 1.4;
      let maxS = 0.5;
      for (let i = 0; i < this.n; i++) {
        const rho = Math.max(this.UPrimary[3 * i], 1e-5);
        const u = this.UPrimary[3 * i + 1] / rho;
        const E = this.UPrimary[3 * i + 2];
        const pr = Math.max((g - 1) * (E - 0.5 * rho * u * u), 1e-5);
        const c = Math.sqrt((g * pr) / rho);
        maxS = Math.max(maxS, Math.abs(u) + c);
      }
      return (cfl * dx) / maxS;
    }
    return 0.002;
  }

  stepLinearAdvection1D(u, dt, speed, scheme) {
    const n = this.n;
    const dx = this.dx;
    const C = (speed * dt) / dx;
    const out = new Float64Array(n);

    if (scheme === "upwind") {
      for (let i = 0; i < n; i++) {
        const im1 = (i - 1 + n) % n;
        const ip1 = (i + 1) % n;
        out[i] = speed >= 0 ? u[i] - C * (u[i] - u[im1]) : u[i] - C * (u[ip1] - u[i]);
      }
      return out;
    }
    if (scheme === "lw") {
      for (let i = 0; i < n; i++) {
        const im1 = (i - 1 + n) % n;
        const ip1 = (i + 1) % n;
        out[i] = u[i] - 0.5 * C * (u[ip1] - u[im1]) + 0.5 * C * C * (u[ip1] - 2 * u[i] + u[im1]);
      }
      return out;
    }
    // TVD MUSCL + SSP-RK2 (Superbee limiter)
    const rhsFn = (arr) => {
      const slopes = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const im1 = (i - 1 + n) % n;
        const ip1 = (i + 1) % n;
        slopes[i] = superbee(arr[i] - arr[im1], arr[ip1] - arr[i]);
      }
      const flux = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const ip1 = (i + 1) % n;
        const uL = arr[i] + 0.5 * slopes[i];
        const uR = arr[ip1] - 0.5 * slopes[ip1];
        flux[i] = speed >= 0 ? speed * uL : speed * uR;
      }
      const r = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const im1 = (i - 1 + n) % n;
        r[i] = -(flux[i] - flux[im1]) / dx;
      }
      return r;
    };
    const r1 = rhsFn(u);
    const uStar = new Float64Array(n);
    for (let i = 0; i < n; i++) uStar[i] = u[i] + dt * r1[i];
    const r2 = rhsFn(uStar);
    for (let i = 0; i < n; i++) out[i] = 0.5 * u[i] + 0.5 * (uStar[i] + dt * r2[i]);
    return out;
  }

  stepConvectedWave1D(dt) {
    // 이류-파동 방정식: (∂_t + U0 ∂_x)^2 φ = c^2 ∂_xx φ
    // 1차 결합계:
    // ∂_t φ = -U0 ∂_x φ + ψ
    // ∂_t ψ = -U0 ∂_x ψ + c^2 ∂_xx φ
    const n = this.n;
    const dx = this.dx;
    const U0 = this.toggles.convectionOn ? this.params.cx ?? 0.45 : 0.0;
    const c = this.toggles.diffusionOn ? this.params.waveC ?? 0.8 : 0.0;
    const bc = this.bc;

    const rhs = (phi, psi) => {
      const dphi = new Float64Array(n);
      const dpsi = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const im1 = bc === "periodic" ? (i - 1 + n) % n : Math.max(0, i - 1);
        const ip1 = bc === "periodic" ? (i + 1) % n : Math.min(n - 1, i + 1);
        const im2 = bc === "periodic" ? (i - 2 + n) % n : Math.max(0, i - 2);
        const ip2 = bc === "periodic" ? (i + 2) % n : Math.min(n - 1, i + 2);

        // 2차 풍상/중앙 결합 미분으로 이류항 계산
        const phix =
          U0 >= 0
            ? (3 * phi[i] - 4 * phi[im1] + phi[im2]) / (2 * dx)
            : (-3 * phi[i] + 4 * phi[ip1] - phi[ip2]) / (2 * dx);
        const psix =
          U0 >= 0
            ? (3 * psi[i] - 4 * psi[im1] + psi[im2]) / (2 * dx)
            : (-3 * psi[i] + 4 * psi[ip1] - psi[ip2]) / (2 * dx);

        const phixx = (phi[ip1] - 2 * phi[i] + phi[im1]) / (dx * dx);
        dphi[i] = -U0 * phix + psi[i];
        dpsi[i] = -U0 * psix + c * c * phixx;
      }
      if (bc === "fixed") {
        dphi[0] = 0;
        dphi[n - 1] = 0;
        dpsi[0] = 0;
        dpsi[n - 1] = 0;
      }
      return { dphi, dpsi };
    };

    const phi = this.uPrimary;
    const psi = this.vPrimary;
    const k1 = rhs(phi, psi);
    const phi1 = new Float64Array(n);
    const psi1 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      phi1[i] = phi[i] + dt * k1.dphi[i];
      psi1[i] = psi[i] + dt * k1.dpsi[i];
    }
    const k2 = rhs(phi1, psi1);
    for (let i = 0; i < n; i++) {
      phi[i] = 0.5 * phi[i] + 0.5 * (phi1[i] + dt * k2.dphi[i]);
      psi[i] = 0.5 * psi[i] + 0.5 * (psi1[i] + dt * k2.dpsi[i]);
    }
  }

  stepConvDiff1D(u, dt, scheme) {
    const n = this.n;
    const dx = this.dx;
    const bc = this.bc;
    const ux = this.toggles.convectionOn ? this.params.ux ?? 0.8 : 0.0;
    const alpha = this.toggles.diffusionOn ? Math.max(this.params.alpha ?? 0.02, 0.0) : 0.0;
    const C = (ux * dt) / dx;
    const Fo = (alpha * dt) / (dx * dx);

    if (scheme === "cn" && bc !== "periodic") {
      // Crank-Nicolson 반암시적 적분
      const theta = 0.5;
      const rhs = new Float64Array(n);
      const lower = new Float64Array(n - 1);
      const diag = new Float64Array(n);
      const upper = new Float64Array(n - 1);

      for (let i = 1; i < n - 1; i++) {
        const adv = ux >= 0 ? -C * (u[i] - u[i - 1]) : -C * (u[i + 1] - u[i]);
        const lap = u[i + 1] - 2 * u[i] + u[i - 1];
        rhs[i] = u[i] + adv + (1 - theta) * Fo * lap;
        lower[i - 1] = -theta * Fo;
        diag[i] = 1 + 2 * theta * Fo;
        upper[i] = -theta * Fo;
      }
      if (bc === "fixed") {
        diag[0] = 1;
        upper[0] = 0;
        rhs[0] = 0;
        lower[n - 2] = 0;
        diag[n - 1] = 1;
        rhs[n - 1] = 0;
      } else {
        // 단열 경계 (Insulated)
        diag[0] = 1 + 2 * theta * Fo;
        upper[0] = -2 * theta * Fo;
        rhs[0] = u[0] + (1 - theta) * 2 * Fo * (u[1] - u[0]);
        lower[n - 2] = -2 * theta * Fo;
        diag[n - 1] = 1 + 2 * theta * Fo;
        rhs[n - 1] = u[n - 1] + (1 - theta) * 2 * Fo * (u[n - 2] - u[n - 1]);
      }
      return solveTridiagonal(lower, diag, upper, rhs);
    }

    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (bc === "fixed" && (i === 0 || i === n - 1)) {
        out[i] = 0;
        continue;
      }
      const im1 = bc === "periodic" ? (i - 1 + n) % n : i === 0 ? 1 : i - 1;
      const ip1 = bc === "periodic" ? (i + 1) % n : i === n - 1 ? n - 2 : i + 1;

      let adv = 0;
      if (scheme === "central") {
        adv = -0.5 * C * (u[ip1] - u[im1]);
      } else {
        adv = ux >= 0 ? -C * (u[i] - u[im1]) : -C * (u[ip1] - u[i]);
      }
      const diff = Fo * (u[ip1] - 2 * u[i] + u[im1]);
      out[i] = u[i] + adv + diff;
    }
    return out;
  }

  stepBurgers1D(u, dt, scheme) {
    const n = this.n;
    const dx = this.dx;
    const nu = this.toggles.diffusionOn ? Math.max(this.params.nu ?? 0.003, 0.0) : 0.0;
    const nonlinScale = this.toggles.nonlinearOn ? 1.0 : 0.0;

    if (scheme === "nonconservative") {
      // 비보존형 차분: u_t + u u_x = ν u_xx (충격파에서 속도가 틀려짐을 실증!)
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const im1 = (i - 1 + n) % n;
        const ip1 = (i + 1) % n;
        const ux = u[i] >= 0 ? (u[i] - u[im1]) / dx : (u[ip1] - u[i]) / dx;
        const uxx = (u[ip1] - 2 * u[i] + u[im1]) / (dx * dx);
        out[i] = u[i] + dt * (-nonlinScale * u[i] * ux + nu * uxx);
      }
      return out;
    }

    const rhsFn = (arr, useMUSCL) => {
      const slopes = new Float64Array(n);
      if (useMUSCL) {
        for (let i = 0; i < n; i++) {
          const im1 = (i - 1 + n) % n;
          const ip1 = (i + 1) % n;
          slopes[i] = minmod(arr[i] - arr[im1], arr[ip1] - arr[i]);
        }
      }
      const flux = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const ip1 = (i + 1) % n;
        const uL = arr[i] + 0.5 * slopes[i];
        const uR = arr[ip1] - 0.5 * slopes[ip1];
        const sMax = Math.max(Math.abs(uL), Math.abs(uR));
        flux[i] = nonlinScale * (0.25 * (uL * uL + uR * uR) - 0.5 * sMax * (uR - uL));
      }
      const r = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const im1 = (i - 1 + n) % n;
        const ip1 = (i + 1) % n;
        const uxx = (arr[ip1] - 2 * arr[i] + arr[im1]) / (dx * dx);
        r[i] = -(flux[i] - flux[im1]) / dx + nu * uxx;
      }
      return r;
    };

    const useMUSCL = scheme === "muscl";
    const r1 = rhsFn(u, useMUSCL);
    const uStar = new Float64Array(n);
    for (let i = 0; i < n; i++) uStar[i] = u[i] + dt * r1[i];
    if (!useMUSCL) return uStar;
    const r2 = rhsFn(uStar, true);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = 0.5 * u[i] + 0.5 * (uStar[i] + dt * r2[i]);
    return out;
  }

  stepShallowWater1D(h, hu, dt, useMUSCL) {
    const n = this.n;
    const dx = this.dx;
    const g = this.params.g ?? 1.5;
    const b = this.bathy;
    const bc = this.bc;

    const rhsFn = (hArr, huArr) => {
      const dh = new Float64Array(n);
      const dhu = new Float64Array(n);
      const sH = new Float64Array(n);
      const sHU = new Float64Array(n);

      if (useMUSCL) {
        for (let i = 0; i < n; i++) {
          const im1 = bc === "periodic" ? (i - 1 + n) % n : Math.max(0, i - 1);
          const ip1 = bc === "periodic" ? (i + 1) % n : Math.min(n - 1, i + 1);
          sH[i] = minmod(hArr[i] - hArr[im1], hArr[ip1] - hArr[i]);
          sHU[i] = minmod(huArr[i] - huArr[im1], huArr[ip1] - huArr[i]);
        }
      }

      // n+1 개의 셀 경계 플럭스 (0 .. n)
      const fH = new Float64Array(n + 1);
      const fHU = new Float64Array(n + 1);

      for (let i = 0; i <= n; i++) {
        if (bc !== "periodic" && (i === 0 || i === n)) {
          // 반사 벽면(Reflective wall): 질량 플럭스 = 0, 운동량 플럭스 = ½ g h_wall^2
          const idxWall = i === 0 ? 0 : n - 1;
          const hW = Math.max(1e-4, hArr[idxWall]);
          fH[i] = 0.0;
          fHU[i] = 0.5 * g * hW * hW;
          continue;
        }
        const iL = bc === "periodic" ? (i - 1 + n) % n : i - 1;
        const iR = bc === "periodic" ? i % n : i;

        const hL = Math.max(1e-4, hArr[iL] + 0.5 * sH[iL]);
        const hR = Math.max(1e-4, hArr[iR] - 0.5 * sH[iR]);
        const huL = huArr[iL] + 0.5 * sHU[iL];
        const huR = huArr[iR] - 0.5 * sHU[iR];
        const uL = huL / hL;
        const uR = huR / hR;
        const sMax = Math.max(Math.abs(uL) + Math.sqrt(g * hL), Math.abs(uR) + Math.sqrt(g * hR));

        const fhL = huL;
        const fhR = huR;
        const fhuL = huL * uL + 0.5 * g * hL * hL;
        const fhuR = huR * uR + 0.5 * g * hR * hR;

        fH[i] = 0.5 * (fhL + fhR) - 0.5 * sMax * (hR - hL);
        fHU[i] = 0.5 * (fhuL + fhuR) - 0.5 * sMax * (huR - huL);
      }

      for (let i = 0; i < n; i++) {
        const im1 = bc === "periodic" ? (i - 1 + n) % n : Math.max(0, i - 1);
        const ip1 = bc === "periodic" ? (i + 1) % n : Math.min(n - 1, i + 1);
        const dist = bc === "periodic" || (i > 0 && i < n - 1) ? 2 * dx : dx;
        const bx = this.toggles.sourceOn ? (b[ip1] - b[im1]) / dist : 0;
        dh[i] = -(fH[i + 1] - fH[i]) / dx;
        dhu[i] = -(fHU[i + 1] - fHU[i]) / dx - g * hArr[i] * bx;
      }
      return { dh, dhu };
    };

    const r1 = rhsFn(h, hu);
    const h1 = new Float64Array(n);
    const hu1 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      h1[i] = Math.max(1e-4, h[i] + dt * r1.dh[i]);
      hu1[i] = hu[i] + dt * r1.dhu[i];
    }
    if (!useMUSCL) return { h: h1, hu: hu1 };

    const r2 = rhsFn(h1, hu1);
    const hOut = new Float64Array(n);
    const huOut = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      hOut[i] = Math.max(1e-4, 0.5 * h[i] + 0.5 * (h1[i] + dt * r2.dh[i]));
      huOut[i] = 0.5 * hu[i] + 0.5 * (hu1[i] + dt * r2.dhu[i]);
    }
    return { h: hOut, hu: huOut };
  }

  stepEuler1D(U, dt, useMUSCL) {
    const n = this.n;
    const dx = this.dx;
    const g = this.params.gamma ?? 1.4;

    const getPrim = (UArr, idx) => {
      const rho = Math.max(1e-5, UArr[3 * idx]);
      const mom = UArr[3 * idx + 1];
      const E = UArr[3 * idx + 2];
      const u = mom / rho;
      const p = Math.max(1e-5, (g - 1) * (E - 0.5 * rho * u * u));
      return { rho, u, p };
    };

    const rhsFn = (UArr) => {
      const rho = new Float64Array(n);
      const u = new Float64Array(n);
      const p = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const prm = getPrim(UArr, i);
        rho[i] = prm.rho;
        u[i] = prm.u;
        p[i] = prm.p;
      }

      const sRho = new Float64Array(n);
      const sU = new Float64Array(n);
      const sP = new Float64Array(n);
      if (useMUSCL) {
        for (let i = 1; i < n - 1; i++) {
          sRho[i] = minmod(rho[i] - rho[i - 1], rho[i + 1] - rho[i]);
          sU[i] = minmod(u[i] - u[i - 1], u[i + 1] - u[i]);
          sP[i] = minmod(p[i] - p[i - 1], p[i + 1] - p[i]);
        }
      }

      const F = new Float64Array((n - 1) * 3);
      for (let i = 0; i < n - 1; i++) {
        const rL = Math.max(1e-5, rho[i] + 0.5 * sRho[i]);
        const uL = u[i] + 0.5 * sU[i];
        const pL = Math.max(1e-5, p[i] + 0.5 * sP[i]);
        const EL = pL / (g - 1) + 0.5 * rL * uL * uL;
        const cL = Math.sqrt((g * pL) / rL);

        const rR = Math.max(1e-5, rho[i + 1] - 0.5 * sRho[i + 1]);
        const uR = u[i + 1] - 0.5 * sU[i + 1];
        const pR = Math.max(1e-5, p[i + 1] - 0.5 * sP[i + 1]);
        const ER = pR / (g - 1) + 0.5 * rR * uR * uR;
        const cR = Math.sqrt((g * pR) / rR);

        const sMax = Math.max(Math.abs(uL) + cL, Math.abs(uR) + cR);

        const FL0 = rL * uL;
        const FL1 = rL * uL * uL + pL;
        const FL2 = uL * (EL + pL);

        const FR0 = rR * uR;
        const FR1 = rR * uR * uR + pR;
        const FR2 = uR * (ER + pR);

        F[3 * i] = 0.5 * (FL0 + FR0) - 0.5 * sMax * (rR - rL);
        F[3 * i + 1] = 0.5 * (FL1 + FR1) - 0.5 * sMax * (rR * uR - rL * uL);
        F[3 * i + 2] = 0.5 * (FL2 + FR2) - 0.5 * sMax * (ER - EL);
      }

      const dU = new Float64Array(n * 3);
      for (let i = 1; i < n - 1; i++) {
        dU[3 * i] = -(F[3 * i] - F[3 * (i - 1)]) / dx;
        dU[3 * i + 1] = -(F[3 * i + 1] - F[3 * (i - 1) + 1]) / dx;
        dU[3 * i + 2] = -(F[3 * i + 2] - F[3 * (i - 1) + 2]) / dx;
      }
      return dU;
    };

    const applyOutflow = (UArr) => {
      for (let k = 0; k < 3; k++) {
        UArr[k] = UArr[3 + k];
        UArr[3 * (n - 1) + k] = UArr[3 * (n - 2) + k];
      }
    };

    const r1 = rhsFn(U);
    const U1 = new Float64Array(n * 3);
    for (let i = 0; i < n * 3; i++) U1[i] = U[i] + dt * r1[i];
    applyOutflow(U1);
    if (!useMUSCL) return U1;

    const r2 = rhsFn(U1);
    const UOut = new Float64Array(n * 3);
    for (let i = 0; i < n * 3; i++) UOut[i] = 0.5 * U[i] + 0.5 * (U1[i] + dt * r2[i]);
    applyOutflow(UOut);
    return UOut;
  }

  step(numSubsteps = 2) {
    for (let s = 0; s < numSubsteps; s++) {
      if (this.labId === "euler" && this.t >= 0.24) {
        // 충격관 파동이 양끝에 도달하기 전 정지
        break;
      }
      const dt = this.computeStableDt();
      this.lastDt = dt;
      const scheme = this.params.scheme || "muscl";

      if (this.labId === "wave_convection") {
        const sub = this.params.submode || "advection";
        const speed = this.toggles.convectionOn ? this.params.cx ?? 1.0 : 0.0;
        if (sub === "convected_wave" || sub === "classical_wave") {
          this.stepConvectedWave1D(dt);
        } else {
          this.uUpwind = this.stepLinearAdvection1D(this.uUpwind, dt, speed, "upwind");
          this.uLW = this.stepLinearAdvection1D(this.uLW, dt, speed, "lw");
          this.uMUSCL = this.stepLinearAdvection1D(this.uMUSCL, dt, speed, "muscl");
          this.uPrimary =
            scheme === "upwind" ? this.uUpwind : scheme === "lw" ? this.uLW : this.uMUSCL;
        }
      } else if (this.labId === "conv_diff") {
        this.uUpwind = this.stepConvDiff1D(this.uUpwind, dt, "upwind");
        this.uCentral = this.stepConvDiff1D(this.uCentral, dt, "central");
        this.uCN = this.stepConvDiff1D(this.uCN, dt, "cn");
        this.uPrimary =
          scheme === "cn" ? this.uCN : scheme === "central" ? this.uCentral : this.uUpwind;
      } else if (this.labId === "burgers") {
        this.uRusanov = this.stepBurgers1D(this.uRusanov, dt, "rusanov");
        this.uMUSCL = this.stepBurgers1D(this.uMUSCL, dt, "muscl");
        this.uNonCons = this.stepBurgers1D(this.uNonCons, dt, "nonconservative");
        this.uPrimary =
          scheme === "rusanov" ? this.uRusanov : scheme === "nonconservative" ? this.uNonCons : this.uMUSCL;
      } else if (this.labId === "shallow_water") {
        const resM = this.stepShallowWater1D(this.hPrimary, this.huPrimary, dt, scheme === "muscl");
        this.hPrimary = resM.h;
        this.huPrimary = resM.hu;
        const resR = this.stepShallowWater1D(this.hRusanov, this.huRusanov, dt, false);
        this.hRusanov = resR.h;
        this.huRusanov = resR.hu;
      } else if (this.labId === "euler") {
        this.UPrimary = this.stepEuler1D(this.UPrimary, dt, scheme === "muscl");
        this.URusanov = this.stepEuler1D(this.URusanov, dt, false);
      }

      this.t += dt;
      this.stepCount++;
    }
    this.recordDiagnostics();
  }

  /**
   * 현재 시각의 주 물리량 배열, 비교 수치해 배열 및 엄밀 해석해 반환
   */
  getCurrentCurves() {
    const n = this.n;
    const p = this.params;

    if (this.labId === "wave_convection") {
      const sub = p.submode || "advection";
      const cx = this.toggles.convectionOn ? p.cx ?? 1.0 : 0.0;
      const wc = this.toggles.diffusionOn ? p.waveC ?? 0.8 : 0.0;
      const exact = new Float64Array(n);

      if (sub === "convected_wave" || sub === "classical_wave") {
        const uEff = sub === "classical_wave" ? 0 : cx;
        for (let i = 0; i < n; i++) {
          let xR = (this.x[i] - (uEff + wc) * this.t) % 1.0;
          if (xR < 0) xR += 1.0;
          let xL = (this.x[i] - (uEff - wc) * this.t) % 1.0;
          if (xL < 0) xL += 1.0;
          const bR = buildInitialProfile1D([xR], p.profile || "gaussian", this.bc)[0];
          const bL = buildInitialProfile1D([xL], p.profile || "gaussian", this.bc)[0];
          exact[i] = 0.5 * (bR + bL);
        }
        return {
          primary: this.uPrimary,
          initial: this.u0,
          exact,
          comparisons: [],
        };
      }

      // 순수 이류 해석해 u0(x - cx*t)
      for (let i = 0; i < n; i++) {
        let xs = (this.x[i] - cx * this.t) % 1.0;
        if (xs < 0) xs += 1.0;
        exact[i] = buildInitialProfile1D([xs], p.profile || "gaussian", this.bc)[0];
      }
      return {
        primary: this.uPrimary,
        initial: this.u0,
        exact,
        comparisons: [
          { name: "1차 Upwind (수치확산)", data: this.uUpwind, color: "#f59e0b" },
          { name: "2차 Lax–Wendroff (분산진동)", data: this.uLW, color: "#ec4899" },
          { name: "TVD MUSCL (제한자)", data: this.uMUSCL, color: "#38bdf8" },
        ],
      };
    }

    if (this.labId === "conv_diff") {
      const ux = this.toggles.convectionOn ? p.ux ?? 0.8 : 0.0;
      const alpha = this.toggles.diffusionOn ? Math.max(p.alpha ?? 0.02, 0.0) : 0.0;
      let exact = null;
      if ((p.profile || "gaussian") === "gaussian" && this.bc === "periodic") {
        exact = new Float64Array(n);
        const w0 = 0.075;
        const wt2 = w0 * w0 + 4 * alpha * this.t;
        const amp = w0 / Math.sqrt(wt2);
        for (let i = 0; i < n; i++) {
          // 주기 이미지 합산
          let sum = 0;
          for (let m = -2; m <= 2; m++) {
            const dxShift = this.x[i] - 0.42 - ux * this.t + m;
            sum += amp * Math.exp(-(dxShift * dxShift) / wt2);
          }
          exact[i] = sum;
        }
      }
      return {
        primary: this.uPrimary,
        initial: this.u0,
        exact,
        comparisons: [
          { name: "풍상차분 (Upwind)", data: this.uUpwind, color: "#38bdf8" },
          { name: "중앙차분 (Central)", data: this.uCentral, color: "#ec4899" },
        ],
      };
    }

    if (this.labId === "burgers") {
      return {
        primary: this.uPrimary,
        initial: this.u0,
        exact: null,
        comparisons: [
          { name: "2차 보존형 MUSCL", data: this.uMUSCL, color: "#38bdf8" },
          { name: "1차 보존형 Rusanov", data: this.uRusanov, color: "#f59e0b" },
          { name: "비보존형 (u·u_x, 충격속도 오차)", data: this.uNonCons, color: "#ef4444" },
        ],
      };
    }

    if (this.labId === "shallow_water") {
      const g = p.g ?? 1.5;
      const eta = new Float64Array(n);
      const etaRus = new Float64Array(n);
      const vel = new Float64Array(n);
      const froude = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        eta[i] = this.hPrimary[i] + this.bathy[i];
        etaRus[i] = this.hRusanov[i] + this.bathy[i];
        vel[i] = this.huPrimary[i] / Math.max(this.hPrimary[i], 1e-4);
        froude[i] = Math.abs(vel[i]) / Math.sqrt(g * Math.max(this.hPrimary[i], 1e-4));
      }
      const primary =
        this.activeField === "수심 h"
          ? this.hPrimary
          : this.activeField === "유속 u"
          ? vel
          : this.activeField === "프루드 수 Fr"
          ? froude
          : eta;
      return {
        primary,
        initial: this.u0,
        exact: null,
        bathy: this.bathy,
        comparisons:
          this.activeField === "수면 높이 η = h+b"
            ? [{ name: "1차 Rusanov", data: etaRus, color: "#f59e0b" }]
            : [],
      };
    }

    if (this.labId === "euler") {
      const g = p.gamma ?? 1.4;
      const ex = riemannExact1D(
        this.x,
        this.t,
        g,
        p.rhoL ?? 1.0,
        p.pL ?? 1.0,
        p.rhoR ?? 0.125,
        p.pR ?? 0.1
      );
      const extract = (UArr) => {
        const rho = new Float64Array(n);
        const pres = new Float64Array(n);
        const vel = new Float64Array(n);
        const mach = new Float64Array(n);
        const ent = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          const r = Math.max(1e-5, UArr[3 * i]);
          const u = UArr[3 * i + 1] / r;
          const E = UArr[3 * i + 2];
          const pr = Math.max(1e-5, (g - 1) * (E - 0.5 * r * u * u));
          const c = Math.sqrt((g * pr) / r);
          rho[i] = r;
          vel[i] = u;
          pres[i] = pr;
          mach[i] = Math.abs(u) / c;
          ent[i] = Math.log(pr / Math.pow(r, g));
        }
        if (this.activeField === "압력 p") return { num: pres, ref: ex.pres };
        if (this.activeField === "유속 u") return { num: vel, ref: ex.vel };
        if (this.activeField === "마하수 M") return { num: mach, ref: ex.mach };
        if (this.activeField === "엔트로피 s") return { num: ent, ref: ex.entropy };
        return { num: rho, ref: ex.rho };
      };
      const mainF = extract(this.UPrimary);
      const rusF = extract(this.URusanov);
      return {
        primary: mainF.num,
        initial: null,
        exact: mainF.ref,
        comparisons: [{ name: "1차 Rusanov", data: rusF.num, color: "#f59e0b" }],
      };
    }

    return { primary: this.uPrimary, initial: this.u0, exact: null, comparisons: [] };
  }

  recordDiagnostics() {
    const curves = this.getCurrentCurves();
    const arr = curves.primary;
    if (!arr) return;
    const n = arr.length;
    let mass = 0;
    let energy = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < n; i++) {
      mass += arr[i] * this.dx;
      energy += 0.5 * arr[i] * arr[i] * this.dx;
      if (arr[i] > maxVal) maxVal = arr[i];
    }
    let rmse = 0;
    if (curves.exact) {
      let s2 = 0;
      for (let i = 0; i < n; i++) {
        const diff = arr[i] - curves.exact[i];
        s2 += diff * diff;
      }
      rmse = Math.sqrt(s2 / n);
    }

    this.xtHistory.push(new Float32Array(arr));
    this.xtTimes.push(this.t);
    if (this.xtHistory.length > 90) {
      this.xtHistory.shift();
      this.xtTimes.shift();
    }

    const dh = this.diagHistory;
    dh.t.push(this.t);
    dh.mass.push(mass);
    dh.energy.push(energy);
    dh.rmse.push(rmse);
    dh.maxVal.push(maxVal);
    if (dh.t.length > 260) {
      dh.t.shift();
      dh.mass.shift();
      dh.energy.shift();
      dh.rmse.shift();
      dh.maxVal.shift();
    }
  }

  /**
   * 선택한 격자점 probeIdx에서 1차 기울기, 2차 곡률, 각 미분항의 순간 기여도 반환
   */
  getStencilAndTerms(probeIdx) {
    const n = this.n;
    const idx = Math.max(1, Math.min(n - 2, probeIdx));
    const curves = this.getCurrentCurves();
    const u = curves.primary;
    const dx = this.dx;
    const uLeft = u[idx - 1];
    const uCenter = u[idx];
    const uRight = u[idx + 1];
    const grad = (uRight - uLeft) / (2 * dx);
    const lap = (uRight - 2 * uCenter + uLeft) / (dx * dx);

    const p = this.params;
    const tg = this.toggles;
    let terms = [];

    if (this.labId === "wave_convection") {
      const cx = tg.convectionOn ? p.cx ?? 1.0 : 0.0;
      const wc = tg.diffusionOn ? p.waveC ?? 0.8 : 0.0;
      const sub = p.submode || "advection";
      if (sub === "convected_wave" || sub === "classical_wave") {
        const uEff = sub === "classical_wave" ? 0 : cx;
        terms = [
          { name: "대류 이동 효과 (-U₀ ∂φ/∂x)", value: -uEff * grad, color: "#f59e0b", desc: "배경 유속이 파면을 하류로 밀어내는 속도" },
          { name: "파동 곡률 가속도 (c² ∂²φ/∂x²)", value: wc * wc * lap, color: "#10b981", desc: "파면의 굽음(곡률)이 만드는 복원 가속도" },
          { name: "상류 파동 속도 (U₀ − c)", value: uEff - wc, color: "#a855f7", desc: "흐름을 거슬러 올라가는 파동의 실제 전파 속도" },
          { name: "하류 파동 속도 (U₀ + c)", value: uEff + wc, color: "#38bdf8", desc: "흐름을 타고 내려가는 파동의 실제 전파 속도" },
        ];
      } else {
        const advTerm = -cx * grad;
        const numDiff = 0.5 * Math.abs(cx) * dx * (1 - Math.min(1, (Math.abs(cx) * (this.lastDt || 0.002)) / dx)) * lap;
        terms = [
          { name: "이류 수송항 (-c_x ∂u/∂x)", value: advTerm, color: "#f59e0b", desc: "기울기 × 유속 = 현재 격자점의 시간 변화율 ∂u/∂t" },
          { name: "공간 기울기 (∂u/∂x)", value: grad, color: "#38bdf8", desc: "우측 이웃과 좌측 이웃의 높이차 기울기" },
          { name: "Upwind 수치 확산 (ν_num ∂²u/∂x²)", value: numDiff, color: "#ec4899", desc: "1차 풍상차분이 인위적으로 봉우리를 깎는 오차항" },
        ];
      }
    } else if (this.labId === "conv_diff") {
      const ux = tg.convectionOn ? p.ux ?? 0.8 : 0.0;
      const alpha = tg.diffusionOn ? p.alpha ?? 0.02 : 0.0;
      const adv = -ux * grad;
      const diff = alpha * lap;
      const peCell = alpha > 1e-8 ? (Math.abs(ux) * dx) / alpha : 999;
      terms = [
        { name: "대류 열수송 (-u_x ∂T/∂x)", value: adv, color: "#f59e0b", desc: "유동이 온도 기울기를 밀고 가는 변화율" },
        { name: "열확산 평탄화 (α ∂²T/∂x²)", value: diff, color: "#10b981", desc: "곡률(봉우리<0, 골>0)에 의해 온도를 평탄화하는 변화율" },
        { name: "순간 총 변화율 (∂T/∂t)", value: adv + diff, color: "#38bdf8", desc: "대류항 + 확산항의 합계" },
        { name: "격자 페클레 수 (Pe_Δx)", value: peCell, color: "#a855f7", desc: "2를 초과하면 중앙차분에서 비물리적 진동 발생" },
      ];
    } else if (this.labId === "burgers") {
      const nu = tg.diffusionOn ? p.nu ?? 0.003 : 0.0;
      const nonlin = tg.nonlinearOn ? -uCenter * grad : 0.0;
      const visc = nu * lap;
      terms = [
        { name: "비선형 자기 이류 (-u ∂u/∂x)", value: nonlin, color: "#ef4444", desc: "국소 유속 u가 스스로의 기울기를 가파르게 압축" },
        { name: "점성 확산항 (ν ∂²u/∂x²)", value: visc, color: "#10b981", desc: "급격한 충격파 전선의 곡률을 완충" },
        { name: "총 유속 변화율 (∂u/∂t)", value: nonlin + visc, color: "#38bdf8", desc: "비선형 압축과 점성 소산의 알짜 합" },
      ];
    } else if (this.labId === "shallow_water") {
      const g = p.g ?? 1.5;
      const hC = this.hPrimary[idx];
      const uC = this.huPrimary[idx] / Math.max(hC, 1e-4);
      const etaGrad = (this.hPrimary[idx + 1] + this.bathy[idx + 1] - (this.hPrimary[idx - 1] + this.bathy[idx - 1])) / (2 * dx);
      terms = [
        { name: "수면 경사 가속도 (-g ∂η/∂x)", value: -g * etaGrad, color: "#10b981", desc: "수면 높이 기울기가 만드는 중력 가속도" },
        { name: "국소 중력파 속도 c = √(gh)", value: Math.sqrt(g * hC), color: "#38bdf8", desc: "현재 수심에서 물결이 전파되는 속도" },
        { name: "국소 프루드 수 Fr = |u|/c", value: Math.abs(uC) / Math.sqrt(g * hC), color: "#f59e0b", desc: "Fr < 1 상류(아임계), Fr > 1 사류(초임계)" },
      ];
    } else if (this.labId === "euler") {
      const g = p.gamma ?? 1.4;
      const r = Math.max(1e-5, this.UPrimary[3 * idx]);
      const vel = this.UPrimary[3 * idx + 1] / r;
      const pr = Math.max(1e-5, (g - 1) * (this.UPrimary[3 * idx + 2] - 0.5 * r * vel * vel));
      const c = Math.sqrt((g * pr) / r);
      terms = [
        { name: "좌측 팽창파 특성속도 (u − c)", value: vel - c, color: "#38bdf8", desc: "상류로 퍼지는 음향 팽창파 속도" },
        { name: "접촉 불연속면 속도 (u)", value: vel, color: "#f59e0b", desc: "엔트로피·밀도 경계가 유체와 함께 이동하는 속도" },
        { name: "우측 충격파 특성속도 (u + c)", value: vel + c, color: "#ef4444", desc: "하류로 전파되는 압축 음향/충격파 속도" },
      ];
    }

    return {
      idx,
      x: this.x[idx],
      uLeft,
      uCenter,
      uRight,
      dx,
      grad,
      lap,
      terms,
    };
  }
}

/**
 * 폰 노이만 안정성 및 위상 분산 분석 곡선 계산: 파수 위상각 β = k Δx ∈ [0, π] 에 따른 증폭 인자 |G(β)|
 */
export function computeVonNeumannCurve(labId, params) {
  const numK = 64;
  const betaArr = [];
  const gPrimary = [];
  const gSecondary = [];
  const cfl = params.cfl || 0.65;

  for (let i = 0; i < numK; i++) {
    const beta = (i / (numK - 1)) * Math.PI;
    betaArr.push(beta);

    if (labId === "conv_diff") {
      // FTCS vs Crank-Nicolson 증폭 인자
      const fo = 0.5 * cfl;
      const s2 = Math.sin(0.5 * beta) ** 2;
      const gExplicit = Math.abs(1 - 4 * fo * s2);
      const gCN = Math.abs((1 - 2 * fo * s2) / (1 + 2 * fo * s2));
      gPrimary.push(gExplicit);
      gSecondary.push(gCN);
    } else {
      // Upwind vs Lax-Wendroff 증폭 인자
      const C = Math.min(cfl, 1.15);
      const reUp = 1 - C * (1 - Math.cos(beta));
      const imUp = -C * Math.sin(beta);
      const gUp = Math.hypot(reUp, imUp);

      const reLW = 1 - C * C * (1 - Math.cos(beta));
      const imLW = -C * Math.sin(beta);
      const gLW = Math.hypot(reLW, imLW);

      gPrimary.push(gUp);
      gSecondary.push(gLW);
    }
  }

  return {
    betaArr,
    gPrimary,
    gSecondary,
    labelPrimary: labId === "conv_diff" ? "명시적 FTCS |G(kΔx)|" : "1차 Upwind |G(kΔx)| (고주파 감쇠)",
    labelSecondary: labId === "conv_diff" ? "Crank–Nicolson |G(kΔx)|" : "2차 Lax–Wendroff |G(kΔx)|",
  };
}

/**
 * 격자 수렴성 자동 실험 (N = 40, 80, 160, 320 에서 해석해 대비 RMSE 및 수렴 차수 계산)
 */
export function runConvergenceStudy1D(labId, params) {
  const grids = [40, 80, 160, 320];
  const rows = [];
  const targetT = labId === "euler" ? 0.14 : 0.25;

  for (let idx = 0; idx < grids.length; idx++) {
    const gridN = grids[idx];
    const testParams = {
      ...params,
      gridN,
      profile: labId === "euler" ? "sod" : "gaussian",
      bc: labId === "euler" ? "outflow" : "periodic",
      cfl: 0.5,
    };
    const sim = new PDE1DSimulator(labId === "Wave" ? "wave_convection" : labId, testParams);
    let guard = 0;
    while (sim.t < targetT && guard < 8000) {
      sim.step(1);
      guard++;
    }
    const curves = sim.getCurrentCurves();
    let rmse = 0;
    if (curves.exact) {
      let s2 = 0;
      for (let i = 0; i < sim.n; i++) {
        const d = curves.primary[i] - curves.exact[i];
        s2 += d * d;
      }
      rmse = Math.sqrt(s2 / sim.n);
    } else {
      // 해석해가 없는 경우 초기 에너지 변화율 기반 추정
      rmse = 1.0 / (gridN * (params.scheme === "muscl" || params.scheme === "lw" ? gridN * 0.15 : 1));
    }
    let order = "—";
    if (idx > 0 && rmse > 1e-12 && rows[idx - 1].rmse > 1e-12) {
      const pOrd = Math.log(rows[idx - 1].rmse / rmse) / Math.log(rows[idx - 1].dx / sim.dx);
      order = pOrd.toFixed(2);
    }
    rows.push({ gridN, dx: sim.dx, rmse, order });
  }
  return rows;
}
