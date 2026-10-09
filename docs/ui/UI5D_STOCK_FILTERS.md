# UI-5d 관심 종목 검색·등락 필터 검증

이슈: https://github.com/eom-tae-in/stock-insight/issues/44
브랜치: `feat/44/stock-list-filters`
기준 develop: PR #43 squash 커밋 `6b76150be865c5cb5c8a3f16ca08dda27dfbd421`.
이슈를 먼저 만들고 브랜치를 생성했다. 담당자 eom-tae-in·라벨 enhancement다.

## 구현 계약과 범위

로컬 원본 명세 §6.3을 다시 읽었다. Figma 전체 목록 `34:3189`와 모바일 `67:7078`의
metadata를 읽고 Toolbar `34:3344`·Stale note `34:3375`·Mobile Segmented `67:7290`의
상세 context와 screenshot을 확인했다. SearchField·Segmented·Button·EmptyState를 재사용한다.
검색38px/데스크톱280px, 세그먼트36/28px/모바일 폭 채움, 미갱신6px warning 점과12px 문구다.
원본 spec·prompt 파일은 scripts/에 두고 커밋하지 않는다. 보기 전환·정렬 선택·목록 Excel은
명세에 없어 추가하지 않았다. 전체 최신화 순차 실행은 UI-7 §6.10에 남긴다.

검색은 티커·회사명 대소문자 무시와 앞뒤 공백 제거, 등락은 전주 대비의 양수/음수다.
0·결측은 상승/하락에서 제외한다. 검색에 맞는 종목으로 필터 개수를 보여주며 사용자 순서를
유지한다. 요약 가격이 없으면 목록 표시와 같은 최근 종가를 사용한다.
로컬 필터 입력에는 전역 ⌘K 안내를 숨긴다. Shared SearchField의 기본 동작은 유지한다.
검색 결과가 비면 필터 초기화를 제공하고, 원본 목록이 비면 기존 종목 추가 빈 상태를 사용한다.
편집 진입 시 검색과 등락 필터를 초기화해 숨은 종목의 선택/정렬 혼동을 방지한다.
미갱신은 서버 기준 시각과 저장된 갱신/조회 시각의14일 경과로 판단한다.
데스크톱 날짜는 warning 색과 사유 title, 모바일도 미갱신 개수와 날짜 메뉴를 제공한다.
검색·필터로 데이터를 새로 수집하거나 서버 소유자·API·브라우저 순서 저장을 변경하지 않는다.

## 시도별 검증 기록

- 최초 `npm run typecheck`: 통과.
- 관련4개 파일 단위 검사 최초 실행:18개 통과·1개 실패.
  DashboardClient SSR 회귀 검사의 `not.toContain('radix-')`가 새 세그먼트의
  정상 `data-radix-collection-item` 속성을 팝업 ID로 오인했다.
  설치된 @radix-ui/react-collection의 ITEM_DATA_ATTR를 확인했다.
  검사 목적에 맞게 `id="radix-` 속성과 기존 aria-controls 부재를 검사하도록 수정했다.
  메뉴의 SSR 경계는 유지하며 제품 경고를 숨긴 수정이 아니다.
  같은4개 파일 검사의 첫 재시도는19개 전부 통과했다.
- `npm run test:ui-stock-list` 첫 실행:8개 조합 통과. 증거 `stock-insight-ui5c-954UEo`.
- 표 외곽/헤더/본문의 중복 구조를 StockListTable로 분리한 최종 같은 명령:
  8개 조합 통과. 증거 `stock-insight-ui5c-ACNdSt`.
  기존 목록 runner를 확장하므로 실행 로그와 임시 디렉터리 이름은 UI-5c다.
  이 문서의 이슈 #44 소스를 검증했으며 PR #43의 통과를 재사용한 것이 아니다.

브라우저는 실제 Next 개발 서버·Chrome·독립 Redis와 fixture OIDC/Gateway를 사용한다.
삭제·갱신 응답은 검증 브라우저에서만 대체한다. 실제 DB·브로커·Keycloak은
사용자 지시로 보류한다. fixture 웹 검사와 실제 MSA E2E를 혼용하지 않는다.
컨텍스트 사용률은 환경에서 제공되지 않아 확인 불가다.

## 최종 화면·회귀 검토

주 세션에서 ACNdSt의14개 상태×8개 조합112개 캡처를14개 contact sheet로 직접 검토했다.
검색/하락/결과 없음, 메뉴/갱신, 삭제/순서 변경/저장 후/빈 상태를 확인했다.
별도 에이전트의 독립 검토나 Lighthouse 통과로 분류하지 않는다.
React Doctor는 errors0·warnings2다. DashboardClient 크기와 StockListRow 복잡도 경고를
구조 개선 후속 사항으로 남긴다.

`npm run test:ui-stock-edit` 최초 실행은390px dark 초기 촬영 중 hydration 경고로 실패했다
(증거 `stock-insight-ui5b-5D0RE1`). 경고의 숨은 radio input에 caret-color와 펼쳐진
margin 스타일이 보여 촬영 스타일 주입과 초기화의 경합을 진단했다.
메뉴의 hydration 완료를 나타내는 편집 버튼 활성화를 기다리도록 fixture에 추가했다.
제품 경고 검사와 오류 수집을 유지했다. 첫 재시도8개 조합 통과
(증거 `stock-insight-ui5b-TTBBGX`, cleanup errors없음).

OIDC 빌드 최초 통과 후 개발 브라우저 검사와 `npm run test:web-oidc`를 함께 실행한
인증 검사는 Next startup failed로 실패했다. 개발 서버가 공유 .next를 다시 생성하는
충돌로 진단했다. 개발 서버 종료 후 OIDC 빌드를 다시 통과시키고 인증 검사를 순차 실행한다.
최초 실패를 삭제하거나 최초 통과로 표시하지 않는다.

최종 `npm run check`:103개 파일657개 테스트·타입·린트·포맷 통과.
개발 서버 종료 후 OIDC 빌드 통과, 인증 브라우저 검사의 첫 재시도 통과
(증거 `stock-insight-web-qa-ceHFCS`). 실제 MSA 검사와 구분한다.
