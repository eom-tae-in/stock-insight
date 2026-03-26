# StockInsight MVP 개발 로드맵

특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 비교하여 투자 판단을 지원하는 로컬 분석 도구

## 개요

StockInsight은 개인 투자자를 위한 로컬 주식 분석 도구로 다음 기능을 제공합니다:

- **주가 및 트렌드 수집**: Yahoo Finance 5년 주간 주가 + SerpAPI Google Trends 검색 관심도 수집
- **시각적 분석**: 주가+MA13 차트, Trends 차트, 주가 vs 트렌드 비교 차트 3종 제공
- **로컬 데이터 관리**: better-sqlite3 기반 SQLite DB에 종목 데이터 저장/조회/삭제/갱신

## 개발 워크플로우

1. **작업 계획**

   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**

   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - `/tasks` 디렉토리에 새 작업 파일 생성
   - 명명 형식: `XXX-description.md` (예: `001-setup.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)
   - 예시를 위해 `/tasks` 디렉토리의 마지막 완료된 작업 참조. 예를 들어, 현재 작업이 `012`라면 `011`과 `010`을 예시로 참조.
   - 이러한 예시들은 완료된 작업이므로 내용이 완료된 작업의 최종 상태를 반영함 (체크된 박스와 변경 사항 요약). 새 작업의 경우, 문서에는 빈 박스와 변경 사항 요약이 없어야 함. 초기 상태의 샘플로 `000-sample.md` 참조.

3. **작업 구현**

   - 작업 파일의 명세서를 따름
   - 기능과 기능성 구현
   - API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수
   - 각 단계 후 작업 파일 내 단계 진행 상황 업데이트
   - 구현 완료 후 Playwright MCP를 사용한 E2E 테스트 실행
   - 테스트 통과 확인 후 다음 단계로 진행
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**

   - 로드맵에서 완료된 작업을 체크 표시로 변경

---

## 개발 단계

### Phase 1: 애플리케이션 골격 구축 -- 완료

> 라우팅, 레이아웃, 기본 UI 컴포넌트 골격이 이미 구성되어 있음.
> 이 Phase에서는 나머지 타입 정의, DB 스키마 설계, 환경 설정을 완료한다.

- **Task 001: 타입 정의 및 인터페이스 설계** - 우선순위
  - `src/types/` 디렉토리에 전체 TypeScript 타입/인터페이스 정의
  - `StockSearch`, `PriceData`, `TrendsData` DB 모델 타입 정의
  - `StockData`, `TrendsDataPoint`, `CalculatedMetrics` API 응답 DTO 타입 정의
  - 차트 데이터 타입 (`PriceChartData`, `TrendsChartData`, `ComparisonChartData`) 정의
  - 공통 API 응답 래퍼 타입 (`ApiResponse<T>`, `ApiError`) 정의

- **Task 002: 데이터베이스 스키마 및 초기화 설정**
  - `src/lib/db.ts`에 better-sqlite3 싱글턴 인스턴스 생성 로직 구현
  - `PRAGMA foreign_keys = ON` 설정 포함
  - `searches`, `price_data`, `trends_data` 테이블 CREATE TABLE IF NOT EXISTS DDL 작성
  - `(search_id, date)` 복합 인덱스 생성
  - `next.config.ts`에 `serverExternalPackages: ['better-sqlite3']` 추가
  - `data/` 디렉토리 생성 및 `.gitignore`에 `data/*.db` 추가

- **Task 003: 환경 변수 및 프로젝트 설정**
  - `.env.local` 및 `.env.example` 파일 구성 (`SERPAPI_KEY`)
  - `src/lib/env.ts` 환경 변수 검증 유틸리티 구현
  - 필요한 npm 패키지 설치 (`better-sqlite3`, `yahoo-finance2`, `date-fns`, `recharts`, `xlsx`, `html-to-image`)
  - `@types/better-sqlite3` 개발 의존성 추가

---

### Phase 2: UI/UX 완성 (더미 데이터 활용)

> 모든 페이지의 UI를 더미 데이터로 완성하여 전체 사용자 플로우를 체험할 수 있도록 한다.
> 이 단계에서는 실제 API 호출이나 DB 연동 없이, 하드코딩된 데이터로 화면을 구성한다.

- **Task 004: 더미 데이터 및 목업 유틸리티 작성**
  - `src/lib/mock-data.ts`에 더미 데이터 생성 함수 구현
  - 5년치 주간 주가 더미 데이터 (260개 데이터포인트) 생성
  - 5년치 주간 트렌드 더미 데이터 (260개 데이터포인트) 생성
  - MA13, YoY, 52주 최고/최저가 등 계산 지표 더미 데이터 포함
  - 저장된 종목 목록 더미 데이터 (3-5개 종목) 생성

- **Task 005: 대시보드 페이지 UI 구현 (F014, F015, F016)**
  - 종목 카드 컴포넌트 (`StockCard`) 구현: ticker, 회사명, 현재가, YoY, 스파크라인
  - 4열 반응형 카드 그리드 레이아웃 구현 (모바일 1열, 태블릿 2열, 데스크톱 4열)
  - 카드 호버 시 새로고침/삭제 버튼 오버레이 구현
  - 삭제 확인 다이얼로그(AlertDialog) 구현
  - 빈 상태 UI ("저장된 종목이 없습니다") 개선
  - 하단 [+ 추가] 버튼 고정 배치
  - 스파크라인 미니 차트 컴포넌트 구현 (Recharts LineChart 간소화 버전)

- **Task 006: 검색 페이지 UI 구현 (F001)**
  - React Hook Form + Zod 기반 Ticker 입력 폼 구현
  - 영문 대문자 자동 변환 로직 적용
  - 빈 값 제출 방지 및 인라인 에러 메시지 표시
  - Enter 키 및 조회 버튼 제출 지원
  - 로딩 상태 UI: Skeleton 카드 5개 + 차트 Skeleton 3개 표시
  - 단계별 진행 메시지 표시 컴포넌트 구현 ("주가 데이터 수집 중..." 등)
  - 에러 상태 UI: 에러 메시지 + [다시 시도] 버튼

- **Task 007: 종목 상세 페이지 UI 구현 (F010, F007, F008, F009)**
  - 지표 요약 카드 5개 구현: 현재 종가, MA13, YoY(색상 구분), 52주 최고가, 52주 최저가
  - 주가 + MA13 라인 차트 구현 (Recharts LineChart, 파란색/주황색)
  - Google Trends 영역 차트 구현 (Recharts AreaChart)
  - 주가 vs 트렌드 비교 차트 구현 (Recharts ComposedChart, 이중 Y축)
  - 차트 공통 설정: X축 날짜 레이블, Y축 단위, 범례, 반응형 크기
  - 각 차트별 [PNG 다운로드] 버튼 배치 (기능은 Phase 4에서 구현)
  - 다운로드 섹션: [엑셀 다운로드] + [전체 차트 PNG 일괄 다운로드] 버튼 배치

---

### Phase 3: 핵심 기능 구현

> 실제 API 연동, DB CRUD, 비즈니스 로직을 구현하여 더미 데이터를 실제 데이터로 교체한다.
> 각 Task 완료 후 Playwright MCP를 활용한 E2E 테스트를 수행한다.

- **Task 008: 데이터베이스 CRUD 레이어 구현 (F013, F014, F015)** - 우선순위
  - `src/lib/db/queries.ts`에 DB 접근 함수 구현
  - `insertSearch()` / `upsertSearch()`: searches 테이블 UPSERT 로직
  - `insertPriceData()` / `insertTrendsData()`: 시계열 데이터 배치 INSERT
  - `getSearchById()` / `getAllSearches()`: 종목 조회 함수
  - `getSearchByTicker()`: ticker 기반 중복 확인
  - `getPriceDataBySearchId()` / `getTrendsDataBySearchId()`: 시계열 데이터 조회
  - `deleteSearch()`: CASCADE 삭제 (searches + price_data + trends_data)
  - `replaceStockData()`: 재조회 시 price_data/trends_data 전체 교체 (DELETE + INSERT 트랜잭션)
  - Playwright MCP를 활용한 DB CRUD API 엔드포인트 통합 테스트

- **Task 009: 주가 데이터 수집 API 구현 (F002, F003)**
  - `src/app/api/stock/route.ts` Route Handler 구현
  - yahoo-finance2로 5년 주간 종가 수집 (`historical`, `interval: 1wk`)
  - yahoo-finance2 `quoteSummary()`로 회사명(companyName) 조회
  - 현재 종가 조회 (`quote`)
  - Yahoo Finance 금요일 기준일을 date-fns `startOfISOWeek()`로 월요일 정규화
  - 에러 처리: 잘못된 ticker, API 응답 실패, 네트워크 오류
  - Playwright MCP를 활용한 API 엔드포인트 테스트

- **Task 010: Google Trends 데이터 수집 API 구현 (F004)**
  - `src/app/api/trends/route.ts` Route Handler 구현
  - SerpAPI Google Trends API 호출 (`engine: google_trends`, 5년 주간 데이터)
  - 검색 키워드: companyName 우선, 실패 시 `"{ticker} stock"` 폴백
  - SerpAPI 일요일 기준 날짜를 date-fns `startOfISOWeek()`로 월요일 정규화
  - 환경 변수 `SERPAPI_KEY` 검증 및 누락 시 에러 반환
  - 에러 처리: API 키 누락, 요청 실패, 데이터 없음
  - Playwright MCP를 활용한 API 엔드포인트 테스트

- **Task 011: 지표 계산 로직 구현 (F005, F006)**
  - `src/lib/calculations.ts` 비즈니스 로직 모듈 구현
  - MA13 계산: 13주 이동평균선 (주간 종가 기반 sliding window)
  - YoY 계산: 52주 전 대비 현재 주가 변화율 (%)
  - 52주 최고가/최저가 추출: 최근 52개 주간 데이터에서 max/min
  - ISO week number 기반 주가-트렌드 데이터 매칭 (F009 비교 차트용)
  - 단위 테스트 수준의 검증 (엣지 케이스: 데이터 부족, 0 나눗셈 등)

- **Task 012: 종목 조회 통합 플로우 구현 (F001 + F003 + F004 + F005 + F006 + F013)**
  - `src/app/api/searches/route.ts` 통합 API Route Handler 구현
  - 조회 플로우: ticker 입력 -> 주가 수집 -> 트렌드 수집 -> 지표 계산 -> DB 저장 -> search_id 반환
  - 검색 페이지에서 통합 API 호출 및 로딩 상태 관리
  - 단계별 진행 메시지 업데이트 (SSE 또는 폴링 방식)
  - 성공 시 `/analysis/[id]`로 리다이렉트
  - 실패 시 에러 메시지 표시 + [다시 시도] 버튼 활성화
  - 동일 ticker 재조회 시 UPSERT 처리 검증
  - Playwright MCP를 활용한 전체 조회 플로우 E2E 테스트

- **Task 013: 대시보드 실제 데이터 연동 (F014, F015, F016)**
  - 대시보드 페이지를 Server Component로 전환하여 DB 직접 조회
  - `getAllSearches()` + 최근 52주 price_data 조회로 카드 데이터 구성
  - 스파크라인 차트에 실제 52주 가격 데이터 바인딩
  - 삭제 기능 연동: DELETE API Route -> `deleteSearch()` -> 카드 제거 (Client Component)
  - 새로고침 기능 연동: 재수집 API 호출 -> DB 갱신 -> 카드 데이터 리렌더링 (F016)
  - `searched_at` 최신순 정렬 적용
  - Playwright MCP를 활용한 대시보드 CRUD E2E 테스트

- **Task 014: 종목 상세 페이지 실제 데이터 연동 (F002, F007, F008, F009, F010)**
  - Server Component에서 `getSearchById()` + 시계열 데이터 조회
  - 지표 요약 카드 5개에 실제 DB 데이터 바인딩
  - 주가 + MA13 차트에 실제 price_data + 계산된 MA13 데이터 바인딩
  - Google Trends 차트에 실제 trends_data 바인딩
  - 비교 차트에 ISO week number 기반 매칭된 데이터 바인딩 (이중 Y축)
  - 존재하지 않는 id 접근 시 404 또는 리다이렉트 처리
  - Playwright MCP를 활용한 상세 페이지 데이터 표시 E2E 테스트

- **Task 014-1: 핵심 기능 통합 테스트**
  - Playwright MCP를 사용한 전체 사용자 플로우 테스트
    - 시나리오 1: 최초 방문 -> 빈 대시보드 -> [+ 추가] -> ticker 입력 -> 조회 -> 상세 페이지 확인 -> 대시보드 복귀
    - 시나리오 2: 저장된 종목 카드 클릭 -> 상세 페이지 차트/지표 확인
    - 시나리오 3: 카드 호버 -> 삭제 -> 확인 다이얼로그 -> 카드 제거 확인
    - 시나리오 4: 카드 호버 -> 새로고침 -> 로딩 스피너 -> 데이터 갱신 확인
    - 시나리오 5: 동일 ticker 재조회 -> UPSERT 정상 처리 확인
  - API 연동 및 비즈니스 로직 검증
  - 에러 핸들링 테스트: 잘못된 ticker, API 키 누락, 네트워크 오류

---

### Phase 4: 다운로드 기능 및 최적화

> 부가 기능(엑셀/PNG 다운로드) 구현과 사용자 경험 최적화를 수행한다.

- **Task 015: 엑셀 다운로드 기능 구현 (F011)**
  - `src/lib/export/excel.ts` 엑셀 생성 유틸리티 구현
  - xlsx(SheetJS) 라이브러리로 .xlsx 파일 생성
  - 시트 구성: "주가 데이터" (날짜, 종가, MA13), "트렌드 데이터" (날짜, 관심도), "지표 요약" (현재가, MA13, YoY 등)
  - 브라우저 다운로드 트리거 (Blob + URL.createObjectURL)
  - 파일명 형식: `{ticker}_StockInsight_{YYYYMMDD}.xlsx`
  - Playwright MCP를 활용한 다운로드 기능 테스트

- **Task 016: 차트 PNG 다운로드 기능 구현 (F012)**
  - html-to-image 라이브러리로 차트 DOM 노드를 PNG Blob 변환
  - 개별 차트 PNG 다운로드: 각 차트 섹션의 [PNG 다운로드] 버튼 기능 연결
  - 전체 차트 일괄 PNG 다운로드: 3개 차트 순차 변환 후 ZIP 또는 개별 저장
  - 차트 ref 관리: `useRef`로 각 차트 컨테이너 DOM 참조
  - 파일명 형식: `{ticker}_{chartType}_{YYYYMMDD}.png`
  - Playwright MCP를 활용한 다운로드 기능 테스트

- **Task 017: 사용자 경험 최적화 및 마무리**
  - 로딩 상태 개선: 카드 Skeleton, 차트 Skeleton 통일
  - 에러 바운더리 추가: 페이지/컴포넌트 레벨 에러 처리
  - 다크 모드 차트 색상 최적화 (배경/축/범례 색상 테마 대응)
  - 반응형 디자인 점검: 모바일/태블릿/데스크톱 레이아웃 최종 확인
  - 접근성 개선: 키보드 네비게이션, aria 속성, 색상 대비
  - `npm run check-all` 및 `npm run build` 통과 확인
  - Playwright MCP를 활용한 전체 앱 최종 E2E 테스트
