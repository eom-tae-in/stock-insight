# UI-5b 관심 종목 편집 구현과 검증 기록

이슈: https://github.com/eom-tae-in/stock-insight/issues/38
브랜치: `feat/38/stock-edit-design`
기준: PR #37 squash 병합 커밋 `cfc3bd0b9b2e6ecdc4e6c66e9b4f25c7bc5cb631`.
이슈 생성 후 브랜치를 만들었다. 아래 중단 기록은 재개 이전의 이력이다.
develop에는 이번 변경을 직접 반영하지 않았다.

## 구현과 미완료 범위

편집 메뉴·삭제 선택 바·순서 변경 바·삭제 확인창을 별도 컴포넌트로 분리했다.
공통 Button·Checkbox·DropdownMenu·AlertDialog와 기존 디자인 토큰을 사용한다.
전체 선택·선택 해제·선택 개수·삭제 비활성·삭제할 티커·위험 작업 스타일을 표시한다.
순서 변경에 명시적 취소 버튼과 브라우저 저장 안내를 추가했다.
기존 DELETE API·갱신·stock-sort-order 저장 키·KeyboardSensor를 유지한다.

Figma 삭제 `56:4526`과 순서 변경 `56:5102`의 context와 screenshot을 읽었다.
삭제창의420px 폭·20px 반경·24px 여백·경고 아이콘·20px 제목을 적용했다.
목록 본체는 기존 카드 그리드이며 완성된 Figma 목록으로 분류하지 않는다.
기존 카드의 숫자·색상·갱신 표시와 표·모바일 행 디자인은 다음 목록 본체 단계다.
개발 전용 `/design-preview/stock-edit`와 운영 차단 검사를 추가했다.
실제 인증·서비스·DB·브로커·클라우드·Actions는 변경하지 않았다.

## 재개 이전 검증 이력

- 초기 `npx vitest run src/components/stock/dashboard-client.test.tsx`:4개 테스트 통과.
- 전체 선택 해제·삭제 취소·순서 취소 추가 후 같은 명령:7개 테스트 통과.
  최종 삭제창 스타일과 미리보기 추가 전 기록이며 최종 전체 검증으로 사용하지 않는다.
- React Doctor 변경3개 컴포넌트: 오류0·경고3.
  기존 reorderBackup 상태와 카드 컨테이너 클릭의 키보드·시맨틱 경고가 남아 있다.
  증거: `/tmp/stock-insight-ui5b-react-doctor.json`. supply-chain 검사는 제외했다.
- 최종 전체 check·OIDC 빌드·운영404·인증 브라우저 검증: 미실행.
- UI-5a의638개 테스트·8개 조합 통과를 이번 작업의 통과로 사용하지 않는다.
- 레거시 Supabase 실패 면제, Docker·실제 DB·RabbitMQ·Keycloak 보류를 유지했다.

## 브라우저 실패와 복구

세 번 모두 명령은 `npm run test:ui-stock-edit`다.
실제 Next 개발 서버·Chrome·독립 Redis와 fixture OIDC/Gateway를 사용했다.
고정 데이터의 DELETE는 검증 브라우저에서만204 응답으로 대체한다.
실제 저장 데이터 삭제나 실제 MSA 연동 검증으로 분류하지 않는다.

1. 첫 실패:390px light에서 Space → ArrowDown → Space 뒤
   첫 종목이 MSFT로 바뀌어야 하지만 AAPL 그대로였다.
   `moveFirst`의 `toHaveText('MSFT')`가5000ms timeout으로 실패했다.
   증거: `stock-insight-ui5b-VnxqzY`.
2. 첫 수정:드래그 활성 aria-pressed=true와 이동 대상 announcement를
   기다리고 마지막 Space로 놓도록 검사 순서를 바꿨다.
   두 번째 실행은390px light를 통과했지만390px dark에서 실패했다.
   다음 대상 `preview-stock-1`을 기다렸지만 announcement는
   `Draggable item preview-stock-0 was moved over droppable area preview-stock-0.`였다.
   증거: `stock-insight-ui5b-U1xfUU`.
3. 두 번 실패 후 원인 조사:설치된 dnd-kit의 sortableKeyboardCoordinates는
   active·collisionRect·droppableRects가 있어야 방향키 이동 대상을 반환한다.
   활성 상태만 기다려서는 이동 준비를 입증하지 못한다는 가설로 최소 복구했다.
   초기 대상 `preview-stock-0`의 announcement까지 확인한 뒤 방향키를 누르고,
   다음 대상 `preview-stock-1`을 기다리도록 수정했다.
4. 복구 검증도390px light에서 실패했다. 초기 대상 announcement는 확인됐으나
   방향키 뒤 대상은 `preview-stock-0` 그대로였다. 같은5000ms timeout이다.
   최종 위치: `tests/fixtures/ui-stock-edit-qa.mjs:74`.
   증거: `stock-insight-ui5b-0ZsJG5`.
   따라서 초기 준비 시점만이 원인이라는 가설은 충분하지 않다.
   센서 이벤트·스크롤·좌표 계산 중 실제 원인은 확정하지 않았다.

임시 증거의 공통 디렉터리는
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/`다.
failure.json·next.log·상태 PNG를 보존했다. 최종 cleanup.json은 passed=true이며
해당 실행의 서버·브라우저·Redis·fixture를 정리했다.

## 재개 이전 중단 상태와 당시 다음 해결

사용자의 AGENTS.md 복구 후 중단 규칙에 따라 추가 제품 수정·검증 재시도·
커밋·PR 생성·병합을 중단했다. 당시 미커밋 파일은 다음과 같았다.

- package.json
- src/components/stock/dashboard-client.tsx 및 dashboard-client.test.tsx
- src/components/stock/stock-edit-toolbar.tsx 및 stock-delete-dialog.tsx
- src/components/design-preview/stock-edit-showcase.tsx
- src/app/(dev)/design-preview/stock-edit/page.tsx 및 page.test.tsx
- src/lib/design-preview.ts
- tests/fixtures/ui-components-smoke.mjs 및 ui-stock-edit-qa.mjs
- tests/fixtures/web-oidc-smoke.mjs
- docs/architecture/MIGRATION_STATUS.md 및 이 문서

재개 시에는 먼저 같은 고정 데이터로 기준 커밋과 현재 구현을 비교하고,
방향키가 센서에 전달되는지·계산된 이동 좌표·충돌 대상·스크롤 위치를 기록한다.
검증 코드의 시점 문제인지 기존 또는 변경된 키보드 정렬 문제인지 구분한 뒤
근거가 있는 최소 수정을 적용해야 한다. 단순 대기 시간 증가나 검사 생략은 하지 않는다.
최종8개 화면 조합·전체 check·OIDC 빌드·운영 차단·시각 검토 통과 후 PR을 만든다.

UI-5 목록 본체·상세부터 UI-10까지 디자인은 아직 남아 있다.

## 2026-10-09 사용자 지시로 재개

공통 규칙은 이슈 #39·PR #40으로 먼저 변경하고 squash 병합했다
(`58255084e89d9e0963675d1495ea22222336aec8`). 최초 실패 뒤 근거 있는 수정으로
최대 두 번 재시도하며, 두 번째 재시도도 실패할 때 중단한다. 환경이 제공하는
컨텍스트 사용률이55% 이상일 때 기록하고 중단한다. 현재 사용률은 제공되지 않아
확인 불가이며 수치를 추정하지 않았다. 이슈 #38 담당자는 eom-tae-in,
라벨은 enhancement다. 재개 전 실패 기록은 위에 보존한다.

### 원인 조사와 브라우저 재검증

- 재개 후 최초 `npm run test:ui-stock-edit`: 실패. 390px light 방향키 입력 뒤
  대상이 그대로였다. 계측에서 방향키 좌표 getter가 호출되지 않았다.
  증거: `stock-insight-ui5b-GJMOYg`.
- 읽기·계측 전용 실행 `node tests/fixtures/ui-components-smoke.mjs --stock-edit --diagnose-stock-edit`:
  `passed: null`로 기록한 진단이며 검증 통과로 집계하지 않는다.
  설치된 KeyboardSensor는 활성화 뒤 setTimeout으로 keydown 리스너를 연결한다.
  활성 표시만 기다리면 리스너가 연결되지 않을 수 있다. 모바일에서는 목표 좌표가
  y682였으나 smooth scroll의 scrollY가2·32로 이동 중이었다. 메뉴 닫힘·포커스·
  종목 사각형은 정상으로 관측했다. 증거: `stock-insight-ui5b-DryH7Q`.
- 최소 수정: 검증에서 활성화 뒤 두 requestAnimationFrame 단계 후 방향키를 입력한다.
  제품의 KeyboardSensor만 `scrollBehavior: 'auto'`로 지정해 방향키 스크롤을 즉시 반영한다.
  첫 재시도 `npm run test:ui-stock-edit`: 8개 조합 통과.
  증거: `stock-insight-ui5b-Zk4v0f`. 두 원인을 각각 단독으로 제거한 비교는 하지 않았다.
- 임시 계측·진단 분기를 제거한 최종 소스의 같은 명령: 8개 조합 통과.
  증거: `stock-insight-ui5b-EVg49N`. 390·1280·1440·1920px × light/dark.
  전체 선택·해제·삭제 비활성·삭제 취소·키보드 순서 변경·취소 복원·저장·새로고침·
  고정 데이터 DELETE 1회·남은 순서·가로 넘침 없음·브라우저 오류 없음이 통과했다.
  8상태 × 8조합의64개 PNG와 result.json·cleanup.json을 보존했다.

### 최종 검증과 직접 검토

- `WEB_AUTH_MODE=oidc npm run build`: 통과.
- `npm run check`: 타입·린트·포맷 및99개 파일643개 테스트 통과.
- React Doctor 대상3개 컴포넌트: 오류0·경고3. 기존 핸들러 전용 상태와
  카드 전체 클릭의 키보드·시맨틱 권고는 남긴다. 기본 Checkbox를 이용한 선택과
  KeyboardSensor를 이용한 순서 변경은 브라우저에서 검증했다.
- 주 세션이 최종64개 캡처를8개 상태별 묶음으로 직접 검토했다.
  메뉴·선택 표시·삭제창·순서 변경 도구의 밝은/어두운 화면과 모바일 줄바꿈을 확인했다.
  독립 에이전트 검토나 전체 목록 본체의 Figma 완성으로 분류하지 않는다.
- 기존 차트가 화면 크기에 맞춰지는 도중 `test:web-oidc`의 가로 넘침 검사가 먼저
  실행되어 최초 실행은 `result/390/light overflow`로 실패했다.
  `ui-theme-qa.mjs`의 기존 SVG/컨테이너 너비 일치 대기를 넘침 검사 앞으로 이동했다.
  검사·허용값·제한 시간은 그대로 유지한다. 첫 재시도는 통과했다. 증거: `stock-insight-web-qa-pWd6Sw`.
  로그인·결과·계정 화면의24개 테마/폭 조합, 로그인·재분석·CSRF·삭제·로그아웃·
  미인증 거부와 개발 미리보기의 운영404를 확인했다. 실패 증거: `stock-insight-web-qa-41cTg1`.
- fixture OIDC/Gateway를 이용한 웹 검증은 실제 MSA 통과가 아니다.
  Node fixture의 MODULE_TYPELESS_PACKAGE_JSON 경고는 유지된다.
  실제 Docker·DB·RabbitMQ·Keycloak 검증은 사용자 지시로 보류한다.

주 세션의 diff·검증·시각 자체 검토는 이슈 #38의 편집 도구 범위에서 통과했다.
보안 경로와 실제 API 호출 규약은 유지되며 임시 진단 코드·자격 증명을 추가하지 않았다.
