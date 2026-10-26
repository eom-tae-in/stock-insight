# 공개 서비스 안내 · 이슈 #66 작업 기록

2026-10-26. 구현 후 브라우저 검증에서 중단했다. 아래 재개 기록이 최신 상태다.
완료 또는 배포 가능 판정이 아니다. 제공된 컨텍스트 사용률은 확인 불가다.

## 작업 위치와 범위

- 이슈: https://github.com/eom-tae-in/stock-insight/issues/66
- 담당자 eom-tae-in, enhancement 라벨, OPEN.
- 브랜치 `feat/66/public-service-guides`, 기준 develop `b3eff89`.
- 별도 작업 폴더 `/tmp/stock-insight-guides-66`.
- 미커밋·미푸시 상태. PR 없음. 병합·운영 배포 없음.
- 원래 작업 폴더의 기존 미커밋 변경은 건드리지 않았다.
- 자동 배포 대상이 develop인 현재 Vercel 설정을 변경하지 않았다.
- Docker 복구·실제 DB/broker/OIDC 통합 검증은 기존 지시대로 보류.

## 구현된 소스 (검증 완료와 구분)

- `/explore` 목차, `/guide?step=N` 사용법7장, `/renewal?step=N` 계획6장.
- 공개 경로는 위3개 정확한 pathname만 인증 제공자 호출 전에 통과한다.
  하위 경로·유사 접두사·저장 API의 권한을 열지 않는다.
- 로그인 소개 영역·서비스 사용법/리뉴얼 미리보기 링크.
- 기존 Google·이메일 로그인 폼, OIDC 링크·next·실패 안내를 유지한다.
- Figma의 텍스트·설명 패널과 내려받은 SVG 그래프를 조합한다.
  그림의 저장·자료 도구는 설명용 텍스트이며 실제 요청을 하지 않는다.
- 설명은 실사용 흐름을 기준으로 조회/저장, 임시 비교/연동 저장,
  브라우저 내 차트/서버 연동 차트, 현재 기능/향후 계획을 구분한다.
- 실제 사용자 계정·자격 증명·관리자 데이터는 포함하지 않았다.

변경 파일: DESIGN.md, src/middleware.ts, src/middleware.guides.test.ts,
src/app/(auth)/login/page.tsx, src/app/(public)/ 전체,
src/components/auth/{login-layout,oidc-login,login-guides.test}.tsx,
src/components/guides/ 전체, src/lib/guides/ 전체, public/guides/ SVG.

Figma 파일 WEmeHbbzBqEfBxez9dMk9o, 안내 페이지82:27.
주요 참조85:3597/85:4298/85:5747/85:5826/85:5883/85:4987.
원본 SVG의 루트 치수와 내용을 수정하지 않았다. 코드에서 임시 Figma URL을 사용하지 않는다.

## 통과한 검사

모든 명령은 작업 폴더에서 Node24.21.0을 PATH 선두에 사용했다.

```sh
PATH=/Users/taein/.nvm/versions/node/v24.21.0/bin:$PATH npm run check
PATH=/Users/taein/.nvm/versions/node/v24.21.0/bin:$PATH WEB_AUTH_MODE=oidc npm run build
```

- 관련 테스트 최초 실행5개 파일39개 PASS.
- 전체 check 첫 재시도: 타입·린트·포맷,112개 파일709개 테스트 PASS.
- OIDC 빌드 첫 재시도: 컴파일·정적 페이지 생성·build trace PASS.
- 공개 인증 경계는 legacy/OIDC 두 모드의 단위 검사로 확인했다.
  실제 로그인 제공자와의 종단간 인증 성공을 의미하지 않는다.

## 실패와 복구 기록

### 빌드

최초 `WEB_AUTH_MODE=oidc npm run build`:
Turbopack이 작업 폴더 밖을 가리키는 node_modules 심볼릭 링크를 거부했다.
프로젝트 설정을 변경하지 않고 작업 폴더에 로컬 의존성 하드 링크 복사를 구성했다.
이 과정의 copytree는 실행 중 검사기가 만든 .vite 디렉터리와 충돌했다.
나머지 의존성 배치 후 첫 빌드 재시도가 통과했다. 소스·설정 완화 없음.

### 전체 check

최초 `WEB_AUTH_MODE=oidc npm run check`의 타입·린트·포맷은 통과했다.
테스트 실행 중 위 의존성 링크를 교체한 실수로 next/server·react 등의
import 해석이6개 suite에서 실패했다(106개 파일681개 테스트는 통과).
의존성 배치가 끝난 후 `npm run check`로 동일 검사 첫 재시도가 통과했다.
이는 검사와 의존성 변경을 동시에 진행해 발생한 실행 환경 문제다.

### 브라우저 검증: 최초 + 재시도2회 모두 실패, 추가 실행 중단

명령:

```sh
/Users/taein/.nvm/versions/node/v24.21.0/bin/node /tmp/guides-66-qa.mjs
```

최종 실행은 stdout/stderr를 `/tmp/guides66-browser.log`에 보관했다.
이 파일과 QA 스크립트는 로컬 산출물로 커밋하지 않는다.

1. 최초: OIDC 설정 없이 next start 실행. instrumentation의
   AUTH_CONFIGURATION_INVALID로 /explore가500, 제목 검사가 실패했다.
2. 재시도1: 기존 저장소의 OIDC provider·Redis fixture와 임의 생성한
   테스트 전용 세션 암호 키로 서버를 시작했다. 페이지 이동 완료 전
   localStorage 접근으로 SecurityError가 발생했다.
3. 재시도2: goto에 waitUntil:load를 지정했다.15개 페이지×4폭×2테마의
   120개 PNG를 생성하고, 다음 링크가 step6으로 이동하는 검사까지 진행했다.
   history.back 뒤 step5 제목을 기다리는 locator가3000ms 시간 초과했다.
   뒤로가기 때 실제 URL·history entry·제목을 함께 기록하지 않아 원인은 미확정이다.
   Next 링크와 fragment/history 처리 또는 자동화 locator/readiness를 조사해야 한다.

스크립트는 다음 assertion을 실행하지 못했다: URL 재방문·잘못된step의
브라우저 fallback·로그인 안내 링크 클릭·키보드 포커스.
단위 검사 결과와 브라우저 미실행 항목을 혼동하지 않는다.

## 캡처의 제한과 남은 실제 문제

캡처: `/tmp/stock-insight-guides66-qa/`.
시도한 행렬은15개 페이지×390/1280/1440/1920×dark/light이지만,
중단 후 이미지 읽기에서 `390-light-guide-5.png`가 데스크톱 구도로 보였다.
Omowright의 emulate 이후 navigation 시 viewport 기본값 복원 가능성이 있다.
따라서 파일명만으로 모바일·모든 폭 검증 PASS라고 보고할 수 없다.
실제 innerWidth와 PNG 치수를 각 캡처에 저장하고 일치부터 확인해야 한다.
중간 results는 마지막 실패 때문에 JSON으로 저장되지 않았다.

직접 읽은 캡처:

- 1440-dark-guide-5.png: 설명·팁·도식·카드 이동이 렌더링됐다.
- 390-light-guide-5.png: 잘못된 데스크톱 크기의 캡처이며 모바일 증거가 아니다.
  라이트에서 SVG 주가 선은 너무 옅고 grid는 진해 Figma85:6091과 다르다.
  다크 원본의 고정 색상이 외부SVG 이미지에서 상속되지 않는 문제가 의심된다.
  라이트 원본 SVG를 내려받아 테마별 자산을 정확히 연결해야 한다.

120개 캡처를 생성했지만 전체 시각 검사 PASS가 아니다.
Figma와 픽셀 단위 일치, 모든 폭·테마·키보드, Lighthouse는 완료하지 않았다.

## 다음 재개 시 작업

1. 사용자 재개 지시에 따라 검증 재시도 횟수를0으로 새로 시작하되 이 기록은 보존.
2. 실제 viewport·history·URL·제목을 함께 계측해 브라우저 검증 문제를 구분한다.
3. 라이트 SVG를 Figma 원본으로 연결하고 모든 정적 자산·크기를 재검토한다.
4. 모든 화면의 실제390/1280/1440/1920·테마·키보드·이전/다음·목차·복귀를 검증한다.
5. 필요한 수정 후 타입·린트·포맷·테스트·OIDC 빌드와 최종 시각 검증을 수행한다.
6. 완료한 범위만 한글 커밋·push 후 develop 대상 PR, Closes #66·담당자·라벨 지정.
   현재 작업에서는 운영 자동 배포로 이어지는 병합을 하지 않기로 안내했다.

종료 시 이번 작업에서 시작한 Next 서버·Chrome 임시 프로필·Redis·OIDC fixture는
finally에서 정리했다. 운영 자원이나 기존 사용자 브라우저는 종료하지 않았다.

## 재개 기록 · 사용자 «큰 문제 없으면 진행해줘» 이후

사용자 재개 지시에 따라 이 실행 구간의 검증 횟수를0에서 시작했다.
이전 실패 기록은 위에 보존했다. 제공된 컨텍스트 사용률은 여전히 확인 불가다.

### 수정

- 안내용 모든 그래프와 로그인 그래프에 Figma 원본의 Light 자산을 추가했다.
  원본 벡터를 복제한 임시 내보내기 노드에서 Light 모드로 가져온 후 임시 노드는 정리했다.
  파일을 직접 재색칠하거나 SVG 경로·루트 치수를 수정하지 않았다.
- 기존 토큰의 dark variant로 정확한 테마 자산을 선택한다.
- 검증의 AgentTabManager가 navigation 때1440px로 repin하는 원인을 확인했다.
  manager.repin과 기기 에뮬레이션을 함께 적용하고 실제 innerWidth·DPR·touch를 검사한다.
- PNG는 스크롤바를 제외한 clientWidth×DPR과 비교한다.
- 각 페이지 직후 results.json을 저장하며 URL·제목·history.length를 별도 기록한다.

### 이 실행 구간의 통과

- `PATH=/Users/taein/.nvm/versions/node/v24.21.0/bin:$PATH npm run check`:
  타입·린트·포맷·112개 파일709개 테스트 PASS.
  로그 `/tmp/guides66-check-resumed.log`.
- `PATH=/Users/taein/.nvm/versions/node/v24.21.0/bin:$PATH WEB_AUTH_MODE=oidc npm run build` PASS.
- 스킬의 accent stripe 검사기를 로컬 임시 JavaScript로 transpile해 실행:
  변경 UI13개 파일, no accent stripes PASS. 저장소 도구·의존성 변경 없음.
- 파일별 책임을 확인했다. 신규 UI 파일은 순수 LOC200 미만,
  예시 그림은198줄로 단일 책임의 정적 도식 매핑이다.
- 브라우저 최종 실행의15개 화면×390/1280/1440/1920×Light/Dark:
  120개 full-page와 모바일 끝 위치30개 PNG 생성.
  실제 innerWidth·DPR(모바일3/PC1)·touch·가로 넘침·표시 이미지 로딩·PNG content width 검사 PASS.
- 직접 읽은390px 라이트 비교 카드에서 주가 선·grid 색상이 정상적으로 구분된다.
  모바일 다크 로그인에서 안내 링크와 인증 진입이 표시된다.
  전체120개 이미지의 세밀한 시각 판정 완료로 분류하지 않는다.

산출물 `/tmp/stock-insight-guides66-qa-resumed/`:
results.json, history.json, 실제120개 화면과30개 모바일 끝 캡처.
이전 잘못된 폭의 캡처는 이 증거와 분리한다.

### 이 실행 구간의 브라우저 실패 (최초 + 재시도2회)

명령은 동일한 `/Users/taein/.nvm/versions/node/v24.21.0/bin/node /tmp/guides-66-qa.mjs`이며
시도별 stdout/stderr 파일만 다르다.

1. 최초: Runtime.callFunctionOn 시간 초과.
   숨겨진 데스크톱 로그인 그림·비활성 테마 이미지까지 decode를 기다렸다.
   실제 표시된 이미지만 기다리도록 QA 코드 수정.
   로그 `/tmp/guides66-browser-resumed.log`.
2. 재시도1: 데스크톱 PNG 폭1265를1280과 비교해 실패.
   innerWidth 검사는1280으로 통과했지만 full-page capture는15px 스크롤바를 제외했다.
   실제 clientWidth×DPR로 PNG 치수를 비교하도록 수정했다.
   로그 `/tmp/guides66-browser-resumed-retry1.log`.
3. 재시도2: 위120개 화면 검사와 다음 링크 이동까지 통과.
   Omowright page.goBack이 `Timed out waiting for navigation`으로 실패했다.
   로그 `/tmp/guides66-browser-resumed-retry2.log`.
   history.json의 실제 증거:
   - before next: `/guide?step=5`, 제목 «비교해 보고, 남기고 싶을 때 저장».
   - after next: `/guide?step=6#guide-title`, 제목 «내 차트를 만들고 자료를 남기기».
   - after back은 도구의 navigation 대기가 반환하지 않아 기록하지 못했다.

가설: SPA의 동일 문서 history 이동인데 자동화 도구가 일반 navigation을 기다리는 문제.
실제 뒤로간 뒤 주소와 DOM은 실패 시점에 수집하지 못했으므로 확정하지 않는다.
검사 timeout을 늘리거나 우회 성공으로 표시하지 않았다.
사용자가 재개하면 네이티브 뒤로가기를 실행하고 URL·DOM·CDP history를 함께 관측해
실제 제품 문제와 도구의 navigation 대기 문제를 구분해야 한다.

### 중단 시점

사용자 규칙에 따라 재시도2회 실패 후 추가 개발·검증 실행을 중단했다.
새 코드·자산·문서는 미커밋으로 위 작업 폴더에 보존했다. PR·push·병합·운영 배포 없음.
다음 검증인 뒤로가기 완료·URL 재방문·잘못된step fallback·로그인 안내 링크 클릭·
키보드 포커스는 브라우저 전체 PASS로 표시하지 않는다. 해당 단위 검사는 통과한 상태다.
Next·임시 Chrome·Redis·OIDC fixture는 finally에서 정리했다.
Docker 실제 통합과 레거시 Supabase 빌드/E2E는 기존 면제/보류 상태를 유지한다.

## 현재 구현 반영 승인

사용자는 남은 브라우저 검증의 상태와 develop 병합 시 운영 자동 배포 연결을 안내받은 뒤
현재 구현으로 진행하는 것을 수락했다. 이에 이슈 #66의 구현을 PR로 제출하고 develop에
squash 병합한다. 검증 실패를 통과로 변경하지 않는다.
남은 검증은 [이슈 #67](https://github.com/eom-tae-in/stock-insight/issues/67)로 분리했다.
담당자 eom-tae-in·verification 라벨을 지정했으며 후속 검증이 끝나기 전 닫지 않는다.
위의 «미커밋·PR 없음·병합 없음»은 각 중단 시점의 이력이다.
코드 변경 없이 기존 통과 검사 증거를 사용하고, 이 문서만 포맷을 정리한다.
