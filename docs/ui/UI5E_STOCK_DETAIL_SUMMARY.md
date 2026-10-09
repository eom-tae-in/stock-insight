# UI-5e 종목 상세 헤더와 핵심 지표

이슈 #46: https://github.com/eom-tae-in/stock-insight/issues/46
브랜치 feat/46/stock-detail-metrics. 기준 develop은 PR #45 squash
`5eff5d52e3468d4e8c168bafbbbffaa365a6d9df`다.
이슈를 먼저 생성하고 담당자 eom-tae-in·enhancement를 적용했다.

## 범위와 표시 계약

원본 로컬 명세 §6.4와 Figma 상세15:2493·모바일16:3087 metadata,
헤더15:2498·KPI15:2521·모바일KPI16:3163 context와 screenshot을 확인했다.
Badge·TickerLogo·MetricTile·ChangeText와 기존 가격·거래량 포맷을 재사용한다.
TickerLogo에48px lg 크기를 추가하며 기존 기본36px·sm28px를 유지한다.
상세 서버의 사용자 인증·소유자 조회·notFound를 유지하고 저장된 데이터로 표시한다.
기존 calculateMetrics·calculateMA13 반환값과 차트 전달값을 변경하지 않는다.

5개 지표는 MA13·52주 YoY·최근 주 고저·저장 기간 최고 종가·주간 거래량이다.
MA13은13주, YoY는65주 미만이면 결측이다. 고저와 거래량이 없으면 결측이며
거래량 전주 대비의 기준이0이면 결측이다. 최고점 대비와 날짜를 저장된 주간 데이터에서
계산한다. 주간 변동폭은 (고가−저가)/저가로 표시한다. 기존 최신화 날짜 안내를 유지한다.
등락은 상승red·하락blue·0/결측secondary 공통 규칙을 사용한다.

모바일2열·데스크톱5열로 배치한다. 모바일에는 거래량도 유지한다.
이번 범위는 헤더 정보·KPI이며 전체 상세 화면의 완성은 아니다.
최신화/내보내기 헤더 동작·앵커 탭·차트·오른쪽 연결 키워드/데이터 정보·주간 표와
모바일 전체 배치는 후속 단계에서 연결한다. 기존 차트/커스텀 차트/표 링크를 유지한다.
개발 미리보기는 정확한 경로만 허용하고 운영 모드에서 notFound로 차단한다.

## 시도별 검증

- 관련3개 파일 단위 검사 최초 실행:4개 통과·1개 실패.
  같은 fixture의 주간 변화와 고점 대비가 모두−9.09%여서 단일 텍스트 조회가 실패했다.
  동일 수치의 모든 표시가 down 색인지 확인하도록 검사 범위를 명확히 했다.
  동일 명령 첫 재시도5개 전부 통과했다.
- 초기 `npm run test:ui-stock-detail`:8개 조합 통과. 증거 stock-insight-ui5e-Ql0M4x.
  전체/부족 데이터16개 캡처를 주 세션에서 직접 확인했다.
- 최초 OIDC 빌드 통과. 이후 기존 최신화 날짜 안내를 추가해 최종 검증을 진행한다.

고정 fixture 화면의 통과를 실제 DB·브로커·Keycloak·시장 데이터 검증으로 분류하지 않는다.
그 검증과 Docker는 사용자 지시로 보류다. Actions를 비활성화 상태로 유지한다.
별도 에이전트 검토·Lighthouse는 수행하지 않았다.

최신화 날짜 유지 후 최종 브라우저 검사8개 조합 통과. 증거 stock-insight-ui5e-UFjkMW.
전체/결측16개 캡처를 주 세션에서 직접 검토했다. 최신화 날짜와5개 지표가 표시되며
가로 넘침이 없고 설명 툴팁의 키보드 포커스 접근을 확인했다.
`npm run check`는106개 파일662개 테스트·타입·린트·포맷 통과했다.
최신 소스의 OIDC 빌드와 인증 fixture 검증은 최종 실행 결과를 아래에 기록한다.

최종 `WEB_AUTH_MODE=oidc npm run build` 통과.
`npm run test:web-oidc` 통과(증거 stock-insight-web-qa-MNBB9B).
개발 서버가 종료된 뒤 빌드와 인증 검사를 순차 실행했다.
