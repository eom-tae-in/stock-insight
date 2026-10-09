# UI-3 앱 셸 구현 보고

이슈: https://github.com/eom-tae-in/stock-insight/issues/32
브랜치: `feat/32/app-shell`
기준: `develop`의 `5ef82a9`(UI-2 PR #31 squash merge).

이슈 생성 후 브랜치를 만들었다. 구현과 수동 검증 결과를 구분하며,
새 PR은 develop 대상으로 생성하고 병합 전에 멈춘다.
로컬 scripts 지시서·명세, 자격증명, 브라우저 캡처는 커밋하지 않는다.

## 1. 변경한 화면과 대응 Figma 프레임

데스크톱 사이드바 `8:3`, 상단바 `8:146`(홈 `8:2`),
계정 메뉴 `39:4928`(상세 프레임 `15:2366`), 모바일 셸 `16:2795`를 참조했다.
Figma design context와 실제 라이트·다크 캡처를 비교했다.
기존 shadcn/Radix와 Lucide를 재사용하며 새 UI 라이브러리는 없다.

- 1024px부터 사이드바240px·상단바64px. 활성 링크·개수·사용자 순서의 앞5종목.
- 완료 ISO 주차·월요일–금요일 범위·다음 반영일·14일 이상 미갱신 경고.
- 모바일 헤더52px·하단 탭86px·상세 제목 중앙·뒤로가기.
- 데스크톱300px 계정 메뉴·모바일 내 정보 시트. 이름·이메일·화면 모드·로그아웃.
- OIDC `/trends-jobs`는 축소 셸만 사용하며 레거시 저장 화면 링크를 노출하지 않는다.
- 개발 전용 `/design-preview/shell`은 고정 데이터로 위 표현 컴포넌트를 렌더한다.
  미들웨어와 페이지 가드 모두 운영 환경에서는404다. 다른 경로를 인증 예외로 만들지 않았다.

## 2. 바뀐 동작과 유지한 동작

D2의 시스템·라이트·다크와 Pretendard를 유지한다. 새 등락은 D7 공통 ChangeText를 쓴다.
로컬 지시서 D7에 tertiary 문구가 아직 있지만, 사용자 확정사항에 따라0·null은 text/secondary다. DESIGN.md에 반영된 UI-2 결정을 유지한다.

`useStockOrder`는 기존 `stock-sort-order`의 id→index 형식을 유지한다.
서버 응답 순서로 SSR하고 hydrate 뒤 저장 순서를 적용한다.
같은 탭과 다른 탭의 순서 변경을 반영하며, 잘못된 JSON·인덱스는 서버 순서로 표시한다.
목록의 dnd-kit KeyboardSensor·삭제 확인·최신화 API는 유지한다.
삭제 후 남은 종목의 사용자 순서가 서버 순서로 되돌아가는 회귀를 수정했다.

레이아웃의 인증된 사용자로 `getSavedSearches`·`getKeywords`를 조회한다.
React.cache로 동일 요청의 목록 페이지 조회를 공유하며, 클라이언트 셸에는 id·이름·등락과
개수·주차·미갱신 요약만 전달한다. 신규 셸로 원본 시계열이나 사용자 소유자 필드를 넘기지 않는다.
기존 페이지의 차트용 데이터 계약과 계산 함수는 변경하지 않았다.
관리자 표시는 서버 `isAdminEmail` 결과로 결정한다.

기존 Supabase getUser/signOut→login, OIDC requestSession·POST 로그아웃·hidden csrf를 유지한다.
OIDC 토큰·세션 저장·CSRF 검증·BFF·폴링·늦은 응답 처리·작업 상태 로직은 변경하지 않았다.
계정 메뉴는 SSR에 동일한 프로필 버튼을 그리고 hydration 완료 뒤 Radix를 활성화한다.
그 전 버튼은 disabled이며, hydration 경고를 무시하거나 ID를 하드코딩하지 않는다.

## 3. 실행한 검증 명령과 실제 결과

- `npm run check`: 최종 타입·린트·포맷·96개 파일616개 테스트 통과.
- `WEB_AUTH_MODE=oidc npm run build`: 프로덕션 컴파일·타입·18개 정적 페이지 생성 통과.
- `npm run test:ui-shell`: 최종390/1280/1440px × light/dark6개 조합 통과.
  캡처46개, Pretendard 실제 font face 로딩, 가로 넘침 없음, hover/focus,
  키보드 메뉴·테마 선택·Escape 포커스 복원, aria-controls/id·aria-labelledby 연결,
  순서 변경의 사이드바/본문 동기화·재로드 복원·빈 목록·관리자 링크·스크롤 끝을 확인했다.
  pageerror·console error0, cleanup.json passed=true.
- `npm run test:web-oidc`: 실제 Next 프로덕션 서버·Redis·Chrome + fixture OIDC/Gateway에서 통과.
  두 개발 미리보기의 HTTP404, 로그인·테마·작업 완료·재분석·데이터 없음·폴링 중단·CSRF403·삭제·로그아웃·미인증401을 확인했다.
  실제 Java/RabbitMQ/Keycloak E2E 통과로 분류하지 않는다.
- 레거시 `npm run build`·`npm run test:e2e`: Supabase 환경 부재로 실패한 기존 상태에 대한 면제 유지,
  재실행하지 않았으며 통과로 쓰지 않는다.
- Docker 실제 DB/broker/Keycloak 런타임은 기존 사용자 보류 유지. 복구하거나 실행하지 않았다.
- CI/CD를 추가하거나 GitHub Actions를 활성화하지 않았다.

최종 셸 증거는 `/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui3-BTUxWt`다.
최종 OIDC 증거는 `/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-web-qa-bOqJII`다.
로그인·작업 결과·계정 메뉴·가입·비밀번호 화면의390/1440/1920px × light/dark 캡처29개를 남겼다.
수정된 화면을 직접 확인했고, 개발 도구 표시가 하단 탭·프로필을 가리던 문제도 제거했다.
이전 최종 복구 실패 기록은 `/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui3-mdq5br`,
재개 후 모달 배경 트리거 속성 조회 실패 기록은 `/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/stock-insight-ui3-feKAe7`에 남아 있다.
Node fixture의 MODULE_TYPELESS_PACKAGE_JSON 경고는 남아 있다.

### 실패·중단·재개 이력

- 첫 `npm run typecheck`: UserMenu getUser 콜백의 암묵적 any 오류. 공식 UserResponse 타입으로 수정 후 통과.
- 이전 `npm run test:ui-shell` 첫 실패: 다크 모드 ThemeToggle title의 SSR/클라이언트 불일치.
  마운트 전 동일 제목으로 수정하고6개 조합 통과했다.
- 모바일 제목 중앙·개발 도구 표시를 정리한 뒤 두 번째 실패: 숨겨진 데스크톱 제목까지 선택하는 strict locator 오류.
  표시된 제목만 검사한 복구 실행에서는 Radix 메뉴 id·시트 aria-controls hydration 불일치가 발생했다.
  규칙대로 개발·추가 재시도를 중단하고 미커밋 상태와 PR 미생성을 보고했다.
- 사용자 재개 뒤 첫 브라우저 조사 실행은6개 조합 통과했다. 간헐적 경고를 해결됐다고 분류하지 않았다.
  최초 로드/종목 순서 저장 후 재로드를 구분하는 임시 진단을 추가했고 최종 소스에서는 제거했다.
- 삭제 순서 회귀를 기존 DashboardClient 테스트에 추가한 첫 실행은3/4 통과했다.
  기대 `search-3:0,search-2:1`에 실제 `search-2:0,search-3:1`로 실패했다.
  필터 대상을 서버 원본 records에서 사용자가 보던 ordered로 바꾼 뒤 관련3파일10테스트 통과.
- 계정 메뉴의 hydration 이후 마운트 대응을 적용한 브라우저 실행은6개 조합 통과했다.
  이후 실제 aria-controls/id 연결 검사를 추가한 첫 실행은 모바일 모달이 배경 트리거를 숨겨
  getByRole의 속성 조회가10초 시간 초과했다. 팝업 연결 속성만 includeHidden으로 조회하도록 수정했다.
  배경 포커스·키보드·팝업 표시·에러 검사는 제외하거나 약화하지 않았다.

### hydration 원인과 해결 방향

실제로 관측한 증상은 서버·클라이언트의 Radix useId 값 불일치다.
앱의 저장 순서 훅은 서버 스냅샷을 사용하며 첫 hydration에서는 서버 순서를 유지한다.
아직 이 앱에서 저수준 원인을 결정적으로 토글 재현하지 못했으므로 특정 upstream 결함을
확정 원인으로 단정하지 않는다.

공식 React [useId 문서](https://react.dev/reference/react/useId)는 동일한 렌더 트리를 요구한다.
[Radix #3700](https://github.com/radix-ui/primitives/issues/3700)은 Next15.5+의 유사 증상을 기록하며,
React의 [렌더 재개 시 useId 경로 추적 수정 #35518](https://github.com/facebook/react/pull/35518)은
suspend 후 Fiber의 Forked 플래그 유실을 원인으로 설명한다. 현재 증상과 부합하는 후보다.

이번 대응은 서버 프로필·탭 레이아웃을 유지하고, 상호작용 메뉴·시트의 ID 생성만 hydration 이후로
옮기는 제한적인 회피다. Next/React를 임의 다운그레이드하거나 canary로 교체하지 않았다.
현재 Next가 번들한 React는 `19.2.0-canary-0bdb9206-20250818`이며, package.json의
React19.1과 구분된다. 장기적으로 해당 수정이 포함된 안정 버전으로 별도 업그레이드·회귀 검증한 뒤 이 가드 제거를 검토한다.

## 4. 디자인과 다르게 구현한 부분과 이유

- 통합 검색·⌘K·새 분석 포커스는 지시서 UI-8 범위다. 현재 검색은 `/search`,
  새 분석은 기존 `/keyword-analysis/new`로 연결한다. 이번 단계에 팔레트가 구현됐다고 보고하지 않는다.
- Figma 마크28px·일부 아이콘18px보다 명세의 마크32px·내비게이션 아이콘20px를 우선했다.
- 모바일 시트는44px 닫기 버튼과 safe-area 패딩을 포함한다. 브라우저 캡처에 OS 상태바를 모사하지 않았다.
- 미리보기 본문은 셸 상태 검사용 고정 데이터다. 홈 전체 디자인 이관은 UI-7이며 픽셀 동일성을 주장하지 않는다.
- 계정 모드의 설명·서버 프로필 글자 길이에 따라 메뉴 높이가 달라진다. 폭300px는 유지했다.
- UI-2에서 확인한 다크 Primary hover 지정색의 흰 텍스트 대비4.23:1 문제는 남아 있다.
  지정 토큰은 그대로 유지했다.4.5:1 요구와 색 명세를 함께 충족하려면 hover 토큰 조정이 필요하다.
  전체 접근성 대비가 통과했다고 보고하지 않는다. 해결안으로 다크 hover만
  `#8554EE`로 조정하면 흰 글자 대비는 약4.67:1이다. 명세·Figma를 함께 갱신할 후보이며 이번 PR에는 적용하지 않았다.

## 5. 남은 일

- UI-4 표시 규칙 라이브러리와 계산 경계 테스트.
- UI-5·UI-6 제품 본문 이관, UI-7 홈, UI-8 통합 검색, UI-9 내보내기·인증·운영·작업 화면.
- 안정 Next/React 업그레이드 검증 후 계정 메뉴 hydration 가드 제거 검토.
- 다크 hover 토큰 대비 충돌 정리.
- 레거시 Supabase 실제 페이지 런타임은 환경 부재로 확인하지 못했다.
  실제 DB/broker/Keycloak 런타임은 기존 사용자 보류를 유지하며 Docker 복구를 시도하지 않았다.
  fixture OIDC/Gateway 검증을 실제 MSA 전체 E2E로 분류하지 않는다.
