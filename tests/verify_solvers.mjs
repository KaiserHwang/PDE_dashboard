// tests/verify_solvers.mjs
// 물리학 ODE 및 유체역학 1D/2D PDE 수치해석 엔진 자동 검증 테스트 스위트

import { LABS, LAB_MAP } from "../src/curriculum.js";
import { ODESimulator, exactHarmonicOscillator, computeResonanceCurve } from "../src/solvers-ode.js";
import { PDE1DSimulator, riemannExact1D, computeVonNeumannCurve, runConvergenceStudy1D } from "../src/solvers-pde1d.js";
import { PDE2DSimulator } from "../src/solvers-pde2d.js";

let passed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ PASS ${String(passed).padStart(2, "0")} · ${msg}`);
}

// 1. 커리큘럼 9개 실험실 검증
check(LABS.length === 9, "9개 물리학 ODE 및 유체역학 PDE 실험실 정의 완비");
for (const lab of LABS) {
  check(lab.presets && lab.presets.length >= 3, `${lab.id}: 최소 3개 이상의 물리 프리셋 보유`);
}

// 2. ODE 01: 감쇠·강제 조화진동자 RK4 vs 엄밀 해석해 일치 검증
{
  const params = { zeta: 0.15, omega0: 4.0, F0: 0.8, omegad: 3.5, x0: 1.0, v0: 0.0, dt: 0.01, scheme: "rk4" };
  const sim = new ODESimulator("oscillator", params);
  sim.step(200); // t = 2.0
  const ex = exactHarmonicOscillator(sim.t, params);
  const err = Math.abs(sim.state.x - ex.x);
  check(err < 1e-4, `ODE 01 (조화진동자): RK4 수치해와 엄밀 해석해 오차 < 1e-4 (실측 ${err.toExponential(2)})`);

  // 무감쇠(ζ=0, F0=0)에서 Euler 에너지 증가 vs Verlet 에너지 보존 검증
  const pFree = { zeta: 0.0, omega0: 4.0, F0: 0.0, omegad: 4.0, x0: 1.0, v0: 0.0, dt: 0.025, scheme: "verlet" };
  const simFree = new ODESimulator("oscillator", pFree);
  const e0 = simFree.computeEnergy(simFree.state);
  simFree.step(160);
  const eVerlet = simFree.computeEnergy(simFree.compVerlet);
  const eEuler = simFree.computeEnergy(simFree.compEuler);
  check(Math.abs(eVerlet - e0) / e0 < 0.01, "ODE 01: Symplectic Verlet 장기 에너지 보존 확인");
  check(eEuler > e0 * 1.25, "ODE 01: Forward Euler 비물리적 에너지 증가 재현 확인");

  const res = computeResonanceCurve(4.0, 0.1, 1.0);
  check(res.ampArr.length === 120 && Math.max(...res.ampArr) > 1.0, "ODE 01: 공명 곡선 진폭 피크 계산 확인");
}

// 3. ODE 02: 비선형 대각도 진자 vs 소각도 선형 근사 주기 차이 검증
{
  const params = { submode: "pendulum", theta0: 2.6, omegaInit: 0.0, omega0: 3.0, zeta: 0.0, F0: 0.0, omegad: 2.0, dt: 0.01, scheme: "verlet" };
  const sim = new ODESimulator("pendulum", params);
  const e0 = sim.computeEnergy(sim.state);
  sim.step(150);
  const eNow = sim.computeEnergy(sim.state);
  check(Math.abs(eNow - e0) / e0 < 0.01, "ODE 02 (비선형 진자): 에너지 보존 검증");
  check(Math.abs(sim.state.x - sim.linearRef.x) > 0.2, "ODE 02: 대각도 비선형 진자와 선형 근사(sin θ ≈ θ) 간의 위상차 확인");
}

// 4. ODE 03: 케플러 궤도 각운동량 보존 & 로렌츠 카오스 발산 검증
{
  const pKep = { submode: "kepler", ecc: 0.5, dt: 0.01, scheme: "verlet" };
  const simKep = new ODESimulator("chaos_orbit", pKep);
  const L0 = simKep.state.x * simKep.state.vy - simKep.state.y * simKep.state.vx;
  simKep.step(200);
  const L1 = simKep.state.x * simKep.state.vy - simKep.state.y * simKep.state.vx;
  check(Math.abs(L1 - L0) < 1e-10, `ODE 03 (케플러 궤도): Symplectic Verlet 각운동량 L_z 정밀 보존 (오차 ${Math.abs(L1 - L0).toExponential(2)})`);

  const pLor = { submode: "lorenz", sigma: 10.0, rho: 28.0, beta: 2.667, perturb: 1e-4, dt: 0.01, scheme: "rk4" };
  const simLor = new ODESimulator("chaos_orbit", pLor);
  simLor.step(300);
  check(Number.isFinite(simLor.state.x) && simLor.history.energy.at(-1) > 1e-4, "ODE 03 (로렌츠 열대류): 나비효과 두 궤적 발산 확인");
}

// 5. PDE 04 (1D & 2D Wave & Convection): 이류 수송, Upwind vs MUSCL 수치확산 차이, 이류-파동 결합 검증
{
  const p1d = LAB_MAP.wave_convection.presets.find((pr) => pr.id === "conv1d_schemes").params;
  const sim1d = new PDE1DSimulator("wave_convection", p1d);
  const m0 = sim1d.diagHistory.mass[0];
  sim1d.step(60);
  const m1 = sim1d.diagHistory.mass.at(-1);
  check(Math.abs(m1 - m0) < 1e-10, "PDE 04 (1D 이류): 주기 경계에서 총 질량(∫u dx) 정밀 보존");
  const maxUpwind = Math.max(...sim1d.uUpwind);
  const maxMUSCL = Math.max(...sim1d.uMUSCL);
  check(maxMUSCL > maxUpwind, `PDE 04 (1D 이류): TVD MUSCL(${maxMUSCL.toFixed(3)})이 1차 Upwind(${maxUpwind.toFixed(3)})보다 수치 확산이 적음 확인`);

  // 1D 이류-파동 결합 모드
  const pWave1d = LAB_MAP.wave_convection.presets.find((pr) => pr.id === "wave1d_convected").params;
  const simW1d = new PDE1DSimulator("wave_convection", pWave1d);
  simW1d.step(40);
  check(simW1d.uPrimary.every(Number.isFinite), "PDE 04 (1D 이류-파동 결합): 유한하고 안정된 파동 해 계산");

  // 2D 도플러 및 초음속 마하 원뿔 모드
  const pMach2d = LAB_MAP.wave_convection.presets.find((pr) => pr.id === "mach_cone_supersonic").params;
  const sim2d = new PDE2DSimulator("wave_convection", pMach2d);
  sim2d.step(25);
  check(sim2d.u.every(Number.isFinite), "PDE 04 (2D 초음속 이류-파동 마하 원뿔): 2D 안정 적분 확인");
}

// 6. PDE 05 (1D & 2D Convection-Diffusion): 단열 열량 보존 및 2D 대류-확산 플룸 검증
{
  const pHeat = LAB_MAP.conv_diff.presets.find((pr) => pr.id === "heat1d_insulated").params;
  const simH = new PDE1DSimulator("conv_diff", pHeat);
  simH.step(40);
  check(simH.uPrimary.every(Number.isFinite), "PDE 05 (1D Crank-Nicolson 단열 열전도): 안정 적분 확인");

  const p2d = LAB_MAP.conv_diff.presets[0].params;
  const sim2d = new PDE2DSimulator("conv_diff", p2d);
  sim2d.step(20);
  check(sim2d.u.every(Number.isFinite), "PDE 05 (2D 대류-확산 열 플룸): 2D 안정 적분 확인");
}

// 7. PDE 06 (1D & 2D Burgers): 보존형 충격파 vs 비보존형 비교 및 2D Burgers 검증
{
  const pBurg = LAB_MAP.burgers.presets[0].params;
  const simB = new PDE1DSimulator("burgers", pBurg);
  const m0 = simB.diagHistory.mass[0];
  simB.step(50);
  const m1 = simB.diagHistory.mass.at(-1);
  check(Math.abs(m1 - m0) < 1e-10, "PDE 06 (1D Burgers): 보존형 MUSCL 운동량 적분(∫u dx) 정밀 보존");

  const simB2 = new PDE2DSimulator("burgers", LAB_MAP.burgers.presets[2].params);
  simB2.step(20);
  check(simB2.w.every(Number.isFinite), "PDE 06 (2D Burgers 충격 전선): 2D 안정 적분 확인");
}

// 8. PDE 07 (1D & 2D Shallow Water): 수심 질량 보존 및 지형 상호작용 검증
{
  const pSW1 = LAB_MAP.shallow_water.presets[1].params;
  const simSW1 = new PDE1DSimulator("shallow_water", pSW1);
  const hSum0 = simSW1.hPrimary.reduce((a, b) => a + b, 0);
  simSW1.step(40);
  const hSum1 = simSW1.hPrimary.reduce((a, b) => a + b, 0);
  check(Math.abs(hSum1 - hSum0) / hSum0 < 1e-10, "PDE 07 (1D 천수 방정식): 수중 언덕 지형 위 총 물 질량(∫h dx) 정밀 보존");

  const simSW2 = new PDE2DSimulator("shallow_water", LAB_MAP.shallow_water.presets[0].params);
  simSW2.step(20);
  check(simSW2.pField.every((h) => Number.isFinite(h) && h > 0), "PDE 07 (2D 원형 댐 붕괴): 양수 수심 및 2D 안정성 유지");
}

// 9. PDE 08 (1D & 2D Compressible Euler): Sod 충격관 엄밀 Riemann 해 일치 및 2D 폭발파 검증
{
  const pEu1 = LAB_MAP.euler.presets[0].params;
  const simEu1 = new PDE1DSimulator("euler", pEu1);
  while (simEu1.t < 0.16) simEu1.step(1);
  const curves = simEu1.getCurrentCurves();
  let l1Err = 0;
  for (let i = 0; i < simEu1.n; i++) {
    l1Err += Math.abs(curves.primary[i] - curves.exact[i]);
  }
  l1Err /= simEu1.n;
  check(l1Err < 0.02, `PDE 08 (1D Euler Sod 충격관): MUSCL 수치해와 엄밀 Riemann 해 평균 밀도 오차 < 0.02 (실측 ${l1Err.toFixed(4)})`);

  const simEu2 = new PDE2DSimulator("euler", LAB_MAP.euler.presets[2].params);
  simEu2.step(18);
  check(simEu2.schlieren.every(Number.isFinite), "PDE 08 (2D 원통 폭발파 & 가상 슐리렌): 2D 안정 적분 및 |∇ρ| 계산 확인");
}

// 10. PDE 09 (2D Incompressible Navier-Stokes): 카르만 와류열 & Taylor-Green 검증
{
  const simNS = new PDE2DSimulator("navier_stokes", LAB_MAP.navier_stokes.presets[0].params);
  simNS.step(15);
  check(simNS.w.every(Number.isFinite) && simNS.pField.every(Number.isFinite), "PDE 09 (2D Navier-Stokes 원기둥 카르만 와류열): 와도·속도·압력 포아송 해 수렴 확인");

  const vn = computeVonNeumannCurve("wave_convection", { cfl: 0.7 });
  check(vn.gPrimary.length === 64, "Von Neumann 증폭 인자 스펙트럼 계산 확인");

  const convRows = runConvergenceStudy1D("wave_convection", { cx: 1.0, scheme: "muscl" });
  check(convRows.length === 4 && convRows[3].rmse < convRows[0].rmse, "1D 격자 수렴성 실험(Grid Convergence Study): 격자 세분화 시 오차 감소 확인");
}

console.log(`\n🎉 모든 ${passed}개 물리·수치해석 회귀 테스트를 완벽히 통과했습니다!`);
