# 구현용 레슨 데이터 계약

src/lesson-schema.js 의 N/M/control을 사용한 ES 모듈로 작성합니다. export const lessons=[...]; 만 내보내며 최종 id 부여는 registry가 담당합니다. 문자열에서 수식은 $...$로 감싸고 TeX의 역슬래시는 JS 문자열에서 이중으로 씁니다. HTML은 쓰지 않습니다. 각 레슨은 다음 필드가 있어야 합니다.

```
{
 id:'C11', course:'calc', unit:'diff', title:'도함수의 부호와 증가·감소',
 standards:['12미적Ⅰ-02-07'], prereqs:['B5','C8'], minutes:25,
 goals:['판정하고 이유를 말한다','말/표/그래프로 바꾼다'],
 misconceptions:[{id:'C11-M1',claim:'...',repair:'...',bridge:'B7'},...2개이상],
 prediction:'설명 전 예측 질문',
 why:['왜 필요한가/왜 성립하는가를 담은 2~3 문단(합계 250자 이상)'],
 derivation:[{title:'...',body:'왜 그런지 설명'},...3~5단계],
 formula:'$...$',
 conditions:[{require:'조건',ifMissing:'조건이 없으면 왜 깨지는가',example:'구체 반례'},...2개이상],
 representation:{kind:'sign',task:'구체 조작/표 읽기 과제',readBack:'역방향 과제/생각할 질문',caption:'표현이 뜻하는 바',controls:[control(...)]},
 example:{prompt:'대표 문제',steps:[{title:'...',body:'계산과 이유'},...3~5단계],answer:'결론'},
 faded:N('faded','비슷하지만 일부 단계가 빈 문제',숫자정답,'이유','힌트',[{value:예상오답,feedback:'오개념에 맞는 피드백',tag:'C11-M1'}]),
 entry:[M('entry',...),N('entry',...)], //선수 확인 2개, 개념이 아닌 선행만 확인
 checks:[
 N('basic',...),
 M('transfer',...표현/조건을 바꾸는 추론. 단순 숫자 교체만은 전이가 아님...),
 M('error',...틀린 풀이의 정확한 오류 위치와 이유를 한 선택지에 함께 제시...),
 N('repair',...오류 풀이를 올바르게 고친 수치 답...)
 ],
 explanation:{prompt:'내 말로 설명할 질문',claims:['포함할 주장1','주장2','주장3'],model:'비교할 설명 예시(자기 채점용)'}
}
```

M(role,prompt,options[3],answerIndex,reason,hint,feedback[3],tags[3]). 정답 선택지 feedback은 reason과 같아도 됨. 오답 피드백은 왜 그 선택이 틀렸는지 구체적으로. tags는 각 오답이 연결되는 위 misconception ID, 정답은 null. 빈 단계·적용 단계의 수치형은 알려진 오답값 최소1개와 구체 피드백. 선수 확인의 단순 산술은 계산 힌트와 풀이를 제공하며 오개념을 임의로 태그하지 않음. 숫자 입력은 정수·소수·분수만 받음(식/π 입력 안 됨). 수치 답이 무리수면 제곱값·계수·개수·범위의 끝값 등으로 묻거나 MC로 전환. '숫자만 교체한 문제'는 basic/faded에만, transfer는 표현이나 추론 방향 변경.

## 표현 kind (작성 시 아래에서 선택)
polynomial / quadratic / transform / absolute / power / log-rules / exponential / logarithm / unitcircle / trig / triangle / arithmetic / geometric / sigma / telescoping / recurrence / induction / limit / continuity / secant / differentiable / derivative / tangent / mvt / sign / extrema / cubic-roots / motion / antiderivative / integral / accumulation / area / distance / counting / repeated / identical / multiset / binomial-theorem / dice / union / conditional / independence / trials / distribution / moments / binomial / density / normal / approximation / sampling / confidence / proportion

표현 renderer는 id와 kind를 모두 받아 구체 상황을 구별할 수 있음. 복잡한 상호작용이 개념과 맞지 않으면 controls=[]이고 구체 표·그림을 사용. controls는 실행 가능한 모델 변수와 맞춰 구현 측에서 최종 조정.

## 브리지 ID
B1 함수·합성·역함수, B2 그래프 이동/대칭, B3 직선 기울기/방정식, B4 인수분해/인수정리, B5 이차함수·판별식·부등식, B6 절댓값·구간·조각함수, B7 명제·필요충분·반례, B8 원·삼각비, B9 합곱법칙·순열·조합, B10 평균·분산·표준편차.

핵심 미적분Ⅰ에서는 다항함수의 미분/적분만. 자연로그/삼각함수 미분/치환·부분적분/급수/기하를 끌어오지 않음. 공통 수능 범위는 docs/curriculum-verification.md 참고.

## 2차 논의 후 확정 사항
핵심 레슨은 misconceptions 최소3개. checks는 basic 2개, transfer 2개, error-location 1개, error(이유)1개, repair 1개, explanation(결함 설명 판정)1개로 총8개. 오류 분석3개는 같은 틀린 풀이의 단계·이유·수정이다. faded는 별도 한 문항. 브리지는 짧은 복습이므로 checks4개(basic/transfer/error/repair)와 오개념2개도 허용.
추가 헬퍼: R(role,prompt,'2/5',reason,hint,wrong,unit) 유리수 정확 비교. I(role,prompt,{lo:-3,loIncl:true,hi:3,hiIncl:true},reason,hint,wrong) 구간, S(role,prompt,[-1,2],reason,hint,wrong) 숫자 집합. I에서 무한대는 문자열 '-inf','inf'. 확률 숫자는 반드시 R을 사용. 모든 원문 대조 코드는 별도 coverage registry가 최종 부여하므로 불확실하면 standards=[]로 두되 pending을 임의로 검증 완료로 표시하지 않는다.

복습은 각 레슨 최소40개 서로 다른 문항 쌍을 목표로 하며, 날짜 전 연습은 예정 복습의 새 변형을 소모하지 않습니다. 소진 시 오래된 변형으로 일정을 계속하되 reused 표시로 새 독립 증거에서 제외합니다.
\n오류 분석의 태그는 선택지 순서가 아니라 해당 레슨의 실제 오류 목표로 명시합니다. 태그가 없는 산술 실수도 첫 응답·교정 기록은 보존하며 오개념 진단으로 만들지 않습니다.\n