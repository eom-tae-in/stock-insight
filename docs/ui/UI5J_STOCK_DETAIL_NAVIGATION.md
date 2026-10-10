# UI-5j 종목 상세 목록 복귀와 섹션 이동

이슈 #56 · 브랜치 `feat/56/stock-detail-navigation` · 담당자 eom-tae-in · enhancement.
선행 이슈 #54는 PR #55로 squash 병합되고 자동으로 닫혔다
(`59974f98af003ffc3422583011ae1db101613f4c`).

## 구현

기존 공통 Ghost Button·Lucide 아이콘과 DESIGN.md의 터치44px·간격8px를 사용한다.
목록 복귀는 `/stock-analysis`, 가격 차트와 주간 데이터는 네이티브 fragment 링크다.
상세 서버 페이지와 개발 미리보기에 같은 내비게이션을 사용한다.
목적지는 tabIndex=-1과 상단바64px+여유32px의 스크롤 여백을 제공한다.
주소 변경·브라우저 뒤로가기·키보드 초점은 브라우저의 기본 동작을 사용한다.
새 API 호출·클라이언트 상태·스크롤 애니메이션을 추가하지 않는다.
기존 인증·소유자 조회와 저장·계산 경계를 유지한다.

## 검증 기록

최초 `npm run check`는109개 파일679개 테스트·타입·린트·포맷이 통과했다.
브라우저 검사에는 목록 목적지·Enter를 통한 주간 데이터 이동·
fragment 주소·목적지 초점·실제 화면 안 스크롤과 차트 복귀를 추가했다.
별도 단위 검사를 만들지 않고 실제 브라우저에서 링크 동작을 확인한다.

`npm run test:ui-stock-detail` 최초 실행은390px light의 기존 가격 툴팁 검사에서
실패했다. 새 앵커의 주소·초점·실제 스크롤 단언은 통과했다.
추가 내비게이션으로 높이가 늘어났는데 기존 검사가 화면 밖 플롯 좌표를 읽고
마우스를 이동한 원인을 확인했다. 음수 툴팁 검사는 이미 스크롤 후 좌표를 읽는다.
양수 툴팁도 같은 순서로 플롯을 먼저 스크롤하는 최소 수정을 적용했다.
최초 실패 증거는 `stock-insight-ui5e-VTxfE6`이며 cleanup.json은 passed=true다.
첫 재시도는390/1280/1440/1920px × light/dark의8개 조합과 종료 코드0으로 통과했다.
최종 증거 디렉터리는
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui5e-ZFeEvP`이다.
result.json·cleanup.json 모두 passed=true이며 기능 단언·PNG·Excel·기존 차트 회귀를 유지했다.
플롯 좌표 순서 수정 후 fixture 구문 검사와 변경 문서/fixture 포맷 검사도 통과했다.
`WEB_AUTH_MODE=oidc npm run build` 최초 실행은 종료 코드0으로 통과했다.
기존 Slow filesystem·MODULE_TYPELESS_PACKAGE_JSON 경고는 남아 있다.
이번 변경은 인증 코드에 닿지 않아 기존 인증 fixture를 다시 실행하지 않았다.
실제 Next·Chrome의 개발 미리보기 검사이며 저장 DB·MSA E2E 통과가 아니다.
주 세션에서 모바일 두 테마와1440px 두 테마의 최종 전체 화면을 직접 열어 검토했다.
독립 기능 검토와 시각 검토는 각각24개 최신 정상/결측/주간 스크롤 캡처를
직접 열어 확인하고 UI-5j 범위에서 PASS/APPROVE를 반환했다. 차단 사항은 없다.
보고서는 로컬 `.omo/evidence/ui5j-navigation-functional-gate-review.md`와
`.omo/evidence/ui5j-navigation-visual-b-gate-review.md`다.
주 세션에서 두 보고서와 diff를 검토했다. 기존 전체 리디자인의 완료 승인으로 분류하지 않는다.
브라우저 뒤로가기·390px 미만 강제 줄바꿈·200% 확대와 내비게이션 전용 포커스 링
캡처는 별도로 검증하지 않았으며 네이티브 링크와 공통 Button의 코드 경로만 확인했다.
Lighthouse는 실행하지 않았다.

## 남은 범위와 한계

헤더 갱신·삭제 행동·조회 결과와 UI-6~UI-10은 남아 있다.
실제 저장 종목 SSR 화면은 DB 환경에서 미실행이며 개발 미리보기로 화면을 검증한다.
Docker·DB·RabbitMQ·Keycloak 검증은 사용자 지시에 따라 보류한다.
legacy Supabase/Vercel 실패와 역사적 원격 통과는 새 MSA 검증으로 분류하지 않는다.
GitHub Actions enabled=false를 확인했으며 자동 워크플로를 추가하지 않았다.
현재 도구/환경은 컨텍스트 사용률을 제공하지 않아 확인 불가다.
