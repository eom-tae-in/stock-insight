# UI-5h 종목 상세 주간 데이터

이슈 #52·브랜치 feat/52/stock-weekly-card. 이슈를 먼저 만들고 담당자
eom-tae-in·enhancement를 지정했다. 기준 develop은 PR #51 squash
`3b0d9f5f55f8e5932cc90ea1852dfb8877b8e5bd`다. #50은 병합으로 자동으로 닫혔다.

원본 로컬 명세 §6.4와 Figma 상세15:2493 metadata, 주간 카드15:2663의
context/screenshot을 확인했다. 공통 Button·표 헤더/행/셀·ChangeText·
가격/거래량/주차 포맷을 사용한다. 다운로드 아이콘은 기존 Lucide FileSpreadsheet다.
원본 대체 글꼴보다 프로젝트 Pretendard를 우선한다.

## 구현과 경계

최근6주를 최신순으로 표시하고 주차·시가·고가·저가·종가·등락률·거래량·
MA13·52주 YoY의9열을 제공한다. 기존 계산 함수는 저장된 전체 이력으로 실행하고
그 뒤에6주를 선택한다. 첫 표시 주의 등락도 보이지 않는 직전 저장 주를 사용한다.
첫 주와 전주 종가0의 등락·없는 OHLC/거래량·부족한 MA13/YoY는 대시다.
ISO 주차 연도와 월~금 날짜 범위를 제공한다.

모바일에서는 머리를 두 줄로 배치하고 표 영역만 가로 스크롤한다.
스크롤 영역은 이름과 키보드 포커스를 제공한다. 전체 표 경로·정렬·무한 스크롤은
유지한다. Excel은 기존 generateTableExcelFile에 전체 주간 이력을 전달하며
일자·종가·MA13·YoY의4열과 기존 파일명·통화 판정 계약을 유지한다.
다운로드 오류는 카드 안에 표시하고 재시도 시 지운다. 빈 데이터는 안내와
비활성 Excel을 제공한다.

상세의 기존 서버 인증·소유자 조회·notFound를 유지하고 조회된 record만 전달한다.
새 API·계산 반환값·의존성·워크플로를 추가하지 않았다. 개발 미리보기는
고정 데이터이며 실제 저장 계정·MSA 검증이 아니다.

## 검증 기록

`npx vitest run src/components/stock/stock-weekly-card.test.tsx` 최초 실행:
5개 통과. 최근6주·전체65주 내보내기·13/65주 계산 경계·0 기준/결측·
ISO 연도 경계·빈 데이터·다운로드 실패 후 재시도를 확인했다.
`npm run check` 최초 실행:107개 파일670개 테스트·타입·린트·포맷 통과.
문서의 최종 기록 추가 후에는 변경 문서의 Prettier와 diff 검사를 별도로 실행한다.

`npm run test:ui-stock-detail` 최초 실행:390/1280/1440/1920px × light/dark
8개 조합 통과. 증거는 로컬 임시 디렉터리 stock-insight-ui5e-QDnLdD다.
기존 기간/시리즈·음수0%·툴팁·PNG 서명 검증에9열·6주/결측1주·
키보드 가로 스크롤·페이지 가로 넘침 없음·전체 보기 링크 검사를 추가했다.
실제로 weekly-export.xlsx를 내려받아 첫/마지막 날짜와 가격·80주 전체81행·4열을
XLSX로 다시 읽어 확인했다. PNG 내보내기도 유지했다.

주 세션이8개 조합의 전체/결측 주간 화면16개와 모바일 오른쪽 스크롤 캡처를
직접 열어 머리/행/숫자 정렬·부호·날짜·테마·모바일 줄바꿈을 확인했다.
Figma는 카드의 구조/토큰 기준이며 값·통화·전체 화면 셸은 실제 데이터/기존 구현이다.
픽셀 동일성이나 전체 상세 디자인 완료를 주장하지 않는다.

| 검증 범위                    | 결과           | 증거와 한계                                                |
| ---------------------------- | -------------- | ---------------------------------------------------------- |
| 최근6주/9열·전체 계산 이력   | 통과           | QDnLdD/result.json·5개 단위 검사                           |
| 13/65주·0 기준·결측·ISO 연도 | 통과           | stock-weekly-card.test.tsx·결측 캡처                       |
| 전체80주·4열 Excel           | 통과           | QDnLdD/weekly-export.xlsx·실제 파일 읽기                   |
| 모바일 가로 스크롤·테마      | 통과           | QDnLdD/390-_-weekly-_.png·키보드 검사                      |
| 전체 보기                    | 링크 연결 확인 | 기존 사용자 소유 데이터 SSR 경로 유지; 실제 DB 화면 미실행 |
| 다운로드 오류 후 재시도      | 단위 검사 통과 | 실제 브라우저 파일 생성 실패는 주입하지 않음               |
| 서버 인증/소유자 조회        | 변경 없음 확인 | 상세 페이지 diff·기존 전체 회귀 검사                       |

`WEB_AUTH_MODE=oidc npm run build` 최초 실행 통과.
`npm run test:web-oidc` 최초 실행 통과(stock-insight-web-qa-Q4X7Wu).
실제 Next 프로덕션·Chrome·Redis와 서명된 OIDC/HTTP Gateway fixture 검사이며
실제 Keycloak·Spring·DB·브로커 통과가 아니다. MODULE_TYPELESS_PACKAGE_JSON
경고는 기존과 동일하다. 이 재개 구간의 검증 실패와 재시도는 없다.
각 fixture의 finally에서 실행한 서버·브라우저·Redis를 정리했다.
GitHub Actions enabled=false와 로컬 scripts ignore를 확인했다.

실제 DB·브로커·Keycloak·Docker는 기존 지시로 보류하며 #24에 남긴다.
컨텍스트 사용률은 현재 도구/환경에서 제공하지 않아 확인 불가다.
독립 에이전트 검토와 Lighthouse 측정은 수행하지 않았다.
연결 키워드/데이터 정보 레일·헤더 행동·앵커 탭·조회 결과와 UI-6~UI-10은 남아 있다.
