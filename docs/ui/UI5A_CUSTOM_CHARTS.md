# UI-5a 커스텀 차트 디자인 검증 기록

이슈: https://github.com/eom-tae-in/stock-insight/issues/36
브랜치: `feat/36/custom-chart-design`
기준: `develop`의 `f2ea79d7f2388f257ba626a632ae7c14a3891497`.
이슈 #36 단위의 구현·검증 기록이다. 디자인 전체 완료가 아니다.

## 구현 범위

Figma18 프레임 `59:5504` 및 모달 `59:5713`의 상세 context와 screenshot을 읽었다.
기존 공통 Button·Dialog·Checkbox·Segmented·TextField·Sparkline과 토큰을 재사용한다.
커스텀 차트 생성 모달·저장 목록·삭제 확인을 재구성하고, 기간 자동 확장을 없앤다.
최소 기간 미충족 시리즈를 비활성화하며 기간 축소 때 선택 해제와 이유를 표시한다.
주 수는1~260 정수이며 입력 오류·저장 오류는 문구로 표시한다.
기존 localStorage 키와 customChartUpdated 이벤트를 유지한다.
차트 설정은 Zod로 해석하며 잘못된 저장 데이터는 덮어쓰지 않는다.
상세 화면이 티커·가격 데이터를 생성 모달에 전달한다.

개발 전용 `/design-preview/custom-charts`는 실제 표현 컴포넌트와 고정 데이터로 구성한다.
해당 정확한 경로만 기존 개발 환경 예외에 포함하고 운영 페이지 가드를 추가했다.
운영404 검사도 추가했다. 최신 실행 결과는 아래 재개 검증 기록을 따른다.
API·OIDC 세션·CSRF·토큰·DB·services·클라우드는 변경하지 않았다.

## 중단 당시 검증 기록

- 초기 생성·삭제 관련 테스트:2개 파일9개 통과.
- `npm run check` 첫 실행: 테스트의 getByRole 옵션 `exact`가 Testing Library 타입에 없어 TS2769 실패.
  옵션을 제거한 두 번째 실행은98개 파일636개 테스트·타입·린트·포맷 통과.
- 정수 입력·미리보기 경계 추가 후 관련3개 파일13개 테스트 통과.
- hydration 대응 후 최종 관련3개 파일14개 테스트 통과.
- React Doctor 초기 검사: 오류0·경고1(array.includes 반복 검색). Set으로 수정했지만 최종 재검사하지 않았다.
- 최종 전체 check·OIDC 빌드·OIDC 브라우저 검증: 미실행.636개 통과는 최종 수정 전 기록이다.
- 레거시 Supabase 빌드·E2E는 기존 실패 면제를 유지하며 재실행하지 않았다.
- 실제 Docker·DB·RabbitMQ·Keycloak은 사용자 보류를 유지했다.

## 브라우저 실패·복구·중단

명령은 각 실행 모두 `npm run test:ui-custom-charts`다.
검증 환경은 실제 Next 개발 서버·Chrome·독립 Redis와 fixture OIDC/Gateway다.
실제 MSA 연동 검증으로 분류하지 않는다.

1. 첫 실행 실패:390px light에서 삭제 취소 직후 펼쳐진 버튼 수를 검사해 `0 !== 1`.
   모달 닫힘 전 배경이 접근성 트리에서 숨겨진 상태였다.
   대화상자 숨김과 배경 버튼 표시를 기다리도록 검증을 수정했다.
   증거: 임시 경로 `stock-insight-ui5a-mhCpJD`.
2. 두 번째 실행 통과:390/1280/1440/1920px × light/dark8개 조합.
   생성·기간 축소·저장·재로드·삭제 취소·삭제·키보드 열기·Escape·포커스 복귀·넘침을 확인했다.
   증거: 임시 경로 `stock-insight-ui5a-fu1fk4`.
   이후 정수 입력을 수정했으므로 최종 소스의 통과 기록으로 재사용하지 않는다.
3. 수정 후 실행 실패:1280px light에서 React hydration 경고.
   DialogTrigger aria-controls의 서버 값 `radix-_R_aatpesnebmqlb_`와
   브라우저 값 `radix-_R_2atpesnebmqlb_`가 달랐다.
   증거: 임시 경로 `stock-insight-ui5a-c4tjuu`.
   같은 검증의 두 번째 실패이므로 원인 조사 후 최소 복구를 적용했다.
4. 복구:기존 AccountMenu와 같은 useSyncExternalStore 서버 snapshot으로
   첫 렌더에 동일한 비활성 버튼만 표시하고 hydration 뒤 Dialog를 마운트한다.
   서버 렌더에 Radix ID가 없음을 검사하는 회귀 테스트와 실제 ID 연결 검사를 추가했다.
   저수준 upstream 원인을 결정적으로 토글 재현한 것은 아니므로 확정하지 않는다.
5. 복구 실행 실패:390px light에서 `locator.getAttribute: Timeout 10000ms exceeded`.
   `ui-custom-charts-qa.mjs:29`는 모달이 열린 뒤 배경 trigger를 getByRole로 조회한다.
   Radix 모달이 배경을 숨기므로 해당 접근성 locator가 버튼을 찾지 못한다.
   증거: 임시 경로 `stock-insight-ui5a-k8HffV`.
   해당 실행은 초기에 중단돼 hydration 대응 성공을 입증하지 못한다.
   추가 코드 수정·재실행·커밋·PR 생성을 중단했다.

임시 증거 경로의 공통 상위 디렉터리는
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/`다.
각 실패의 failure.json·next.log·cleanup.json을 보존했다.
최종 복구 실행 cleanup.json은 passed=true이며 이 실행의 서버·브라우저·fixture를 정리했다.

## 중단 당시 다음 해결 방법

검증의 aria-controls는 모달을 열기 전에 읽거나, 속성 검사에만 includeHidden을 사용한다.
제품의 배경 숨김·포커스 격리는 유지한다. 재개 후 이 검증 수정을 적용하고 전체8개 조합,
현재 소스의 전체 check·OIDC 빌드·운영 미리보기404를 확인해야 한다.
브라우저 캡처 독립 검토와 Figma 비교, 최종 React Doctor 검사는 아직 완료하지 않았다.
다크 Primary hover 글자 대비 부채는 기존 명세의 검토 항목으로 유지한다.

UI-5 나머지 종목 목록·상세부터 UI-10까지 남아 있다.
본격적인 Spring/Eureka와 클라우드 구성은 디자인 완료 후 별도 단계다.

## 사용자 승인 후 재개 검증: 2026-10-09

사용자가 원인 기반 수정을 승인해 검증을 재개했다. 생성 버튼이 활성화될 때까지
기다리고, 모달을 열기 전에 aria-controls를 읽는다. 비어 있지 않은 ID와 열린
대화상자의 ID가 일치하는지 검사하며 제품의 배경 숨김·포커스 격리는 유지한다.

- `npm run test:ui-custom-charts`: 현재 소스의8개 조합 모두 통과.
  생성·기간 축소·저장·재로드·삭제 취소·삭제·키보드·ID 연결·넘침을 확인했다.
  브라우저 오류와 hydration 경고는 없었다. cleanup.json도 passed=true다.
  증거: `stock-insight-ui5a-YQE2jj`(위 공통 임시 디렉터리).
- React Doctor 최종3개 컴포넌트 검사: 오류0·경고0.
  증거: `/tmp/stock-insight-ui5a-react-doctor.json`. supply-chain 검사는 제외했다.
- 첫 `npm run check`: 개발 서버와 동시에 실행해 `.next/types` 생성 중
  TS2305·TS2536·TS2344 등의 타입 오류가 발생했다. 소스 타입을 완화하지 않고
  개발 서버 종료 후 운영 빌드로 생성 타입을 재생성하고 검사를 실행한다.
- `WEB_AUTH_MODE=oidc npm run build`: 통과.
- 빌드 후 `npm run check`:98개 파일638개 테스트·타입·린트·포맷 통과.
- `npm run test:web-oidc`: 로그인·작업·삭제·로그아웃·접근 차단 및
  운영 환경의 커스텀 차트 미리보기404 검사 통과.
  증거: `stock-insight-web-qa-XhXmDU`(위 공통 임시 디렉터리).
  실제 Next·Chrome·Redis와 OIDC/Gateway fixture를 사용하므로 실제 MSA 통과가 아니다.

이 기록은 이전 실패와 수정 전 통과 기록을 대체·삭제하지 않는다.

## PR 전 최종 검토

주 세션에서 실제 브라우저 증거와 변경 diff를 재검토했다. 별도 에이전트의
독립 검토로 분류하지 않는다. 최초 캡처 검토에서 삭제창이 애니메이션 도중
촬영되고 삭제 버튼에 일반 Primary 스타일이 섞인 것을 확인했다.
삭제는 공통 Button의 danger variant로 지정하고 창 배경은 card 토큰으로 맞췄다.
캡처는 screenshot의 animations=disabled로 유한 애니메이션 종료 상태를 기록한다.

이후 `npm run test:ui-custom-charts`를 다시 실행해8개 조합 모두 통과했다.
최종 증거는 공통 임시 디렉터리의 `stock-insight-ui5a-CGrqIm`다.
result.json·cleanup.json이 passed=true이며7개 상태 ×8개 조합의56개 PNG를
검사하고7개 review 이미지에서 전 조합의 배치·줄바꿈·모달·삭제 상태를 확인했다.
Pillow가 없어 첫 보조 캡처 모음 생성이 실패했고, 이미 설치된 sharp로 생성했다.
제품 검증 실패나 의존성 추가로 처리하지 않는다.

| 확인 항목                                      | 결과 | 증거                                   |
| ---------------------------------------------- | ---- | -------------------------------------- |
| 기간 유지·부족한 시리즈 비활성·축소 시 사유    | 통과 | builder 테스트, period-reduced PNG     |
| 기존 저장 키·생성 이벤트·재로드·삭제 취소      | 통과 | builder/view 테스트, result.json       |
| 서버 첫 렌더·실제 Dialog ID·키보드·포커스 복귀 | 통과 | 서버 렌더 테스트, result.json, end PNG |
| 저장 오류 때 기존 데이터 보존                  | 통과 | builder 저장 실패 테스트               |
| 모바일 모달 경계·설명 줄바꿈·삭제 버튼 구분    | 통과 | modal/delete-dialog PNG, geometry      |
| 운영 미리보기 차단·인증 회귀                   | 통과 | OIDC 브라우저 검증의404 및 인증 검사   |

Figma 모달과560px 폭·20px 반경·24px 여백·섹션 순서·시리즈 설명을 비교했다.
닫기 버튼은44px 터치 영역, 미리보기는 기존 공유 Sparkline의48px 높이를 유지한다.
Figma의72px 그래프와 전체 높이가 동일하다고 주장하지 않는다. 저장 카드 안의
UnifiedChart 내부 컨트롤은 기존 구현이며 후속 종목 상세 단계에서 재스타일한다.
공통 Primary hover 대비 부채와 전체 UI-5~UI-10은 후속 검토 대상이다.

최종 스타일 수정 후에도 `WEB_AUTH_MODE=oidc npm run build`와
`npm run check`(98개 파일638개 테스트·타입·린트·포맷)가 통과했다.
`npm run test:web-oidc`의 최종 증거는 `stock-insight-web-qa-1vy6fE`다.
React Doctor 최종3개 컴포넌트 재검사도 오류0·경고0이다.
