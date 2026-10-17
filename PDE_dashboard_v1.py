#!/usr/bin/env python3
"""미분방정식 물리 실험실 — 단일 파일 Streamlit 대시보드.

설치: python3 -m pip install 'streamlit>=1.50' 'plotly>=5.18' 'numpy>=1.24'
실행: python3 -m streamlit run PDE_dashboard_v1.py
수치 검증: python3 PDE_dashboard_v1.py --self-test

모든 계산은 무차원 변수로 수행한다. 외부 데이터, SciPy, 서버 API는 필요 없다.
"""

from __future__ import annotations

import csv
import io
import json
import math
import sys
from typing import Any

import numpy as np


LABS = {
    "cooling": {
        "name": "01 · ODE — 냉각과 성장", "short": "냉각과 성장", "tag": "0D · 시간 1차",
        "equation": r"\frac{dT}{dt}=-k(T-T_\infty)\quad\text{또는}\quad\frac{dN}{dt}=rN(1-N/K)",
        "intro": "공간 전체를 하나의 값으로 묶으면 시간만 남습니다. 커피의 냉각과 개체 수의 성장을 통해 변화율과 현재 값의 관계를 봅니다.",
        "question": "같은 시간 간격에서 변화량이 점점 작아지는 이유는 무엇일까요?",
        "terms": [("시간미분", "현재 상태에서 얼마나 빠르게 변하는가"), ("냉각항", "주변과 온도차가 클수록 빠르게 냉각"), ("성장항", "수용량에 가까워질수록 성장 억제")],
        "tasks": ["냉각 계수를 2배로 바꾸고 주변 온도에 가까워지는 시간을 비교하세요.", "시간 간격을 크게 만들고 Euler와 RK4의 해석해 오차를 비교하세요.", "로지스틱 성장을 선택하고 초기값이 수용량보다 작을 때와 클 때를 비교하세요."],
    },
    "oscillator": {
        "name": "02 · ODE — 질량·스프링 진동", "short": "감쇠 진동", "tag": "0D · 시간 2차",
        "equation": r"\ddot q+2\zeta\omega_0\dot q+\omega_0^2q=0",
        "intro": "위치의 변화율은 속도, 속도의 변화율은 가속도입니다. 시간의 2차 미분을 두 개의 1차 ODE로 바꾸어 스프링의 진동을 계산합니다.",
        "question": "감쇠비가 0, 1, 1보다 클 때 물체가 평형으로 돌아오는 모습은 어떻게 다를까요?",
        "terms": [("관성", "가속도: 속도의 변화율"), ("감쇠", "속도에 비례하는 에너지 손실"), ("복원력", "평형에서 멀어질수록 강해지는 스프링 힘")],
        "tasks": ["감쇠비 0에서 위상 궤적과 에너지의 변화를 관찰하세요.", "감쇠비를 0.2 → 1 → 1.5로 바꾸어 진동과 복귀 속도를 비교하세요.", "감쇠가 없을 때 전진 Euler의 에너지 증가를 RK4와 비교하세요."],
    },
    "heat1d": {
        "name": "03 · PDE — 1D 열전도", "short": "1D 열전도", "tag": "1D · 공간 2차",
        "equation": r"\frac{\partial T}{\partial t}=\alpha\frac{\partial^2T}{\partial x^2}",
        "intro": "뜨거운 부분에서 차가운 부분으로 열이 퍼집니다. 공간의 2차 미분은 곡률이며, 봉우리에서는 음수, 골에서는 양수가 됩니다.",
        "question": "온도의 기울기가 0인 봉우리에서도 온도가 내려가는 이유는 무엇일까요?",
        "terms": [("시간미분", "각 위치의 온도 변화율"), ("라플라시안", "이웃과 비교한 온도의 굽음"), ("열확산계수 α", "온도차가 평탄해지는 속도")],
        "tasks": ["사인 초기조건으로 수치해와 해석해의 감쇠를 비교하세요.", "양끝 고정과 단열 경계를 비교하고 총열량 그래프를 확인하세요.", "FTCS의 Fourier 수를 0.5보다 크게 설정하여 불안정이 시작되는지 보세요."],
    },
    "advection": {
        "name": "04 · PDE — 이류·확산", "short": "이류·확산", "tag": "1D · 공간 1차 + 2차",
        "equation": r"\frac{\partial c}{\partial t}+a\frac{\partial c}{\partial x}=D\frac{\partial^2c}{\partial x^2}",
        "intro": "이류는 유체와 함께 농도를 옮기고, 확산은 농도차를 완화합니다. 이동과 퍼짐을 서로 다른 항으로 읽어 봅니다.",
        "question": "확산계수가 0인데도 봉우리가 낮아진다면, 그 퍼짐은 어디서 생겼을까요?",
        "terms": [("이류 a·cₓ", "흐름을 따라 모양을 운반"), ("확산 D·cₓₓ", "농도차를 완화"), ("주기 경계", "오른쪽으로 나간 물질이 왼쪽으로 돌아옴")],
        "tasks": ["D=0에서 Upwind와 Lax–Wendroff의 봉우리 높이를 비교하세요.", "유속의 부호를 바꾸고 이동 방향을 확인하세요.", "사인 초기조건에서 해석해와 비교해 물리적 확산과 수치 확산을 구별하세요."],
    },
    "wave": {
        "name": "05 · PDE — 파동", "short": "파동", "tag": "1D · 시간·공간 2차",
        "equation": r"\frac{\partial^2q}{\partial t^2}=c^2\frac{\partial^2q}{\partial x^2}",
        "intro": "줄의 굽음이 가속도를 만들며 변형이 양방향으로 전달됩니다. 열전도와 같은 공간 2차 미분을 쓰지만 시간 2차 미분 때문에 전혀 다른 거동이 나타납니다.",
        "question": "열전도에서는 사라지는 봉우리가 파동에서는 왜 이동하고 되돌아올까요?",
        "terms": [("시간 2차 미분", "변위의 가속도"), ("공간 2차 미분", "줄의 굽음이 만드는 복원력"), ("파동속도 c", "정보가 전달되는 속도")],
        "tasks": ["가우시안 봉우리가 두 방향으로 나뉘는 것을 관찰하세요.", "고정 경계에서 반사되는 파동의 부호를 확인하세요.", "사인 초기조건으로 정재파와 해석해를 비교하세요."],
    },
    "heat2d": {
        "name": "06 · PDE — 2D 열전도", "short": "2D 열전도", "tag": "2D · 라플라시안",
        "equation": r"T_t=\alpha\nabla^2T=\alpha(T_{xx}+T_{yy})",
        "intro": "얇은 판에서 열은 x와 y 방향 모두로 퍼집니다. 5점 격자에서 네 이웃의 온도를 합쳐 중앙의 변화율을 계산합니다.",
        "question": "같은 Δx와 Δt에서 2D 열전도의 안정 조건이 1D보다 엄격한 이유는 무엇일까요?",
        "terms": [("x 방향 곡률", "좌우 이웃과의 온도차"), ("y 방향 곡률", "위아래 이웃과의 온도차"), ("라플라시안", "두 방향 곡률의 합")],
        "tasks": ["뜨거운 점 두 개를 선택하여 열이 합쳐지는 과정을 보세요.", "사인 모드의 해석해와 감쇠율을 비교하세요.", "격자점을 바꿔 Δx와 내부 시간 간격이 함께 바뀌는지 확인하세요."],
    },
    "burgers": {
        "name": "07 · PDE — Burgers 비선형 유동", "short": "Burgers 유동", "tag": "1D · 비선형 보존법칙",
        "equation": r"u_t+\left(\frac{u^2}{2}\right)_x=\nu u_{xx}",
        "intro": "유속 자체가 운반 속도입니다. 빠른 유체가 느린 유체를 따라잡으면 급격한 전선이 생기고 점성은 그 전선을 부드럽게 합니다.",
        "question": "일정한 속도의 이류와 달리 파형이 기울어지고 가파르게 되는 이유는 무엇일까요?",
        "terms": [("비선형 이류", "빠른 부분이 더 빨리 이동"), ("점성 ν", "속도차를 완화하고 에너지 소산"), ("보존형 플럭스", "셀 경계에서 운동량을 교환")],
        "tasks": ["점성을 0에 가깝게 줄이고 급격한 전선을 관찰하세요.", "1차 Rusanov와 2차 MUSCL을 비교해 수치 확산을 확인하세요.", "질량에 대응하는 ∫u dx의 보존과 에너지 감소를 비교하세요."],
    },
    "euler": {
        "name": "08 · 유체 — 압축성 Euler 충격관", "short": "Euler 충격관", "tag": "1D · 질량·운동량·에너지",
        "equation": r"\mathbf U_t+\mathbf F(\mathbf U)_x=0,\quad \mathbf U=(\rho,\rho u,E)^T",
        "intro": "칸막이를 없앤 고압·저압 기체를 계산합니다. 질량, 운동량, 에너지의 세 보존법칙이 연결되어 팽창파·접촉면·충격파를 만듭니다.",
        "question": "밀도 그래프에는 보이지만 압력 그래프에는 없는 불연속은 무엇일까요?",
        "terms": [("질량 보존", "ρ의 변화는 질량 플럭스의 차이"), ("운동량 보존", "운반과 압력에 의한 힘"), ("에너지 보존", "내부에너지와 운동에너지의 교환")],
        "tasks": ["밀도·유속·압력을 번갈아 보며 접촉면과 충격파를 구별하세요.", "격자를 늘리고 정확한 Riemann 해에 얼마나 가까워지는지 보세요.", "오른쪽 압력을 바꿔 충격파의 세기와 전파 속도를 비교하세요."],
    },
    "navier": {
        "name": "09 · 유체 — 2D Navier–Stokes", "short": "Navier–Stokes", "tag": "2D · 비압축성·점성",
        "equation": r"\mathbf u_t+(\mathbf u\cdot\nabla)\mathbf u=-\nabla p+\nu\nabla^2\mathbf u,\quad\nabla\cdot\mathbf u=0",
        "intro": "속도장의 비선형 운반, 점성 소산, 압력을 연결합니다. 주기 영역에서 와도·유선함수로 실제 2D 비압축성 유동을 계산하며 압력도 복원합니다.",
        "question": "점성을 0으로 하면 운동에너지는 어떻게 되며, 와도는 어떻게 이동할까요?",
        "terms": [("관성과 이류", "유체가 자신의 속도를 운반"), ("압력", "비압축성 조건을 만족하도록 속도장을 연결"), ("점성", "속도차와 작은 소용돌이를 완화")],
        "tasks": ["Taylor–Green 소용돌이에서 점성을 2배로 바꾸고 에너지 감쇠를 비교하세요.", "교란 소용돌이를 선택해 비선형 항이 파형을 바꾸는 것을 보세요.", "ν=0의 2D 비압축성 Euler와 ν>0의 Navier–Stokes를 비교하세요."],
    },
}


def default_config(kind: str) -> dict[str, Any]:
    p = dict(kind=kind, n=101, end=0.3, frames=81, cfl=0.75,
             method="explicit", initial="sine", boundary="fixed", dt=0.02,
             alpha=0.05, speed=1.0, diffusion=0.005, nu=0.01,
             rate=0.8, y0=1.0, ambient=0.2, capacity=1.0,
             zeta=0.15, omega=6.0, gamma=1.4, right_p=0.1, implicit_factor=1, logistic_y0=0.1)
    overrides = {
        "cooling": dict(end=6.0, initial="cooling", method="rk4", y0=1.0),
        "oscillator": dict(end=5.0, method="rk4"),
        "heat1d": dict(end=0.6, cfl=0.85),
        "advection": dict(end=0.6, method="upwind", boundary="periodic", initial="gaussian"),
        "wave": dict(end=1.5, initial="gaussian", diffusion=0.0),
        "heat2d": dict(n=41, end=0.4, initial="gaussian", cfl=0.85),
        "burgers": dict(n=128, end=0.35, method="muscl", boundary="periodic"),
        "euler": dict(n=160, end=0.2, method="muscl", initial="sod", boundary="outflow"),
        "navier": dict(n=48, end=2.0, initial="taylor", boundary="periodic", method="spectral"),
    }
    p.update(overrides[kind])
    return p


def thomas(lower, diagonal, upper, rhs):
    """경계조건을 적용한 삼중대각 연립방정식을 O(n)에 푼다."""
    b, d = np.array(diagonal, float, copy=True), np.array(rhs, float, copy=True)
    for i in range(1, len(b)):
        m = lower[i - 1] / b[i - 1]
        b[i] -= m * upper[i - 1]
        d[i] -= m * d[i - 1]
    d[-1] /= b[-1]
    for i in range(len(b) - 2, -1, -1):
        d[i] = (d[i] - upper[i] * d[i + 1]) / b[i]
    return d


def lap1(u, dx, boundary):
    if boundary == "periodic":
        return (np.roll(u, -1) - 2 * u + np.roll(u, 1)) / dx**2
    out = np.zeros_like(u)
    out[1:-1] = (u[2:] - 2 * u[1:-1] + u[:-2]) / dx**2
    if boundary == "insulated":
        out[0] = 2 * (u[1] - u[0]) / dx**2
        out[-1] = 2 * (u[-2] - u[-1]) / dx**2
    return out


def initial1(x, profile, boundary="periodic"):
    if profile == "sine":
        return np.sin(np.pi * x) if boundary == "fixed" else 0.5 + 0.45 * np.sin(2 * np.pi * x)
    if profile == "step":
        u = np.where((x > 0.3) & (x < 0.65), 1.0, 0.0)
    else:
        u = np.exp(-((x - 0.45) / 0.09)**2)
    if boundary == "fixed":
        u[[0, -1]] = 0
    return u


def minmod(a, b):
    return np.where(a * b > 0, np.sign(a) * np.minimum(np.abs(a), np.abs(b)), 0.0)


def integrate_snapshots(state, end, frames, step, dt_limit, diagnostics):
    """출력 시각과 내부 적분 시각을 구분하고 출력 시각에 정확히 도달한다."""
    times = np.linspace(0, end, frames)
    snapshots, records = [state.copy()], [diagnostics(state)]
    t, count, min_dt, max_dt = 0.0, 0, float("inf"), 0.0
    for target in times[1:]:
        while target - t > 1e-13 * max(1.0, end):
            dt = min(float(dt_limit(state)), float(target - t))
            if not np.isfinite(dt) or dt <= 1e-12:
                raise ValueError("안정 시간 간격이 너무 작습니다. 격자를 줄이거나 계수를 낮춰 주세요.")
            state = step(state, dt)
            if not np.all(np.isfinite(state)) or np.max(np.abs(state)) > 1e9:
                raise ValueError("수치해가 발산했습니다. 시간 간격 또는 CFL 배율을 줄여 주세요.")
            t += dt
            count += 1
            min_dt, max_dt = min(min_dt, dt), max(max_dt, dt)
            if count > 60000:
                raise ValueError("계산량 한도를 넘었습니다. 종료 시간 또는 격자 수를 줄여 주세요.")
        snapshots.append(state.copy())
        records.append(diagnostics(state))
    return times, np.asarray(snapshots), records, dict(steps=count, dt_min=min_dt, dt_max=max_dt)


def pack(p, x, times, fields, records, meta, y=None, reference=None):
    return dict(config=p.copy(), x=x, y=y, t=times, fields=fields,
                diag={k: np.array([d[k] for d in records]) for k in records[0]},
                meta=meta, reference=reference or {})


def oscillator_exact(t, omega, zeta):
    t = np.asarray(t)
    if abs(zeta - 1) < 1e-10:
        q = (1 + omega * t) * np.exp(-omega * t)
        v = -omega**2 * t * np.exp(-omega * t)
    else:
        disc = np.sqrt(complex(zeta**2 - 1))
        r1, r2 = omega * (-zeta + disc), omega * (-zeta - disc)
        q = ((-r2 * np.exp(r1 * t) + r1 * np.exp(r2 * t)) / (r1 - r2)).real
        v = (r1 * r2 * (-np.exp(r1 * t) + np.exp(r2 * t)) / (r1 - r2)).real
    return q, v


def solve_ode(p):
    oscillator = p["kind"] == "oscillator"
    def rhs(s):
        if oscillator:
            return np.array([s[1], -2 * p["zeta"] * p["omega"] * s[1] - p["omega"]**2 * s[0]])
        if p["initial"] == "logistic":
            return p["rate"] * s * (1 - s / p["capacity"])
        return -p["rate"] * (s - p["ambient"])
    def step(s, dt):
        if p["method"] == "euler":
            return s + dt * rhs(s)
        k1 = rhs(s)
        k2 = rhs(s + dt * k1 / 2)
        k3 = rhs(s + dt * k2 / 2)
        k4 = rhs(s + dt * k3)
        return s + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6
    def diag(s):
        if oscillator:
            return {"에너지": 0.5 * (s[1]**2 + p["omega"]**2 * s[0]**2)}
        return {"상태값": float(s[0]), "변화율": float(rhs(s)[0])}
    state = np.array([1.0, 0.0]) if oscillator else np.array([p["y0"]])
    t, s, d, meta = integrate_snapshots(state, p["end"], p["frames"], step, lambda _: p["dt"], diag)
    if oscillator:
        q, v = oscillator_exact(t, p["omega"], p["zeta"])
        fields, ref = {"변위 q": s[:, 0], "속도 v": s[:, 1]}, {"변위 q": q, "속도 v": v}
    else:
        if p["initial"] == "logistic":
            exact = p["capacity"] / (1 + (p["capacity"] / p["y0"] - 1) * np.exp(-p["rate"] * t))
        else:
            exact = p["ambient"] + (p["y0"] - p["ambient"]) * np.exp(-p["rate"] * t)
        fields, ref = {"상태값": s[:, 0]}, {"상태값": exact}
    meta.update(dx=None, scheme=p["method"], boundary="공간 없음")
    return pack(p, None, t, fields, d, meta, reference=ref)


def solve_scalar(p):
    kind, n, bc = p["kind"], p["n"], p["boundary"]
    periodic = bc == "periodic"
    x = np.linspace(0, 1, n, endpoint=not periodic)
    dx = 1 / (n if periodic else n - 1)
    u0 = initial1(x, p["initial"], bc)
    if kind == "burgers":
        u0 = 0.5 + 0.5 * np.sin(2 * np.pi * x)
    coefficient = p["alpha"] if kind == "heat1d" else p["diffusion"] if kind == "advection" else p["nu"]
    # 비주기 적분은 사다리꼴 가중치. 단열 ghost stencil과 일치한다.
    weights = np.ones(n) * dx
    if not periodic:
        weights[[0, -1]] *= 0.5
    def diag(u):
        return {"적분값 ∫f dx": float(weights @ u), "제곱 적분 ∫f²/2 dx": float(weights @ (0.5 * u**2)),
                "최솟값": float(u.min()), "최댓값": float(u.max())}
    def rhs_burgers(u):
        if p["method"] == "muscl":
            slope = minmod(u - np.roll(u, 1), np.roll(u, -1) - u)
        else:
            slope = np.zeros_like(u)
        left, right = u + slope / 2, np.roll(u - slope / 2, -1)
        flux = 0.25 * (left**2 + right**2) - 0.5 * np.maximum(abs(left), abs(right)) * (right - left)
        return -(flux - np.roll(flux, 1)) / dx + coefficient * lap1(u, dx, bc)
    def step(u, dt):
        if kind == "heat1d":
            r = coefficient * dt / dx**2
            if p["method"] == "explicit":
                return u + dt * coefficient * lap1(u, dx, bc)
            theta = 1.0 if p["method"] == "implicit" else 0.5
            # 고정·단열 경계에서 backward Euler / Crank–Nicolson.
            if bc == "fixed":
                rhs = u[1:-1] + (1 - theta) * r * (u[2:] - 2 * u[1:-1] + u[:-2])
                m = n - 2
                interior = thomas(np.full(m - 1, -theta * r), np.full(m, 1 + 2 * theta * r),
                                  np.full(m - 1, -theta * r), rhs)
                return np.r_[0.0, interior, 0.0]
            rhs = u + (1 - theta) * dt * coefficient * lap1(u, dx, bc)
            low, high = np.full(n - 1, -theta * r), np.full(n - 1, -theta * r)
            low[-1] *= 2
            high[0] *= 2
            return thomas(low, np.full(n, 1 + 2 * theta * r), high, rhs)
        if kind == "advection":
            a, C, r = p["speed"], p["speed"] * dt / dx, coefficient * dt / dx**2
            prev, nxt = np.roll(u, 1), np.roll(u, -1)
            if p["method"] == "upwind":
                adv = -C * (u - prev) if a >= 0 else -C * (nxt - u)
            else:
                adv = -0.5 * C * (nxt - prev) + 0.5 * C**2 * (nxt - 2 * u + prev)
            return u + adv + r * (nxt - 2 * u + prev)
        rhs = rhs_burgers(u)
        candidate = u + dt * rhs
        if p["method"] == "muscl":
            return 0.5 * u + 0.5 * (candidate + dt * rhs_burgers(candidate))
        return candidate
    def dt_limit(u):
        if kind == "heat1d":
            factor = p["implicit_factor"] if p["method"] != "explicit" else 1
            return p["cfl"] * factor * dx**2 / (2 * coefficient)
        speed = abs(p["speed"]) if kind == "advection" else max(float(np.max(abs(u))), 1e-8)
        return p["cfl"] / (speed / dx + 2 * coefficient / dx**2 + 1e-12)
    t, s, d, meta = integrate_snapshots(u0, p["end"], p["frames"], step, dt_limit, diag)
    name = "온도 T" if kind == "heat1d" else "농도 c" if kind == "advection" else "유속 u"
    refs = {}
    if p["initial"] == "sine" and kind == "heat1d":
        if bc == "fixed":
            refs[name] = np.exp(-coefficient * np.pi**2 * t[:, None]) * np.sin(np.pi * x)
    if p["initial"] == "sine" and kind == "advection":
        refs[name] = 0.5 + 0.45 * np.exp(-coefficient * (2 * np.pi)**2 * t[:, None]) * np.sin(2 * np.pi * (x[None, :] - p["speed"] * t[:, None]))
    meta.update(dx=dx, scheme=p["method"], boundary=bc,
                fourier=coefficient * meta["dt_max"] / dx**2,
                courant=(abs(p["speed"]) if kind == "advection" else float(abs(s).max()) if kind == "burgers" else 0) * meta["dt_max"] / dx)
    return pack(p, x, t, {name: s}, d, meta, reference=refs)


def solve_wave(p):
    n, bc = p["n"], p["boundary"]
    x = np.linspace(0, 1, n, endpoint=bc != "periodic")
    dx = 1 / (n if bc == "periodic" else n - 1)
    q = initial1(x, p["initial"], bc)
    if bc == "periodic" and p["initial"] == "sine":
        q = np.sin(2 * np.pi * x)
    s0 = np.stack([q, np.zeros_like(q)])
    c = p["speed"]
    def step(s, dt):
        q, v = s
        vh = v + 0.5 * dt * c**2 * lap1(q, dx, bc)
        qnew = q + dt * vh
        vnew = vh + 0.5 * dt * c**2 * lap1(qnew, dx, bc)
        if bc == "fixed":
            qnew[[0, -1]], vnew[[0, -1]] = 0, 0
        return np.stack([qnew, vnew])
    def diag(s):
        q, v = s
        grad = (np.roll(q, -1) - q) / dx if bc == "periodic" else np.diff(q) / dx
        return {"에너지": float(0.5 * dx * (np.sum(v**2) + c**2 * np.sum(grad**2))),
                "최대 변위": float(np.max(abs(q)))}
    t, s, d, meta = integrate_snapshots(s0, p["end"], p["frames"], step,
                                         lambda _: p["cfl"] * dx / c, diag)
    refs = {}
    if p["initial"] == "sine":
        k = np.pi if bc == "fixed" else 2 * np.pi
        refs["변위 q"] = np.cos(c * k * t[:, None]) * np.sin(k * x)
        refs["속도 v"] = -c * k * np.sin(c * k * t[:, None]) * np.sin(k * x)
    meta.update(dx=dx, scheme="Velocity Verlet", boundary=bc, courant=c * meta["dt_max"] / dx)
    return pack(p, x, t, {"변위 q": s[:, 0], "속도 v": s[:, 1]}, d, meta, reference=refs)


def solve_heat2d(p):
    n, alpha = p["n"], p["alpha"]
    x = np.linspace(0, 1, n)
    dx = x[1] - x[0]
    X, Y = np.meshgrid(x, x)
    if p["initial"] == "sine":
        u0 = np.sin(np.pi * X) * np.sin(np.pi * Y)
    elif p["initial"] == "double":
        u0 = np.exp(-((X - 0.32)**2 + (Y - 0.4)**2) / 0.008) + 0.8 * np.exp(-((X - 0.68)**2 + (Y - 0.6)**2) / 0.008)
    else:
        u0 = np.exp(-((X - 0.5)**2 + (Y - 0.5)**2) / 0.018)
    u0[[0, -1], :] = 0
    u0[:, [0, -1]] = 0
    def step(u, dt):
        v = u.copy()
        v[1:-1, 1:-1] += alpha * dt / dx**2 * (u[1:-1, 2:] + u[1:-1, :-2] + u[2:, 1:-1] + u[:-2, 1:-1] - 4 * u[1:-1, 1:-1])
        return v
    def diag(u):
        return {"총열량": float(u.sum() * dx**2), "최대 온도": float(u.max()),
                "제곱 적분 ∫T²/2 dA": float(np.sum(u**2) * dx**2 / 2)}
    t, s, d, meta = integrate_snapshots(u0, p["end"], p["frames"], step,
                                         lambda _: p["cfl"] * dx**2 / (4 * alpha), diag)
    ref = {"온도 T": np.exp(-2 * alpha * np.pi**2 * t[:, None, None]) * u0} if p["initial"] == "sine" else {}
    meta.update(dx=dx, scheme="2D FTCS", boundary="fixed", fourier=alpha * meta["dt_max"] / dx**2)
    return pack(p, x, t, {"온도 T": s}, d, meta, y=x, reference=ref)


def primitive(U, gamma):
    rho = U[..., 0]
    if np.any(rho <= 0):
        raise ValueError("Euler 계산에서 음의 밀도가 생겼습니다. CFL을 줄여 주세요.")
    u = U[..., 1] / rho
    pressure = (gamma - 1) * (U[..., 2] - 0.5 * rho * u**2)
    if np.any(pressure <= 0):
        raise ValueError("Euler 계산에서 음의 압력이 생겼습니다. CFL을 줄여 주세요.")
    return rho, u, pressure


def conserved(W, gamma):
    rho, u, pressure = W[..., 0], W[..., 1], W[..., 2]
    return np.stack([rho, rho * u, pressure / (gamma - 1) + 0.5 * rho * u**2], axis=-1)


def euler_flux(U, gamma):
    rho, u, pressure = primitive(U, gamma)
    F = np.stack([rho * u, rho * u**2 + pressure, u * (U[..., 2] + pressure)], axis=-1)
    return F, abs(u) + np.sqrt(gamma * pressure / rho)


def riemann_exact(x, t, gamma=1.4, right_p=0.1):
    """Sod 형태 Riemann 해. 중간 상태의 압력만 이분법으로 구한다."""
    rL, pL, rR, pR = 1.0, 1.0, 0.125, right_p
    aL, aR = math.sqrt(gamma * pL / rL), math.sqrt(gamma * pR / rR)
    g = gamma
    def f(p, rho, pk, ak):
        if p > pk:
            A, B = 2 / ((g + 1) * rho), (g - 1) * pk / (g + 1)
            return (p - pk) * math.sqrt(A / (p + B))
        return 2 * ak / (g - 1) * ((p / pk)**((g - 1) / (2 * g)) - 1)
    lo, hi = 1e-12, max(pL, pR)
    for _ in range(80):
        ps = (lo + hi) / 2
        if f(ps, rL, pL, aL) + f(ps, rR, pR, aR) > 0:
            hi = ps
        else:
            lo = ps
    ps = (lo + hi) / 2
    us = 0.5 * (f(ps, rR, pR, aR) - f(ps, rL, pL, aL))
    rho, vel, pressure = np.empty_like(x), np.empty_like(x), np.empty_like(x)
    if t < 1e-14:
        return np.where(x < 0.5, rL, rR), np.zeros_like(x), np.where(x < 0.5, pL, pR)
    beta = (g - 1) / (g + 1)
    for i, S in enumerate((x - 0.5) / t):
        left = S <= us
        rk, pk, ak, sign = (rL, pL, aL, -1) if left else (rR, pR, aR, 1)
        if ps > pk:
            speed = sign * ak * math.sqrt((g + 1) * ps / (2 * g * pk) + (g - 1) / (2 * g))
            outer = S < speed if left else S > speed
            if outer:
                rho[i], vel[i], pressure[i] = rk, 0, pk
            else:
                rho[i], vel[i], pressure[i] = rk * (ps / pk + beta) / (beta * ps / pk + 1), us, ps
        else:
            astar = ak * (ps / pk)**((g - 1) / (2 * g))
            head, tail = sign * ak, us + sign * astar
            outer = S <= head if left else S >= head
            star = S >= tail if left else S <= tail
            if outer:
                rho[i], vel[i], pressure[i] = rk, 0, pk
            elif star:
                rho[i], vel[i], pressure[i] = rk * (ps / pk)**(1 / g), us, ps
            else:
                uf = 2 / (g + 1) * (S - sign * ak)
                af = 2 / (g + 1) * (ak + sign * (g - 1) * S / 2)
                rho[i], vel[i], pressure[i] = rk * (af / ak)**(2 / (g - 1)), uf, pk * (af / ak)**(2 * g / (g - 1))
    return rho, vel, pressure


def solve_euler(p):
    n, g = p["n"], p["gamma"]
    dx = 1 / n
    x = (np.arange(n) + 0.5) * dx
    W0 = np.stack([np.where(x < 0.5, 1.0, 0.125), np.zeros(n), np.where(x < 0.5, 1.0, p["right_p"])], axis=-1)
    U0 = conserved(W0, g)
    def rhs(U):
        rho, u, pressure = primitive(U, g)
        W = np.pad(np.stack([rho, u, pressure], axis=-1), ((2, 2), (0, 0)), mode="edge")
        slope = np.zeros_like(W)
        if p["method"] == "muscl":
            slope[1:-1] = minmod(W[1:-1] - W[:-2], W[2:] - W[1:-1])
        left, right = W[1:-2] + slope[1:-2] / 2, W[2:-1] - slope[2:-1] / 2
        UL, UR = conserved(left, g), conserved(right, g)
        FL, al = euler_flux(UL, g)
        FR, ar = euler_flux(UR, g)
        F = 0.5 * (FL + FR) - 0.5 * np.maximum(al, ar)[:, None] * (UR - UL)
        return -(F[1:] - F[:-1]) / dx, F
    # 상태 끝에 세 보존량의 누적 경계 플럭스를 저장하여 개방 영역의 수지를 추적.
    state0 = np.vstack([U0, np.zeros((1, 3))])
    def step(state, dt):
        U, budget = state[:-1], state[-1]
        R1, F1 = rhs(U)
        Ua = U + dt * R1
        primitive(Ua, g)
        if p["method"] == "muscl":
            R2, F2 = rhs(Ua)
            Un = 0.5 * U + 0.5 * (Ua + dt * R2)
            incoming = dt * 0.5 * (F1[0] - F1[-1] + F2[0] - F2[-1])
        else:
            Un, incoming = Ua, dt * (F1[0] - F1[-1])
        primitive(Un, g)
        return np.vstack([Un, budget + incoming])
    initial_totals = U0.sum(axis=0) * dx
    def diag(state):
        U, budget = state[:-1], state[-1]
        rho, _, pressure = primitive(U, g)
        totals = U.sum(axis=0) * dx
        residual = totals - initial_totals - budget
        return {"질량": float(totals[0]), "총에너지": float(totals[2]),
                "질량 수지 잔차": float(residual[0]), "운동량 수지 잔차": float(residual[1]),
                "에너지 수지 잔차": float(residual[2]), "최소 밀도": float(rho.min()), "최소 압력": float(pressure.min())}
    def dt_limit(state):
        _, a = euler_flux(state[:-1], g)
        return p["cfl"] * dx / a.max()
    t, s, d, meta = integrate_snapshots(state0, p["end"], p["frames"], step, dt_limit, diag)
    U = s[:, :-1]
    rho, u, pressure = primitive(U, g)
    fields = {"밀도 ρ": rho, "유속 u": u, "압력 p": pressure, "총에너지 E": U[..., 2],
              "마하수 |u|/c": abs(u) / np.sqrt(g * pressure / rho)}
    exact = np.array([riemann_exact(x, ti, g, p["right_p"]) for ti in t])
    ref = {"밀도 ρ": exact[:, 0], "유속 u": exact[:, 1], "압력 p": exact[:, 2]}
    meta.update(dx=dx, scheme=p["method"], boundary="outflow",
                courant=float(np.max(abs(u) + np.sqrt(g * pressure / rho)) * meta["dt_max"] / dx))
    return pack(p, x, t, fields, d, meta, reference=ref)


def spectral_operators(n):
    k = 2 * np.pi * np.fft.fftfreq(n, d=1 / n)
    KX, KY = np.meshgrid(k, k)
    k2 = KX**2 + KY**2
    inv = np.zeros_like(k2)
    inv[k2 > 0] = 1 / k2[k2 > 0]
    modes = np.fft.fftfreq(n) * n
    # 엄격한 2/3 절단으로 Nyquist 성분도 제거.
    mask = (abs(modes[:, None]) < n / 3) & (abs(modes[None, :]) < n / 3)
    return KX, KY, k2, inv, mask


def solve_navier(p):
    n, nu = p["n"], p["nu"]
    x = np.arange(n) / n
    dx = 1 / n
    X, Y = np.meshgrid(x, x)
    KX, KY, k2, inv, mask = spectral_operators(n)
    if p["initial"] == "taylor":
        omega0 = 4 * np.pi * np.sin(2 * np.pi * X) * np.sin(2 * np.pi * Y)
    else:
        omega0 = 4 * np.pi * (np.sin(2 * np.pi * X) * np.sin(2 * np.pi * Y)
                                  + 0.35 * np.cos(4 * np.pi * X + 2 * np.pi * Y)
                                  + 0.2 * np.sin(2 * np.pi * X - 6 * np.pi * Y))
    omega0 = np.fft.ifft2(np.fft.fft2(omega0) * mask).real
    def velocity(omega):
        oh = np.fft.fft2(omega) * mask
        psi = oh * inv
        u = np.fft.ifft2(1j * KY * psi).real
        v = np.fft.ifft2(-1j * KX * psi).real
        return u, v, oh, psi
    def rhs(omega):
        u, v, oh, _ = velocity(omega)
        ox = np.fft.ifft2(1j * KX * oh).real
        oy = np.fft.ifft2(1j * KY * oh).real
        nonlinear = np.fft.fft2(u * ox + v * oy) * mask
        return np.fft.ifft2(-nonlinear - nu * k2 * oh).real
    def step(omega, dt):
        # 3단계 3차 SSP Runge–Kutta.
        a = omega + dt * rhs(omega)
        b = 0.75 * omega + 0.25 * (a + dt * rhs(a))
        return omega / 3 + (2 / 3) * (b + dt * rhs(b))
    def dt_limit(omega):
        u, v, _, _ = velocity(omega)
        # 이류 속도와 최대 라플라시안 고윳값에 근거한 보수적인 시간 간격.
        adv = float(abs(u).max() * abs(KX[mask]).max() + abs(v).max() * abs(KY[mask]).max())
        return p["cfl"] / max(adv + nu * k2[mask].max(), 1e-8)
    def diag(omega):
        u, v, _, psi = velocity(omega)
        div = np.fft.ifft2(1j * KX * np.fft.fft2(u) + 1j * KY * np.fft.fft2(v)).real
        return {"운동에너지": float(0.5 * np.mean(u**2 + v**2)), "엔스트로피": float(0.5 * np.mean(omega**2)),
                "최대 발산 |∇·u|": float(abs(div).max()), "평균 와도": float(omega.mean())}
    t, s, d, meta = integrate_snapshots(omega0, p["end"], p["frames"], step, dt_limit, diag)
    us, vs, pressures, streams = [], [], [], []
    for omega in s:
        u, v, _, psi = velocity(omega)
        uh, vh = np.fft.fft2(u), np.fft.fft2(v)
        ux, uy = np.fft.ifft2(1j * KX * uh).real, np.fft.ifft2(1j * KY * uh).real
        vx, vy = np.fft.ifft2(1j * KX * vh).real, np.fft.ifft2(1j * KY * vh).real
        # Δp = -Σ_i,j (∂_i u_j)(∂_j u_i), 평균 압력을 0으로 둔다.
        ph = np.fft.fft2(ux**2 + 2 * uy * vx + vy**2) * inv * mask
        us.append(u)
        vs.append(v)
        pressures.append(np.fft.ifft2(ph).real)
        streams.append(np.fft.ifft2(psi).real)
    us, vs = np.array(us), np.array(vs)
    fields = {"와도 ω": s, "속력 |u|": np.sqrt(us**2 + vs**2), "x 속도 u": us,
              "y 속도 v": vs, "압력 p": np.array(pressures), "유선함수 ψ": np.array(streams)}
    ref = {}
    if p["initial"] == "taylor":
        decay = np.exp(-8 * np.pi**2 * nu * t[:, None, None])
        u0, v0, _, _ = velocity(omega0)
        ref = {"와도 ω": decay * omega0, "x 속도 u": decay * u0, "y 속도 v": decay * v0,
               "속력 |u|": decay * np.sqrt(u0**2 + v0**2),
               "압력 p": 0.25 * (np.cos(4 * np.pi * X) + np.cos(4 * np.pi * Y)) * decay**2}
    meta.update(dx=dx, scheme="Fourier + SSP-RK3 + 2/3 dealiasing", boundary="periodic",
                reynolds=float(np.max(np.sqrt(us[0]**2 + vs[0]**2)) / nu) if nu > 0 else float("inf"))
    return pack(p, x, t, fields, d, meta, y=x, reference=ref)


def simulate(p):
    if p["kind"] in ("cooling", "oscillator"):
        return solve_ode(p)
    if p["kind"] in ("heat1d", "advection", "burgers"):
        return solve_scalar(p)
    if p["kind"] == "wave":
        return solve_wave(p)
    if p["kind"] == "heat2d":
        return solve_heat2d(p)
    if p["kind"] == "euler":
        return solve_euler(p)
    return solve_navier(p)


# UI 라이브러리는 앱 실행 때만 가져온다. --self-test는 NumPy만 있으면 된다.
st = go = None
COLORS = ["#087f8c", "#ed8b3a", "#7659ba", "#d34c65", "#4378c2"]


def style_figure(fig, title="", height=440):
    fig.update_layout(template="plotly_white", title=dict(text=title, font=dict(size=17)), height=height,
                      font=dict(family="Arial, sans-serif", color="#25364a", size=12),
                      margin=dict(l=35, r=25, t=55, b=45), paper_bgcolor="rgba(0,0,0,0)",
                      plot_bgcolor="#f7fafc", colorway=COLORS,
                      legend=dict(orientation="h", y=1.12, x=0), hovermode="closest")
    fig.update_xaxes(gridcolor="#e6edf2", zerolinecolor="#cbd5df")
    fig.update_yaxes(gridcolor="#e6edf2", zerolinecolor="#cbd5df")
    return fig


def chart(fig, key):
    st.plotly_chart(fig, width="stretch", key=key, config={"displaylogo": False})


def line_figure(x, series, title, xlabel="시간 t", ylabel="값", height=390):
    fig = go.Figure()
    for i, (name, y) in enumerate(series.items()):
        fig.add_trace(go.Scatter(x=x, y=y, name=name, mode="lines",
                                line=dict(color=COLORS[i % len(COLORS)], width=2.5,
                                          dash="dash" if "해석" in name or "정확" in name else "solid")))
    fig.update_layout(xaxis_title=xlabel, yaxis_title=ylabel)
    return style_figure(fig, title, height)


def sidebar_config(kind):
    defaults = default_config(kind)
    labels = {"sine": "사인 모드 · 해석해 비교", "gaussian": "가우시안 봉우리", "step": "사각 펄스",
              "double": "뜨거운 점 두 개", "taylor": "Taylor–Green · 해석해 비교", "perturbed": "교란 소용돌이 · 비선형 상호작용",
              "cooling": "뉴턴 냉각", "logistic": "로지스틱 성장",
              "fixed": "양끝 고정값 0", "insulated": "양끝 단열 · 열유속 0", "periodic": "주기 경계",
              "euler": "전진 Euler · 시간 1차", "rk4": "RK4 · 시간 4차",
              "explicit": "FTCS · 명시적", "implicit": "Backward Euler · 암시적", "cn": "Crank–Nicolson · 시간 2차",
              "upwind": "Upwind · 공간 1차", "lw": "Lax–Wendroff · 공간 2차",
              "rusanov": "Rusanov · 공간·시간 1차", "muscl": "MUSCL + SSP-RK2 · 매끄러운 영역 2차"}
    p = defaults.copy()
    def choose(label, key, opts):
        return st.selectbox(label, opts, index=opts.index(defaults[key]),
                            format_func=lambda v: labels.get(v, v), key=f"cfg_{kind}_{key}")
    def slide(label, key, lo, hi, step=None):
        args = dict(value=defaults[key], key=f"cfg_{kind}_{key}")
        if step is not None:
            args["step"] = step
        return st.slider(label, lo, hi, **args)
    st.sidebar.markdown("#### 실험 설정")
    with st.sidebar.form(f"settings_{kind}"):
        if kind == "cooling":
            p["initial"] = choose("물리 모형", "initial", ["cooling", "logistic"])
            p["rate"] = slide("냉각 / 성장 계수", "rate", 0.1, 2.0, 0.1)
            p["y0"] = slide("초기 온도 T₀ (냉각)", "y0", 0.05, 2.0, 0.05)
            p["logistic_y0"] = slide("초기 개체 수 N₀ (성장)", "logistic_y0", 0.05, 2.0, 0.05)
            if p["initial"] == "logistic":
                p["y0"] = p["logistic_y0"]
            p["ambient"] = slide("주변 온도 T∞ (냉각)", "ambient", 0.0, 1.0, 0.05)
            p["capacity"] = slide("수용량 K (성장)", "capacity", 0.2, 2.0, 0.1)
        elif kind == "oscillator":
            p["zeta"] = slide("감쇠비 ζ", "zeta", 0.0, 2.0, 0.05)
            p["omega"] = slide("고유 각진동수 ω₀", "omega", 1.0, 10.0, 0.5)
            st.caption("초기 변위 q(0)=1, 속도 v(0)=0")
        else:
            grids = [24, 32, 48, 64] if kind == "navier" else [21, 31, 41, 61, 81] if kind == "heat2d" else [64, 96, 128, 160, 240] if kind in ("burgers", "euler") else [41, 61, 101, 151, 201]
            p["n"] = st.select_slider("방향별 격자점 / 셀 수", grids, value=defaults["n"], key=f"cfg_{kind}_n")
            if kind not in ("burgers", "euler"):
                opts = ["taylor", "perturbed"] if kind == "navier" else ["sine", "gaussian", "double"] if kind == "heat2d" else ["sine", "gaussian"] if kind == "wave" else ["sine", "gaussian", "step"]
                p["initial"] = choose("초기조건", "initial", opts)
            if kind in ("heat1d", "wave"):
                p["boundary"] = choose("경계조건", "boundary", ["fixed", "insulated"] if kind == "heat1d" else ["fixed", "periodic"])
            else:
                st.caption("경계: " + ("양끝 외삽 개방 경계" if kind == "euler" else "가장자리 온도 0" if kind == "heat2d" else "주기 경계 · [0,1)"))
            if kind in ("heat1d", "heat2d"):
                p["alpha"] = slide("열확산계수 α", "alpha", 0.005, 0.2, 0.005)
            if kind == "advection":
                p["speed"] = slide("유속 a · 부호는 방향", "speed", -2.0, 2.0, 0.1)
                p["diffusion"] = slide("물리적 확산계수 D", "diffusion", 0.0, 0.05, 0.001)
            if kind == "wave":
                p["speed"] = slide("파동속도 c", "speed", 0.2, 2.0, 0.1)
            if kind in ("burgers", "navier"):
                p["nu"] = slide("동점성계수 ν", "nu", 0.0, 0.05, 0.001)
            if kind == "euler":
                p["gamma"] = slide("비열비 γ", "gamma", 1.2, 1.67, 0.01)
                p["right_p"] = slide("오른쪽 압력 pR", "right_p", 0.05, 0.5, 0.01)
                st.caption("왼쪽 (ρ,u,p)=(1,0,1) · 오른쪽 (0.125,0,pR)")
        if kind in ("cooling", "oscillator"):
            p["method"] = choose("시간 적분", "method", ["euler", "rk4"])
            p["dt"] = slide("최대 내부 시간 간격 Δt", "dt", 0.005, 0.2, 0.005)
        elif kind == "heat1d":
            p["method"] = choose("수치 기법", "method", ["explicit", "implicit", "cn"])
            p["implicit_factor"] = st.select_slider("암시적 기법의 Δt 추가 배수", [1, 2, 5, 10, 25], value=1, key="cfg_heat1d_implicit_factor")
            st.caption("추가 배수는 Backward Euler와 Crank–Nicolson에 적용됩니다. 큰 Δt의 정확도를 비교하세요.")
        elif kind == "advection":
            p["method"] = choose("수치 기법", "method", ["upwind", "lw"])
        elif kind in ("burgers", "euler"):
            p["method"] = choose("수치 기법", "method", ["rusanov", "muscl"])
        limits = {"cooling": (1.0, 10.0, 0.5), "oscillator": (1.0, 8.0, 0.5),
                  "heat1d": (0.1, 2.0, 0.1), "advection": (0.1, 2.0, 0.1),
                  "wave": (0.2, 3.0, 0.1), "heat2d": (0.1, 1.5, 0.1),
                  "burgers": (0.1, 1.0, 0.05), "euler": (0.05, 0.25, 0.01), "navier": (0.2, 4.0, 0.2)}
        lo, hi, step = limits[kind]
        p["end"] = slide("종료 시간", "end", lo, hi, step)
        if kind not in ("cooling", "oscillator"):
            hi = 1.3 if kind == "heat1d" else 0.95
            p["cfl"] = slide("안정 시간 간격에 대한 배율", "cfl", 0.1, hi, 0.05)
            st.caption("내부 Δt는 격자·계수에 따라 자동 계산합니다." + (" 1D 열전도는 불안정 조건도 실험할 수 있습니다." if kind == "heat1d" else ""))
        p["frames"] = st.select_slider("저장할 시간 장면 수", [41, 81, 121], value=81, key=f"cfg_{kind}_frames")
        submitted = st.form_submit_button("계산 / 설정 적용", width="stretch", type="primary")
    config_key = f"applied_{kind}"
    if submitted or config_key not in st.session_state:
        st.session_state[config_key] = p.copy()
    st.sidebar.caption("설정을 바꾼 뒤 적용 버튼을 누르세요. 시간 슬라이더는 저장된 결과를 탐색합니다.")
    return st.session_state[config_key]


def field_range(values, field):
    low, high = float(values.min()), float(values.max())
    diverging = low < -1e-8 and high > 1e-8
    if diverging:
        limit = max(abs(low), abs(high))
        return -limit, limit, "RdBu_r"
    return low, max(high, low + 1e-12), "Viridis"


def vector_trace(x, y, u, v, color="rgba(27,46,68,0.72)"):
    stride = max(1, len(x) // 12)
    X, Y = np.meshgrid(x[::stride], y[::stride])
    U, V = u[::stride, ::stride], v[::stride, ::stride]
    scale = 0.042 / max(float(np.sqrt(U**2 + V**2).max()), 1e-12)
    xs, ys = [], []
    for xx, yy, uu, vv in zip(X.ravel(), Y.ravel(), U.ravel(), V.ravel()):
        ex, ey = xx + scale * uu, yy + scale * vv
        bx, by = ex - 0.25 * scale * uu, ey - 0.25 * scale * vv
        xs.extend([xx, ex, None, bx - 0.12 * scale * vv, ex, bx + 0.12 * scale * vv, None])
        ys.extend([yy, ey, None, by + 0.12 * scale * uu, ey, by - 0.12 * scale * uu, None])
    return go.Scatter(x=xs, y=ys, mode="lines", line=dict(color=color, width=1.2),
                      hoverinfo="skip", name="속도 방향", showlegend=False)


def render_live(result, kind):
    fields, t = result["fields"], result["t"]
    a, b = st.columns([1, 3])
    with a:
        field = st.selectbox("관찰할 물리량", list(fields), key=f"field_{kind}")
    with b:
        idx = st.select_slider("관찰 시각", options=list(range(len(t))), value=len(t) // 2,
                               format_func=lambda i: f"t = {t[i]:.4f}", key=f"time_{kind}_{len(t)}")
    values = fields[field]
    reference = result["reference"].get(field)
    c1, c2, c3 = st.columns(3)
    c1.metric("관찰 시간", f"{t[idx]:.4f}")
    c2.metric("현재 최댓값", f"{np.max(values[idx]):.5g}")
    c3.metric("해석해 RMSE" if reference is not None else "현재 최솟값",
              f"{np.sqrt(np.mean((values[idx] - reference[idx])**2)):.3e}" if reference is not None else f"{np.min(values[idx]):.5g}")
    if result["x"] is None:
        series = {"수치해": values}
        if reference is not None:
            series["해석해"] = reference
        fig = line_figure(t, series, field + "의 시간 변화", ylabel=field)
        fig.add_vline(x=t[idx], line_dash="dot", line_color=COLORS[1])
        fig.add_trace(go.Scatter(x=[t[idx]], y=[values[idx]], mode="markers", marker=dict(size=11, color=COLORS[1]), name="현재 시각"))
        chart(fig, f"live_{kind}")
        if kind == "oscillator":
            q, v = fields["변위 q"], fields["속도 v"]
            fig = line_figure(q, {"위상 궤적": v}, "변위–속도 위상 공간", xlabel="변위 q", ylabel="속도 v", height=330)
            fig.add_trace(go.Scatter(x=[q[idx]], y=[v[idx]], mode="markers", marker=dict(size=12, color=COLORS[1]), name="현재 상태"))
            chart(fig, "phase")
            st.caption("닫힌 궤도는 반복 진동, 안쪽으로 감기는 궤도는 에너지 소산을 나타냅니다.")
    elif result["y"] is None:
        series = {"초기 상태": values[0], "수치해": values[idx]}
        if reference is not None:
            series["정확한 Riemann 해" if kind == "euler" else "해석해"] = reference[idx]
        fig = line_figure(result["x"], series, f"{field} · t={t[idx]:.4f}", "위치 x", field, 420)
        lo, hi, _ = field_range(values, field)
        pad = 0.06 * max(hi - lo, 1e-6)
        fig.update_yaxes(range=[lo - pad, hi + pad])
        chart(fig, f"live_{kind}")
        st.caption("초기 상태와 현재 상태를 같은 축으로 비교합니다. 축 범위는 전체 시간 동안 고정됩니다.")
        fig = go.Figure(go.Heatmap(x=result["x"], y=t, z=values, colorscale="Viridis", colorbar=dict(title=field)))
        fig.add_hline(y=t[idx], line_color="#ffffff", line_dash="dot")
        fig.update_layout(xaxis_title="위치 x", yaxis_title="시간 t")
        chart(style_figure(fig, "공간–시간 지도 · 이동은 기울어진 띠, 확산은 희미해지는 띠", 380), f"xt_{kind}")
        if kind == "euler":
            st.info("왼쪽 팽창파 → 중간 접촉면 → 오른쪽 충격파. 접촉면에서는 압력과 유속이 이어지지만 밀도가 뛰어오릅니다.")
    else:
        left, right = st.columns([2, 1])
        lo, hi, scale = field_range(values, field)
        with left:
            fig = go.Figure(go.Heatmap(x=result["x"], y=result["y"], z=values[idx], zmin=lo, zmax=hi,
                                      colorscale=scale, colorbar=dict(title=field)))
            if kind == "navier":
                arrow_color = "rgba(255,255,255,0.85)" if scale == "Viridis" else "rgba(27,46,68,0.72)"
                fig.add_trace(vector_trace(result["x"], result["y"], fields["x 속도 u"][idx], fields["y 속도 v"][idx], arrow_color))
            fig.update_layout(xaxis_title="x", yaxis_title="y")
            fig.update_yaxes(scaleanchor="x", scaleratio=1)
            chart(style_figure(fig, f"{field} · t={t[idx]:.4f}", 520), f"live_{kind}")
        with right:
            # Taylor–Green의 중앙선 와도는 0이므로 소용돌이 중심을 지나는 단면을 사용.
            mid = len(result["y"]) // (4 if kind == "navier" else 2)
            series = {"초기 단면": values[0, mid], "현재 단면": values[idx, mid]}
            if reference is not None:
                series["해석해 단면"] = reference[idx, mid]
            chart(line_figure(result["x"], series, f"y={result['y'][mid]:.3f} 단면", "x", field, 350), f"slice_{kind}")
            st.caption("색 범위는 전체 시간에 대해 고정되어 감소량을 비교할 수 있습니다. 화살표는 속도 방향이며 매 장면 크기를 정규화합니다.")
        if st.checkbox("3D 표면 보기", key=f"surface_{kind}"):
            fig = go.Figure(go.Surface(x=result["x"], y=result["y"], z=values[idx], colorscale=scale, cmin=lo, cmax=hi))
            fig.update_layout(scene=dict(xaxis_title="x", yaxis_title="y", zaxis_title=field, zaxis=dict(range=[lo, hi])))
            chart(style_figure(fig, "물리량의 높이로 보는 공간 분포", 500), f"3d_{kind}")
    if result["x"] is not None and st.checkbox("▶ 재생 가능한 애니메이션 열기", key=f"animate_{kind}"):
        render_animation(result, field)
    st.markdown("#### 물리량과 보존 진단")
    names = list(result["diag"])
    defaults = names[:2] if kind not in ("euler", "navier") else ["질량 수지 잔차", "에너지 수지 잔차"] if kind == "euler" else ["운동에너지"]
    picked = st.multiselect("진단 곡선", names, default=defaults, key=f"diag_{kind}")
    if picked:
        chart(line_figure(t, {name: result["diag"][name] for name in picked}, "시간에 따른 진단", ylabel="무차원 값", height=330), f"diagnostics_{kind}")
    captions = {
        "heat1d": "고정 온도 경계에서는 열이 영역 밖으로 나가므로 총열량이 감소합니다. 단열 경계에서는 총열량이 보존되어야 합니다.",
        "heat2d": "판 가장자리의 온도를 0으로 고정했으므로 열은 밖으로 빠져나갑니다.",
        "advection": "주기 경계의 총농도는 보존됩니다. Upwind에서는 D=0이어도 수치 확산으로 제곱 적분이 감소할 수 있습니다.",
        "burgers": "주기 경계에서 ∫u dx는 보존됩니다. 점성과 충격파를 위한 수치 소산은 ∫u²/2 dx를 감소시킵니다.",
        "wave": "연속 파동계의 에너지는 보존됩니다. 표시된 이산 에너지는 Verlet의 유한한 시간 간격 때문에 조금 진동할 수 있습니다.",
        "euler": "개방 경계에서는 영역의 운동량 등이 달라질 수 있습니다. 수지 잔차는 초기 적분값과 누적 경계 플럭스를 빼고 계산하므로 0에 가까워야 합니다.",
        "navier": "운동에너지 = 영역 평균 |u|²/2, 엔스트로피 = 영역 평균 ω²/2. 주기 영역에서 ν>0이면 둘 다 소산됩니다. Re는 초기 최대 속력과 영역 길이 1을 기준으로 합니다.",
    }
    if kind in captions:
        st.caption(captions[kind])
    render_export(result, field, idx)
    return field, idx


def render_animation(result, field):
    x, y, t, values = result["x"], result["y"], result["t"], result["fields"][field]
    # 브라우저 전송량을 제한하고, 최종 시각은 반드시 포함.
    indices = np.unique(np.r_[np.linspace(0, len(t) - 1, min(41, len(t))).astype(int), len(t) - 1])
    lo, hi, scale = field_range(values, field)
    def trace(i):
        if y is None:
            return go.Scatter(x=x, y=values[i], mode="lines", line=dict(color=COLORS[0], width=3))
        return go.Heatmap(x=x, y=y, z=values[i], zmin=lo, zmax=hi, colorscale=scale, colorbar=dict(title=field))
    fig = go.Figure(data=[trace(0)], frames=[go.Frame(data=[trace(i)], name=str(i),
                         layout=go.Layout(title_text=f"{field} · t={t[i]:.4f}")) for i in indices])
    if y is None:
        padding = max((hi - lo) * 0.08, 1e-5)
        fig.update_yaxes(range=[lo - padding, hi + padding])
    else:
        fig.update_yaxes(scaleanchor="x", scaleratio=1)
    fig.update_layout(updatemenus=[dict(type="buttons", direction="left", x=0, y=1.2,
        buttons=[dict(label="▶ 재생", method="animate", args=[None, {"frame": {"duration": 90, "redraw": y is not None}, "transition": {"duration": 0}, "fromcurrent": True}]),
                 dict(label="Ⅱ 일시정지", method="animate", args=[[None], {"mode": "immediate", "frame": {"duration": 0, "redraw": False}, "transition": {"duration": 0}}])])],
        sliders=[dict(currentvalue=dict(prefix="장면 "), steps=[dict(label=f"{t[i]:.2f}", method="animate",
                      args=[[str(i)], {"mode": "immediate", "frame": {"duration": 0, "redraw": y is not None}, "transition": {"duration": 0}}]) for i in indices])])
    chart(style_figure(fig, f"{field} · 재생", 500), f"animation_{result['config']['kind']}")
    st.caption("재생 속도는 시각화를 위한 속도입니다. 내부 Δt와 저장 장면 간격은 별도로 표시됩니다.")


def render_export(result, field, idx):
    with st.expander("현재 장면과 계산 설정 다운로드"):
        buf = io.StringIO()
        writer = csv.writer(buf)
        values = result["fields"][field]
        if result["x"] is None:
            writer.writerow(["time", field])
            writer.writerows(zip(result["t"], values))
        elif result["y"] is None:
            writer.writerow(["time", "x", field])
            writer.writerows((result["t"][idx], x, val) for x, val in zip(result["x"], values[idx]))
        else:
            writer.writerow(["time", "x", "y", field])
            writer.writerows((result["t"][idx], x, y, values[idx, j, i]) for j, y in enumerate(result["y"]) for i, x in enumerate(result["x"]))
        c1, c2, c3 = st.columns(3)
        c1.download_button("장면 CSV", data=("\ufeff" + buf.getvalue()).encode("utf-8"), file_name=f"{result['config']['kind']}_snapshot.csv", mime="text/csv")
        c2.download_button("설정 JSON", data=json.dumps(result["config"], ensure_ascii=False, indent=2), file_name="simulation_config.json", mime="application/json")
        arrays = dict(time=result["t"], **{f"field_{i}": a for i, a in enumerate(result["fields"].values())})
        arrays["field_names"] = np.array(list(result["fields"]))
        if result["x"] is not None:
            arrays["x"] = result["x"]
        if result["y"] is not None:
            arrays["y"] = result["y"]
        for i, (name, vals) in enumerate(result["diag"].items()):
            arrays[f"diagnostic_{i}"] = vals
        arrays["diagnostic_names"] = np.array(list(result["diag"]))
        arrays["config_json"] = np.array(json.dumps(result["config"], ensure_ascii=False))
        binary = io.BytesIO()
        np.savez_compressed(binary, **arrays)
        c3.download_button("전체 시간 결과 NPZ", data=binary.getvalue(), file_name=f"{result['config']['kind']}_all.npz", mime="application/octet-stream")
        st.caption("NPZ의 field_names / diagnostic_names 순서가 field_0, diagnostic_0 등의 배열 번호에 대응합니다. NumPy의 np.load로 읽을 수 있습니다.")


def render_equation(result, kind):
    lab, p = LABS[kind], result["config"]
    st.markdown("#### 항을 물리적 동작으로 읽기")
    columns = st.columns(3)
    for col, (title, text) in zip(columns, lab["terms"]):
        with col:
            st.markdown(f"**{title}**")
            st.write(text)
    st.info(lab["question"])
    st.markdown("#### 1차와 2차 미분의 역할")
    st.markdown("- **1차 시간미분**: 지금 얼마나 빨리 변하는지 나타냅니다.\n- **2차 시간미분**: 변화율의 변화, 즉 가속도를 나타냅니다.\n- **1차 공간미분**: 위치에 따른 기울기입니다. 이류와 압력에 의한 힘에 등장합니다.\n- **2차 공간미분**: 기울기의 변화인 곡률입니다. 열·농도·운동량의 확산에 등장합니다.")
    if kind == "cooling":
        st.latex(r"T(t)=T_\infty+(T_0-T_\infty)e^{-kt},\qquad N(t)=\frac{K}{1+(K/N_0-1)e^{-rt}}")
        st.write("냉각은 안정된 평형에 접근하며, 로지스틱 성장은 수용량에 접근합니다. 두 모형 모두 공간을 해상하지 않는 집중계 모형입니다.")
    elif kind == "oscillator":
        st.latex(r"\dot q=v,\qquad \dot v=-2\zeta\omega_0v-\omega_0^2q")
        st.write("ζ<1은 감쇠 진동, ζ=1은 임계 감쇠, ζ>1은 과감쇠입니다. 질량을 1로 두어 에너지를 (v²+ω₀²q²)/2로 표시합니다.")
    elif kind in ("heat1d", "heat2d"):
        st.latex(r"\mathbf j=-\alpha\nabla T,\qquad T_t=-\nabla\cdot\mathbf j")
        st.write("열유속은 높은 온도에서 낮은 온도로 향합니다. 한 격자에 들어오는 열과 나가는 열의 차이가 온도의 시간 변화입니다. 밀도와 비열 등의 상수는 무차원화에 포함했습니다.")
    elif kind == "wave":
        st.latex(r"q_t=v,\qquad v_t=c^2q_{xx}")
        st.write("초기 변위뿐 아니라 초기 속도도 필요합니다. 여기서는 초기 속도를 0으로 두었으므로 봉우리가 양방향으로 나뉩니다. 고정 끝에서는 변위가 항상 0입니다.")
    elif kind == "advection":
        st.latex(r"c_t+J_x=0,\qquad J=ac-Dc_x")
        st.write("운반 플럭스 ac와 확산 플럭스 −Dcₓ의 차이로 농도가 변합니다. Upwind의 퍼짐에는 격자에 따른 수치 확산도 포함되므로 물리 계수 D와 구별해야 합니다.")
    elif kind == "burgers":
        st.latex(r"u_t+u u_x=\nu u_{xx}\quad\Longleftrightarrow\quad u_t+(u^2/2)_x=\nu u_{xx}")
        st.write("매끄러운 영역에서는 두 식이 같지만 충격파가 생기면 보존형이 중요합니다. Burgers는 유체의 비선형 운반과 점성을 공부하는 모형이며 압력과 밀도 방정식은 포함하지 않습니다.")
    elif kind == "euler":
        st.latex(r"\partial_t\begin{pmatrix}\rho\\\rho u\\E\end{pmatrix}+\partial_x\begin{pmatrix}\rho u\\\rho u^2+p\\u(E+p)\end{pmatrix}=0")
        st.latex(r"p=(\gamma-1)(E-\rho u^2/2),\qquad c=\sqrt{\gamma p/\rho},\qquad\lambda=u-c,\ u,\ u+c")
        st.write("이상기체 상태방정식으로 압력을 닫습니다. 음속 c에 대한 상대속도로 압축성 파동이 전파되고, 접촉면은 유체의 속도 u로 움직입니다. 정확한 Riemann 해는 반무한 충격관 문제의 해입니다. 계산 종료 시간은 파동이 경계에 도달하기 전 범위로 제한했습니다.")
    elif kind == "navier":
        st.latex(r"\omega=v_x-u_y,\quad-\nabla^2\psi=\omega,\quad u=\psi_y,\quad v=-\psi_x")
        st.latex(r"\omega_t+u\omega_x+v\omega_y=\nu\nabla^2\omega")
        st.latex(r"\nabla^2p=-\sum_{i,j}(\partial_i u_j)(\partial_j u_i),\qquad\langle p\rangle=0")
        st.write("와도 방정식을 적분하고 Poisson 방정식으로 유선함수와 속도를 복원합니다. 이 표현은 발산이 0인 속도장을 구성합니다. 압력은 속도장에서 복원한 운동학적 압력 p/ρ이며, 기준 평균을 0으로 정합니다.")
        st.write("이 실험은 밀도 일정, 외력 없음, 정사각형 주기 영역이라는 가정의 2D 유동입니다. 벽면 경계층, 3D 난류, 압축성 점성 유동까지 포함하는 범용 CFD 해석기는 아닙니다. ν=0이면 같은 조건의 비압축성 Euler 방정식입니다.")
        if p["initial"] == "taylor":
            st.latex(r"\omega(t)=\omega(0)e^{-8\pi^2\nu t},\qquad K(t)=K(0)e^{-16\pi^2\nu t}")
            st.write("Taylor–Green은 비선형 와도 운반항이 상쇄되는 검증용 해입니다. 비선형 상호작용은 '교란 소용돌이'에서 관찰하세요.")
    with st.expander("초기조건·경계조건·단위"):
        st.write("모든 축과 계수는 무차원입니다. PDE 영역 길이는 각 방향 1이며, 실제 SI 단위로 해석하려면 별도의 길이·시간·온도·밀도 기준값을 정해야 합니다.")
        st.json({k: p[k] for k in ("initial", "boundary", "n", "end")})
        st.write("주기 격자는 [0,1)로 끝점을 중복하지 않습니다. 고정 경계의 유한차분 격자는 양끝을 포함합니다. Euler의 유한체적법은 셀 중심 값을 표시합니다.")


def render_stencil(result, field, idx):
    p, kind, x = result["config"], result["config"]["kind"], result["x"]
    st.markdown("#### 한 격자에서 계산되는 미분")
    if x is None:
        if kind == "oscillator":
            q, v = result["fields"]["변위 q"][idx], result["fields"]["속도 v"][idx]
            damping, spring = -2 * p["zeta"] * p["omega"] * v, -p["omega"]**2 * q
            st.latex(r"v=\dot q,\qquad a=\dot v=\underbrace{-2\zeta\omega_0v}_{\text{감쇠}}+\underbrace{-\omega_0^2q}_{\text{복원력}}")
            st.table({"항": ["감쇠에 의한 가속도", "복원력에 의한 가속도", "총가속도"], "값": [damping, spring, damping + spring]})
        else:
            val = result["fields"][field][idx]
            rhs = p["rate"] * val * (1 - val / p["capacity"]) if p["initial"] == "logistic" else -p["rate"] * (val - p["ambient"])
            st.latex(r"y^{n+1}=y^n+\Delta t\,f(y^n)")
            st.write(f"현재 y={val:.5f}, 변화율 f(y)={rhs:.5f}. Δt={p['dt']:.4f}를 쓰는 전진 Euler 한 걸음의 예측값은 {val + p['dt'] * rhs:.5f}입니다.")
            st.caption("위 값은 Euler 한 걸음의 설명입니다. 실제 선택한 적분법과 출력 시각에 맞추어 줄어든 Δt는 별도 적용됩니다.")
        return
    n, dx = len(x), result["meta"]["dx"]
    i = st.slider("관찰할 x 격자 번호 i", 1, n - 2, n // 2, key=f"stencil_x_{kind}_{n}")
    vals = result["fields"][field][idx]
    if result["y"] is not None:
        j = st.slider("관찰할 y 격자 번호 j", 1, n - 2, n // 2, key=f"stencil_y_{kind}_{n}")
        center = vals[j, i]
        dxx = (vals[j, i+1] - 2 * center + vals[j, i-1]) / dx**2
        dyy = (vals[j+1, i] - 2 * center + vals[j-1, i]) / dx**2
        cross = np.full((3, 3), np.nan)
        cross[1] = vals[j, i-1:i+2]
        cross[:, 1] = vals[j-1:j+2, i]
        text = [["" if np.isnan(a) else f"{a:.4f}" for a in row] for row in cross]
        fig = go.Figure(go.Heatmap(z=cross, text=text, texttemplate="%{text}", colorscale="Viridis", showscale=False,
                                  x=["i−1", "i", "i+1"], y=["j−1", "j", "j+1"]))
        chart(style_figure(fig, "5점 라플라시안 격자", 290), f"stencil2d_{kind}")
        st.latex(r"\nabla^2 f_{i,j}\approx\frac{f_{i+1,j}+f_{i-1,j}+f_{i,j+1}+f_{i,j-1}-4f_{i,j}}{\Delta x^2}")
        st.table({"항": ["x 곡률", "y 곡률", "라플라시안"], "값": [dxx, dyy, dxx + dyy]})
        if kind == "heat2d":
            st.write(f"온도 변화율 α∇²T ≈ {p['alpha'] * (dxx + dyy):.5f}")
        else:
            st.caption("이 표는 미분의 의미를 보여 주는 유한차분 근사입니다. 실제 Navier–Stokes 적분은 Fourier 공간에서 미분하므로 값이 조금 다를 수 있습니다.")
    else:
        prev, center, nxt = vals[i-1:i+2]
        first, second = (nxt - prev) / (2 * dx), (nxt - 2 * center + prev) / dx**2
        fig = go.Figure(go.Scatter(x=x[i-1:i+2], y=[prev, center, nxt], mode="lines+markers+text",
                                  text=[f"{v:.4f}" for v in (prev, center, nxt)], textposition="top center",
                                  marker=dict(size=[10, 17, 10], color=[COLORS[0], COLORS[1], COLORS[0]])))
        fig.update_layout(xaxis_title="x", yaxis_title=field)
        chart(style_figure(fig, "중앙과 두 이웃", 300), f"stencil1d_{kind}")
        st.latex(r"f_x\approx\frac{f_{i+1}-f_{i-1}}{2\Delta x},\qquad f_{xx}\approx\frac{f_{i+1}-2f_i+f_{i-1}}{\Delta x^2}")
        st.table({"미분": ["1차 공간미분 · 기울기", "2차 공간미분 · 곡률"], "값": [first, second]})
        if kind == "heat1d":
            st.write(f"Tₜ = αTₓₓ ≈ {p['alpha'] * second:.5f}. 곡률이 양수이면 온도가 올라가고 음수이면 내려갑니다.")
        elif kind == "advection":
            st.table({"변화율 기여": ["이류 −a·cₓ", "확산 D·cₓₓ", "합계"], "값": [-p["speed"] * first, p["diffusion"] * second, -p["speed"] * first + p["diffusion"] * second]})
        elif kind == "wave":
            q = result["fields"]["변위 q"][idx]
            curvature = (q[i+1] - 2 * q[i] + q[i-1]) / dx**2
            st.write(f"변위 곡률에 의한 가속도 qₜₜ = c²qₓₓ ≈ {p['speed']**2 * curvature:.5f}.")
        elif kind == "burgers":
            st.table({"변화율 기여": ["비선형 이류 −u·uₓ", "점성 ν·uₓₓ"], "값": [-center * first, p["nu"] * second]})
        if kind in ("advection", "burgers", "euler"):
            st.caption("이 표의 중앙차분은 기울기·곡률을 해석하기 위한 값입니다. 실제 업데이트는 선택한 Upwind 또는 셀 경계의 수치 플럭스를 사용합니다.")


def render_numerics(result, field, idx):
    p, meta, kind = result["config"], result["meta"], result["config"]["kind"]
    st.markdown("#### 연속 방정식 → 공간 격자 → 시간 적분")
    if kind not in ("cooling", "oscillator"):
        st.latex(r"x_i=i\Delta x,\quad t^n=n\Delta t,\quad f_i^n\approx f(x_i,t^n)")
        st.latex(r"\frac{d\mathbf f}{dt}=\mathbf R(\mathbf f)\quad\Longrightarrow\quad\mathbf f^{n+1}=\mathbf f^n+\Delta t\,\mathbf R(\mathbf f^n)")
        st.write("공간을 먼저 이산화하면 각 격자점의 값이 서로 연결된 ODE가 됩니다. 그 ODE를 시간 적분합니다. 위 업데이트는 전진 Euler의 예이며 고차 방법은 한 걸음에서 여러 변화율을 조합합니다.")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Δx", f"{meta['dx']:.5f}" if meta["dx"] else "공간 없음")
    c2.metric("실제 최대 내부 Δt", f"{meta['dt_max']:.3e}")
    c3.metric("내부 적분 횟수", f"{meta['steps']:,}")
    c4.metric("출력 장면 간격", f"{result['t'][1] - result['t'][0]:.4g}")
    st.caption(f"수치 기법: {meta['scheme']} · 출력 시각에 정확히 도달하기 위해 일부 내부 Δt를 줄입니다. 최소 내부 Δt={meta['dt_min']:.3e}.")
    if kind in ("heat1d", "heat2d"):
        limit = 0.5 if kind == "heat1d" else 0.25
        st.latex(r"Fo=\alpha\Delta t/\Delta x^2,\quad Fo\leq 1/2\ (1D),\quad Fo_x+Fo_y\leq 1/2\ (2D)")
        st.write(f"실제 최대 Fourier 수 Fo={meta['fourier']:.4f}. 등간격 2D에서는 방향별 Fo≤0.25가 필요합니다.")
        if p["method"] in ("implicit", "cn"):
            st.success("선택한 암시적 열전도 기법은 선형 안정성 관점에서 이 제한을 받지 않습니다. 큰 Δt에서는 시간 정확도가 낮아지고 Crank–Nicolson은 날카로운 초기조건에서 진동할 수 있습니다.")
        elif meta["fourier"] > limit + 1e-10:
            st.warning("명시적 열전도의 안정 한계를 넘었습니다. 값의 진동과 증가를 관찰한 뒤 배율을 낮춰 비교하세요.")
        if kind == "heat1d":
            st.latex(r"T_i^{n+1}=T_i^n+Fo(T_{i+1}^n-2T_i^n+T_{i-1}^n)")
            st.latex(r"(I-\theta\alpha\Delta tL)T^{n+1}=(I+(1-\theta)\alpha\Delta tL)T^n")
            st.caption("L은 이산 라플라시안, θ=1은 Backward Euler, θ=1/2은 Crank–Nicolson입니다. 단열 경계는 거울 ghost 값을 사용합니다.")
            with st.expander("안정성 직접 실험 · 작은 격자 교란은 줄어들까, 커질까?"):
                render_stability_demo(p["cfl"] / 2)
    elif kind == "advection":
        st.latex(r"C=|a|\Delta t/\Delta x,\quad r=D\Delta t/\Delta x^2,\quad C+2r\leq1\quad\text{(Upwind)}")
        st.write(f"보수적으로 선택한 내부 간격: C={meta['courant']:.4f}, r={meta['fourier']:.4f}.")
        st.latex(r"c_i^{n+1}=c_i^n-C(c_i^n-c_{i-1}^n)+r(c_{i+1}^n-2c_i^n+c_{i-1}^n)\quad(a>0)")
        st.caption("Lax–Wendroff에는 중앙 이류와 C²/2의 보정항을 사용합니다. 현재 Δt 제약은 두 방법에 보수적으로 적용하며 급격한 펄스에서는 고차 방법의 과대·과소 진동이 나타날 수 있습니다.")
    elif kind == "wave":
        st.latex(r"C=c\Delta t/\Delta x\leq1")
        st.latex(r"v^{n+1/2}=v^n+\tfrac12\Delta t\,c^2Lq^n,\quad q^{n+1}=q^n+\Delta t\,v^{n+1/2}")
        st.write(f"Velocity Verlet으로 위치와 속도를 갱신합니다. 실제 최대 C={meta['courant']:.4f}.")
    elif kind in ("euler", "burgers"):
        st.latex(r"U_i^{n+1}=U_i^n-\frac{\Delta t}{\Delta x}(\widehat F_{i+1/2}-\widehat F_{i-1/2})")
        st.latex(r"\widehat F=\frac{F(U_L)+F(U_R)}2-\frac{s_{\max}}2(U_R-U_L)")
        st.write("유한체적법은 셀 안의 평균량을 보존합니다. 공통 경계의 플럭스는 한 셀에서는 나가고 이웃에서는 들어오므로 내부 교환이 상쇄됩니다. MUSCL은 minmod 제한자로 좌우 상태를 재구성하고 SSP-RK2로 시간 적분합니다.")
        if kind == "euler":
            st.latex(r"\Delta t\leq\mathrm{CFL}\frac{\Delta x}{\max(|u|+c)}")
        else:
            st.latex(r"\Delta t\leq\mathrm{CFL}\left(\max|u|/\Delta x+2\nu/\Delta x^2\right)^{-1}")
        st.caption("불연속 주변에서는 제한자 때문에 고차 방법도 국소적으로 1차가 됩니다. 수치 소산은 ν=0에서도 존재합니다.")
    elif kind == "navier":
        st.latex(r"\widehat{\partial_x f}=ik_x\hat f,\quad\widehat{\nabla^2f}=-|\mathbf k|^2\hat f,\quad\hat\psi=\hat\omega/|\mathbf k|^2")
        st.write("주기 격자에서 FFT로 공간미분과 Poisson 해를 구합니다. 비선형 곱의 가짜 고주파 성분을 줄이기 위해 각 방향의 모드 |m|<N/3만 유지하고 SSP-RK3로 시간 적분합니다. 평균 와도와 평균 속도는 0인 초기조건을 사용합니다.")
        st.latex(r"\Delta t=\frac{\mathrm{CFL}}{\max|u|\,k_{x,\max}+\max|v|\,k_{y,\max}+\nu|\mathbf k|_{\max}^2}")
        st.write(f"초기 속력 기준 Re = {meta['reynolds']:.4g}. 공간 이산화는 주기 Fourier 방법이므로 벽의 미끄럼 없음 조건은 적용하지 않습니다.")
    else:
        st.latex(r"k_1=f(y_n),\quad k_2=f(y_n+\Delta t k_1/2),\quad k_3=f(y_n+\Delta t k_2/2),\quad k_4=f(y_n+\Delta t k_3)")
        st.latex(r"y_{n+1}=y_n+\Delta t(k_1+2k_2+2k_3+k_4)/6")
        st.write("RK4는 매끄러운 해에서 시간 4차 정확도를 갖습니다. 전진 Euler는 1차이며 진동계에서는 에너지를 인위적으로 증가시킬 수 있습니다.")
    render_stencil(result, field, idx)


def render_stability_demo(default_fo=0.425):
    """FTCS 고주파 격자 모드의 증폭을 전체 PDE 계산과 독립적으로 관찰."""
    fo = st.slider("작은 안정성 실험의 Fourier 수 Fo", 0.1, 0.8,
                   value=float(np.clip(round(default_fo, 2), 0.1, 0.8)), step=0.01, key="stability_demo_fo")
    n = 25
    x = np.linspace(0, 1, n)
    low = np.sin(np.pi * x)
    perturbation = 1e-6 * np.sin((n - 2) * np.pi * x)
    u = low + perturbation
    noise_norm = [np.max(abs(perturbation))]
    g1 = 1 - 4 * fo * np.sin(np.pi / (2 * (n - 1)))**2
    for step in range(1, 41):
        u[1:-1] += fo * (u[2:] - 2 * u[1:-1] + u[:-2])
        u[[0, -1]] = 0
        noise_norm.append(float(np.max(abs(u - g1**step * low))))
    amplification = 1 - 4 * fo * np.sin((n - 2) * np.pi / (2 * (n - 1)))**2
    st.latex(r"G(k)=1-4Fo\sin^2(k\Delta x/2),\qquad|G|\leq1\ \Rightarrow\ \text{교란 감소}")
    st.write(f"초기 온도에 10⁻⁶ 크기의 짧은 파장 교란을 더했습니다. 이 모드의 증폭률 G={amplification:.3f}, |G|={abs(amplification):.3f}입니다.")
    fig = line_figure(np.arange(41), {"작은 교란의 크기": noise_norm}, "40번 갱신하면서 교란을 추적", "내부 시간 걸음 번호", "교란 크기", 310)
    fig.update_yaxes(type="log")
    chart(fig, "stability_growth")
    chart(line_figure(x, {"초기 온도": low + perturbation, "40걸음 후": u}, "안정한 확산 또는 격자 진동의 성장", "x", "온도", 310), "stability_profile")
    st.caption("이 실험은 25점 고정 경계의 별도 FTCS 계산입니다. 낮은 주파수의 이산 감쇠 해를 빼고 교란을 추적합니다. Fo가 0.5를 넘으면 짧은 파장의 수치 잡음이 증폭될 수 있습니다.")


def render_comparison(result, field, idx, cached_simulate):
    p, kind = result["config"], result["config"]["kind"]
    st.markdown("#### 한 변수만 바꾸는 비교 실험")
    choices = ["시간 간격 / 안정 배율을 절반으로"]
    if kind in ("heat1d", "heat2d"):
        choices += ["열확산계수를 2배로"]
    if kind in ("burgers", "navier"):
        choices += ["점성을 0으로", "점성을 2배로"]
    methods = {"cooling": ("euler", "rk4"), "oscillator": ("euler", "rk4"),
               "heat1d": ("explicit", "cn"), "advection": ("upwind", "lw"),
               "burgers": ("rusanov", "muscl"), "euler": ("rusanov", "muscl")}
    if kind in methods:
        choices += ["수치 기법 바꾸기"]
    if kind == "advection":
        choices += ["물리적 확산을 0으로", "유속 방향 바꾸기"]
    choice = st.selectbox("비교 조건", choices, key=f"compare_choice_{kind}")
    if st.button("비교 실험 계산", key=f"compare_run_{kind}", type="primary"):
        other = p.copy()
        if choice.startswith("시간"):
            key = "dt" if kind in ("cooling", "oscillator") else "cfl"
            other[key] *= 0.5
        elif choice.startswith("열확산"):
            other["alpha"] *= 2
        elif choice == "점성을 0으로":
            other["nu"] = 0.0
        elif choice == "점성을 2배로":
            other["nu"] *= 2
        elif choice == "수치 기법 바꾸기":
            ma, mb = methods[kind]
            other["method"] = mb if p["method"] == ma else ma
        elif choice == "물리적 확산을 0으로":
            other["diffusion"] = 0.0
        else:
            other["speed"] *= -1
        try:
            with st.spinner("비교 조건 적분 중…"):
                second = cached_simulate(other)
            st.session_state[f"compare_result_{kind}"] = dict(base=p.copy(), result=second, choice=choice)
        except ValueError as exc:
            st.error(str(exc))
    saved = st.session_state.get(f"compare_result_{kind}")
    if saved and saved["base"] == p:
        other = saved["result"]
        base_vals, other_vals = result["fields"][field], other["fields"][field]
        st.caption(f"적용된 비교: {saved['choice']} · 동일한 초기조건·관찰 시간 t={result['t'][idx]:.4f}")
        if result["x"] is None:
            fig = line_figure(result["t"], {"기준": base_vals, "비교": other_vals}, "시간 궤적 비교", ylabel=field)
        elif result["y"] is None:
            series = {"기준": base_vals[idx], "비교": other_vals[idx]}
            if field in result["reference"]:
                series["기준 조건 해석해"] = result["reference"][field][idx]
            fig = line_figure(result["x"], series, "동일 시각의 공간 분포", "x", field)
        else:
            mid = len(result["y"]) // (4 if kind == "navier" else 2)
            fig = line_figure(result["x"], {"기준 단면": base_vals[idx, mid], "비교 단면": other_vals[idx, mid]}, f"y={result['y'][mid]:.3f} 단면 비교", "x", field)
        chart(fig, f"compare_plot_{kind}")
        if result["x"] is not None and result["y"] is not None:
            diff = other_vals[idx] - base_vals[idx]
            lim = max(float(abs(diff).max()), 1e-12)
            fig = go.Figure(go.Heatmap(x=result["x"], y=result["y"], z=diff, zmin=-lim, zmax=lim, colorscale="RdBu_r"))
            fig.update_yaxes(scaleanchor="x")
            chart(style_figure(fig, "비교 − 기준 · 공간 차이", 390), f"compare_diff_{kind}")
        shared = list(result["diag"])
        diagnostic = st.selectbox("두 조건의 진단 비교", shared, key=f"compare_diag_{kind}")
        chart(line_figure(result["t"], {"기준": result["diag"][diagnostic], "비교": other["diag"][diagnostic]}, diagnostic, height=300), f"compare_diagnostics_{kind}")
    else:
        st.caption("비교를 계산하면 현재 관찰 시각에 맞춘 두 결과를 보여 줍니다. 기준 설정을 변경하면 다시 계산하세요.")
    st.markdown("#### 격자·시간 간격과 정확도")
    st.write("안정성은 값이 폭발하지 않는 조건이며, 정확성은 실제 해에 얼마나 가까운가입니다. 안정하더라도 거친 격자는 수치 확산이나 위상 오차를 만들 수 있습니다.")
    if kind == "burgers":
        st.info("Burgers 실험은 충격 전선과 수치 소산을 비교합니다. 여기서는 닫힌형 해석해를 제공하지 않으므로 위의 수치 기법 비교와 보존 진단을 사용하세요.")
        return
    if st.button("해석해로 수렴 실험 계산", key=f"convergence_run_{kind}"):
        try:
            rows = convergence_study(p, cached_simulate)
            st.session_state[f"convergence_{kind}"] = dict(base=p.copy(), rows=rows)
        except ValueError as exc:
            st.error(str(exc))
    saved_conv = st.session_state.get(f"convergence_{kind}")
    if saved_conv and saved_conv["base"] == p:
        rows = saved_conv["rows"]
        st.table(rows)
        fig = line_figure([r["간격 h"] for r in rows], {"RMSE": [r["RMSE"] for r in rows]}, "간격을 줄이면 오차가 줄어드는가?", "h (Δt 또는 Δx)", "RMSE", 340)
        fig.update_xaxes(type="log", autorange="reversed")
        fig.update_yaxes(type="log")
        chart(fig, f"convergence_chart_{kind}")
        st.caption("같은 종료 시각의 연속 해석해에 대한 RMSE입니다. 공간 수렴 실험에서는 자동 Δt도 함께 줄어듭니다. 표시된 차수는 공간·시간 오차가 함께 만든 관측값입니다. 불연속 Euler 해의 점별 비교는 셀 평균 오차와 다를 수 있습니다.")


def convergence_study(p, solver=simulate):
    kind = p["kind"]
    q = p.copy()
    q["frames"] = 3
    q["cfl"] = min(q["cfl"], 0.75)
    if kind == "heat1d":
        q.update(initial="sine", boundary="fixed")
    elif kind in ("advection", "wave", "heat2d"):
        q["initial"] = "sine"
    elif kind == "navier":
        q["initial"] = "taylor"
    elif kind == "burgers":
        raise ValueError("Burgers 충격파에는 일반적인 닫힌형 해가 없습니다. 이 실험에서는 수치 기법·격자 변경과 보존 진단으로 비교하세요.")
    if kind in ("cooling", "oscillator"):
        sizes = [p["dt"], p["dt"] / 2, p["dt"] / 4]
        key = "dt"
    else:
        key = "n"
        sizes = [24, 36, 48] if kind == "navier" else [21, 41, 81] if kind == "heat2d" else [80, 160, 320] if kind == "euler" else [41, 81, 161]
    rows = []
    for size in sizes:
        q[key] = size
        r = solver(q)
        name = next(iter(r["reference"]))
        error = float(np.sqrt(np.mean((r["fields"][name][-1] - r["reference"][name][-1])**2)))
        h = size if key == "dt" else r["meta"]["dx"]
        order = "—"
        if rows and error > 1e-15 and rows[-1]["RMSE"] > 1e-15:
            order = f"{math.log(rows[-1]['RMSE'] / error) / math.log(rows[-1]['간격 h'] / h):.2f}"
        rows.append({"Δt 또는 격자 수": size, "간격 h": h, "RMSE": error, "관측 차수": order})
    return rows


def render_guide(kind):
    st.markdown("#### 권장 학습 경로")
    st.table({"단계": ["1. 변화율", "2. 관성과 곡률", "3. 공간 운반", "4. 비선형 보존", "5. 유체의 연결"],
              "실험": ["냉각·성장 ODE", "스프링 → 열전도 → 파동", "이류·확산 → 2D 열전도", "Burgers → Euler 충격관", "2D Navier–Stokes"],
              "질문": ["현재 값으로 다음 값을 어떻게 예측할까?", "같은 2차 미분이 왜 다른 거동을 만들까?", "이동과 퍼짐을 어떻게 구별할까?", "파형이 왜 가파르게 되고 충격파가 생길까?", "압력·비압축성·점성은 어떻게 결합할까?"]})
    st.markdown("#### 지금 실험에서 해볼 일")
    for i, task in enumerate(LABS[kind]["tasks"], 1):
        st.write(f"{i}. {task}")
    st.markdown("#### Euler에서 Navier–Stokes까지")
    st.latex(r"\rho_t+\nabla\cdot(\rho\mathbf u)=0")
    st.latex(r"\rho(\mathbf u_t+\mathbf u\cdot\nabla\mathbf u)=-\nabla p+\nabla\cdot\boldsymbol\tau")
    st.write("질량 보존에 운동량 보존을 연결하고 점성 응력 τ를 포함하면 Navier–Stokes의 출발점이 됩니다. 압축성 유동에는 에너지와 상태방정식도 필요합니다. 여기서는 1D 압축성 비점성 Euler와 2D 비압축성 점성 Navier–Stokes를 각각 계산합니다.")
    st.write("밀도 일정인 비압축성 유동에서 질량 보존은 ∇·u=0이 됩니다. 이때 압력은 독립된 열역학 상태값보다 속도장의 발산을 제한하는 역할을 하며, 열전도의 확산 항은 운동량의 점성 항과 같은 라플라시안 구조를 가집니다.")
    st.markdown("#### 방정식 형태 비교")
    st.table({"방정식": ["냉각 ODE", "진동 ODE", "열전도", "이류", "파동", "Burgers", "압축성 Euler", "비압축성 Navier–Stokes"],
              "시간 / 공간 최고 미분": ["1 / 없음", "2 / 없음", "1 / 2", "1 / 1", "2 / 2", "1 / 2 (ν>0)", "1 / 1", "1 / 2 (ν>0)"],
              "관찰 거동": ["평형 접근", "관성·진동·감쇠", "퍼짐·평탄화", "이동", "양방향 전파·반사", "급경사·충격·소산", "팽창파·접촉면·충격파", "와도 운반·점성 소산"],
              "대표 분류": ["상미분", "상미분", "포물형", "쌍곡형", "쌍곡형", "점성에 따라 변화", "쌍곡형 보존계", "운반·확산 + 타원형 압력 제약"]})
    st.markdown("#### 참고 자료")
    st.markdown("- [Clawpack — 압축성 Euler 방정식과 Riemann 문제](https://www.clawpack.org/riemann_book/html/Euler.html)\n- [Clawpack — 유한체적법과 근사 Riemann 해법 비교](https://www.clawpack.org/riemann_book/html/FV_compare.html)\n- [MIT 18.336 — PDE 수치해법과 주기 Navier–Stokes 예제](https://math.mit.edu/classes/18.336/index.html)\n- [Streamlit — 실행과 대시보드 안내](https://docs.streamlit.io/get-started/tutorials/create-an-app)")


def run_app():
    global st, go
    try:
        import streamlit as st_module
        import plotly.graph_objects as go_module
    except ImportError:
        print("필요 패키지 설치: python3 -m pip install streamlit plotly numpy", file=sys.stderr)
        raise SystemExit(1)
    st, go = st_module, go_module
    st.set_page_config(page_title="PDE Lab · 미분방정식 물리 실험실", page_icon="🌊", layout="wide")
    st.markdown("""<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
    html, body, .stApp, [data-testid="stMarkdownContainer"], label, p, h1, h2, h3, h4 {font-family: 'Noto Sans KR', sans-serif;}
    .stApp {background: #f4f7fa; color: #223349;}
    .block-container {padding-top: 4.5rem; padding-bottom: 3rem; max-width: 1480px;}
    section[data-testid="stSidebar"] {background: #eaf0f5; border-right: 1px solid #dde5ec;}
    [data-testid="stMetric"] {background: white; padding: 16px 20px; border-radius: 12px; border: 1px solid #e3eaf0;}
    [data-testid="stMetricValue"] {font-size: 1.65rem; color: #087f8c;}
    .hero {padding: 28px 32px; border-radius: 18px; background: linear-gradient(115deg,#16344b,#086e79); color: white; margin-bottom: 22px;}
    .hero .eyebrow {font-size: 12px; letter-spacing: 2px; color: #a5e0dd; margin-bottom: 8px;}
    .hero h1 {font-size: 31px; margin: 0 0 8px; color: white; font-weight: 700;}
    .hero p {font-size: 14px; margin: 0; color: #d5e7ed; line-height: 1.8;}
    .tag {display: inline-block; padding: 5px 12px; background: #e0f1f0; color: #086e79; border-radius: 20px; font-size: 12px; margin-bottom: 8px;}
    button[data-baseweb="tab"] {font-weight: 600; padding: 12px 18px;}
    [data-testid="stPlotlyChart"] {background: white; border: 1px solid #e3eaf0; border-radius: 14px; padding: 6px;}
    h3, h4 {color: #20384f;}
    </style>""", unsafe_allow_html=True)
    st.sidebar.markdown("### 🌊 PDE Lab")
    st.sidebar.caption("방정식을 바꾸고, 물리적 거동을 관찰하세요.")
    kind = st.sidebar.selectbox("실험실 선택", list(LABS), format_func=lambda k: LABS[k]["name"])
    p = sidebar_config(kind)
    lab = LABS[kind]
    st.markdown("""<div class="hero"><div class="eyebrow">NUMERICAL PHYSICS · INTERACTIVE LAB</div>
    <h1>미분방정식 물리 실험실</h1><p>변화율에서 유체의 운동까지 — 방정식의 항을 읽고, 격자로 계산하고, 움직임으로 이해합니다.</p></div>""", unsafe_allow_html=True)
    st.markdown(f'<span class="tag">{lab["tag"]}</span>', unsafe_allow_html=True)
    st.subheader(lab["short"])
    st.write(lab["intro"])
    st.latex(lab["equation"])
    cached_simulate = st.cache_data(show_spinner=False, max_entries=24)(simulate)
    try:
        with st.spinner("시간·공간 격자에서 방정식을 적분하고 있습니다…"):
            result = cached_simulate(p)
    except (ValueError, FloatingPointError) as exc:
        st.error(str(exc))
        st.info("왼쪽에서 안정 시간 간격 배율을 낮추고 '계산 / 설정 적용'을 누르세요. 열전도는 암시적 기법으로도 비교할 수 있습니다.")
        if kind == "heat1d":
            render_stability_demo(p["cfl"] / 2)
        render_guide(kind)
        return
    tabs = st.tabs(["물리 거동", "방정식 읽기", "격자와 수치해법", "비교와 정확도", "학습 가이드"])
    with tabs[0]:
        field, idx = render_live(result, kind)
    with tabs[1]:
        render_equation(result, kind)
    with tabs[2]:
        render_numerics(result, field, idx)
    with tabs[3]:
        render_comparison(result, field, idx, cached_simulate)
    with tabs[4]:
        render_guide(kind)
    st.caption("PDE Lab v1 · NumPy로 직접 적분 · 무차원 교육 모형 · 장면 저장과 내부 적분을 구분합니다.")


def self_test():
    """해석해·보존법칙에 대한 독립적인 수치 회귀 검증."""
    count = 0
    def check(condition, description):
        nonlocal count
        if not condition:
            raise AssertionError(description)
        count += 1
        print(f"PASS {count:02d} · {description}")
    for kind in LABS:
        p = default_config(kind)
        p["frames"] = 11
        r = simulate(p)
        check(all(np.all(np.isfinite(a)) for a in r["fields"].values()), f"{kind}: 기본 설정의 유한한 해")
        check(abs(r["t"][-1] - p["end"]) < 1e-12, f"{kind}: 종료 시각 도달")
    for kind in ("cooling", "oscillator"):
        p = default_config(kind)
        p["frames"] = 7
        r = simulate(p)
        f = next(iter(r["reference"]))
        check(np.max(abs(r["fields"][f] - r["reference"][f])) < 2e-4, f"{kind}: RK4와 해석해 일치")
    p = default_config("heat1d")
    p.update(initial="gaussian", boundary="insulated", frames=11)
    for method in ("explicit", "implicit", "cn"):
        p["method"] = method
        r = simulate(p)
        d = r["diag"]["적분값 ∫f dx"]
        check(np.max(abs(d - d[0])) < 1e-10, f"단열 열전도 {method}: 총열량 보존")
    for kind in ("advection", "burgers"):
        p = default_config(kind)
        p["frames"] = 11
        r = simulate(p)
        d = r["diag"]["적분값 ∫f dx"]
        check(np.max(abs(d - d[0])) < 1e-10, f"{kind}: 주기 영역 적분 보존")
    p = default_config("heat1d")
    rows = convergence_study(p)
    check(rows[-1]["RMSE"] < rows[0]["RMSE"] / 8, "1D 열전도: 격자 세분화에 따른 2차 수렴")
    p = default_config("wave")
    p.update(initial="sine", frames=21, end=0.5)
    r = simulate(p)
    check(np.max(abs(r["fields"]["변위 q"] - r["reference"]["변위 q"])) < 0.001, "파동: 정재파 해석해 일치")
    p = default_config("heat2d")
    p.update(initial="sine", frames=11)
    r = simulate(p)
    check(np.max(abs(r["fields"]["온도 T"] - r["reference"]["온도 T"])) < 0.001, "2D 열전도: 해석해 일치")
    p = default_config("euler")
    p["frames"] = 11
    r = simulate(p)
    for name in ("질량 수지 잔차", "운동량 수지 잔차", "에너지 수지 잔차"):
        check(np.max(abs(r["diag"][name])) < 1e-10, f"Euler: {name}")
    check(np.mean(abs(r["fields"]["밀도 ρ"][-1] - r["reference"]["밀도 ρ"][-1])) < 0.02, "Euler: 정확한 Sod 밀도 해와 비교")
    p = default_config("navier")
    p.update(frames=11, end=0.5)
    r = simulate(p)
    for name in ("와도 ω", "압력 p"):
        check(np.max(abs(r["fields"][name] - r["reference"][name])) < 2e-5, f"Navier–Stokes: Taylor–Green {name} 해석해")
    check(np.max(r["diag"]["최대 발산 |∇·u|"]) < 1e-12, "Navier–Stokes: 비압축성 조건")
    p.update(initial="perturbed", nu=0.0)
    r = simulate(p)
    energy = r["diag"]["운동에너지"]
    check(np.max(abs(energy - energy[0])) / energy[0] < 1e-4, "2D 비압축성 Euler: 비선형 유동 에너지 보존")
    print(f"\n{count}개 검증 통과")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    else:
        run_app()
