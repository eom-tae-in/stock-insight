# UI-2 공통 컴포넌트 구현 보고

이슈: https://github.com/eom-tae-in/stock-insight/issues/30
브랜치: `feat/30/ui-components`
기준: `develop`의 `b37d793`.

사용자의 순차 처리 지시에 따라 PR #29를 검사 상태 CLEAN·MERGEABLE,
원격 검사 목록 없음(Actions 비활성화)과 기존 수동 검증 결과를 확인한 뒤 squash merge했다.
제목은 `[FEATURE] UI 기반 토큰과 글꼴 및 시스템 테마 적용(#29)`이며 본문은 한글로 지정했다.
이후 develop을 fast-forward하고 이슈 #30 생성 후 브랜치를 만들었다.

두 차례 복구 실패 후 규칙대로 중단·보고했고, 각각 사용자의 재개 지시를 받은 뒤 이어갔다.
최종 구현은 아래 수동 검증을 통과했다. 공통 컴포넌트의 구현과 검증이며 제품 화면 이관은 아니다.
PR은 develop을 대상으로 만들고 머지 전에 멈춘다. 실패 이력은 아래에 유지한다.

## 1. 변경한 화면과 대응 Figma 프레임

명세 §2의 Button/IconButton, Segmented, Tabs, SelectChip, SearchField/TextField,
Checkbox, StatusBadge, ChangeBadge/ChangeText, SeriesToggle, AlertBanner,
MetricTile, Sparkline, TickerLogo, Kbd, Dialog, Popover/Menu와 표·목록 행 스타일을 구현했다.
EmptyState도 추가했다. 기존 shadcn/Radix와 Lucide를 재사용하며 새 UI 라이브러리는 없다.

개발 전용 `/design-preview/components`는 고정 데이터로 실제 컴포넌트를 렌더한다.
해당 정확한 경로만 개발 환경에서 인증 미들웨어보다 먼저 허용하고, 다른 환경에서는 404다.
페이지에도 development 이외 notFound 가드를 두었다. 기존 OIDC 분기와 보호 경로는 수정하지 않았다.

Figma Components `2:3`, Controls `4:2`, Data Display `5:49`, AlertBanner `7:178`,
TextField `33:523`, 데이터 행 `7:97`을 참조했다. 페이지 노드의 design-context 호출은
선택 필요 오류를 반환해 metadata로 실제 프레임 ID를 확인하고 프레임별 context·캡처를 받았다.
참조 캡처는 `/tmp/stock-insight-ui2-figma-components.png`에 있다.

## 2. 바뀐 동작과 유지한 동작

D7의 상승은 up, 하락은 down, 0·null은 text/secondary로 정리했다.
DESIGN.md의 UI-1 tertiary 우선 기록을 바로잡았다. 새 등락 컴포넌트에서만 색을 결정한다.
제품의 기존 등락 표시 연결은 지시서 UI-5·UI-6에 남긴다.

숫자 도우미는 등락 소수2자리·U+2212·부호, 비율1자리, 차이p, 관심도정수,
가격 통화기호/2자리, 거래량 K/M/B, ISO 주차, 결측 대시를 제공한다.
기존 통화 판정·가격 포맷 함수와 계산 계약은 수정하지 않았다.
스파크라인은 최근52점만 그리고 null 구간을 연결하지 않는다.

기존 Button variant 이름과 asChild 계약은 유지하며 명세 별칭·상태를 추가했다.
인증·CSRF·토큰·BFF·API·저장·계산·폴링 코드는 변경하지 않았다.

## 3. 실행한 검증 명령과 실제 결과

- `npm run check`: 최종 타입·린트·포맷·91개 파일 589개 테스트 통과.
- `npx vitest run src/lib/format/display.test.ts src/components/shared/ui-foundations.test.tsx 'src/app/(dev)/design-preview/components/page.test.tsx'`:
  첫 실행 39/40, 두 번째 실행 39/40. 원인 조사 후 복구 실행 40/40 통과.
- `npm run test:ui-components`: 과거 실패·중단 기록은 아래에 보존. 최종 390/1280/1440px × light/dark 6개 조합 통과.
  각 조합의 컨트롤16개 hover/focus, disabled17개 40% 불투명도, 버튼 pressed,
  세그먼트 화살표·선택·탭·체크박스·메뉴·대화상자·팝오버·결측 사유 툴팁을 확인했다.
  실제 Pretendard font face 로딩, 가로 넘침 없음, 표 헤더40px, pageerror0도 확인했다.
- `WEB_AUTH_MODE=oidc npm run build`: 프로덕션 컴파일·타입·정적 페이지 생성 통과.
- `npm run test:web-oidc`: 실제 Next/Redis/Chrome + fixture OIDC/Gateway에서 통과.
  운영 미리보기 HTTP404, 로그인·작업 완료·재분석·데이터 없음·폴링 중단·CSRF403·삭제·로그아웃·미인증401 확인.
  실제 Keycloak/Java/RabbitMQ E2E 통과로 분류하지 않는다.
- 레거시 `npm run build`, `npm run test:e2e`: 기존 Supabase 환경 부재 실패에 대한 사용자 면제 유지, 재실행하지 않았다.
- Docker 실제 DB/broker/Keycloak: 사용자 보류 유지, 복구나 실행을 시도하지 않았다.
- screenshots와 scripts 지시서·명세는 커밋하지 않았다. CI/CD를 추가하거나 Actions를 활성화하지 않았다.

최종 공통 컴포넌트 증거:
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui2-93s4ty`.
result.json passed=true, 캡처132개, cleanup.json passed=true.
Figma 참조와 모바일·데스크톱 light/dark의 입력·숫자·상태·표·메뉴·대화상자 캡처를 직접 비교했다.
최종 OIDC 증거:
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-web-qa-jhJebQ`.
result.json passed=true, 캡처29개.

최종 check의 첫 실행은 이전 UI-1 로컬 검토 증거 파일의 Prettier 오류로 실패했다.
해당 git 제외 파일의 포맷만 정리하고 같은 명령을 다시 실행해 통과했다. 검사 제외 규칙을 추가하지 않았다.
기존 Node fixture의 MODULE_TYPELESS_PACKAGE_JSON 경고는 남아 있다.

### 세그먼트 단위 테스트 실패·복구

첫 실패는 ArrowRight 이후 C 라디오가 선택되지 않은 오류였다.
선택 완료를 waitFor로 기다리도록 수정한 두 번째 실행도 같은 오류였다.
Radix radio-group의 keydown/up 참조와 roving-focus의 setTimeout 포커스 코드를 읽었다.
user-event가 예약된 포커스 이동보다 먼저 keyup을 처리하면 onFocus 시
키가 눌린 상태가 아니므로 선택하지 않는 원인을 확인했다.
테스트를 ArrowRight keydown 유지 → 선택 완료 확인 → keyup으로 최소 수정했다.
복구 실행은 3개 파일 40개 테스트 통과했다. 제품의 키보드 로직을 우회하지 않았다.

### 최초 브라우저 검증 실패·복구 후 중단 이력

1. `npm run test:ui-components` 첫 실행은 exit13과 unsettled top-level await로 실패했다.
   이미 종료된 Next 프로세스의 exit 이벤트를 뒤늦게 기다리는 정리 코드가 원래 오류를 가렸다.
2. 종료 상태 확인과 정리 전에 next.log 기록을 추가한 두 번째 실행은 exit1이었다.
   instrumentation의 OIDC 설정 검사에서 AUTH_CONFIGURATION_INVALID로 Next가 시작하지 못했다.
   검증 실행기가 WEB_AUTH_MODE=oidc만 지정하고 필수 fixture 설정을 제공하지 않은 원인이다.
3. 기존 OIDC provider·Redis fixture와 격리 HTTP Gateway를 실제 시작하고,
   해당 주소와 임시 생성 세션 암호 키를 제공하도록 최소 수정했다.
   복구 실행에서 Next 시작과 미리보기 HTTP200은 확인했으나 전체 검증은 실패했다.
   종료 오류는 `TypeError: provider.close is not a function`이다.
   provider 반환 계약은 `{ server, issuer, ... }`이며 close 메서드가 없다.
   finally의 오류가 앞선 브라우저 오류를 덮어써 원래 오류는 보존되지 않았다.
   캡처 진행 위치상 세그먼트 키보드 선택 확인 부근이 다음 조사 대상이지만,
   실제 최초 브라우저 오류는 확인하지 못했으므로 제품 원인으로 단정하지 않는다.

복구 검증도 실패했으므로 개발·수정·재시도를 중단했다. 통과 result.json은 없다.
불완전 증거 디렉터리는
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui2-w5Wuiy`다.
390px light의 기본/일부 hover/focus 캡처9개와 next.log만 있다.
라이트·다크 전체 상태 매트릭스가 통과했다고 주장하지 않는다.
종료 후 프로세스 확인에서 이 실행의 Next/Chrome/Redis는 남아 있지 않았다.
기존 사용자의 6379 Redis는 종료하거나 변경하지 않았다.

## 4. 디자인과 다르게 구현한 부분과 이유

로컬 지시서 D7과 명세 §2에는 tertiary 문구가 여전히 남아 있었다.
이번 사용자의 명시 정정인 text/secondary를 우선했으며 Figma ChangeBadge Flat과 일치한다.
scripts 아래 두 문서는 수정하지 않았다.

미리보기는 제품 레이아웃이 아니라 상태 확인용 모음이며 실제 데이터·API 호출을 추가하지 않는다.
Figma의 Noto Sans/Inter 대체 표시는 명세의 Pretendard를 따른다.
반경8/12/5를 공통 CSS 토큰으로 추가했다. Button lg=40px 등 기존 호출 계약은 유지했다.
미리보기는 Figma 컴포넌트 페이지 전체 레이아웃을 복제하지 않으며 제품 화면은 후속 단계에서 조립한다.

실측 명세 충돌: 다크 Primary hover의 #8B5CF6와 흰 글자 대비는 약4.23:1이다.
지시서 §7의4.5:1 주장과 달라 지정 토큰을 임의 변경하지 않고 남은 디자인 검토 항목으로 기록한다.
모든 텍스트 조합의 접근성 완료를 주장하지 않는다.

지시서 §3의 테마·색·DESIGN 설명은 UI-1 병합 전 내용이다. 현재 layout은 system/light/dark,
글꼴은 자체 호스팅 Pretendard, globals·차트는 새 의미 토큰 기반이며 DESIGN.md는 리디자인 계약이다.
나머지 기능 사실과 기존 계산·인증·저장 계약은 UI-1 대조 보고를 따르며 이번 PR에서 바꾸지 않는다.

## 5. 남은 일과 다음 해결 방법

- UI-2 PR 검토와 머지. 이번 작업에서는 머지하지 않는다.
- 다크 Primary hover의 텍스트 대비와 지정 토큰 충돌에 대한 디자인 결정.
- UI-3 새 앱 셸, UI-5/UI-6 제품 화면의 공통 등락 컴포넌트 연결과 YoY 막대 규칙.
- 나머지 단계의 화면·계산·PNG·인증/작업 재스타일·PRD 최종 갱신.
- 실제 런타임 검증 #24와 레거시 화면 자체의 브라우저 검증 환경 확보.

### 첫 재개 후 실패·중단 이력

명령은 세 실행 모두 `npm run test:ui-components`다.
provider 종료를 `stop(provider.server)`로 수정하고 최초 오류를 cleanup 전에 보존했다.
브라우저 동작 제한 시간도 지정했다. 아래 세 실행의 cleanup.json은 모두 통과했다.

1. 첫 실행: ArrowRight 이후 3Y 선택 확인이 10초 제한 시간으로 실패했다.
   증거: `stock-insight-ui2-ALthXO/failure.json`, `390-light-keyboard.json`.
   키보드 상태에서 1Y가 계속 선택·포커스돼 있었으며 Radix의 지연 포커스 처리보다
   keyup이 먼저 발생하는 단위 테스트와 같은 검증 이벤트 순서 문제였다.
   keydown 유지 → 선택 확인 → keyup으로 최소 수정했다.
2. 두 번째 실행: 키보드·선택·체크박스·대화상자·메뉴·팝오버 확인을 진행한 뒤
   결측 사유 툴팁 캡처에서 `locator.screenshot: Element is not attached to the DOM`으로 실패했다.
   증거: `stock-insight-ui2-a2PLcr/failure.json`.
   캡처 로그의 자동 scroll-into-view와 Radix Tooltip의 상위 스크롤 시 닫기 처리를 대조했다.
3. 복구 실행: 툴팁 트리거를 먼저 스크롤한 뒤 포커스하고 추가 스크롤 없는
   page.screenshot으로 캡처했다. 툴팁 캡처와 끝 화면 캡처까지 진행했으나,
   마지막 pageerror 검사에서 React hydration 오류로 실패했다.
   서버 문구는 `prefers-color-scheme을 따라요.`, 브라우저 문구는
   `이 기기(브라우저)에 저장돼요.`였다.
   기존 ThemeSelector가 next-themes의 서버 undefined와 브라우저 저장 테마를
   첫 렌더에서 바로 문구에 반영하는 분기와 일치한다.
   최신 증거 디렉터리는
   `/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui2-luZggd`다.

복구 실패 후 추가 구현·검증·커밋·PR 생성을 하지 않았다. 390px light 캡처는
불완전 증거이며 나머지 너비·다크 검증이나 전체 통과를 의미하지 않는다.
다음 해결 방법은 ThemeSelector의 서버와 브라우저 첫 렌더를 일치시키고,
hydration 회귀를 확인한 뒤 전체 상태 매트릭스와 아래 검증을 실행하는 것이다.

### 두 번째 재개 후 해결

사용자가 재개를 지시하고 Pretendard 우선·로드 불가 시 대체 글꼴을 허용했다.
글꼴 오류는 아니므로 기존 자체 호스팅과 시스템 대체 스택을 유지했다.
ThemeSelector는 useSyncExternalStore의 서버 snapshot으로 서버와 브라우저 첫 렌더를
system으로 일치시키고, hydration 이후 저장 테마를 반영하도록 최소 수정했다.
SSR → light/dark hydration의 복구 오류0과 저장된 선택 복원을 확인하는 회귀 테스트2개가 통과했다.
실제 브라우저 6개 조합도 통과했고, 이후 모바일 테마 선택기 폭과 표 헤더 높이,
메뉴 변형의 크기·비활성 상태·reduced-motion을 명세로 정리한 최종 실행도 통과했다.
검사 삭제나 오류 무시, hydration 경고 억제로 통과시키지 않았다.
