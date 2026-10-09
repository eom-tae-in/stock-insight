# UI-5f 가격 차트 도구

이슈 #48·브랜치 feat/48/stock-chart-controls. 담당자 eom-tae-in·라벨 enhancement.
이슈 생성 후 브랜치를 만들었다. 기준 develop은 PR #47 squash
`166cc635dc6edb3b147a2516295e91cdfab77ce9`다.

원본 §6.4와 Figma15:2529 context/screenshot을 확인하고 UI-5e에서 확인한
상세/모바일 구조를 사용한다. 가격 차트 제목·설명, 공통 Segmented1Y–5Y,
직접 기간 팝오버, 짧은 시리즈 표시와 상세 접근성 이름, 범위·실제 주 수,
PNG 아이콘을 공통 토큰과 Button·Popover·Tooltip으로 적용했다.
Popover 입력 ID는 useId로 차트별 분리하고 최초 서버/클라이언트 경계를 유지한다.
컨트롤·설정을 분리하며 기존 커스텀 차트의 초기 기간·시리즈와 PNG 콜백을 유지한다.
기간 변경은 종가만 유지한다. 직접 입력은1–260 정수 주이며0/분수/초과는 적용하지 않는다.
표시 기간뿐 아니라 저장된 데이터가13/65주 미만인 경우 MA13/YoY가 비활성이다.
기존 계산 반환값과 데이터/API·소유자 경계를 변경하지 않는다.

## 범위와 남은 화면 차이

이번 범위는 차트 조작 도구다. 상하 가격/YoY 분리·가격 면6%·MA 점선·YoY 부호 색
막대·주차 십자선과 최근 가격 라벨은 다음 플롯 단계다. 현재 기존 플롯의 긴 우측 축과
120px 우측 여백이 모바일 그래프 폭을 좁히는 차이도 직접 캡처에서 확인했다.
전체 상세 화면 완료나 Figma 전체 일치로 분류하지 않는다.

## 검증 기록

- 기존 UnifiedChart7개 검사 최초 통과.
- 기간 변경/재활성화·실제 저장 데이터 부족 회귀를 추가한 관련3개 파일20개 검사 통과.
- `npm run test:ui-stock-detail`:8개 조합 통과. 증거 stock-insight-ui5e-WBbEIG.
  기존 상세 runner를 확장해 이름은 UI-5e며 이슈 #48의 소스 검증이다.
  전체/결측/직접 기간/시리즈 복원32개 캡처를4개 contact sheet로 직접 확인했다.
  390px light에서 PNG 다운로드를 실제 실행하고 파일 PNG 서명도 확인했다.
- `npm run test:ui-custom-charts`:8개 조합 통과. 증거 stock-insight-ui5a-sSVe0U.
  최초 화면·생성·펼침·이름/기간·삭제 취소/완료·브라우저 저장 동작을 유지했다.

실제 DB·브로커·Keycloak·Docker 검증은 사용자 지시로 보류한다.
fixture 웹 검증과 실제 MSA 검증은 구분한다. Actions 비활성화를 유지한다.
독립 에이전트 검토나 Lighthouse 통과는 주장하지 않는다.

최종 OIDC 빌드 통과. 인증 브라우저 fixture 통과(증거 stock-insight-web-qa-aipIRY).
`npm run check` 최초 실행은 새 단위 검사4곳의 ByRoleOptions exact 속성 때문에
TS2769로 실패했다. Playwright와 달리 Testing Library 역할 조회에는 해당 옵션이 없다.
역할 이름 문자열의 기존 일치 동작을 사용하도록 exact 옵션을 제거한 첫 재시도를 실행한다.
단위 검사 의미·제품 코드·브라우저 검사는 변경하지 않았다.

`npm run check` 첫 재시도는106개 파일664개 테스트·타입·린트·포맷 통과했다.
최종 제품 소스의 브라우저/빌드 증거를 위에 기록했으며 그 이후 수정은 단위 검사의
지원하지 않는 옵션 제거와 검증 문서뿐이다. 임시 진단 코드나 인증정보를 추가하지 않았다.
