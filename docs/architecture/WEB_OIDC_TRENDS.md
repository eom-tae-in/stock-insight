# 웹 OIDC 세션과 Trends 작업

이슈 #26의 전환 경로는 `WEB_AUTH_MODE=oidc`에서 활성화된다. 기본값은
기존 모드다. 기존 계정 UUID를 이메일로 OIDC subject에 연결하지 않는다.
OIDC 모드에서는 `/trends-jobs`와 신규 인증·작업 API만 사용할 수 있다.
기존 저장 API는 501로 차단한다. 기존 저장 기능과 계정 이전은 후속 작업이다.

## 실행

Node.js 24 이상과 Redis 6.2 이상(GETDEL 사용)이 필요하다.
`infra/local/web.env.example`을 참고해 환경 변수를 설정한다. 세션 암호화 키는
`openssl rand -hex 32`로 생성하고 비밀 저장소 또는 로컬 비추적 환경 파일에
보관한다. 모든 웹 인스턴스가 동일한 키와 Redis를 사용해야 한다.
키 변경은 기존 로그인 세션을 무효화하므로 세션 정리·재로그인 절차를 동반한다.

```sh
npm ci
WEB_AUTH_MODE=oidc npm run build
npm start
```

빌드와 실행 모두 같은 `WEB_AUTH_MODE`를 사용한다. OIDC 서버 실행에는
예시 파일의 모든 서버 환경 변수가 필요하다. Supabase 자격증명은 필요 없다.
서버 초기화는 OIDC 설정을 검사하고 기존 Supabase 초기화를 실행하지 않는다.
개발 환경의 React 도구는 `NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS=true`로 끌 수 있다.
프로덕션에서는 실행하지 않는다.

Keycloak 신규 realm에는 `/api/auth/oidc/callback`과 `/login` 로그아웃 복귀
주소를 등록했다. 기존 볼륨은 realm 파일 변경을 자동 반영하지 않으므로 관리자
콘솔의 `stock-insight-web` 클라이언트에서 Valid redirect URIs에
`http://localhost:3000/api/auth/oidc/callback`, Valid post logout redirect URIs에
`http://localhost:3000/login`을 추가한다. 기존 runtime smoke 주소도 유지한다.
Public client, Standard flow, PKCE S256, API audience `stock-insight-api`를
유지하고 password grant를 켜지 않는다. 운영 주소는 정확한 HTTPS 주소로
치환하며 와일드카드를 허용하지 않는다. 실제 Keycloak 적용 검증은 #24에 남긴다.

## 인증과 서비스 경계

Authorization Code + PKCE S256, state, nonce와 ID Token 서명은
`openid-client`로 검증한다. 브라우저 쿠키에는 무작위 세션 ID만 넣는다.
access/refresh token과 ID Token은 AES-256-GCM으로 암호화해 Redis에 보관한다.
HttpOnly·SameSite=Lax와 HTTPS Secure/\_\_Host 쿠키를 적용한다. 로컬 HTTP는
명시적인 허용 설정과 loopback issuer/origin에만 허용한다.

로그인 트랜잭션은 10분 TTL과 원자적 GETDEL로 한 번만 소비한다. 세션은
최대 8시간이며 갱신해도 절대 만료 시간을 연장하지 않는다. refresh token
동시 사용은 Redis 잠금으로 직렬화한다. Lua 저장은 잠금 소유자와 기존 세션
존재를 검사해 로그아웃 중 완료된 갱신이 세션을 되살리지 못하게 한다.
invalid_grant이면 서버 세션을 삭제한다. 로그아웃은 CSRF 검증 후 서버 세션을
먼저 삭제하며 IdP 로그아웃 주소 조회 실패에도 브라우저 쿠키를 지운다.

페이지와 BFF가 세션을 직접 검사하며 미들웨어만 신뢰하지 않는다.
POST/DELETE는 정확한 WEB_ORIGIN과 세션 CSRF를 검증한다. BFF는 검증된
작업 조건과 멱등 키만 Gateway로 보내고 사용자 식별자는 브라우저에서 받지
않는다. API 소유권 판단은 analysis-service의 issuer/subject 경계에 남긴다.
인증 오류·토큰·Redis 원문을 브라우저 오류 응답에 노출하지 않는다.

Next.js는 같은 15.5 계열의 15.5.27로 고정한다. 기존 15.5.9에는
[미들웨어 우회 보안 공지](https://github.com/vercel/next.js/security/advisories/GHSA-267c-6grr-h53f)의
영향 범위가 포함된다. 패치와 페이지/API 직접 인증 검사를 함께 적용한다.
의존성 전체 보안 감사가 완료됐다는 의미는 아니다.

## 작업 화면

조건 입력 → 작업 생성 → 폴링 → 차트/표의 순서로 표시한다. 성공·실패 또는
상태 조회 한계에 도달하면 폴링을 끝낸다. 새 작업·갱신·삭제·페이지 이탈 시
늦게 도착한 응답을 무시한다. 불확실하게 실패한 같은 입력은 같은 멱등 키를
재사용하고 입력/작업 세대가 바뀌면 새 키를 사용한다. 401·404·409·429 및
데이터 없음·시간 초과·provider 실패를 사용자 문장으로 표시한다.
현재 결과는 fixture-v1 샘플이며 실제 Google 수집이라고 표시하지 않는다.
페이지 재로드 시 작업 선택 복원과 저장 기능은 아직 이관하지 않았다.

## 수동 검증

```sh
npm run check
WEB_AUTH_MODE=oidc npm run build
npm run test:web-oidc
```

프로토콜 테스트는 실제 독립 Redis 프로세스와 서명된 HTTP OIDC fixture를
사용한다. 브라우저 검증은 실제 Next 프로덕션 서버·Redis·설치된 Chrome을
사용하고 OIDC/Gateway 응답은 fixture다. 테스트 포트와 Redis 임시 디렉터리는
매번 분리한다. 스크린샷은 임시 디렉터리에 보관하고 저장소에 넣지 않는다.
로그인·결과 화면을 390/1440/1920px, light/dark에서 캡처한다.

기존 브라우저 검증은 이전 완료 문구를 새 갱신 완료로 읽어 세대 검증에
실패했다. 지금은 갱신 POST 응답과 해당 새 세대의 SUCCEEDED 조회 응답을
확인한 다음 화면을 검사한다. 대기 시간을 늘리거나 검증을 삭제하지 않았다.
기존 Supabase 초기화 실행과 Playwright 브라우저 미설치도 각각 초기화 분기와
설치된 Chrome 사용으로 해결했다. 실패 횟수와 중단 후 사용자 재개 지시는
검증 이력으로 유지한다.

Docker 실제 Keycloak·Java·DB·RabbitMQ 연동, 사용자 두 명의 실제 소유권,
운영 HTTPS 쿠키 및 클라우드 배포는 #24와 후속 단계에서 확인한다.
fixture 통과를 전체 MSA E2E 통과로 분류하지 않는다. CI/CD는 생성하지 않는다.
