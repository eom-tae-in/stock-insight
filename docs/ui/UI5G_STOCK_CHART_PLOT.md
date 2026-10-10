# UI-5g 가격/YoY 플롯

이슈 #50·브랜치 feat/50/stock-chart-plot. 이슈 생성 후 브랜치를 만들었다.
담당자 eom-tae-in·enhancement. 기준 develop은 PR #49 squash
`901a769edff98d0e081f638abe9fdcfc9921f259`다.
원본 §6.4·이전 상세/모바일 context와 Figma15:2550 screenshot/context를 확인했다.

가격과52주 YoY를 상하로 분리한다. 가격은 종가2px·6% 면 그라데이션,
MA13은2px 점선이며 시가·고저 선택을 유지한다. YoY는 부호에 따라up/down 색 막대다.
결측 막대는 투명하며 기존 계산 반환값과 기간/시리즈·커스텀 차트·PNG 동작을 유지한다.
가격 축을 오른쪽에 두고 기존120px 여백·긴 수직 문구를 제거했다.
모바일230px·데스크톱300px 가격 영역과110px YoY 영역을 사용하며 실제 plot 폭을 확인한다.
두 차트는 날짜 기준으로 십자선을 동기화하며 툴팁은 하나의 주간 상세로 표시한다.
툴팁은 완료 주차·월요일~금요일·선택된 시리즈 값을 소유 데이터에서 찾는다.
Recharts any payload를 캐스트해 사용하지 않는다. 차트별 gradient/sync ID는 useId로 분리한다.
마지막 종가 라벨은 축 눈금과 겹치지 않게 배경을 제공한다.

## 시도별 기록

- 기존 차트9개 단위 검사 최초 통과.
- 초기 상세 브라우저8개 조합 통과:stock-insight-ui5e-S93yUf.
- npm run typecheck 최초 실패 TS2322:수치/이름 타입을 Recharts 기본 범위보다 좁게 지정했다.
  첫 재시도는 TS2558:Tooltip JSX가 제네릭 인수를 받지 않아 실패했다.
  설치된 DefaultTooltipContent.d.ts와 Tooltip.d.ts를 확인하고 TooltipContentProps 기본
  범위로 일치시켰다. 두 번째 재시도 npm run typecheck 통과. 검사 완화나 any 사용이 아니다.
- 툴팁·하락 막대·plot 폭 검증을 추가한 상세 브라우저 실행은390px light에서 실패했다
  (stock-insight-ui5e-BKakGZ). KPI 설명과 새 차트 상세의 tooltip2개를 단일 조회한 것이 원인이다.
  설명 문구/차트 상세 접근성 이름으로 각각 정확히 조회하도록 수정했다.
  기존 오류 수집·주차·가격·부호·다운로드 검사는 유지했다.

상세 레일·주간 표·헤더 행동·조회 결과와 UI-6~UI-10은 후속 범위다.
실제 DB·브로커·Keycloak·Docker는 사용자 지시로 보류하며 fixture를 실제 MSA 통과로
분류하지 않는다. 독립 에이전트 검토와 Lighthouse는 수행하지 않는다.

확장 브라우저 검사의 첫 재시도는8개 조합 통과(증거 stock-insight-ui5e-BcO70h).
이후 YoY 값을 ChangeText로 공통 색에 연결하고 음수 툴팁 검증을 추가했다.
이 추가 검증의 최초 실행은390px light에서 툴팁을 찾지 못해 실패했다
(증거 stock-insight-ui5e-HRwSrW). 하단의 데이터 전환 버튼을 클릭하면 화면이 스크롤되어
이전에 얻은 plot 좌표로 마우스를 이동한 것이 원인이다.
스크롤 후 plot의 실제 위치를 다시 조회해 입력하도록 수정하며 음수 색 검사는 유지했다.
초기/스크롤 전/현재 좌표를 plot-geometry.json으로 보존해 입력 위치를 확인한다.

음수 툴팁 검증의 첫 재시도8개 조합 통과(증거 stock-insight-ui5e-s1vHDd).
390px light의 실제 좌표는 초기 y858.5에서 전환 버튼 클릭 후 y507.5로351px 바뀌었다.
현재 위치를 조회한 입력으로 주차·음수 ChangeText가 표시되는 것을 확인했다.
음수/결측 색을 확인한 차트 단위 검사는10개 통과했다.

s1vHDd 실제 음수 툴팁 캡처의 수동 검토에서 음수만 있는 YoY 축이0을 포함하지 않고
−26.65%~−28.6%로 잡힌 문제와 마지막 가격 라벨 아래가 잘리는 문제를 발견했다.
기능 검사 통과를 이 표시 문제의 통과로 분류하지 않는다.
YoY domain 양 끝에0을 포함하고 가격 축 위아래12px 공간을 제공했다.
음수 화면에0%가 보이는 브라우저 검증을 추가하고 최종 화면을 다시 검증한다.

## 2026-10-10 이어서 진행

현재 세션 컨텍스트 사용률은 도구/환경에서 제공하지 않아 확인 불가다.
55% 도달 여부나 임의의 수치를 만들지 않는다.

`npm run test:ui-stock-detail` 재개 후 최초 실행은8개 조합 통과했다
(stock-insight-ui5e-iMsawA). 음수 축0%와 툴팁을 확인했지만 실제 캡처 수동 검토에서
최근 가격 라벨과 축 눈금 숫자가 겹쳤다. 이 표시 문제를 통과로 분류하지 않는다.
라벨을 플롯 안쪽으로 옮기고 실제 boundingBox가 플롯 경계 안에 들어오는 검사를 추가했다.
`npm run check`는106개 파일665개 테스트·타입·린트·포맷이 통과했다.
이 결과는 최근 라벨 위치와 boundingBox 검사 추가 전 소스 검사다.
커스텀 차트8개 조합은 stock-insight-ui5a-S0zarB로 통과했다.
최종 소스의 상세/커스텀·OIDC 빌드·인증 fixture는 아래 후속 결과로 구분한다.

최근 라벨 보정 후 `npm run test:ui-stock-detail`은8개 조합 통과했다
(stock-insight-ui5e-FWKLL8). 양수/음수·0%·주차 툴팁·실제 plot 폭·라벨 경계·
PNG 파일 서명·기간/시리즈 회귀를 유지했다.8개 기본 화면과 모바일 음수 툴팁,
데스크톱 음수 캡처를 직접 열어 라벨 잘림과 숫자 겹침이 해소된 것을 확인했다.
최종 타입·변경 파일 ESLint·차트10개 테스트도 통과했다.
주 세션의 직접 검토이며 독립 에이전트 검토나 Lighthouse 측정으로 분류하지 않는다.

최종 커스텀 차트8개 조합은 stock-insight-ui5a-JZQqfF로 통과했다.
390/1440px light/dark의 저장 후 다시 읽은 화면도 직접 검토했다.
`git diff --check`·변경 문서/소스 Prettier 검사는 통과했고 scripts ignore와
GitHub Actions enabled=false를 확인했다.

## 직접 검토 기록

| 범위                       | 확인 결과      | 근거                                                            |
| -------------------------- | -------------- | --------------------------------------------------------------- |
| 가격/YoY 분리·부호·결측    | 통과           | FWKLL8/result.json, 차트10개 단위 검사                          |
| 모바일 폭·라벨·음수0%      | 통과           | FWKLL8의 실제 좌표 검사·390px 캡처                              |
| 기간/시리즈·PNG            | 통과           | FWKLL8의 직접 입력/복원·chart-export.png 서명 검사              |
| 커스텀 차트 저장·복원·삭제 | 통과           | JZQqfF/result.json·reloaded 캡처                                |
| 계산·인증·소유자 경계      | 변경 없음 확인 | UnifiedChart 계산 입력/기간 제한 유지, 서버/인증 파일 변경 없음 |
| 실제 MSA·실제 저장 계정    | 보류           | 기존 #24와 사용자 Docker 보류 지시                              |

새 라이브러리·워크플로·자격 증명은 추가하지 않았다. 차트 데이터는 기존 계산 결과를
직접 전달하며 툴팁은 payload의 임의 타입 변환 없이 날짜로 소유 데이터에서 찾는다.
`review-work`의 Codex 기본 경로대로 주 세션의 self-review로 기록하며 독립 승인으로
분류하지 않는다. 디자인 전체 완료와 실제 MSA 검증은 이 작업의 완료 범위가 아니다.

최종 `WEB_AUTH_MODE=oidc npm run build` 최초 실행 통과.
`npm run test:web-oidc` 최초 실행 통과(stock-insight-web-qa-u0dzze).
실제 Next 프로덕션·Chrome·Redis와 서명된 OIDC/HTTP Gateway fixture 검증이며
실제 Keycloak·Spring·DB·broker 통과가 아니다. 기존 MODULE_TYPELESS_PACKAGE_JSON
경고는 남아 있다. 이 재개 구간의 실행 실패는 없으며 이전 실패 기록은 위에 보존했다.
모든 fixture 실행은 각 스크립트의 finally에서 서버·Redis·브라우저를 정리했다.
