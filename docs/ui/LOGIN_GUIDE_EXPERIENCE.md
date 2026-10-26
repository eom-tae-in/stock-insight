# 로그인과 안내 경험 개선 · 이슈 #69

## 최신 상태

2026-10-26 사용자 요청으로 기존 로그인 소개와 URL 기반 카드 이동을 개편했다.
이슈 https://github.com/eom-tae-in/stock-insight/issues/69,
담당자 eom-tae-in·enhancement, 브랜치 feat/69/login-guide-experience.
작업 폴더 /tmp/stock-insight-guides-66, 기준 develop 6bc081c.
최초 중단 시점에는 미커밋·미푸시·PR 없음이었다. 아래 후속 구현과 검증 기록이 최신 상태다.
제공된 컨텍스트 사용률은 확인 불가다.

## 구현한 내용과 변경 파일

- login-layout: 큰 홍보 제목·그래프·2열 소개를 제거하고 중앙420px 로그인 구성.
- login-guide-links: 폼 아래 «사용법을 알아봐요», «새로워질 모습을 살펴봐요».
  «로그인 전에 먼저 알아보세요» 문구 제거.
- 로그인 제목 «로그인해요», 하단 설명을 자연스러운 ~해요체로 변경.
- app/layout, theme-provider: 신규 기본값light. 저장한 사용자 테마 선택은 보존.
- public/layout: white 카드 바탕 사용.
- guide-reader: React 로컬 상태로 카드·목차·종류를 즉시 전환.
  카드 이동에 router·history·URL 변경을 하지 않는다. 최초step deep link는 호환한다.
  CSS/WAAPI180ms 방향별12px 이동·opacity, 기존 애니메이션 취소 후 즉시 새 입력 처리.
  reduced motion은 이동 효과를 생략. 버튼·좌우 키·가로 스와이프 제공.
- guide-controls: 이전·다음·목차/장수 버튼. 첫 장 이전은 비활성, 끝 장은 목차로 이동.
- navigation: ~해요체 종류 이름, DESIGN.md에 새 계약과 모션 원칙 기록.
- guide-reader.test, login-guides.test, theme-provider.test를 변경 동작에 맞게 보완.

모든 위 구현은 실제 브라우저 검증 완료와 구분한다.
원래 주 작업 폴더의 기존 미커밋 작업에는 손대지 않았다.

## 직접 본 기존 운영 화면

CUA Chrome의 stock-insight-xi.vercel.app/login?next=%2F 탭을 직접 읽고 촬영했다.
큰 소개·그래프와 우측 로그인 폼, «로그인 전에 먼저 알아보세요» 안내를 확인했다.
현재 구조가 로그인보다 소개를 강조하고 있음을 확인한 뒤 수정했다.
수정한 로컬 화면에 대한 시각 검증은 아래 연결 실패로 완료하지 못했다.

## 통과

Node /Users/taein/.nvm/versions/node/v24.21.0/bin/node 사용.

- 관련 Vitest3개 파일20개 테스트 첫 재시도 통과.
  최초에는 기본값light가 이미 선택돼 있어 같은 라디오 클릭에 localStorage 저장을
  기대하던 기존 테스트가 실패했다. system→light 선택으로 실제 변경 동작을 검사하도록 수정.
- WEB_AUTH_MODE=oidc npm run build 통과. 로그 /tmp/guides69-build.log.
- 변경 UI13개 파일 accent stripe 검사 통과.
- 최종 전체 check의 타입·린트·포맷 단계 통과.
- localhost3066의 /login, /guide HTTP200 확인.
  이는 페이지의 실제 상호작용·모바일·전환 효과 검증 통과가 아니다.

## 전체 check 실패 기록 · 재시도 한도 도달

정확한 명령(작업 폴더에서):

```sh
PATH=/Users/taein/.nvm/versions/node/v24.21.0/bin:$PATH npm run check
```

1. 최초 실행: guide-reader.test의 getByRole 옵션 exact가
   Testing Library ByRoleOptions에서 지원되지 않아 타입 검사 실패.
   테스트의 exact 옵션 제거. 로그 /tmp/guides69-check.log.
2. 재시도1: 위 수정 파일의 Prettier 포맷 실패.
   Prettier --write로 해당 테스트 파일 정리. 로그 /tmp/guides69-check-retry1.log.
3. 재시도2: 타입·린트·포맷 통과, Vitest의 RUN 헤더 이후 종료 코드1.
   결과 요약·실패 suite·오류 설명이 출력되지 않았다.
   로그 /tmp/guides69-check-retry2.log는413바이트이며 결과 없음.
   원인은 미확정이다. 메모리·프로세스·실행 환경 영향은 가설이지 확인된 원인이 아니다.

마지막 전체 테스트를 통과로 표시하지 않는다.
사용자 규칙에 따라 추가 개발·검증 실행을 멈췄다.
재개 시 기존 기록을 보존하고0회부터 실행한다.
테스트 프로세스의 종료 원인을 계측하고 필요한 최소 수정 후 동일 check를 수행해야 한다.

## 브라우저 연결 실패와 남은 검증

CUA에서 로컬 미리보기 새 탭 열기 시30초 시간 초과와 커널 리셋,
Chrome getApp 재연결도30초 시간 초과가 발생했다.
getState 인벤토리는 응답했지만 연결된 브라우저 공급자는 없었다.
지원 여부가 optional인 listWindows 호출은 not a function이었다.
기존 사용자 Chrome·탭을 강제 종료하거나 설정을 변경하지 않았다.
다른 기술로 사용자 브라우저 UI를 우회 제어하지 않았다.

남은 것:

- 실제 로컬 로그인·카드 UI를390/1440px에서 직접 확인
- 주소 고정 상태의 이전/다음·목차·종류 전환, 반복 입력과 키보드·스와이프
- 전환 중/완료 프레임과 reduced motion, 새 카드 시작 위치·하단 조작 접근성
- 기존 Google/이메일 로그인·OIDC 진입 회귀와 저장된 테마 보존
- 전체 검사 통과 후 커밋·push·develop 대상 PR(Closes #69), 담당자·라벨 지정

이번 작업에서 시작한 로컬 Next·Redis·OIDC fixture는 종료한다.
운영 자원·설정·DB·prod 브랜치·GitHub Actions는 변경하지 않았다.

## 후속 사용자 검토 · 카드 크기와 버튼 위치

사용자가 장마다 다음 버튼 위치가 변하는 문제를 지적하고 수정을 요청했다.
이 실행의 검증 횟수는 새로0회에서 시작했다. 이전 중단 기록은 보존한다.

- 안내 main을 viewport 잔여 높이의4행 grid로 구성하고 최대860px로 제한했다.
- 사용법·리뉴얼·목차에서 같은 card slot을 쓰며 긴 내용은 카드 내부에서 스크롤한다.
- 카드 조작은 별도80px 행, 하단 안내는40px 행으로 내용 길이와 분리했다.
- 이전·다음/목차 버튼 폭을 모바일96px·sm112px로 고정했다.
- 카드 변경 시 내부 scrollTop을0으로 되돌린다. 애니메이션은 조작 행에 적용하지 않는다.
- 관련 카드 테스트14개 통과.
- 전체 npm run check 첫 실행: 타입·린트·포맷·112개 파일710개 테스트 통과.
  /tmp/guides69-fixed-frame-check.log. 이전 실행 구간의 설명 없는 테스트 종료와 구분한다.
- 최종 OIDC 빌드 통과: /tmp/guides69-fixed-frame-final-build.log.
- 변경2개 UI 파일 accent stripe 검사 통과.
- CUA로 로컬 /guide 첫 카드를 직접 촬영해 같은 크기 슬롯과 별도 조작 행을 확인했다.
  대형 화면에서 카드 내부의 과도한 빈 공간을 확인하고 최대 높이860px를 추가했다.
- 최종 높이 제한 뒤에는 사용자가 Chrome 창을 전환 중이라 연속된 비교 촬영을 완료하지 못했다.
  픽셀 좌표의 전 카드 일치·최종 모바일 QA 완료로 분류하지 않는다.
- 로컬3066 서버를 최종 빌드로 다시 띄웠다. 사용자가 직접 검토할 수 있도록 유지한다.
- 로컬 fixture 종료 중 자식 프로세스 exit 대기의 경합으로 이전 runner가 남았다.
  해당 작업의 runner PID50334만 종료했고 새 runner에서 대기 순서를 정리했다.
  사용자 Chrome과 운영 자원은 종료하지 않았다.

해당 로컬 검토 시점의 변경은 feat/69/login-guide-experience에 미커밋 상태였다.
사용자 로컬 검토를 진행 중이며 전체 시각 검증과 PR 제출은 아직 완료하지 않았다.

## 후속 사용자 검토 · 인터랙티브 주간 그래프

반복되던 SVG 그래프를 Recharts의 주간 샘플 차트로 교체했다.
주 데이터는 src/lib/guides/chart-samples.ts의 합성 정적 데이터이며 실제 시세·검색 관측치가 아니다.
주간 가격과 상대 관심도를 정의했고 MA13은 기존 calculateMA13으로 계산한다.

- 소개: Apple 관심도와 AAPL 종가26주, 두 축.
- 지표: AAPL 종가와 MA13, 처음12주 평균은 결측으로 표시.
- 키워드: Apple 관심도만 표시.
- 비교: 최근16주, 각 원래 단위 표시.
- 내 차트: 최근13주, 사전 전체 데이터로 MA13 계산.
- 브리핑: NVIDIA 관심도와 NVDA 가격이 엇갈리는12주 샘플.
- 근거: 최근6주, 점과 수치 표.
- 모바일: NVIDIA 관심도8주, 주차 선택.

호버·차트 키보드 접근·주차 range·시리즈 선택·접근 가능한 전체 수치 표를 제공한다.
날짜 범위·ISO 주차·USD·0~100 지수를 구분하고 실제 데이터가 아니라는 표시를 유지한다.
차트 내부의 키보드·터치는 카드 이동으로 전파하지 않는다.
카드별 key로 선택 상태가 다른 차트에 새지 않도록 한다.
기존 고정 프레임과 다음 버튼 위치는 유지하고 추가 수치는 내부 스크롤로 읽는다.
API·실제 계정·실시간 수집은 호출하지 않는다.

검증:

- npm run check: 타입·린트·포맷·114개 파일715개 테스트 통과.
  로그 /tmp/guides69-chart-check.log.
- 마지막 공통 Button 재사용 조정 후 관련3개 파일19개 테스트 재확인 통과.
- 최종 WEB_AUTH_MODE=oidc npm run build 통과.
  로그 /tmp/guides69-chart-final-build.log.
- 그래프 관련3개 파일 accent stripe 검사 통과.
- CUA로 로컬 /guide의 실제 축과 그래프를 읽고 차트 지점 클릭으로 hover 툴팁을 확인했다.
  2025 W15 /04.07–04.11, 검색 관심도61/100, 주간 종가$196.80이 표시됐다.
- 주차 slider의 Decrement로 index25→24, W26 /06.23–06.27,
  관심도81/100·$210.70으로 변경됨을 확인했다. 카드1/7과 /guide 주소는 유지됐다.
- 실제 로컬 화면에서 툴팁과 선택 값 카드·내부 스크롤·하단 조작을 촬영해 직접 검토했다.
- 모바일 전체 행렬·모든 tooltip 지점의 정량 시각 검증과 실제 인증 회귀는 아직 별도 후속이다.
  이는 위에서 통과한 단위·빌드·데스크톱 수동 검사와 구분한다.

신규 차트 소스는231줄(순수 LOC250 이하)이며, 주간 값 표시·데이터는 별도 모듈로 분리했다.
앞으로 더 확장하면 수치 표·주차 선택 영역의 분리를 우선 검토한다.
사용자 검토를 위해 최종 빌드의 localhost3066 서버는 유지한다.

전체 후속 구현과 통과한 검사를 묶어 이슈 #69의 develop 대상 PR로 제출한다.
운영 반영·병합은 하지 않고, 로컬 미리보기와 남은 수동 검증 상태를 PR에 명시한다.

## 후속 사용자 검토 · 로그인 강조와 안내 영역 보존

사용자가 로그인만 더 잘 보이게 해달라고 명확히 정정했다.
사용법·리뉴얼 진입은 기존 아이콘·제목·설명 행으로 복원하고 로그인 카드 아래에 유지한다.
로그인 제목은32px로, 중앙 카드는440px·중립 테두리·기존 카드 그림자로 강조한다.
OIDC와 이메일 로그인 버튼은48px 높이·16px 글자로 키운다. 인증 동작과 next는 유지한다.
그래프의 혼동되는 호버/터치 안내 문구는 «주차 선택»으로 줄인다.
range 자체는 구현되어 있고 앞선 실제 브라우저 검사에서 선택 주차와 값 변경을 확인했다.
새로운 터치 성공 검증으로 분류하거나 사용법·리뉴얼 카드 흐름을 추가 변경하지 않는다.

검증: 로그인 강조 최초 구성에서 전체 타입·린트·포맷·114개 파일715개 테스트와 OIDC 빌드 통과.
로그 /tmp/guides69-login-emphasis-check.log, /tmp/guides69-login-emphasis-build.log.
사용자 정정대로 기존 안내 링크 복원 후 관련4개 파일12개 테스트 재확인 통과.
최종 빌드는 /tmp/guides69-login-only-build.log에 기록한다.
CUA로 로컬 로그인 제목·중앙 카드·주 로그인 링크를 직접 촬영해 확인했다.
해당 촬영은 안내 링크를 작은 텍스트로 줄였던 중간 상태이므로,
최종 링크 영역의 새로운 시각 검증 통과로 확대하지 않는다.
최종 로컬 서버를 갱신해 사용자 검토를 유지한다. PR #70에 후속 커밋하고 병합하지 않는다.

## 후속 사용자 검토 · 기존 이메일/Google 로그인으로 로컬 실행

사용자가 OIDC 테스트 진입이 아니라 기존 아이디(이메일)·비밀번호·Google OAuth
형식의 실제 로그인 화면을 요청했다. 기존 legacy LoginForm/OAuthLoginButton을 유지해 보완했다.

- 이메일·비밀번호에 연결된 label·고유 id·name·autocomplete를 추가하고44px 입력으로 통일.
- 기존 Supabase signInWithPassword·Google OAuth callback/next와 로그인 후 이동 유지.
- Google 버튼의 검색 이모지를 공식 Google 로고 SVG로 교체하고48px 높이 적용.
  자산 출처: https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg
- OIDC 모드와 접근 제어는 변경하지 않았다. 로컬 실행만 WEB_AUTH_MODE=legacy로 전환.
- Vercel에 sensitive로 저장된 publishable key는 API에서 조회되지 않았다.
  배포된 웹 클라이언트가 공개하는 Supabase URL·publishable key만 확인해
  Git에 무시되는 .env.local(0600)에 저장했다. 관리자 키·개인 아이디·비밀번호는 저장하지 않았다.
- Supabase 공개 인증 설정 조회에서 email/Google 제공자 enabled=true 확인.
  실제 계정 로그인 성공이나 Google callback 완료 검증으로 분류하지 않는다.
- 로컬 개발 서버에서 /login HTTP200과 email/password input, Google 버튼이 존재하고
  OIDC 전용 «계정으로 로그인»은 표시되지 않음을 확인했다.
- CUA로 기존 로그인 탭을 선택하려던 호출은30초 시간 초과로 실패했다.
  최신 폼 전체의 시각 검증 완료로 분류하지 않는다.

관련3개 파일10개 테스트 통과. 전체 타입·린트·포맷·114개 파일715개 테스트 통과.
로그 /tmp/guides69-real-login-check.log.
WEB_AUTH_MODE=oidc npm run build 통과: /tmp/guides69-real-login-build.log.
새로 추가한 로컬 설정은 커밋·PR에 포함하지 않는다. 저장소/운영 환경변수는 변경하지 않았다.
localhost3066은 기존 로그인 방식의 dev 서버로 유지해 사용자가 직접 검토할 수 있다.

## 공개 안내 탐색 정리 · 이슈 #71 · 2026-10-27

사용자가 목차를 없애고 첫 장의 이전·끝 장의 다음을 숨기도록 요청했다.
GuideReader의 목차 상태·본문·진입을 제거하고 장수는 읽기 전용으로 표시한다.
GuideControls는 양끝96px(sm112px) 빈 슬롯을 유지해 남은 버튼 위치가 바뀌지 않는다.
첫 장/마지막 장의 버튼은 DOM에 없어 탭 순서에도 남지 않는다.
기존 좌우 키·스와이프·최초 step deep link와 범위 제한은 유지한다.
공개 헤더의 목차 링크를 없애고 Brand를 /로 연결했다.
기존 /explore 목차 페이지는 /로 redirect해 예전 주소도 안내 목차를 다시 열지 않는다.
/는 기존 인증 미들웨어를 거쳐 비로그인이면 /login?next=%2F로 이동한다.

### 검증과 한계

- 전체 npm run check: 타입·린트·포맷·115개 파일717개 테스트 통과.
  /tmp/guide71-final-check.log. 이후 메인 / 보호 경계 두 모드 사례를 직접 추가했다.
- WEB_AUTH_MODE=oidc npm run build 통과: /tmp/guide71-build.log.
- 변경 UI3개 파일 accent stripe 검사 통과. bun이 없어 npm exec의 tsx 런너로 동일 검사 실행.
- 두 안내의 마지막 카드 다음 부재·이전 유지, 전환 후 양쪽 버튼, 첫 장 이전 부재,
  키보드 경계, 주소/히스토리 유지와 목차 부재를 단위 검사로 검증했다.
- CUA 실제 Chrome에서 /guide 첫·중간·7장과 /renewal 6장의 버튼을 확인했다.
  로고를 클릭해 /login?next=%2F와 이메일·비밀번호·Google 로그인 폼을 확인했다.
  실제 로그인은 수행하지 않았다. 화면 증거: /tmp/guide71-page-first.png,
  /tmp/guide71-page-middle.png, /tmp/guide71-page-last.png,
  /tmp/guide71-page-renewal-last.png.
- HTTP /explore:307 Location:/, /:307 Location:/login?next=%2F 확인.
- 개발 서버와 빌드가 같은 .next를 사용해 /explore 첫 HTTP 확인이500/ENOENT로 실패했다.
  해당 작업 서버만 종료하고 캐시를 /tmp/stock-insight-guide71-stale-next로 보관한 뒤
  서버를 재시작했다. 첫 재시도는307로 통과했다. 소스 수정이나 검사 완화는 없었다.
- 실제 모바일 전체·라이트/다크 전수·실제 계정 인증과 신규 런타임 통합은 이번 통과로
  확대하지 않는다. 기존 후속 이슈 #67과 Docker 보류 경계를 유지한다.
- 컨텍스트 사용률은 제공되지 않아 확인 불가다.

### Figma 동기화

파일 WEmeHbbzBqEfBxez9dMk9o의 안내 페이지82:27을 수정했다.
기존 Guide Page 컴포넌트의 헤더 목차2개를 제거하고 좌우 고정 슬롯4개를 추가했다.
26개 안내 화면과 Light 검토1개에 첫/끝 버튼 상태와 로고의 로그인 프로토타입 목적지를
적용했다. 이는 비로그인 메인 접근의 최종 화면을 표현하며 실제 접근 제어는 코드에 남긴다.
은퇴한 공개 목차 프레임85:5883·85:5974를 제거했다. 기본 Light 모드를 적용했다.
Figma 목차 화면은 삭제됐고 보이는 목차 텍스트가 없음을 구조 조회로 확인했다.

Figma 최초 일괄 수정은 재부모화 직후 하위 인스턴스 ID가 무효화돼 실패했다.
공통 컴포넌트 수정과 인스턴스 수정을 분리한 첫 재시도에서 공통 슬롯 수정은 통과했다.
인스턴스 수정 최초 실행 및 첫 재시도는 visible 변경 뒤 같은 참조를 읽거나 수정해 실패했다.
원래 상속 경로로 노드를 새로 조회하고 연결을 먼저 갱신한 두 번째 재시도는 통과했다.
27개 상태·로고 목적지와 목차 제거를 다시 조회했고 첫 장 Mobile390px·끝 장
Desktop1440px 스크린샷을 직접 검토했다. 새 컴포넌트나 전체 화면 래스터는 추가하지 않았다.
증거: /tmp/guide71-figma-first-mobile-final.png, /tmp/guide71-figma-last-desktop-final.png.
기존 설명 그림과 나머지 화면의 세부 디자인은 이번 탐색 변경 범위에서 재작성하지 않았다.

검토자가 최초 브라우저 캡처에서 JPEG/PNG 확장자 불일치와 화면 밖으로 벗어난 창의
오른쪽 잘림을 발견해 시각 검증을 보류했다. Chrome의 확대/축소 제어로 창을 화면 안에
맞춘 뒤 동일 소스의 첫·중간·두 끝 장을 다시 촬영했다. JPEG 원본을 보존하고
브라우저 UI를 제외한 PNG를 생성했다. 최종 증거는 위 guide71-page 경로다.
이미지 자르기 최초 실행은 로컬 Python PIL 부재로 실패했고, 기존 sharp 의존성을
사용한 첫 재시도에서 성공했다. 소스 변경이나 새 패키지 추가는 없었다.
메인 보호 경계 추가 후 관련3개 파일34개 테스트가 통과했다: /tmp/guide71-targeted.log.
