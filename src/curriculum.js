// src/curriculum.js
// 미분방정식 물리·유체역학 인터랙티브 스튜디오 (PhysiLab PDE Studio v2.0)
// 9대 핵심 실험실 메타데이터, 수식 분해, 프리셋 및 학습 미션 정의

export const LABS = [
  {
    id: "oscillator",
    num: "01",
    category: "ODE · 고전역학",
    name: "감쇠·강제 조화진동자와 공명",
    short: "조화진동 · 공명",
    dims: ["ODE"],
    defaultDim: "ODE",
    badge: "시간 2차 선형 ODE · 위상 공간 & 공명",
    latexMain: String.raw`\underbrace{\ddot{x}}_{\text{관성 가속도}} + \underbrace{2\zeta\omega_0\dot{x}}_{\text{점성 감쇠}} + \underbrace{\omega_0^2 x}_{\text{탄성 복원력}} = \underbrace{F_0\cos(\omega_d t)}_{\text{주기적 외력}}`,
    summary:
      "질량-스프링-댐퍼 시스템에서 관성·감쇠·복원력·외력 4가지 물리적 항의 실시간 힘 균형과 공명(Resonance), 그리고 수치 적분기(Euler vs Verlet vs RK4)의 에너지 보존 특성을 비교합니다.",
    keyQuestion:
      "구동 주파수 ω_d가 고유진동수 ω_0에 가까워질 때 왜 진폭이 폭발적으로 커지며, 전진 Euler 적분기는 왜 감쇠가 없어도 스스로 에너지를 불려 발산할까요?",
    terms: [
      {
        symbol: String.raw`\ddot{x}`,
        name: "관성항 (Inertia)",
        color: "#38bdf8",
        role: "속도의 시간 변화율(가속도)로, 물체가 현재 운동 상태를 유지하려는 성질입니다.",
      },
      {
        symbol: String.raw`-2\zeta\omega_0\dot{x}`,
        name: "점성 감쇠력 (Damping)",
        color: "#f59e0b",
        role: "속도 v에 비례해 운동 반대 방향으로 작용하며 역학적 에너지를 열로 소산시킵니다.",
      },
      {
        symbol: String.raw`-\omega_0^2 x`,
        name: "선형 복원력 (Restoring)",
        color: "#10b981",
        role: "평형점(x=0)에서 벗어난 변위에 비례해 원점으로 되돌리려는 스프링 힘입니다.",
      },
      {
        symbol: String.raw`F_0\cos(\omega_d t)`,
        name: "외부 구동력 (Driving)",
        color: "#ec4899",
        role: "외부에서 에너지를 주기적으로 공급합니다. ω_d ≈ ω_0일 때 공명(Resonance)을 일으킵니다.",
      },
    ],
    presets: [
      {
        id: "underdamped",
        label: "감쇠 자유진동 (ζ=0.12)",
        params: { zeta: 0.12, omega0: 4.0, F0: 0.0, omegad: 4.0, x0: 1.0, v0: 0.0, dt: 0.025, scheme: "rk4" },
      },
      {
        id: "resonance",
        label: "공명 폭발 (ω_d = ω_0)",
        params: { zeta: 0.05, omega0: 4.0, F0: 1.2, omegad: 4.0, x0: 0.0, v0: 0.0, dt: 0.02, scheme: "rk4" },
      },
      {
        id: "beating",
        label: "맥놀이 현상 (ω_d = 0.88ω_0)",
        params: { zeta: 0.0, omega0: 5.0, F0: 1.5, omegad: 4.4, x0: 0.0, v0: 0.0, dt: 0.02, scheme: "verlet" },
      },
      {
        id: "critical",
        label: "임계 감쇠 복귀 (ζ=1.0)",
        params: { zeta: 1.0, omega0: 4.0, F0: 0.0, omegad: 4.0, x0: 1.0, v0: 0.0, dt: 0.025, scheme: "rk4" },
      },
      {
        id: "euler_instability",
        label: "Euler 수치 발산 실증 (ζ=0)",
        params: { zeta: 0.0, omega0: 4.5, F0: 0.0, omegad: 4.0, x0: 1.0, v0: 0.0, dt: 0.035, scheme: "euler" },
      },
    ],
    missions: [
      "프리셋 [공명 폭발]을 선택하고 구동 주파수 ω_d를 변화시키며 우측 공명 곡선에서 현재 운전점의 진폭과 위상차를 확인하세요.",
      "[감쇠항 ON/OFF] 스위치를 끄고(ζ=0), 수치 기법 동시 비교를 켜서 Forward Euler의 위상 궤적이 바깥으로 나선을 그리며 발산하는 반면 Symplectic Verlet과 RK4는 닫힌 타원을 유지하는지 비교하세요.",
      "[맥놀이 현상] 프리셋에서 두 주파수(ω_0, ω_d)의 중첩이 어떻게 느린 포락선(Envelope) 진동을 만드는지 관찰하세요.",
    ],
  },
  {
    id: "pendulum",
    num: "02",
    category: "ODE · 비선형 동역학",
    name: "비선형 대각도 진자 & 자려 진동",
    short: "비선형 진자 · 위상평면",
    dims: ["ODE"],
    defaultDim: "ODE",
    badge: "시간 2차 비선형 ODE · 분리선(Separatrix) & 극한주기궤도",
    latexMain: String.raw`\ddot{\theta} + 2\zeta\omega_0\dot{\theta} + \underbrace{\omega_0^2 \sin\theta}_{\text{비선형 중력 복원력 }\neq \omega_0^2\theta} = F_0\cos(\omega_d t)`,
    summary:
      "소각도 선형 근사(sin θ ≈ θ)가 무너지는 대각도 비선형 진자, 스스로 에너지를 조절하는 Van der Pol 극한주기궤도(Limit Cycle), 쌍안정 포텐셜의 Duffing 진동자를 위상 공간 벡터장과 함께 탐구합니다.",
    keyQuestion:
      "초기 각도 θ_0가 170°에 가까워지면 왜 진동 주기가 급격히 길어지며, 위상 평면의 눈 모양 경계선(Separatrix) 밖에서는 어떤 운동이 일어날까요?",
    terms: [
      {
        symbol: String.raw`\ddot{\theta}`,
        name: "각가속도 (Angular Inertia)",
        color: "#38bdf8",
        role: "각속도 ω = dθ/dt의 시간 변화율입니다.",
      },
      {
        symbol: String.raw`-\omega_0^2\sin\theta`,
        name: "비선형 복원 토크 (Nonlinear Torque)",
        color: "#10b981",
        role: "각도가 커질수록 선형(θ)보다 복원력이 약해져 진동 주기가 길어지고, θ=±π에서 불안정 평형점(안장점)을 형성합니다.",
      },
      {
        symbol: String.raw`-2\zeta\omega_0\dot{\theta}`,
        name: "비선형/선형 감쇠 (Damping)",
        color: "#f59e0b",
        role: "에너지를 소산시켜 회전 운동을 왕복 진동으로 가두거나, Van der Pol에서는 작은 진폭을 키우고 큰 진폭을 억제합니다.",
      },
    ],
    presets: [
      {
        id: "large_angle",
        label: "대각도 비선형 진자 (165° vs 선형근사)",
        params: { submode: "pendulum", theta0: 2.88, omegaInit: 0.0, omega0: 3.0, zeta: 0.0, F0: 0.0, omegad: 2.0, dt: 0.02, scheme: "verlet" },
      },
      {
        id: "over_top",
        label: "분리선 돌파 연속 회전 (Over-the-Top)",
        params: { submode: "pendulum", theta0: 0.0, omegaInit: 6.4, omega0: 3.0, zeta: 0.04, F0: 0.0, omegad: 2.0, dt: 0.02, scheme: "rk4" },
      },
      {
        id: "vanderpol",
        label: "Van der Pol 자려 진동 (Limit Cycle)",
        params: { submode: "vanderpol", theta0: 0.2, omegaInit: 0.0, omega0: 2.5, zeta: 1.4, F0: 0.0, omegad: 2.0, dt: 0.02, scheme: "rk4" },
      },
      {
        id: "duffing",
        label: "Duffing 이중 우물 비선형 진동",
        params: { submode: "duffing", theta0: 0.15, omegaInit: 0.0, omega0: 2.2, zeta: 0.08, F0: 0.95, omegad: 2.0, dt: 0.02, scheme: "rk4" },
      },
    ],
    missions: [
      "[대각도 비선형 진자]에서 실선(비선형 sin θ)과 점선(선형 근사 θ)의 주기가 어떻게 벌어지는지 실시간 파형과 진자 애니메이션으로 비교하세요.",
      "[분리선 돌파 연속 회전]에서 초기 각속도가 클 때 진자가 한 바퀴 이상 넘어가다가 감쇠에 의해 분리선(Separatrix) 안쪽 우물에 갇히는 위상 궤적을 관찰하세요.",
      "물리 모형을 [Van der Pol 자려 진동]으로 바꾸고 초기 위치가 안쪽(0.2)이든 바깥쪽(3.0)이든 동일한 극한주기궤도(Limit Cycle)로 수렴하는지 확인하세요.",
    ],
  },
  {
    id: "chaos_orbit",
    num: "03",
    category: "ODE · 천체역학 & 열대류 카오스",
    name: "케플러 궤도 역학 & 로렌츠 열대류 카오스",
    short: "케플러 궤도 · 로렌츠",
    dims: ["ODE"],
    defaultDim: "ODE",
    badge: "보존계 심플렉틱 적분 vs 비선형 열대류 카오스(ODE→PDE 가교)",
    latexMain: String.raw`\ddot{\mathbf{r}} = -\frac{\mu}{|\mathbf{r}|^3}\mathbf{r} \quad \text{또는} \quad \begin{cases}\dot{x}=\sigma(y-x)\\ \dot{y}=x(\rho-z)-y\\ \dot{z}=xy-\beta z\end{cases}`,
    summary:
      "중심력장 행성 궤도의 각운동량·에너지 보존(Symplectic Verlet vs Euler/RK4)과, 유체역학 열대류 편미분방정식(Rayleigh-Bénard Convection)에서 유도된 로렌츠 카오스 어트랙터의 나비효과를 체험합니다.",
    keyQuestion:
      "행성 궤도를 전진 Euler로 적분하면 왜 행성이 궤도를 이탈해 날아가버릴까요? 그리고 로렌츠 열대류 방정식에서 10⁻⁴의 미세한 초기 온도차는 언제부터 예측 불가능해질까요?",
    terms: [
      {
        symbol: String.raw`-\mu\mathbf{r}/|\mathbf{r}|^3`,
        name: "역제곱 중심 중력 / 프란틀 확산(σ)",
        color: "#38bdf8",
        role: "케플러 모드에서는 각운동량 L = r × v를 보존하는 중심력이며, 로렌츠 모드에서는 운동량 확산과 열확산의 비(Prandtl 수 σ)를 나타냅니다.",
      },
      {
        symbol: String.raw`x(\rho - z)`,
        name: "레일리 부력 구동항 (Rayleigh ρ)",
        color: "#f59e0b",
        role: "로렌츠 방정식에서 상하부 온도차(레일리 수 ρ)에 의한 열대류 불안정성과 비선형 열수송(xz)을 나타냅니다.",
      },
      {
        symbol: String.raw`xy - \beta z`,
        name: "비선형 대류 열교환 (Convective Mix)",
        color: "#10b981",
        role: "유체 회전 속도(x)와 수평 온도차(y)가 곱해져 수직 온도 구배(z)를 변화시키는 비선형 결합항입니다.",
      },
    ],
    presets: [
      {
        id: "lorenz_butterfly",
        label: "로렌츠 열대류 나비효과 (ρ=28)",
        params: { submode: "lorenz", sigma: 10.0, rho: 28.0, beta: 2.667, ecc: 0.55, perturb: 0.0001, dt: 0.01, scheme: "rk4" },
      },
      {
        id: "kepler_elliptic",
        label: "케플러 타원 궤도 (이심률 e=0.6)",
        params: { submode: "kepler", sigma: 10.0, rho: 28.0, beta: 2.667, ecc: 0.6, perturb: 0.0001, dt: 0.015, scheme: "verlet" },
      },
      {
        id: "kepler_euler_fail",
        label: "케플러 궤도 · Euler vs Verlet 비교",
        params: { submode: "kepler", sigma: 10.0, rho: 28.0, beta: 2.667, ecc: 0.5, perturb: 0.0001, dt: 0.02, scheme: "euler" },
      },
      {
        id: "lorenz_onset",
        label: "대류 롤 안정 수렴 (ρ=15 < 24.74)",
        params: { submode: "lorenz", sigma: 10.0, rho: 15.0, beta: 2.667, ecc: 0.5, perturb: 0.001, dt: 0.01, scheme: "rk4" },
      },
    ],
    missions: [
      "[케플러 타원 궤도]에서 수치 기법 동시 비교를 켜고, 근일점(행성이 중심별에 가장 가까울 때)을 지날 때마다 Euler 궤적이 왜 크게 찌그러지는지 각운동량·에너지 보존 차트에서 확인하세요.",
      "[로렌츠 열대류 나비효과]에서 초기 차이가 10⁻⁴에 불과한 두 궤적(청색 vs 주황색)이 처음에는 완벽히 겹쳐 움직이다가 어느 순간 완전히 다른 날개로 갈라지는지 관찰하세요.",
    ],
  },
  {
    id: "wave_convection",
    num: "04",
    category: "PDE · 파동 & 이류 수송",
    name: "파동·이류 결합 방정식 (1D / 2D Convection & Wave)",
    short: "파동·이류 (1D/2D)",
    dims: ["1D", "2D"],
    defaultDim: "2D",
    badge: "1D/2D 선택 가시화 · 시간 대류(Convection) · 도플러 & 마하 원뿔",
    latexMain: String.raw`\underbrace{\frac{\partial u}{\partial t} + (\mathbf{c}\cdot\nabla)u = 0}_{\text{1차 이류(Convection)}} \quad \text{및} \quad \underbrace{\left(\frac{\partial}{\partial t} + \mathbf{U}_0\cdot\nabla\right)^2 \phi = c^2\nabla^2\phi}_{\text{이류 매질 위의 파동 (도플러/마하콘)}}`,
    summary:
      "1D 파형과 2D 평면 필드를 자유롭게 전환하며, 유속 벡터(c_x, c_y)에 의한 시간에 따른 이류(Convection) 수송 효과와 흐르는 매질 위에서 퍼져나가는 파동(도플러 편이 및 초음속 마하 원뿔)을 수치해법과 결합해 가시화합니다.",
    keyQuestion:
      "1D와 2D에서 대류 속도 U_0가 파동 전파 속도 c보다 빨라지면(마하수 M = |U_0|/c > 1) 파동은 왜 상류로 전파되지 못하고 쐐기 모양의 마하 원뿔(Mach Cone) 안에 갇힐까요?",
    terms: [
      {
        symbol: String.raw`\partial u/\partial t`,
        name: "국소 시간 변화율 (Local Rate)",
        color: "#38bdf8",
        role: "고정된 공간 격자점 (x, y)에서 관측한 물리량의 순간 시간 변화율입니다.",
      },
      {
        symbol: String.raw`-\mathbf{c}\cdot\nabla u`,
        name: "이류/대류 수송항 (Convection Effect)",
        color: "#f59e0b",
        role: "유속 벡터 (c_x, c_y)와 공간 기울기 ∇u의 내적으로, 파형 전체를 흐름 방향으로 시간에 따라 평행 이동(또는 회전 이류)시킵니다.",
      },
      {
        symbol: String.raw`c^2\nabla^2\phi`,
        name: "파동 곡률 복원항 (Wave Laplacian)",
        color: "#10b981",
        role: "공간 2차 미분(곡률)이 가속도를 만들어 교란을 파동 속도 c로 사방에 전파합니다. 대류 속도 U_0와 결합하면 상류(U_0-c)·하류(U_0+c) 비대칭 전파가 일어납니다.",
      },
    ],
    presets: [
      {
        id: "conv2d_diagonal",
        label: "2D 대각선 시간 이류 (Pure Convection)",
        dim: "2D",
        params: { submode: "advection", cx: 1.0, cy: 0.65, waveC: 0.8, profile: "gaussian", bc: "periodic", scheme: "muscl", cfl: 0.7, gridN: 72 },
      },
      {
        id: "conv2d_vortex",
        label: "2D 회전 와류장 이류 (Swirling Convection)",
        dim: "2D",
        params: { submode: "swirl", cx: 1.2, cy: 0.0, waveC: 0.8, profile: "double", bc: "periodic", scheme: "muscl", cfl: 0.7, gridN: 72 },
      },
      {
        id: "doppler_subsonic",
        label: "2D 이류 파동 · 아음속 도플러 효과 (M=0.65)",
        dim: "2D",
        params: { submode: "convected_wave", cx: 0.65, cy: 0.0, waveC: 1.0, profile: "pulse_train", bc: "absorbing", scheme: "verlet", cfl: 0.55, gridN: 80 },
      },
      {
        id: "mach_cone_supersonic",
        label: "2D 초음속 이류 파동 · 마하 원뿔 (M=1.45)",
        dim: "2D",
        params: { submode: "convected_wave", cx: 1.45, cy: 0.0, waveC: 1.0, profile: "pulse_train", bc: "absorbing", scheme: "verlet", cfl: 0.45, gridN: 84 },
      },
      {
        id: "conv1d_schemes",
        label: "1D 이류 · Upwind vs Lax-Wendroff vs MUSCL 비교",
        dim: "1D",
        params: { submode: "advection", cx: 1.0, cy: 0.0, waveC: 1.0, profile: "combo", bc: "periodic", scheme: "muscl", cfl: 0.75, gridN: 160, compareSchemes: true },
      },
      {
        id: "wave1d_convected",
        label: "1D 이류-파동 결합 (비대칭 좌우 파동 U₀±c)",
        dim: "1D",
        params: { submode: "convected_wave", cx: 0.45, cy: 0.0, waveC: 0.8, profile: "gaussian", bc: "periodic", scheme: "verlet", cfl: 0.6, gridN: 160 },
      },
    ],
    missions: [
      "상단의 [1D 단면] ↔ [2D 필드] 버튼을 눌러 동일한 파동·이류 방정식이 1차원 선과 2차원 평면에서 어떻게 시간에 따라 이류(Convection)되는지 비교하세요.",
      "[2D 아음속 도플러 효과]와 [2D 초음속 마하 원뿔] 프리셋을 차례로 선택해 배경 유속 c_x와 파동 속도 c의 비율(마하수 M = |U_0|/c)에 따라 파면이 어떻게 비대칭 압축되고 마하 원뿔(sin μ = 1/M)을 형성하는지 확인하세요.",
      "[1D 이류 · 기법 비교] 프리셋에서 1차 Upwind(수치 확산으로 봉우리가 낮아짐), 2차 Lax-Wendroff(불연속 뒤쪽 수치 진동 발생), TVD MUSCL(날카로운 계단 유지)을 실시간으로 대조하세요.",
    ],
  },
  {
    id: "conv_diff",
    num: "05",
    category: "PDE · 열·물질 전달",
    name: "대류-확산 및 열전달 방정식 (1D / 2D Péclet Physics)",
    short: "대류·확산 (1D/2D)",
    dims: ["1D", "2D"],
    defaultDim: "2D",
    badge: "1D/2D 선택 가시화 · 페클레 수(Pe) · 이류 vs 확산 경쟁",
    latexMain: String.raw`\frac{\partial T}{\partial t} + \underbrace{\left(u_x\frac{\partial T}{\partial x} + u_y\frac{\partial T}{\partial y}\right)}_{\text{대류 열수송 }(\mathbf{u}\cdot\nabla T)} = \underbrace{\alpha\left(\frac{\partial^2 T}{\partial x^2} + \frac{\partial^2 T}{\partial y^2}\right)}_{\text{열확산 평탄화 }(\alpha\nabla^2 T)} + Q`,
    summary:
      "유체 흐름이 열·농도를 실어 나르는 대류(Convection)와 온도 구배의 곡률이 봉우리를 깎아 평탄화하는 확산(Diffusion)의 결합을 1D 및 2D에서 동시에 가시화합니다. 무차원 페클레 수(Pe = uL/α)에 따른 열 플룸(Plume) 변화를 직접 확인하세요.",
    keyQuestion:
      "온도 기울기(∂T/∂x)가 0인 가장 뜨거운 봉우리 꼭대기에서도 왜 온도가 즉시 내려갈까요? 그리고 대류가 확산보다 훨씬 강할 때(Pe ≫ 1) 왜 중앙차분법은 비물리적인 격자 진동을 일으킬까요?",
    terms: [
      {
        symbol: String.raw`-\mathbf{u}\cdot\nabla T`,
        name: "대류 수송항 (Convective Transport)",
        color: "#f59e0b",
        role: "유속 벡터 u를 따라 온도 분포를 비대칭으로 이동시킵니다. 최댓값 자체를 낮추지는 않고 위치만 옮깁니다.",
      },
      {
        symbol: String.raw`\alpha\nabla^2 T`,
        name: "라플라시안 확산항 (Diffusive Curvature)",
        color: "#10b981",
        role: "주변 이웃 평균과 중심 온도의 차이(곡률)에 비례합니다. 봉우리(∇²T < 0)는 깎아 내리고 골짜기(∇²T > 0)는 메웁니다.",
      },
      {
        symbol: String.raw`\text{Pe} = \frac{|\mathbf{u}|L}{\alpha}`,
        name: "페클레 수 (Péclet Number)",
        color: "#a855f7",
        role: "대류 수송 속도 대비 열확산 속도의 비입니다. Pe ≪ 1이면 등방성 원형 확산, Pe ≫ 1이면 유선을 따라 뻗는 열 플룸이 됩니다.",
      },
    ],
    presets: [
      {
        id: "plume_2d",
        label: "2D 열 플룸 대류·확산 (Pe = 40)",
        dim: "2D",
        params: { ux: 0.9, uy: 0.35, alpha: 0.02, profile: "gaussian", bc: "periodic", scheme: "upwind", cfl: 0.65, gridN: 64 },
      },
      {
        id: "pure_heat_2d",
        label: "2D 순수 열전도 · 이중 열원 병합 (u=0)",
        dim: "2D",
        params: { ux: 0.0, uy: 0.0, alpha: 0.05, profile: "double", bc: "fixed", scheme: "explicit", cfl: 0.8, gridN: 64 },
      },
      {
        id: "peclet_1d_layer",
        label: "1D 대류-확산 · 이류+확산 해석해 비교",
        dim: "1D",
        params: { ux: 0.8, uy: 0.0, alpha: 0.015, profile: "gaussian", bc: "periodic", scheme: "upwind", cfl: 0.7, gridN: 128, compareSchemes: true },
      },
      {
        id: "heat1d_insulated",
        label: "1D 단열 경계 열전도 (총열량 보존)",
        dim: "1D",
        params: { ux: 0.0, uy: 0.0, alpha: 0.04, profile: "step", bc: "insulated", scheme: "cn", cfl: 0.85, gridN: 101 },
      },
    ],
    missions: [
      "2D 모드에서 [이류항 ON/OFF]와 [확산항 ON/OFF] 스위치를 각각 켜고 끄면서, 순수 이류(이동만 함), 순수 확산(제자리에서 퍼짐), 대류-확산 결합(이동하며 퍼짐)의 차이를 한눈에 비교하세요.",
      "캔버스 위를 손가락(또는 마우스)으로 드래그해 새로운 열원을 주입하고 유속(u_x, u_y) 방향을 바꿔 열 플룸의 방향을 제어해 보세요.",
      "1D 모드에서 경계조건을 [양끝 고정(T=0)]과 [양끝 단열(∂T/∂x=0)]으로 바꾸어 총열량(∫T dx) 보존 여부를 진단 탭에서 확인하세요.",
    ],
  },
  {
    id: "burgers",
    num: "06",
    category: "PDE · 비선형 유체역학",
    name: "비선형 Burgers 방정식 — 충격파와 점성 (1D / 2D)",
    short: "Burgers 충격파 (1D/2D)",
    dims: ["1D", "2D"],
    defaultDim: "1D",
    badge: "1D/2D 선택 가시화 · 비선형 이류(u·∇u) · 특성선 교차와 충격파",
    latexMain: String.raw`\frac{\partial \mathbf{u}}{\partial t} + \underbrace{(\mathbf{u}\cdot\nabla)\mathbf{u}}_{\text{비선형 자기 이류 (충격파 생성)}} = \underbrace{\nu\nabla^2\mathbf{u}}_{\text{점성 확산 (충격파 완충)}}`,
    summary:
      "나비에-스토크스 방정식의 핵심인 비선형 대류항 (u·∇)u와 점성항 ν∇²u의 정면 승부입니다. 빠른 유체가 느린 유체를 추월해 파면이 스스로 가팔라지며 충격파(Shock Wave)를 만드는 과정을 1D 특성선 교차 및 2D 속도장으로 확인합니다.",
    keyQuestion:
      "선형 이류 방정식에서는 파형 모양이 그대로 유지되는데, 왜 Burgers 방정식에서는 매끄러운 사인파가 스스로 기울어지다가 불연속 충격파를 만들까요?",
    terms: [
      {
        symbol: String.raw`-u\frac{\partial u}{\partial x} = -\frac{\partial(u^2/2)}{\partial x}`,
        name: "비선형 대류항 (Nonlinear Self-Convection)",
        color: "#ef4444",
        role: "유속 u가 큰 봉우리 부분이 골짜기보다 더 빠르게 이동하여 앞쪽 경사면을 가파르게 압축(Steepening)시킵니다.",
      },
      {
        symbol: String.raw`\nu\nabla^2 u`,
        name: "동점성 소산항 (Viscous Dissipation)",
        color: "#10b981",
        role: "충격파 전선에서 속도 구배가 급격해지면 곡률(∇²u)이 커져 무한 기울기로의 붕괴를 막고 두께 δ ~ ν/Δu의 얇은 점성 충격층을 만듭니다.",
      },
      {
        symbol: String.raw`x(t) = x_0 + u_0(x_0)t`,
        name: "특성선 교차 (Characteristic Crossing)",
        color: "#38bdf8",
        role: "시공간(x-t) 평면에서 각 입자의 궤적 기울기가 초기 유속 u_0에 의해 결정되어 유한 시간 t_b = -1/min(u_0')에 서로 교차합니다.",
      },
    ],
    presets: [
      {
        id: "shock_1d",
        label: "1D 사인파 → N-파 충격파 탄생 (ν=0.003)",
        dim: "1D",
        params: { nu: 0.003, dirAngle: 30, profile: "sine", bc: "periodic", scheme: "muscl", cfl: 0.65, gridN: 160, compareSchemes: true },
      },
      {
        id: "riemann_step_1d",
        label: "1D 계단 충격파 · 보존형 vs 비보존형 속도 비교",
        dim: "1D",
        params: { nu: 0.002, dirAngle: 0, profile: "step", bc: "periodic", scheme: "muscl", cfl: 0.6, gridN: 160, compareSchemes: true },
      },
      {
        id: "burgers_2d_jet",
        label: "2D 비선형 버거스 충격 전선 (2D Shock Front)",
        dim: "2D",
        params: { nu: 0.006, dirAngle: 35, profile: "gaussian", bc: "periodic", scheme: "muscl", cfl: 0.55, gridN: 64 },
      },
      {
        id: "viscous_decay_1d",
        label: "1D 고점성 소산 유동 (ν=0.035)",
        dim: "1D",
        params: { nu: 0.035, dirAngle: 0, profile: "sine", bc: "periodic", scheme: "muscl", cfl: 0.65, gridN: 128 },
      },
    ],
    missions: [
      "1D 모드에서 [x-t 시공도 & 특성선] 뷰를 켜고, 빠른 유체에서 출발한 특성선(기울기가 누운 직선)이 느린 특성선과 만나는 순간 충격파가 탄생하는 것을 확인하세요.",
      "[1D 계단 충격파] 프리셋에서 수치 기법 비교를 켜고, 보존형 유한체적법(MUSCL/Rusanov)과 비보존형 차분(u·u_x)이 예측하는 충격파 이동 속도가 왜 달라지는지 확인하세요.",
      "상단 [2D 필드] 버튼을 눌러 2차원 평면에서 양(+)의 유속 봉우리가 한쪽은 가파른 충격면(Shock), 반대쪽은 완만한 팽창면(Rarefaction)으로 비대칭 변형되는 모습을 3D 표면으로도 돌려보세요.",
    ],
  },
  {
    id: "shallow_water",
    num: "07",
    category: "PDE · 자유수면 유체역학",
    name: "천수 방정식 — 댐 붕괴·중력파 & 지형 유동 (1D / 2D)",
    short: "천수·중력파 (1D/2D)",
    dims: ["1D", "2D"],
    defaultDim: "2D",
    badge: "1D/2D 선택 가시화 · 수심(h)·유속(u) 보존계 · Froude 수 & 지형 효과",
    latexMain: String.raw`\frac{\partial h}{\partial t}+\nabla\cdot(h\mathbf{u})=0,\quad \frac{\partial (h\mathbf{u})}{\partial t}+\nabla\cdot\left(h\mathbf{u}\otimes\mathbf{u}+\frac{1}{2}gh^2\mathbf{I}\right)=\underbrace{-gh\nabla b}_{\text{바닥 지형력}}\underbrace{-f\mathbf{k}\times(h\mathbf{u})}_{\text{코리올리 힘}}`,
    summary:
      "수심 h와 유속 u가 결합된 자유수면 유체역학(Shallow Water Equations)입니다. 1D/2D 댐 붕괴(Dam Break), 수중 언덕 지형(b) 위를 지나는 쓰나미 천수 변형, 배경 유속에 의한 중력파 대류 효과를 실시간 가시화합니다.",
    keyQuestion:
      "수심 h가 깊어지면 중력파 전파 속도 c = √(gh)는 어떻게 변하며, 물이 수중 언덕(b > 0) 위를 지날 때 수면 높이와 유속은 어떻게 반응할까요?",
    terms: [
      {
        symbol: String.raw`\nabla\cdot(h\mathbf{u})`,
        name: "체적 유량 발산 (Mass Flux Divergence)",
        color: "#38bdf8",
        role: "단위 폭당 유량 hu가 모여드는 곳(수렴)에서는 수심 h가 높아지고, 빠져나가는 곳(발산)에서는 수심이 낮아집니다.",
      },
      {
        symbol: String.raw`-\nabla(\frac{1}{2}gh^2)`,
        name: "정수압 구배력 (Hydrostatic Pressure)",
        color: "#10b981",
        role: "수심이 높은 곳에서 낮은 곳으로 유체를 밀어내며 파동 속도 c = √(gh)의 표면 중력파를 전파시킵니다.",
      },
      {
        symbol: String.raw`-gh\nabla b`,
        name: "수중 지형 경사력 (Bathymetry Source)",
        color: "#f59e0b",
        role: "바닥 지형 b(x,y)의 오르막·내리막 경사가 수심과 결합하여 파동의 굴절과 천수 증폭(Shoaling)을 일으킵니다.",
      },
    ],
    presets: [
      {
        id: "dambreak_2d",
        label: "2D 원형 댐 붕괴 (Circular Dam Break)",
        dim: "2D",
        params: { g: 1.5, coriolis: 0.0, bathyAmp: 0.0, meanFlow: 0.0, profile: "dambreak", bc: "reflective", scheme: "muscl", cfl: 0.5, gridN: 68 },
      },
      {
        id: "tsunami_shoal_1d",
        label: "1D 수중 언덕 위 천수파 & 지형 상호작용",
        dim: "1D",
        params: { g: 1.5, coriolis: 0.0, bathyAmp: 0.35, meanFlow: 0.0, profile: "gaussian", bc: "reflective", scheme: "muscl", cfl: 0.55, gridN: 150 },
      },
      {
        id: "dambreak_1d",
        label: "1D 댐 붕괴 (충격 보어 + 팽창파)",
        dim: "1D",
        params: { g: 1.5, coriolis: 0.0, bathyAmp: 0.0, meanFlow: 0.0, profile: "dambreak", bc: "reflective", scheme: "muscl", cfl: 0.55, gridN: 160, compareSchemes: true },
      },
      {
        id: "convected_gravity_2d",
        label: "2D 배경 유동 속 중력파 이류 (Froude 효과)",
        dim: "2D",
        params: { g: 1.0, coriolis: 0.0, bathyAmp: 0.0, meanFlow: 0.65, profile: "gaussian", bc: "periodic", scheme: "muscl", cfl: 0.5, gridN: 68 },
      },
    ],
    missions: [
      "[2D 원형 댐 붕괴]에서 [3D 표면] 뷰를 켜고, 중앙의 높은 물기둥이 붕괴하며 바깥으로 퍼져나가는 원형 충격파(Bore)와 벽면 반사 간섭을 입체적으로 관찰하세요.",
      "[1D 수중 언덕 위 천수파]에서 회색으로 표시된 바닥 지형 b(x) 위로 물결이 지나갈 때 파동 속도와 파고가 어떻게 변하는지 확인하세요.",
      "2D 화면을 직접 터치/클릭해 수면에 물방울 파문을 일으켜 보세요!",
    ],
  },
  {
    id: "euler",
    num: "08",
    category: "PDE · 압축성 기체역학",
    name: "압축성 Euler 방정식 — 충격관 & 2D 폭발파 (1D / 2D)",
    short: "Euler 충격관 (1D/2D)",
    dims: ["1D", "2D"],
    defaultDim: "1D",
    badge: "1D Riemann 엄밀해 & 2D 원형 폭발파 · 가상 슐리렌(|∇ρ|)",
    latexMain: String.raw`\frac{\partial}{\partial t}\begin{pmatrix}\rho\\ \rho\mathbf{u}\\ E\end{pmatrix} + \nabla\cdot\begin{pmatrix}\rho\mathbf{u}\\ \rho\mathbf{u}\otimes\mathbf{u}+p\mathbf{I}\\ (E+p)\mathbf{u}\end{pmatrix}=0,\quad p=(\gamma-1)\left(E-\frac{1}{2}\rho|\mathbf{u}|^2\right)`,
    summary:
      "질량(ρ), 운동량(ρu), 총에너지(E) 3개 보존법칙이 결합된 압축성 비점성 기체역학입니다. 1D Sod/Lax 충격관(엄밀한 Riemann 해 오버레이)과 2D 원형 폭발파 및 수치 슐리렌(|∇ρ|) 영상을 모두 지원합니다.",
    keyQuestion:
      "격막이 터진 뒤 생기는 3가지 파동(팽창파, 접촉 불연속면, 충격파) 중에서 왜 중앙의 접촉면(Contact Discontinuity)에서는 밀도와 온도만 뛰고 압력과 유속은 연속일까요?",
    terms: [
      {
        symbol: String.raw`\partial_t\rho + \nabla\cdot(\rho\mathbf{u})=0`,
        name: "질량 보존 (Continuity)",
        color: "#38bdf8",
        role: "압축/팽창에 의해 기체 밀도 ρ가 시간에 따라 어떻게 변화하는지 결정합니다.",
      },
      {
        symbol: String.raw`\partial_t(\rho\mathbf{u}) + \nabla\cdot(\rho\mathbf{u}\otimes\mathbf{u}+p\mathbf{I})=0`,
        name: "운동량 보존 & 압력 구배 (Momentum)",
        color: "#f59e0b",
        role: "운동량 대류 수송과 열역학적 압력 p의 차이가 기체를 가속시킵니다.",
      },
      {
        symbol: String.raw`\lambda = u-c,\ u,\ u+c`,
        name: "3대 특성 파동 속도 (Eigenvalues)",
        color: "#10b981",
        role: "음속 c = √(γp/ρ)에 대해 좌측 음향파(u-c, 팽창파), 엔트로피/접촉파(u, 접촉면), 우측 음향파(u+c, 충격파) 세 갈래로 정보가 전파됩니다.",
      },
    ],
    presets: [
      {
        id: "sod_1d",
        label: "1D Sod 표준 충격관 (pR=0.1, 엄밀해 비교)",
        dim: "1D",
        params: { gamma: 1.4, rhoL: 1.0, pL: 1.0, rhoR: 0.125, pR: 0.1, scheme: "muscl", cfl: 0.55, gridN: 200, compareSchemes: true },
      },
      {
        id: "strong_shock_1d",
        label: "1D 고압비 강충격파 (pR=0.02)",
        dim: "1D",
        params: { gamma: 1.4, rhoL: 1.0, pL: 1.0, rhoR: 0.125, pR: 0.02, scheme: "muscl", cfl: 0.45, gridN: 200 },
      },
      {
        id: "blast_2d",
        label: "2D 원통형 폭발파 & 슐리렌 (2D Cylindrical Blast)",
        dim: "2D",
        params: { gamma: 1.4, rhoL: 1.0, pL: 2.0, rhoR: 0.125, pR: 0.1, scheme: "muscl", cfl: 0.45, gridN: 68 },
      },
      {
        id: "implosion_2d",
        label: "2D 원통 내파 집중 (Cylindrical Implosion)",
        dim: "2D",
        params: { gamma: 1.4, rhoL: 0.125, pL: 0.1, rhoR: 1.0, pR: 1.2, scheme: "muscl", cfl: 0.45, gridN: 68 },
      },
    ],
    missions: [
      "1D 모드에서 관찰 물리량을 [밀도 ρ] → [압력 p] → [유속 u] → [마하수 M] → [엔트로피 s]로 전환하며, x ≈ 0.68 부근의 접촉 불연속면이 어떤 물리량에서만 계단으로 나타나는지 확인하세요.",
      "상단 [2D 필드]를 선택하고 관찰 물리량을 [가상 슐리렌 |∇ρ|]로 바꾸어, 실제 초음속 풍동 광학 실험처럼 얇은 원형 충격파와 안쪽 접촉면 고리를 선명하게 관찰하세요.",
    ],
  },
  {
    id: "navier_stokes",
    num: "09",
    category: "PDE · 2D 점성 유체역학 (CFD)",
    name: "2D 비압축성 Navier–Stokes 유체 스튜디오",
    short: "Navier–Stokes (2D)",
    dims: ["2D", "1D"],
    defaultDim: "2D",
    badge: "와도·유선·압력 포아송 · 카르만 와류열 & 전단 불안정성",
    latexMain: String.raw`\frac{\partial \mathbf{u}}{\partial t}+\underbrace{(\mathbf{u}\cdot\nabla)\mathbf{u}}_{\text{비선형 관성 이류}}=\underbrace{-\nabla p}_{\text{압력 구배}}+\underbrace{\nu\nabla^2\mathbf{u}}_{\text{점성 응력}},\quad \nabla\cdot\mathbf{u}=0`,
    summary:
      "비압축성 점성 유동을 지배하는 나비에-스토크스 방정식입니다. Taylor-Green 해석해 검증부터 Kelvin-Helmholtz 전단층 소용돌이 말림, 원기둥 장애물 뒤의 카르만 와류열(Kármán Vortex Street), 그리고 손가락 터치 유동 교란까지 실시간으로 시뮬레이션합니다.",
    keyQuestion:
      "비압축성 유동(∇·u = 0)에서 별도의 시간 미분 방정식이 없는 압력 p는 어떻게 결정되며, 레이놀즈 수(Re = UL/ν)가 커질 때 원기둥 뒤의 유동은 왜 좌우 교번 와류열로 불안정해질까요?",
    terms: [
      {
        symbol: String.raw`-(\mathbf{u}\cdot\nabla)\omega`,
        name: "비선형 와도 이류 (Vorticity Advection)",
        color: "#f59e0b",
        role: "유체 자신이 만들어낸 유도 속도장 u가 소용돌이(와도 ω)와 염료를 하류로 운반하고 전단층을 말아 올립니다.",
      },
      {
        symbol: String.raw`\nu\nabla^2\omega`,
        name: "점성 확산 및 소산 (Viscous Diffusion)",
        color: "#10b981",
        role: "날카로운 속도 전단과 작은 소용돌이를 평탄화하며 운동에너지와 엔스트로피(½∫ω²dA)를 감소시킵니다.",
      },
      {
        symbol: String.raw`\nabla^2 p = 2(u_x v_y - u_y v_x)`,
        name: "타원형 압력 포아송 결합 (Pressure Poisson)",
        color: "#38bdf8",
        role: "비압축성 조건(∇·u = 0)을 매 순간 만족시키기 위해 공간 전체를 연결합니다. 소용돌이 중심부는 저압(p < 0), 충돌 정체점은 고압(p > 0)이 됩니다.",
      },
    ],
    presets: [
      {
        id: "karman_cylinder",
        label: "원기둥 유동 & 카르만 와류열 (Kármán Street)",
        dim: "2D",
        params: { scenario: "cylinder", nu: 0.0018, uInlet: 1.1, gridN: 72, cfl: 0.5 },
      },
      {
        id: "kelvin_helmholtz",
        label: "Kelvin–Helmholtz 이중 전단층 불안정성",
        dim: "2D",
        params: { scenario: "kh", nu: 0.0008, uInlet: 1.0, gridN: 72, cfl: 0.5 },
      },
      {
        id: "taylor_green",
        label: "Taylor–Green 소용돌이 (엄밀 해석해 검증)",
        dim: "2D",
        params: { scenario: "taylor", nu: 0.005, uInlet: 1.0, gridN: 64, cfl: 0.55 },
      },
      {
        id: "vortex_dipole",
        label: "쌍극자 와류 제트 충돌 (Vortex Dipole)",
        dim: "2D",
        params: { scenario: "dipole", nu: 0.001, uInlet: 1.0, gridN: 72, cfl: 0.5 },
      },
    ],
    missions: [
      "[원기둥 유동 & 카르만 와류열]에서 관찰 물리량을 [염료 농도 Dye]와 [와도 ω], [압력 p]로 바꿔가며 원기둥 앞쪽 정체점(고압)과 뒤쪽 소용돌이 중심(저압)을 확인하세요.",
      "[라그랑주 입자 추적] 토글을 켜고, 실제 유체 입자들이 소용돌이에 휘감기며 이류(Convection)되는 궤적을 관찰하세요.",
      "2D 캔버스 위를 손가락/마우스로 직접 빠르게 문질러 유체 속에 새로운 제트 와류와 컬러 염료를 만들어 보세요!",
    ],
  },
];

export const LAB_MAP = Object.fromEntries(LABS.map((lab) => [lab.id, lab]));
