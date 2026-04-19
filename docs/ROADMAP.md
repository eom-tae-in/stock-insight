# StockInsight 개선 로드맵

이 로드맵은 현재 중간 전환 상태의 프로젝트를 안정적인 Supabase 기반 주식/키워드 분석 앱으로 정리하기 위한 단계별 실행 계획이다. 각 Phase는 독립적으로 검증 가능한 결과물을 가져야 하며, 구현 전후로 문서와 테스트를 함께 갱신한다.

## 운영 원칙

- PRD는 제품 요구사항의 기준 문서다.
- TRD는 아키텍처, 코드 컨벤션, 테스트 전략의 기준 문서다.
- ROADMAP은 실행 순서와 수락 기준의 기준 문서다.
- 새 기능보다 먼저 데이터 모델, API 계약, 테스트 기준을 안정화한다.
- `keyword_searches` 기반 구형 모델과 `keyword_analysis` 기반 신형 모델을 동시에 확장하지 않는다.
- 각 작업은 작은 PR 단위로 완료하고, 최소 `typecheck`, `lint`, 관련 테스트를 통과해야 한다.

## Phase 0. 현상 고정 및 기준선 확보

목표: 현재 동작/비동작 지점을 명확히 기록하고 이후 변경의 기준선을 만든다.

### Task 0.1 문서 기준선 갱신

- `docs/PRD.md`를 현재 제품 방향에 맞게 재작성한다.
- `docs/TRD.md`를 추가해 목표 아키텍처와 코드/테스트 규칙을 정의한다.
- `docs/ROADMAP.md`를 단계별 실행 계획으로 재작성한다.

수락 기준:

- 세 문서가 서로 충돌하지 않는다.
- 오래된 SQLite/SerpAPI 중심 설명이 기준 문서에서 제거된다.
- 현재 발견된 구조 문제와 개선 방향이 로드맵에 반영된다.

### Task 0.2 상태 점검 리포트 작성

- 현재 DB 테이블과 마이그레이션 적용 상태를 점검한다.
- `.env.example`, `package.json`, 배포 설정의 불일치를 기록한다.
- 현재 라우트별 사용 테이블을 표로 정리한다.

수락 기준:

- `docs/STATUS.md` 또는 이슈 문서에 현재 위험이 정리된다.
- `keyword_temporary_overlays`처럼 코드에서 참조하지만 마이그레이션에 없는 테이블이 식별된다.

## Phase 1. 데이터 모델 통합

목표: 키워드/분석/오버레이 저장 모델을 하나로 통일한다.

### Task 1.1 목표 스키마 확정

- 최종 테이블을 확정한다: `keywords`, `keyword_analysis`, `keyword_stock_overlays`, `overlay_chart_timeseries`.
- `keyword_searches`, `keyword_chart_timeseries`, `keyword_temporary_overlays`의 처리 방침을 정한다.
- unique 제약, 외래키, cascade, RLS 정책을 재검토한다.

수락 기준:

- 신규 ERD가 TRD와 마이그레이션에 반영된다.
- 모든 keyword 관련 API가 어떤 테이블을 쓰는지 결정된다.

### Task 1.2 마이그레이션 정리

- 누락 테이블을 제거하거나 정식 마이그레이션으로 추가한다.
- `keyword_stock_overlays`가 `analysis_id` 기준으로만 동작하게 정리한다.
- 키워드 오버레이가 `searches`에 의존하지 않도록 `search_id` FK를 제거하고 `(analysis_id, ticker)` 기준으로 중복을 막는다.
- legacy 데이터를 목표 스키마로 이동하는 SQL을 작성한다.

수락 기준:

- 새 Supabase 프로젝트에 마이그레이션을 순서대로 적용할 수 있다.
- 중복 unique 제약 또는 충돌하는 onConflict 대상이 없다.
- RLS 정책이 모든 SELECT/INSERT/UPDATE/DELETE에 적용된다.

### Task 1.3 TypeScript DB 타입 정리

- `src/types/database.ts`를 목표 스키마 기준으로 정리한다.
- legacy 타입은 명시적으로 `Legacy*` 이름을 사용하거나 제거한다.
- Supabase row 타입, domain type, API DTO를 분리한다.

수락 기준:

- DB row와 UI DTO가 혼용되지 않는다.
- `npm run typecheck`가 통과한다.

## Phase 2. API와 서비스 레이어 재구성

목표: API Route가 얇고 일관되며, 비즈니스 로직은 서비스 레이어에 모이도록 만든다.

### Task 2.1 API 응답/오류 계약 표준화

- 모든 API Route가 `createSuccessResponse`, `createErrorResponse`, `validateApiAuth`를 사용한다.
- 오류 코드를 표준화한다.
- 프로덕션에서는 내부 오류 메시지를 노출하지 않는다.

수락 기준:

- API 응답 형태가 모든 route에서 동일하다.
- 인증 실패, 입력 오류, 외부 API 실패, DB 실패를 구분한다.

### Task 2.2 종목 서비스 정리

- `stock-service`는 Yahoo Finance 수집만 담당한다.
- 종목 저장/조회/삭제/갱신은 `stock-repository` 또는 DB adapter로 분리한다.
- 계산 로직은 순수 함수로 유지한다.

수락 기준:

- 종목 조회 API에서 데이터 수집, 계산, 저장 흐름이 명확하다.
- 동일 ticker upsert와 price_data upsert가 원자성 있게 처리된다.

### Task 2.3 Trends 서비스 단일화

- `api/trends.py`, `src/lib/get_trends.py`, `/api/trends-internal`, `/api/trends`의 역할을 재정의한다.
- 로컬/배포 공통으로 사용할 Trends provider 인터페이스를 만든다.
- `TRENDS_API_URL` 포트와 실행 스크립트를 일치시킨다.

수락 기준:

- Trends 수집 진입점이 하나다.
- 로컬 `npm run dev`에서 설정 그대로 Trends가 동작한다.
- 실패 시 빈 배열로 성공 처리하지 않고 명확한 오류를 반환한다.

### Task 2.4 키워드 분석 API 재작성

- `GET/POST /api/keyword-analysis`를 목표 스키마 기준으로 정리한다.
- 분석 생성은 keyword upsert 후 analysis upsert 흐름으로 처리한다.
- 필터 변경 시 분석 조회/생성 규칙을 명확히 한다.

수락 기준:

- `(user_id, keyword, region, period, search_type)` 기준으로 중복 분석이 생기지 않는다.
- `userId` 파라미터가 실제 쿼리 또는 RLS 검증에 의미 있게 사용된다.

### Task 2.5 오버레이 API 재작성

- 오버레이는 `analysis_id` 기준으로만 조회/삽입/삭제/정렬한다.
- 구형 `keyword_search_id` 기반 route는 제거하거나 호환 redirect 레이어로 축소한다.
- 오버레이 시계열 저장과 조회를 일관화한다.

수락 기준:

- 다른 분석의 오버레이가 섞이지 않는다.
- 같은 분석에 같은 종목 중복 추가가 차단된다.

## Phase 3. 프론트엔드 구조 정리

목표: 페이지와 컴포넌트가 제품 도메인별로 읽히고, 클라이언트 상태가 서버 데이터와 충돌하지 않도록 한다.

### Task 3.1 라우트와 페이지 모델 정리

- 앱 라우트를 제품 기능 기준으로 정리한다.
- 빈 오타 디렉터리(`src/app/\(app\)`, escaped dynamic route)를 제거한다.
- route group과 URL 구조를 문서화한다.

수락 기준:

- `src/app` 구조만 보고 주요 페이지를 파악할 수 있다.
- 잘못 이스케이프된 빈 디렉터리가 없다.

### Task 3.2 키워드 화면 재구성

- 검색, 내 키워드, 분석 상세, 오버레이 관리를 분리한다.
- 조건 선택 UI는 분석 모델과 1:1로 매핑된다.
- 필터 변경, 분석 생성, 오버레이 갱신 시 로딩/오류 상태를 제공한다.

수락 기준:

- 사용자가 현재 보고 있는 분석 조건을 항상 알 수 있다.
- 조건 변경 시 오버레이가 올바르게 재조회된다.

### Task 3.3 종목 화면 재구성

- 종목 검색, 상세, 테이블 뷰, 다운로드 플로우를 점검한다.
- 대시보드에서 종목과 키워드 분석 진입점을 명확히 한다.

수락 기준:

- 종목 저장/삭제/상세 진입 플로우가 회귀 없이 동작한다.
- 불필요한 unused 상태와 핸들러가 제거된다.

### Task 3.4 UI 접근성/반응형 점검

- 주요 버튼에 명확한 accessible name을 제공한다.
- 차트 컨테이너의 모바일/데스크톱 크기를 안정화한다.
- 로딩, 빈 상태, 오류 상태를 모든 주요 화면에 적용한다.

수락 기준:

- 핵심 화면에서 텍스트/버튼 겹침이 없다.
- 키보드로 주요 작업을 수행할 수 있다.

## Phase 4. 테스트 체계 구축

목표: 리팩터링 이후에도 핵심 기능이 깨지지 않도록 테스트 피라미드를 만든다.

### Task 4.1 테스트 도구 도입

- 단위 테스트 도구를 선택한다. 권장: Vitest + React Testing Library.
- E2E 테스트 도구를 선택한다. 권장: Playwright.
- 테스트 전용 env와 mock provider 전략을 정의한다.

수락 기준:

- `npm run test`, `npm run test:e2e` 스크립트가 추가된다.
- CI 없이도 로컬에서 재현 가능한 테스트 실행이 가능하다.

### Task 4.2 순수 로직 단위 테스트

- MA13, YoY, 날짜 정규화, 시계열 매칭을 테스트한다.
- keyword classifier, currency util 등 작은 유틸을 테스트한다.

수락 기준:

- 엣지 케이스: 데이터 부족, 0 나눗셈, 중복 날짜, 역순 데이터가 검증된다.

### Task 4.3 API 통합 테스트

- 인증 실패, 입력 검증 실패, 정상 생성/조회/삭제를 테스트한다.
- Supabase는 테스트 DB 또는 repository mock으로 격리한다.
- 외부 API는 mock provider로 대체한다.

수락 기준:

- 외부 네트워크 없이 테스트가 통과한다.
- API 응답 계약이 스냅샷 또는 명시 assertion으로 보호된다.

### Task 4.4 E2E 테스트

- 로그인 후 종목 저장/상세 조회.
- 키워드 분석 생성.
- 종목 오버레이 추가/삭제/정렬.
- Excel/PNG 다운로드 트리거.

수락 기준:

- 핵심 사용자 여정이 Playwright로 자동 검증된다.
- 테스트 데이터 정리 절차가 명확하다.

## Phase 5. 품질 게이트와 배포 준비

목표: 로컬 개발과 Vercel 배포 모두에서 안정적인 운영 기준을 만든다.

### Task 5.1 환경 변수 검증

- `.env.example`과 `src/lib/env.ts`를 일치시킨다.
- server-only env와 public env를 분리한다.
- placeholder 값을 명시적으로 거부한다.

수락 기준:

- 필수 env 누락 시 앱 시작 단계에서 명확히 실패한다.
- 문서와 실제 코드가 같은 env 이름을 사용한다.

### Task 5.2 로깅과 에러 처리

- 서버 로그에서 민감 정보를 제거한다.
- 사용자-facing 오류 메시지를 정리한다.
- `error.tsx`에서 내부 오류 메시지 노출을 제한한다.

수락 기준:

- 프로덕션 모드에서 내부 stack/message가 UI에 표시되지 않는다.

### Task 5.3 빌드/린트 기준 강화

- unused 변수와 hook dependency 경고를 정리한다.
- ESLint 경고를 실패로 볼지 결정한다.
- `npm run check-all`을 최종 품질 게이트로 사용한다.

수락 기준:

- `npm run check-all`과 `npm run build`가 통과한다.
- 경고가 남는 경우 문서화된 예외만 허용한다.

## Phase 6. 최적화와 사용성 개선

목표: 안정화 이후 사용자 경험과 성능을 개선한다.

### Task 6.1 데이터 로딩 최적화

- N+1 조회를 제거한다.
- 대시보드 카드용 경량 DTO를 만든다.
- 상세 페이지는 필요한 시계열만 로드한다.

### Task 6.2 차트 성능 개선

- 긴 시계열 렌더링 비용을 측정한다.
- Recharts 데이터 변환을 memoization한다.
- 모바일 차트 터치 UX를 점검한다.

### Task 6.3 다운로드 품질 개선

- Excel 시트 구조를 정리한다.
- PNG export 배경/테마/해상도를 안정화한다.
- 파일명 규칙을 통일한다.

## 우선순위 요약

1. 문서 기준선 갱신
2. 키워드 데이터 모델 통합
3. Trends 수집 경로 단일화
4. API/서비스 레이어 재작성
5. 프론트엔드 라우트와 컴포넌트 정리
6. 테스트 체계 구축
7. 품질 게이트와 배포 준비
