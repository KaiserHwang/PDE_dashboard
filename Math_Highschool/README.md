# 수학 개념 탐험실 · Math_Highschool

고1 학생과 수학을 다시 배우는 성인을 위한 **69개 핵심 개념, 15개 분야**의 대시보드입니다. 예상 → 조작 → 숫자 → 정의·조건 → 질문 → 자기 설명으로 연결합니다.

배포 주소: **https://kaiserhwang.github.io/PDE_dashboard/Math_Highschool/**

간편 접속: **https://kaiserhwang.github.io/PDE_dashboard/math.html**. 소문자 `math_highschool/`도 같은 대시보드로 이동합니다. 주소 연결 변경은 [Claude 검토 기록](review/address-aliases.json)에 남겼습니다.

## 학습 구성

- 처음부터 배우기: 문자와 함수에서 변화율·극한·미분·적분으로 이어지는 14개 추천 경로.
- 전체 개념: 분야·검색어로 탐색하고 과목 표시로 교육과정에 연결.
- 개념 지도: 함수·미적분, 경우의 수·통계, 좌표·기하, 반복·무한의 추천 연결.
- 각 개념: 조절 가능한 그림, 수치 표, 원리 설명, 성립 조건, 틀리기 쉬운 생각, 확인 질문 3개와 자기 설명.
- 배움 노트: 브라우저에 자동 저장하고 JSON으로 내려받기. 실험 표는 CSV로 저장.
- 모바일·키보드·스크린리더: 반응형 배치, 입력 라벨, 그림 설명과 대체 수치 표. 외부 CDN·서버 API·계정 없이 실행.

## 범위와 한계

공통수학1·2, 대수, 미적분Ⅰ·Ⅱ, 확률과 통계, 기하의 핵심 개념을 연결합니다. 개별 성취기준의 모든 계산 유형을 완전히 대체하는 교과서는 아닙니다. 경제·AI·직무 수학 등의 별도 과목 전체는 포함하지 않습니다. 개념 수는 사용자에게 완료를 강요하는 목표가 아닙니다.

교육과정 참고: [부산교육청 과목 안내](https://home.pen.go.kr/hscredit/cm/cntnts/cntntsView.do?cntntsId=3729&mi=17411), [EBS 공통수학 성취수준 자료](https://wdown.ebsi.co.kr/LMS/lmsx/EBS_Min_Achievement_Online_Guide_Common.pdf). 설명·실험·질문은 이 프로젝트에서 작성했습니다.

확률의 모의 실험과 정확한 분포를 구분하며, 시각화와 유한 개의 사례 관찰을 일반적인 증명으로 제시하지 않습니다. 3개 확인 질문과 12자 이상의 설명, 자기점검을 마치면 ‘확인 완료’로 기록합니다. 설명의 옳고 그름을 AI가 자동 채점하지 않으며 기록이 이해를 보증하지 않습니다. 기록은 기기 간 동기화되지 않습니다.

## 개발·검증

저장소 루트에서 실행합니다. Node.js 22 이상을 사용합니다.

```bash
node Math_Highschool/scripts/build.mjs
node Math_Highschool/tests/verify.mjs
# Playwright가 설치된 Python 환경에서 PC·모바일 전체 개념 검증
.venv/bin/python Math_Highschool/tests/browser.py
python3 -m http.server 8770
```

http://localhost:8770/Math_Highschool/ 에서 확인합니다. 완성된 `index.html` 하나를 직접 열어도 됩니다. `version.json`은 빌드 식별용이며, 브라우저 실행에 필수인 외부 파일은 없습니다.

## 소스

- `src/content.js`: 69개 개념의 원문·조건·선행 연결·207개 확인 질문.
- `src/math.js`: 화면과 독립적인 계산.
- `src/visuals.js`: SVG 실험·대체 표.
- `src/app.js`: 탐색·상호작용·학습 기록.
- `src/styles.css`: 모바일을 포함한 화면 스타일.
- `scripts/build.mjs`: 외부 의존성 없는 단일 HTML 생성.
- `tests/verify.mjs`: 해석적 결과·정의역·분포·기록·모든 개념의 매개변수 경계 검증.
- `tests/browser.py`: 1440px·390px의 69개 개념 조작, 오답 힌트, 본문 바로가기, 기록 복원·백업, 다운로드 검증. 공개 주소는 `--url`로 전달할 수 있습니다.
- `review/`: Claude의 실제 검토 결과와 반영 기록.

배포 전 순서: 빌드·수치 검증·브라우저 확인 → Claude 읽기 전용 리뷰 → 지적 사항 수정·재검증 → 필요 시 재리뷰 → GitHub 반영·Pages 배포·공개 주소 확인.

최종 검토: 실제 Claude Code 리뷰와 수정·재리뷰를 거쳐 빌드 `3919eac7f0`이 **approve(남은 지적 0건)** 판정을 받았습니다. [리뷰 반영 기록](review/changes.md)과 [최종 검토 원문](review/round-4.json)을 확인할 수 있습니다. 수치·내용·그림·저장 검증 24개 묶음 및 PC·모바일 폭의 전체 69개 개념 브라우저 검사를 통과했습니다.
