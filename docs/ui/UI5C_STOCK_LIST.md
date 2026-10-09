# UI-5c 관심 종목 목록 구현과 검증

이슈: https://github.com/eom-tae-in/stock-insight/issues/42
브랜치: `feat/42/stock-list-design`
PR: https://github.com/eom-tae-in/stock-insight/pull/43
PR 본문의 `Closes #42`로 이슈를 연결했다. 담당자와 enhancement 라벨을 양쪽에 지정했다.
기준 develop: PR #41 squash 커밋 `adeab27cb5ff154d7d7a62bd90b2b46fd6ea1b07`.
이슈를 먼저 만들고 브랜치를 생성했다. 담당자 eom-tae-in·라벨 enhancement다.

## 구현 범위

관심 종목 목록의 큰 카드 대신 데스크톱 표와 모바일64px 행을 적용했다.
HTML table/thead/tbody/tr/th/td를 사용하고 TickerLogo·ChangeBadge/ChangeText·Sparkline·
공통 메뉴·빈 상태·버튼을 재사용한다. 표 헤더40·행64·패딩16·간격12가 기준이다.
모바일은 간격8·추이56×24, 작업 버튼은 접근 가능한44px다.
1280px에서 추이 열을 숨기고1440px부터 표시한다. 메뉴의44px 터치 영역은
Figma28px 메뉴 셀보다 우선한다. 가격은2자리·부호는U+2212, 상승 빨강·하락 파랑이다.
13주/65주 미만의 괴리/YoY는 사유와 대시를 표시한다.

Figma 현재 파일은 Persona/Components 페이지만 반환했다. 목록 Header `33:425`,
Row `33:505`, Mobile Row `11:172`의 상세 context와 screenshot을 읽었다.
전체 페이지 프레임 복제 완료로 분류하지 않는다. 기존 동적 Sparkline·TickerLogo와
동일 MoreHorizontal 아이콘을 재사용하며 고정 주가·Figma 추이 이미지를 제품에 넣지 않았다.
폰트는 명세의 Pretendard를 사용한다. 실제 서버 목록에는 기존 사용자 인증·소유자
조회 결과의 종목과 키워드만 연결한다. 관심도 요약만 전달하며 키워드 원본 시계열을
추가로 클라이언트에 전달하지 않는다. 저장된5년 분석의 오버레이 ticker가 맞는 조건을
표시 순서·갱신일·생성일 기준으로 선택한다. 같은 키워드의 여러 조건은 중복 집계하지 않는다.

편집·삭제 확인·DELETE API·갱신 POST·브라우저 stock-sort-order 저장과 이벤트를 유지했다.
키보드 정렬은 전용 손잡이와 수직 정렬 전략으로 바꿨다. 취소 백업은 ref에 둔다.
삭제 선택은 체크박스에서 조작하며 카드 전체 클릭의 기존 접근성 경고를 제거했다.
관심 종목 페이지의 제목·기준 주차·설명·종목 추가·빈 상태를 적용했다.
개발 전용 `/design-preview/stock-list`는 운영에서404다.

## 실패와 대응 기록

- 최초 `npm run typecheck`: CurrencyInfo에 code가 없다는 TS2339로 실패.
  기존 formatDisplayPrice가 ISO 통화 또는 ticker를 처리함을 확인하고
  `record.currency ?? record.ticker`를 전달했다. 첫 재시도 통과.
- 첫 `npm run test:ui-stock-list`:8개 조합 통과. 증거 `stock-insight-ui5c-AE4TDr`.
  직접 캡처에서1440px의 헤더 마지막 열이 내려간 것을 발견했다. rem 기반 xl과
  px 기반 임의 조건의 CSS 순서가 섞여8열/9열 전환이 어긋났다.
  임의 조건도90rem으로 맞추고 헤더의 줄 위치·추이 열 표시 검사를 추가했다.
  역할 기반 div 표도 네이티브 HTML 표로 교체했다.
- 표 교체 과정의 포맷·타입 검사는 tbody/table 닫는 태그가 div로 남아 실패했다.
  대응하는 태그를 바로잡은 첫 재시도에서 포맷·타입 및 관련13개 테스트가 통과했다.
- 네이티브 표와 헤더 수정 후 `npm run test:ui-stock-list`:8개 조합 통과.
  증거 `stock-insight-ui5c-mWO296`. 이후 hydration 수정 전의 기록이다.
- `npm run test:ui-stock-edit` 최초 회귀 검사는1280px dark에서 실패했다.
  동작 검사는 진행됐지만 콘솔에 SSR/client Radix 메뉴 ID 불일치가 남았다.
  증거 `stock-insight-ui5b-OYkRvR`. 근본적인 React/Next 내부 ID 차이의 발생 시점은
  미확정이며 오류 자체는 확인했다. 기존 계정 메뉴·커스텀 차트와 같은
  useSyncExternalStore 초기 렌더링 경계를 편집 메뉴·행 메뉴에 적용했다.
  서버·최초 브라우저 렌더는 비활성 버튼을 그대로 그리고, hydration 후 팝업을 연결한다.
  오류 검사를 생략하거나 suppressHydrationWarning을 추가하지 않았다.
  서버 렌더링 회귀 검사도 추가했다. 후속 결과는 아래에 기록한다.

## 현재 검증 범위와 제한

실제 Next 개발 서버·Chrome·독립 Redis와 fixture OIDC/Gateway를 사용한다.
미리보기의 삭제·갱신 응답은 브라우저에서만 대체한다. 실제 저장 데이터 삭제·
실제 서비스 갱신이나 MSA E2E 통과로 분류하지 않는다.
Docker·실제 DB·RabbitMQ·Keycloak은 사용자 지시대로 보류하고 Actions는 비활성이다.
전체 Lighthouse 또는 배포 환경 성능 감사는 수행하지 않았다. 독립 에이전트 검토와
주 세션의 직접 검토를 혼용하지 않는다. 컨텍스트 사용률은 제공되지 않아 확인 불가다.

종목 목록의 별도 필터·검색, 종목 상세·조회 결과, UI-6~UI-10은 후속 단계다.

## 최종 화면과 자체 검토

- hydration 수정 후 `npm run test:ui-stock-edit`의 첫 재시도는8개 조합 통과했다.
  증거: `stock-insight-ui5b-dVlthl`.
- 최종 메뉴 경계·subtle 구분선·상단 버튼 배치의 `npm run test:ui-stock-list`:
  390/1280/1440/1920 × light/dark 전부 통과. 증거 `stock-insight-ui5c-MFUX2L`.
- 같은 최종 소스의 `npm run test:ui-stock-edit`:8개 조합 통과.
  증거 `stock-insight-ui5b-XtKwBx`.
- 목록 검증은 상세 경로·실제 POST 1회·갱신 비활성·메뉴·연결 요약·전체 선택/해제·
  삭제 취소·키보드 이동·순서 취소/저장·재로드·삭제 후 순서·마지막 삭제 빈 상태·
  가로 넘침 없음·브라우저 오류 없음·표 헤더 한 줄·반응형 추이 열을 확인한다.
- 최종88개 PNG의 시그니처를 확인하고11개 상태별 화면 묶음을 주 세션에서 직접 보았다.
  모바일 줄바꿈·회사명 말줄임·메뉴와 팝업·키보드 링·종목별 숫자 정렬·밝은/어두운
  토큰을 확인했다. Figma 행 구조와64/40px 높이·토큰·열 의미를 비교했다.
  폰트·44px 메뉴·반응형 생략은 위 계약의 적용이며 픽셀 완전 일치로 주장하지 않는다.
- React Doctor 최종3개 컴포넌트: 오류0·경고1. StockListRow의 조건 분기 복잡도 권고다.
  기존 카드 클릭 접근성·핸들러 전용 state·div 표 경고는 이 구현에서 제거했다.
  증거 `/tmp/stock-insight-ui5c-react-doctor.json`. supply-chain 검사는 제외했다.
- 변경 diff에서 서버 인증과 조회 경계, 삭제/갱신 규약·순서 키·가격 계산 원본의 유지를
  확인했다. 주 세션의 자체 검토이며 독립 에이전트 검토로 분류하지 않는다.

브라우저 증거의 공통 디렉터리는
`/var/folders/yk/7bbn8h3x4dqfy2p1hv97bz3w0000gn/T/`이다.
각 실행의 서버·브라우저·Redis·fixture는 정리했다. 임시 키는 커밋하지 않았다.

## 최종 수동 검증 결과

| 검증                               | 결과 | 증거와 한계                                                                                 |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| `npm run check`                    | 통과 | 타입·린트·포맷·102개 파일653개 테스트                                                       |
| `WEB_AUTH_MODE=oidc npm run build` | 통과 | 운영 빌드·타입·라우트 생성                                                                  |
| `npm run test:web-oidc`            | 통과 | `stock-insight-web-qa-XZuZDC`; 인증·작업·CSRF·삭제·로그아웃·미인증 거부와 개발 경로 운영404 |
| `npm run test:ui-stock-list`       | 통과 | `stock-insight-ui5c-MFUX2L`; 최종8개 조합·88개 캡처                                         |
| `npm run test:ui-stock-edit`       | 통과 | `stock-insight-ui5b-XtKwBx`; 최종8개 조합·64개 캡처                                         |
| 실제 DB·브로커·Keycloak            | 보류 | 사용자 면제 및 이슈 #24; fixture 통과와 구분                                                |

위 최종 전체 검사·빌드·인증 브라우저 검사는 각각 첫 실행에서 통과했다.
Node fixture의 MODULE_TYPELESS_PACKAGE_JSON 경고는 유지된다.
메뉴·삭제·순서·빈 상태·표 반응형·코드의 토큰 재사용에 대한 주 세션 자체 검토는
이슈 #42 범위에서 완료했다. 별도 성능 감사와 디자인 전체 완료를 뜻하지 않는다.
