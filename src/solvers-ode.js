// src/solvers-ode.js
// 물리학 상미분방정식 (ODE) 실시간 수치 적분기, 엄밀 해석해, 위상 공간 및 공명 분석 엔진

/**
 * 감쇠·강제 조화진동자 엄밀 해석해 (초기값 x0, v0 및 외력 F0 cos(ω_d t) 포함)
 * x'' + 2ζω0 x' + ω0^2 x = F0 cos(ω_d t)
 */
export function exactHarmonicOscillator(t, { zeta, omega0, F0, omegad, x0, v0, dampingOn = true, restoringOn = true, drivingOn = true }) {
  const z = dampingOn ? zeta : 0;
  const w0 = restoringOn ? omega0 : 1e-6;
  const f0 = drivingOn ? F0 : 0;
  const wd = omegad;

  // 특수해 (Steady-state particular solution): xp(t) = A cos(wd t) + B sin(wd t)
  let A = 0;
  let B = 0;
  if (f0 !== 0) {
    const det = (w0 * w0 - wd * wd) ** 2 + (2 * z * w0 * wd) ** 2;
    if (det > 1e-12) {
      A = (f0 * (w0 * w0 - wd * wd)) / det;
      B = (f0 * (2 * z * w0 * wd)) / det;
    } else {
      // 순수 무감쇠 공명 (z=0, wd=w0): xp(t) = (F0 / (2 w0)) t sin(w0 t)
      const xp = (f0 / (2 * w0)) * t * Math.sin(w0 * t);
      const vp = (f0 / (2 * w0)) * (Math.sin(w0 * t) + w0 * t * Math.cos(w0 * t));
      const xh = x0 * Math.cos(w0 * t) + (v0 / w0) * Math.sin(w0 * t);
      const vh = -x0 * w0 * Math.sin(w0 * t) + v0 * Math.cos(w0 * t);
      return { x: xh + xp, v: vh + vp };
    }
  }

  const xp = A * Math.cos(wd * t) + B * Math.sin(wd * t);
  const vp = -A * wd * Math.sin(wd * t) + B * wd * Math.cos(wd * t);

  // 제차해 초기조건 보정
  const xh0 = x0 - A;
  const vh0 = v0 - B * wd;

  let xh = 0;
  let vh = 0;
  if (Math.abs(z - 1.0) < 1e-7) {
    // 임계 감쇠 (Critically damped)
    const exp = Math.exp(-w0 * t);
    const c1 = xh0;
    const c2 = vh0 + w0 * xh0;
    xh = (c1 + c2 * t) * exp;
    vh = (c2 - w0 * (c1 + c2 * t)) * exp;
  } else if (z < 1.0) {
    // 부족 감쇠 (Underdamped)
    const wdamp = w0 * Math.sqrt(Math.max(1e-12, 1 - z * z));
    const exp = Math.exp(-z * w0 * t);
    const c1 = xh0;
    const c2 = (vh0 + z * w0 * xh0) / wdamp;
    xh = exp * (c1 * Math.cos(wdamp * t) + c2 * Math.sin(wdamp * t));
    vh =
      exp *
      ((-z * w0 * c1 + wdamp * c2) * Math.cos(wdamp * t) +
        (-z * w0 * c2 - wdamp * c1) * Math.sin(wdamp * t));
  } else {
    // 과감쇠 (Overdamped)
    const s = w0 * Math.sqrt(z * z - 1);
    const r1 = -z * w0 + s;
    const r2 = -z * w0 - s;
    const c1 = (vh0 - r2 * xh0) / (r1 - r2);
    const c2 = (r1 * xh0 - vh0) / (r1 - r2);
    xh = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    vh = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
  }

  return { x: xh + xp, v: vh + vp };
}

/**
 * 공명 곡선 (주파수비 r = ω_d / ω_0 에 따른 정상상태 진폭 및 위상 지연) 계산
 */
export function computeResonanceCurve(omega0, zeta, F0, numPoints = 120) {
  const rArr = [];
  const ampArr = [];
  const phaseArr = [];
  const z = Math.max(zeta, 0.025);
  for (let i = 0; i < numPoints; i++) {
    const r = (i / (numPoints - 1)) * 2.5;
    const denom = Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2);
    const magFactor = 1.0 / Math.max(denom, 1e-6);
    const phase = Math.atan2(2 * z * r, 1 - r * r) * (180 / Math.PI);
    rArr.push(r);
    ampArr.push(magFactor);
    phaseArr.push(phase);
  }
  return { rArr, ampArr, phaseArr };
}

/**
 * 범용 1스텝 ODE 적분기 (Euler, Symplectic Euler, Velocity Verlet, RK4)
 */
export function stepSecondOrderODE(state, t, dt, scheme, accelFn) {
  const { x, v } = state;
  if (scheme === "euler") {
    const a = accelFn(x, v, t);
    return { x: x + dt * v, v: v + dt * a };
  }
  if (scheme === "symplectic") {
    const a = accelFn(x, v, t);
    const vNext = v + dt * a;
    const xNext = x + dt * vNext;
    return { x: xNext, v: vNext };
  }
  if (scheme === "verlet") {
    const a0 = accelFn(x, v, t);
    const vHalf = v + 0.5 * dt * a0;
    const xNext = x + dt * vHalf;
    const a1 = accelFn(xNext, vHalf, t + dt);
    const vNext = vHalf + 0.5 * dt * a1;
    return { x: xNext, v: vNext };
  }
  // 기본 RK4
  const k1x = v;
  const k1v = accelFn(x, v, t);

  const x2 = x + 0.5 * dt * k1x;
  const v2 = v + 0.5 * dt * k1v;
  const k2x = v2;
  const k2v = accelFn(x2, v2, t + 0.5 * dt);

  const x3 = x + 0.5 * dt * k2x;
  const v3 = v + 0.5 * dt * k2v;
  const k3x = v3;
  const k3v = accelFn(x3, v3, t + 0.5 * dt);

  const x4 = x + dt * k3x;
  const v4 = v + dt * k3v;
  const k4x = v4;
  const k4v = accelFn(x4, v4, t + dt);

  return {
    x: x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    v: v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v),
  };
}

/**
 * ODE 실험실 상태 클래스 (실시간 스트리밍 + 다중 기법 동시 비교)
 */
export class ODESimulator {
  constructor(labId, params, toggles = {}) {
    this.labId = labId;
    this.params = { ...params };
    this.toggles = {
      dampingOn: true,
      restoringOn: true,
      drivingOn: true,
      nonlinearOn: true,
      ...toggles,
    };
    this.reset();
  }

  reset() {
    this.t = 0;
    this.stepCount = 0;
    this.historyLimit = 450;
    const p = this.params;

    if (this.labId === "oscillator") {
      const init = { x: p.x0 ?? 1.0, v: p.v0 ?? 0.0 };
      this.state = { ...init };
      this.compEuler = { ...init };
      this.compVerlet = { ...init };
      this.compRK4 = { ...init };
    } else if (this.labId === "pendulum") {
      const init = { x: p.theta0 ?? 2.5, v: p.omegaInit ?? 0.0 };
      this.state = { ...init };
      this.linearRef = { ...init };
      this.compEuler = { ...init };
      this.compVerlet = { ...init };
      this.compRK4 = { ...init };
    } else if (this.labId === "chaos_orbit") {
      if ((p.submode || "lorenz") === "kepler") {
        const e = Math.min(Math.max(p.ecc ?? 0.5, 0.0), 0.85);
        // 근일점 r_p = 1 - e, 속도 v_p = sqrt((1+e)/(1-e)) (장반경 a=1, μ=1)
        const init = { x: 1 - e, y: 0, vx: 0, vy: Math.sqrt((1 + e) / (1 - e)) };
        this.state = { ...init };
        this.compEuler = { ...init };
        this.compVerlet = { ...init };
        this.compRK4 = { ...init };
      } else {
        const delta = p.perturb ?? 1e-4;
        this.state = { x: 1.0, y: 1.0, z: 20.0 };
        this.twin = { x: 1.0 + delta, y: 1.0, z: 20.0 };
      }
    }

    this.history = {
      t: [],
      primary: [],
      velocity: [],
      exact: [],
      euler: [],
      verlet: [],
      rk4: [],
      energy: [],
      energyEuler: [],
      energyVerlet: [],
      energyRK4: [],
      aux: [],
    };
    this.recordSnapshot();
  }

  getAccelFn(overrideLinear = false) {
    const p = this.params;
    const tg = this.toggles;
    if (this.labId === "oscillator") {
      return (x, v, t) => {
        const damp = tg.dampingOn ? -2 * p.zeta * p.omega0 * v : 0;
        const rest = tg.restoringOn ? -p.omega0 * p.omega0 * x : 0;
        const drive = tg.drivingOn ? p.F0 * Math.cos(p.omegad * t) : 0;
        return damp + rest + drive;
      };
    }
    if (this.labId === "pendulum") {
      const sub = p.submode || "pendulum";
      return (theta, omega, t) => {
        const drive = tg.drivingOn ? (p.F0 || 0) * Math.cos((p.omegad || 2.0) * t) : 0;
        if (sub === "vanderpol") {
          const mu = tg.dampingOn ? p.zeta * 2.0 : 0;
          const rest = tg.restoringOn ? -(p.omega0 ** 2) * theta : 0;
          const nonlin = tg.nonlinearOn ? theta * theta : 0;
          return mu * (1 - nonlin) * omega + rest + drive;
        }
        if (sub === "duffing") {
          const damp = tg.dampingOn ? -2 * p.zeta * p.omega0 * omega : 0;
          const linear = tg.restoringOn ? +(p.omega0 ** 2) * 0.5 * theta : 0;
          const cubic = tg.nonlinearOn ? -(p.omega0 ** 2) * 0.5 * theta * theta * theta : 0;
          return damp + linear + cubic + drive;
        }
        // 기본 비선형 단진자
        const damp = tg.dampingOn ? -2 * p.zeta * p.omega0 * omega : 0;
        const restoreVal = overrideLinear || !tg.nonlinearOn ? theta : Math.sin(theta);
        const rest = tg.restoringOn ? -(p.omega0 ** 2) * restoreVal : 0;
        return damp + rest + drive;
      };
    }
    return () => 0;
  }

  computeEnergy(s) {
    const p = this.params;
    if (this.labId === "oscillator") {
      return 0.5 * (s.v * s.v + p.omega0 * p.omega0 * s.x * s.x);
    }
    if (this.labId === "pendulum") {
      const sub = p.submode || "pendulum";
      if (sub === "duffing") {
        return 0.5 * s.v * s.v - 0.25 * p.omega0 ** 2 * s.x ** 2 + 0.125 * p.omega0 ** 2 * s.x ** 4;
      }
      if (sub === "vanderpol") {
        return 0.5 * (s.v * s.v + p.omega0 * p.omega0 * s.x * s.x);
      }
      return 0.5 * s.v * s.v + p.omega0 * p.omega0 * (1 - Math.cos(s.x));
    }
    if (this.labId === "chaos_orbit" && (p.submode || "lorenz") === "kepler") {
      const r = Math.hypot(s.x, s.y);
      const v2 = s.vx * s.vx + s.vy * s.vy;
      return 0.5 * v2 - 1.0 / Math.max(r, 1e-4);
    }
    return 0;
  }

  stepKepler2D(s, dt, scheme) {
    const accel = (x, y) => {
      const r2 = x * x + y * y;
      const r3 = Math.pow(Math.max(r2, 1e-4), 1.5);
      return { ax: -x / r3, ay: -y / r3 };
    };
    if (scheme === "euler") {
      const { ax, ay } = accel(s.x, s.y);
      return { x: s.x + dt * s.vx, y: s.y + dt * s.vy, vx: s.vx + dt * ax, vy: s.vy + dt * ay };
    }
    if (scheme === "verlet" || scheme === "symplectic") {
      const a0 = accel(s.x, s.y);
      const vxh = s.vx + 0.5 * dt * a0.ax;
      const vyh = s.vy + 0.5 * dt * a0.ay;
      const xn = s.x + dt * vxh;
      const yn = s.y + dt * vyh;
      const a1 = accel(xn, yn);
      return { x: xn, y: yn, vx: vxh + 0.5 * dt * a1.ax, vy: vyh + 0.5 * dt * a1.ay };
    }
    // RK4
    const deriv = (st) => {
      const { ax, ay } = accel(st.x, st.y);
      return { dx: st.vx, dy: st.vy, dvx: ax, dvy: ay };
    };
    const k1 = deriv(s);
    const k2 = deriv({ x: s.x + 0.5 * dt * k1.dx, y: s.y + 0.5 * dt * k1.dy, vx: s.vx + 0.5 * dt * k1.dvx, vy: s.vy + 0.5 * dt * k1.dvy });
    const k3 = deriv({ x: s.x + 0.5 * dt * k2.dx, y: s.y + 0.5 * dt * k2.dy, vx: s.vx + 0.5 * dt * k2.dvx, vy: s.vy + 0.5 * dt * k2.dvy });
    const k4 = deriv({ x: s.x + dt * k3.dx, y: s.y + dt * k3.dy, vx: s.vx + dt * k3.dvx, vy: s.vy + dt * k3.dvy });
    return {
      x: s.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
      y: s.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
      vx: s.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
      vy: s.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
    };
  }

  stepLorenz3D(s, dt, scheme) {
    const p = this.params;
    const tg = this.toggles;
    const sigma = tg.dampingOn ? p.sigma ?? 10.0 : 0.0;
    const rho = tg.drivingOn ? p.rho ?? 28.0 : 0.0;
    const beta = tg.restoringOn ? p.beta ?? 2.667 : 0.0;
    const nonlinScale = tg.nonlinearOn ? 1.0 : 0.0;

    const rhs = (st) => ({
      dx: sigma * (st.y - st.x),
      dy: st.x * (rho - nonlinScale * st.z) - st.y,
      dz: nonlinScale * st.x * st.y - beta * st.z,
    });

    if (scheme === "euler") {
      const d = rhs(s);
      return { x: s.x + dt * d.dx, y: s.y + dt * d.dy, z: s.z + dt * d.dz };
    }
    const k1 = rhs(s);
    const k2 = rhs({ x: s.x + 0.5 * dt * k1.dx, y: s.y + 0.5 * dt * k1.dy, z: s.z + 0.5 * dt * k1.dz });
    const k3 = rhs({ x: s.x + 0.5 * dt * k2.dx, y: s.y + 0.5 * dt * k2.dy, z: s.z + 0.5 * dt * k2.dz });
    const k4 = rhs({ x: s.x + dt * k3.dx, y: s.y + dt * k3.dy, z: s.z + dt * k3.dz });
    return {
      x: s.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
      y: s.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
      z: s.z + (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz),
    };
  }

  step(numSubsteps = 1) {
    const dt = this.params.dt || 0.02;
    const scheme = this.params.scheme || "rk4";

    for (let k = 0; k < numSubsteps; k++) {
      if (this.labId === "oscillator" || this.labId === "pendulum") {
        const accel = this.getAccelFn(false);
        this.state = stepSecondOrderODE(this.state, this.t, dt, scheme, accel);
        this.compEuler = stepSecondOrderODE(this.compEuler, this.t, dt, "euler", accel);
        this.compVerlet = stepSecondOrderODE(this.compVerlet, this.t, dt, "verlet", accel);
        this.compRK4 = stepSecondOrderODE(this.compRK4, this.t, dt, "rk4", accel);

        if (this.labId === "pendulum") {
          const linearAccel = this.getAccelFn(true);
          this.linearRef = stepSecondOrderODE(this.linearRef, this.t, dt, "rk4", linearAccel);
        }
      } else if (this.labId === "chaos_orbit") {
        if ((this.params.submode || "lorenz") === "kepler") {
          this.state = this.stepKepler2D(this.state, dt, scheme);
          this.compEuler = this.stepKepler2D(this.compEuler, dt, "euler");
          this.compVerlet = this.stepKepler2D(this.compVerlet, dt, "verlet");
          this.compRK4 = this.stepKepler2D(this.compRK4, dt, "rk4");
        } else {
          this.state = this.stepLorenz3D(this.state, dt, scheme);
          this.twin = this.stepLorenz3D(this.twin, dt, scheme);
        }
      }

      this.t += dt;
      this.stepCount++;
    }
    this.recordSnapshot();
  }

  recordSnapshot() {
    const h = this.history;
    h.t.push(this.t);

    if (this.labId === "oscillator") {
      const ex = exactHarmonicOscillator(this.t, { ...this.params, ...this.toggles });
      h.primary.push(this.state.x);
      h.velocity.push(this.state.v);
      h.exact.push(ex.x);
      h.euler.push(this.compEuler.x);
      h.verlet.push(this.compVerlet.x);
      h.rk4.push(this.compRK4.x);
      h.energy.push(this.computeEnergy(this.state));
      h.energyEuler.push(this.computeEnergy(this.compEuler));
      h.energyVerlet.push(this.computeEnergy(this.compVerlet));
      h.energyRK4.push(this.computeEnergy(this.compRK4));
    } else if (this.labId === "pendulum") {
      h.primary.push(this.state.x);
      h.velocity.push(this.state.v);
      h.exact.push(this.linearRef.x); // 선형 소각도 해
      h.euler.push(this.compEuler.x);
      h.verlet.push(this.compVerlet.x);
      h.rk4.push(this.compRK4.x);
      h.energy.push(this.computeEnergy(this.state));
      h.energyEuler.push(this.computeEnergy(this.compEuler));
      h.energyVerlet.push(this.computeEnergy(this.compVerlet));
      h.energyRK4.push(this.computeEnergy(this.compRK4));
    } else if (this.labId === "chaos_orbit") {
      if ((this.params.submode || "lorenz") === "kepler") {
        h.primary.push({ x: this.state.x, y: this.state.y });
        h.euler.push({ x: this.compEuler.x, y: this.compEuler.y });
        h.verlet.push({ x: this.compVerlet.x, y: this.compVerlet.y });
        h.rk4.push({ x: this.compRK4.x, y: this.compRK4.y });
        h.energy.push(this.computeEnergy(this.state));
        h.energyEuler.push(this.computeEnergy(this.compEuler));
        h.energyVerlet.push(this.computeEnergy(this.compVerlet));
        h.energyRK4.push(this.computeEnergy(this.compRK4));
        const Lz = this.state.x * this.state.vy - this.state.y * this.state.vx;
        h.aux.push(Lz);
      } else {
        h.primary.push({ ...this.state });
        h.exact.push({ ...this.twin });
        const dist = Math.hypot(
          this.state.x - this.twin.x,
          this.state.y - this.twin.y,
          this.state.z - this.twin.z
        );
        h.energy.push(Math.max(dist, 1e-12));
      }
    }

    if (h.t.length > this.historyLimit) {
      for (const key of Object.keys(h)) {
        if (h[key].length > this.historyLimit) h[key].shift();
      }
    }
  }

  /**
   * 현재 순간의 미분방정식 각 항(Term)의 수치적 크기와 물리적 의미 반환
   */
  getTermBreakdown() {
    const p = this.params;
    const tg = this.toggles;
    if (this.labId === "oscillator") {
      const { x, v } = this.state;
      const damp = tg.dampingOn ? -2 * p.zeta * p.omega0 * v : 0;
      const rest = tg.restoringOn ? -p.omega0 * p.omega0 * x : 0;
      const drive = tg.drivingOn ? p.F0 * Math.cos(p.omegad * this.t) : 0;
      const accel = damp + rest + drive;
      return [
        { name: "복원력 (-ω₀²x)", value: rest, color: "#10b981", desc: "평형점(x=0)으로 당기는 스프링 탄성 가속도" },
        { name: "감쇠력 (-2ζω₀v)", value: damp, color: "#f59e0b", desc: "속도에 저항하여 에너지를 흡수하는 마찰 가속도" },
        { name: "구동 외력 (F₀cos ω_d t)", value: drive, color: "#ec4899", desc: "외부 가진기가 밀어주는 주기적 가속도" },
        { name: "알짜 가속도 (x'')", value: accel, color: "#38bdf8", desc: "세 힘의 합 = 순간 속도 변화율 (dv/dt)" },
      ];
    }
    if (this.labId === "pendulum") {
      const { x: theta, v: omega } = this.state;
      const sub = p.submode || "pendulum";
      if (sub === "pendulum") {
        const restNonlin = tg.restoringOn ? -(p.omega0 ** 2) * (tg.nonlinearOn ? Math.sin(theta) : theta) : 0;
        const restLinearDiff = -(p.omega0 ** 2) * ( Math.sin(theta) - theta );
        const damp = tg.dampingOn ? -2 * p.zeta * p.omega0 * omega : 0;
        const drive = tg.drivingOn ? (p.F0 || 0) * Math.cos((p.omegad || 2.0) * this.t) : 0;
        return [
          { name: "비선형 복원 토크 (-ω₀²sin θ)", value: restNonlin, color: "#10b981", desc: "중력이 만드는 실제 회전 복원 각가속도" },
          { name: "비선형성 보정 (sin θ − θ 차이)", value: restLinearDiff, color: "#a855f7", desc: "소각도 근사 대비 대각도에서 약해진 복원력 크기" },
          { name: "감쇠 토크 (-2ζω₀θ')", value: damp, color: "#f59e0b", desc: "회전 마찰에 의한 각속도 감쇠" },
          { name: "알짜 각가속도 (θ'')", value: restNonlin + damp + drive, color: "#38bdf8", desc: "현재 순간의 각속도 변화율" },
        ];
      }
      const accel = this.getAccelFn(false)(theta, omega, this.t);
      return [
        { name: "현재 변위 상태 (x)", value: theta, color: "#10b981", desc: "비선형 진동자의 현재 위치" },
        { name: "현재 속도 상태 (v)", value: omega, color: "#f59e0b", desc: "비선형 진동자의 현재 속도" },
        { name: "순간 가속도 (dv/dt)", value: accel, color: "#38bdf8", desc: "비선형 감쇠 및 복원력의 합력" },
      ];
    }
    if (this.labId === "chaos_orbit") {
      if ((p.submode || "lorenz") === "kepler") {
        const r = Math.hypot(this.state.x, this.state.y);
        const r3 = Math.max(r * r * r, 1e-4);
        const ax = -this.state.x / r3;
        const ay = -this.state.y / r3;
        const Lz = this.state.x * this.state.vy - this.state.y * this.state.vx;
        return [
          { name: "중력 가속도 x (-μx/r³)", value: ax, color: "#38bdf8", desc: "중심별 방향 x축 만유인력 가속도" },
          { name: "중력 가속도 y (-μy/r³)", value: ay, color: "#f59e0b", desc: "중심별 방향 y축 만유인력 가속도" },
          { name: "보존 각운동량 (L_z = x v_y - y v_x)", value: Lz, color: "#10b981", desc: "케플러 제2법칙(면적속도 일정) 보존량" },
          { name: "총 역학적 에너지 (E)", value: this.computeEnergy(this.state), color: "#ec4899", desc: "운동에너지(½v²) + 중력퍼텐셜(-μ/r)" },
        ];
      }
      const s = this.state;
      const dx = (p.sigma ?? 10) * (s.y - s.x);
      const dy = s.x * ((p.rho ?? 28) - s.z) - s.y;
      const dz = s.x * s.y - (p.beta ?? 2.667) * s.z;
      const dist = Math.hypot(s.x - this.twin.x, s.y - this.twin.y, s.z - this.twin.z);
      return [
        { name: "대류 롤 회전 가속도 (dx/dt)", value: dx, color: "#38bdf8", desc: "프란틀 수 σ(y-x)에 의한 유체 회전 변화율" },
        { name: "부력 온도차 구동 (dy/dt)", value: dy, color: "#f59e0b", desc: "레일리 수 x(ρ-z)-y에 의한 수평 온도차 변화율" },
        { name: "비선형 열혼합 (dz/dt)", value: dz, color: "#10b981", desc: "대류 열수송 xy - βz에 의한 수직 온도 구배 변화" },
        { name: "나비효과 두 궤적 거리 |ΔX|", value: dist, color: "#ef4444", desc: "초기 10⁻⁴ 차이였던 두 대류 상태 사이의 현재 거리" },
      ];
    }
    return [];
  }
}
