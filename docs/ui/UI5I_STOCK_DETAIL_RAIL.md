# UI-5i 종목 상세 연결 키워드와 데이터 정보

이슈 #54 · 브랜치 `feat/54/stock-detail-rail` · 담당자 eom-tae-in · enhancement.
이전 주간 카드 PR #53은 squash 병합했다
(`9d5054d7ecb9dd47e0f524b19ec7b98d4944a5a0`).

## 구현

명세 §6.4와 Figma15:2604를 확인하고 DESIGN.md의 레일 규칙을 적용했다.
본문과320px 레일을24px 간격으로 배치하며 좁은 화면에서는 세로로 쌓는다.
공통 Button·Popover·Dialog·StatusBadge·ChangeText와 Lucide 아이콘을 사용한다.
소유 종목 조회 성공 뒤 같은 사용자 ID로 키워드를 조회한다.
5Y 분석 중 해당 종목 오버레이가 있는 키워드를 표시하고, 관심도·YoY·조건은
대표 분석을 사용한다. 관심도 결측은 대시이며 65주 미만 YoY도 기존 계산 정책을 따른다.
지역·검색 종류의 기존 한글 레이블을 공통 모듈로 옮겼다.

비교 선택기는 연결되지 않은 키워드를 포함한 소유 키워드 전체를 제공한다.
데스크톱은 popover, 모바일은 초점이 갇히는 dialog이며 Escape로 닫은 후 초점을 복원한다.
빈 계정에서는 저장 안내를 제공한다. 링크는 `/keywords/{id}?preview={ticker}`이다.
키워드 상세 서버는 단일 문자열 ticker만 검증한 뒤 기존 비교 상태로 전달한다.
선택 조건이 결정되면 기존 인증 GET `/api/stocks/{ticker}`를 사용해 조회하며
Zod로 응답을 검증한다. 저장 API는 자동 실행하지 않는다.
조건 변경·닫기·언마운트 시 요청을 취소하고 늦은 응답을 무시한다.
종목 제거와 명시적 저장 성공 시 preview 쿼리를 제거하며 region/searchType은 유지한다.

데이터 정보에는 Yahoo Finance·완료 주 기준·5년 약260주·실제 저장 주수·통화와
저장된 최근 갱신 시각(없으면 searched_at)을 한국 시간으로 표시한다.
서버에 Redis URL과 token이 모두 있고 실제 TTL이 양수·유한할 때만 기간을 표시한다.
클라이언트에는 기간 숫자만 전달한다. 이 배지는 실제 cache hit를 의미하지 않는다.

## 실패와 복구

`npm run check` 최초 실행: preview/test 오버레이의 `analysis_id`, `created_at`
필수 필드가 없어 타입 검사 실패. fixture에 실제 타입 계약의 필드를 보완했다.
재시도1: 타입·린트 통과 후 use-stock-preview.test.tsx 포맷 검사 실패.
해당 파일에 Prettier를 적용했다. 재시도2는109개 파일678개 테스트와
타입·린트·포맷 모두 통과했다. 검사 완화나 테스트 삭제는 없다.

최초 브라우저8개 조합 자동 검사는 통과했지만 직접 캡처에서 보조 글자가 거의
보이지 않는 문제를 발견했다. text-secondary가 배경 토큰을 참조하는 원인이었다.
text-text-secondary로 수정한 뒤8개 조합을 다시 통과했다.
최종 검사에는 데이터 정보 글자의 배경 대비4.5 이상 검사를 추가했다.
이는 자동 검사 통과와 시각적 검토를 구분한 기록이다.

## 최종 검증

최종 `npm run check`:109개 파일679개 테스트·타입·린트·포맷 통과.
추가한 검사는 대표 분석/연결 분석 구분·빈 연결/빈 계정·캐시 설정 쌍,
실제 상세 클라이언트의 preview 로드/제거, 응답 검증과 취소 경합을 포함한다.
최종 소스의 `npm run test:ui-stock-detail`:390/1280/1440/1920px와
light/dark의8개 조합 통과. 모든 전체 데이터 캡처와 모바일 빈 상태·선택기,
데스크톱 선택기를 직접 열어 검토했다.
최종 증거는 `/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui5e-nwIEuT`의
result.json·cleanup.json과 각 `*-complete.png`, `*-missing.png`,
`*-keyword-chooser.png`다. 빈 상태·초점 복원·이동 href·텍스트 대비4.5,
기존 기간/시리즈/툴팁/PNG·Excel·가로 스크롤 회귀 검사가 통과했다.
링크 이후 실제 DB가 제공하는 키워드 SSR 화면은 미실행이며 preview 동작은
KeywordDetailClient integration과 hook 검사에서 검증했다.

`WEB_AUTH_MODE=oidc npm run build` 최초 실행 통과.
빌드의 Slow filesystem 경고와 기존 MODULE_TYPELESS_PACKAGE_JSON 경고를 확인했다.
`npm run test:web-oidc` 최초 실행 통과(stock-insight-web-qa-bgza5f).
실제 Next 프로덕션·Chrome·Redis와 서명된 OIDC/HTTP Gateway fixture 검사이며
실제 Keycloak·Spring·DB·브로커 검증 통과가 아니다.
최종 browser/auth fixture의 finally에서 실행한 서버·브라우저·Redis를 정리했다.
주 세션이 diff·Figma·캡처·검증 결과를 검토했다. 독립 검토로 분류하지 않는다.
실제 DB·RabbitMQ·Keycloak·Docker 검증은 사용자 지시에 따라 보류한다.
legacy Supabase/Vercel 실패를 새 런타임 통과로 분류하지 않는다.
GitHub Actions enabled=false와 로컬 scripts ignore를 확인했다.
현재 도구/환경은 컨텍스트 사용률을 제공하지 않아 확인 불가다.
독립 에이전트 검토·Lighthouse는 수행하지 않았다.
헤더 행동·앵커·조회 결과와 UI-6~UI-10은 남아 있다.
