# StockInsight 프로젝트 규칙 (AI Agent용)

## 프로젝트 개요

**목적**: Yahoo Finance + Google Trends 데이터를 결합하여 종목의 5년 가격 흐름과 대중 검색 관심도를 비교 분석하는 로컬 주식 분석 도구

**기술스택**:

- Next.js 15.5.3 (App Router + Turbopack)
- React 19 / TypeScript 5
- Supabase (PostgreSQL) + better-sqlite3 (듀얼 스토리지)
- TailwindCSS v4 + shadcn/ui
- React Hook Form + Zod

---

## 📁 프로젝트 구조 & 아키텍처

### 디렉토리 맵

```
/src
├── /app                      # Next.js App Router
│   ├── /api/[route]/route.ts  # API 핸들러 (요청/응답만, 로직 금지)
│   ├── /(pages)/              # 페이지 컴포넌트
│   └── /layout.tsx            # 공통 레이아웃
├── /components                # React 컴포넌트
│   ├── /[feature]-[type]/     # 기능별 컴포넌트 (client/server 구분)
│   └── /ui/                   # shadcn/ui 컴포넌트
├── /lib
│   ├── /adapters/db.ts        # ★ DB 접근 통합점 (모든 쿼리)
│   ├── /services/[name]-service.ts  # 비즈니스 로직 (API와 분리)
│   ├── /schemas/              # Zod 스키마 정의
│   ├── /utils/                # 유틸리티 함수
│   │   └── week-sync.ts       # ISO Monday week + 완료된 전주 정규화
│   └── get_trends.py          # Pytrends 직접 실행 스크립트
├── /types/                    # TypeScript 타입 정의
│   └── database.ts            # DB 타입 (schema와 동기화)
├── /migrations/               # ★ DB 스키마 변경 (SQL)
└── /server/                   # ★ 서버 전용 TS 서비스 (route는 여기 함수만 호출)
    ├── trends-internal-service.ts
    ├── cached-stock-service.ts        # Upstash Redis REST 주가 캐시
    ├── keywords-service.ts
    ├── keyword-analyses-service.ts
    ├── analysis-overlays-service.ts
    └── keyword-overlays-service.ts

/docs                          # 프로젝트 문서
```

### 핵심 데이터 흐름

```
HTTP Request
    ↓
/src/app/api/[route]/route.ts (검증+응답만)
    ↓
/src/server/[name]-service.ts            (서버 전용, HTTP self-call 금지)
  또는 /src/lib/services/[name]-service.ts (외부 호출 가능 비즈니스 로직)
    ↓
/src/lib/adapters/db.ts (DB 쿼리)
    ↓
Supabase  +  Upstash Redis (주가 캐시, 선택)
```

**원칙**:

- API route는 검증/응답만, 비즈니스 로직은 service 함수에 위임한다.
- 서버 내부에서 절대 자기 자신의 HTTP route를 fetch 하지 않는다 → `/src/server/*` 함수를 직접 import.
- 외부에 노출되는 service는 `/src/lib/services/`, 서버 전용은 `/src/server/`에 둔다.

---

## 🔑 핵심 아키텍처 원칙

### 0. 도메인 분리 (절대 위반 금지)

```
주식 종목 기반 차트                키워드 기반 차트
─────────────────────              ──────────────────────────────────
searches                           keywords
stock_price_data                   keyword_analysis
                                   keyword_stock_overlays
                                   overlay_chart_timeseries
```

**필수 규칙**:

- 키워드 오버레이 종목은 **`searches`에 저장하지도, 의존하지도 않는다**.
- 키워드 오버레이 중복 기준은 **`(analysis_id, ticker)`**.
- 키워드 자체 중복 기준은 **공백 정규화만** 사용한다.
  - `trim` + 연속 공백 → 1개로 축소
  - 대소문자/언어/내부 단어 구분은 **유지**
- 두 도메인을 섞은 조회/저장 함수를 신규 작성하지 않는다.

### 1. 조건 조합 기반 분리 (가장 중요)

```
Keyword (단순 이름)
  └─ KeywordAnalysis (keyword_id + region + period + search_type)
      ├─ trends_data (차트 데이터)
      ├─ ma13_data (지표)
      ├─ yoy_data (지표)
      └─ KeywordAnalysisOverlay (★analysis_id 기준, keyword_id 아님)
          └─ 종목 데이터
```

**필수 규칙**:

- 1개 키워드 = N개 분석 가능
- UNIQUE(keyword_id, region, period, search_type) 제약
- 오버레이는 **반드시 analysis_id 기준**
- 필터 변경 → 해당 분석만 갱신 (다른 분석 영향 금지)

### 2. 쿼리 파라미터 기반 필터링

```
URL: /keywords/[keywordId]?region=US&period=5Y&type=WEB
API: GET /api/keyword-analysis?keyword=축구&region=US&period=5Y&type=WEB
Response: KeywordAnalysis { trends_data, ma13_data, yoy_data, overlays[] }
```

**필수 규칙**:

- 필터는 쿼리 파라미터 (경로 변경 금지)
- 기본값: region=GLOBAL, period=5Y, search_type=WEB
- 필터 변경 시 새로운 analysis 조회 (없으면 null)

### 3. 서버/클라이언트 경계 명확화

**서버 컴포넌트** (기본):

- DB 데이터 페칭
- 환경 변수 접근
- 민감한 로직 처리

**클라이언트 컴포넌트** ('use client'):

- 상태(useState)가 필요한 경우
- 이벤트 핸들러 필요
- 브라우저 API 사용

**금지**: 클라이언트에서 DB 직접 접근, 서버 환경변수 노출

---

## 📋 파일별 수정 규칙

### DB 필드 추가/삭제

**변경 순서**:

1. `/migrations/YYYYMMDD_description.sql` 작성 (UP & DOWN)
2. `/src/types/database.ts` 타입 업데이트
3. `/src/lib/adapters/db.ts` 쿼리 업데이트
4. `/src/lib/services/` 서비스 로직 업데이트
5. 필요시 `/src/lib/schemas/` Zod 스키마 업데이트

**마이그레이션 예시**:

```sql
-- /migrations/20260420_add_keyword_status.sql

-- UP
ALTER TABLE keywords ADD COLUMN status TEXT DEFAULT 'active';
CREATE INDEX idx_keywords_status ON keywords(status);

-- DOWN
DROP INDEX idx_keywords_status;
ALTER TABLE keywords DROP COLUMN status;
```

### API 응답 스키마 변경

**동시 수정 필수**:

1. `/src/lib/schemas/[feature].ts` (Zod 스키마)
2. `/src/types/database.ts` (TypeScript 타입)
3. `/src/lib/services/[name]-service.ts` (서비스)
4. `/src/app/api/[route]/route.ts` (응답)

```typescript
// ❌ 금지: 스키마와 타입 불일치
export const keywordSchema = z.object({ id: z.string() })
export type Keyword = { id: string; name: string } // 불일치!

// ✅ 정확
export const keywordSchema = z.object({ id: z.string(), name: z.string() })
export type Keyword = z.infer<typeof keywordSchema>
```

### 새 UI 컴포넌트 추가

**필수**:

1. `'use client'` 또는 서버 컴포넌트 명시
2. 부모 컴포넌트에서 상태 정의
3. shadcn/ui 사용 (직접 Tailwind 스타일링 최소화)

```typescript
// ✅ 정확한 분리
'use client';
import { useState } from 'react';
import { SearchForm } from './search-form'; // 서버 또는 클라이언트 컴포넌트

export function KeywordSearchPage() {
  const [filters, setFilters] = useState({ region: 'GLOBAL' });
  return <SearchForm filters={filters} onChange={setFilters} />;
}
```

---

## 🧩 주요 파일 맵핑

### 타입 정의 → src/types/database.ts

```typescript
export interface Keyword {
  id: string
  name: string
  normalized_name: string
  created_at: string
}

export interface KeywordAnalysis {
  id: string
  keyword_id: string
  region: string
  period: string
  search_type: string
  trends_data: any // JSON
  ma13_data: any
  yoy_data: any
  created_at: string
}

export interface KeywordAnalysisOverlay {
  id: string
  analysis_id: string // ★ keyword_id 아님
  ticker: string
  company_name: string
  created_at: string
}
```

### DB 어댑터 → src/lib/adapters/db.ts

**필수 함수 시그니처**:

```typescript
getKeywordAnalysis(params: { keyword, region, period, search_type }): Promise<KeywordAnalysis | null>
upsertKeywordAnalysis(record: KeywordAnalysis): Promise<string>
getKeywordAnalysisOverlays(analysisId: string): Promise<KeywordAnalysisOverlay[]>
addKeywordAnalysisOverlay(analysisId: string, ticker: string, company_name: string): Promise<string>
removeKeywordAnalysisOverlay(overlayId: string): Promise<boolean>
```

**금지**:

- ❌ `getOverlays(keyword_id)` - analysis_id 사용 필수
- ❌ 필터 파라미터 무시
- ❌ 다중 분석 데이터 혼합 반환

### API 엔드포인트 설계 (현행)

**키워드 / 분석 / 오버레이 (신형, 클라이언트가 사용)**

| 메서드         | 경로                                              | 역할                                     |
| -------------- | ------------------------------------------------- | ---------------------------------------- |
| GET            | `/api/keywords`                                   | 키워드 목록                              |
| POST           | `/api/keywords`                                   | 키워드 추가                              |
| GET            | `/api/keywords/[keywordId]`                       | 키워드 단건 조회                         |
| DELETE         | `/api/keywords/[keywordId]`                       | 키워드 삭제                              |
| GET            | `/api/keywords/[keywordId]/analyses`              | 조건별 analysis 조회                     |
| POST           | `/api/keywords/[keywordId]/analyses`              | 조건별 analysis 생성                     |
| GET            | `/api/analyses/[analysisId]`                      | 분석 단건 조회                           |
| PATCH          | `/api/analyses/[analysisId]`                      | 분석 갱신                                |
| DELETE         | `/api/analyses/[analysisId]`                      | 분석 삭제                                |
| GET            | `/api/analyses/[analysisId]/overlays`             | 분석 오버레이 목록                       |
| POST           | `/api/analyses/[analysisId]/overlays`             | 오버레이 추가                            |
| PATCH          | `/api/analyses/[analysisId]/overlays`             | 오버레이 갱신                            |
| DELETE         | `/api/analyses/[analysisId]/overlays/[overlayId]` | 오버레이 삭제                            |
| GET/POST/PATCH | `/api/keywords/[keywordId]/overlays...`           | 키워드 단위 오버레이 (배치/refresh 포함) |

**Legacy 호환 (외부 호환용, 신규 호출 금지)**

| 경로                        | 상태       | 비고                               |
| --------------------------- | ---------- | ---------------------------------- |
| `/api/keyword-searches/...` | deprecated | 내부 구현은 신형 service 함수 공유 |
| `/api/keyword-analysis/...` | deprecated | 내부 구현은 신형 service 함수 공유 |

**규칙**:

- 신규 코드는 반드시 신형 RESTful route를 사용한다.
- legacy route는 즉시 삭제하지 않고 deprecate 헤더 + MIGRATION 가이드 후 단계적으로 제거한다.
- 두 계열은 **반드시 같은 `/src/server/*` service 함수**를 호출해야 한다 (구현 중복 금지).

---

## 🗄️ Redis 주가 캐시 (Upstash REST)

**위치**: `src/server/cached-stock-service.ts`

**규칙**:

- 캐시 대상은 **주가 ticker 데이터만**. 키워드 Trends 데이터는 절대 Redis에 저장하지 않는다.
- 캐시 키 구성: `ticker + "5y" + "1wk" + 마지막 완료 주의 ISO Monday week key`
- 기본 TTL: `STOCK_DATA_CACHE_TTL_SECONDS` (기본값 86400초)
- Redis 환경변수 미설정 시 자동으로 Yahoo Finance 직접 조회로 fallback.

**금지**:

- ❌ 키워드 Trends 결과 Redis 캐시
- ❌ 캐시 키에서 week key 누락 (오래된 데이터 영구 노출 위험)
- ❌ Redis 실패 시 빈 배열을 성공처럼 반환

---

## 📅 주간 데이터 정규화 (week-sync)

**위치**: `src/lib/utils/week-sync.ts`

**규칙**:

- Yahoo Finance 주가와 pytrends 키워드 데이터는 **모두 ISO week Monday 기준**으로 키를 정규화한다.
- 차트/오버레이 응답에는 **완료된 전주까지만** 포함한다 (현재 진행 중인 주는 제외).
- 신규 주간 데이터 핸들러는 직접 날짜 계산하지 말고 `week-sync.ts` 헬퍼를 사용한다.

---

## 🐍 Trends 데이터 수집 (Python 직접 실행)

**위치**: `src/lib/get_trends.py`

**현행 흐름**:

- `/api/trends`, `/api/trends-internal`은 모두 `src/lib/services/trends-service.ts` → `src/server/trends-internal-service.ts`를 통해 `.venv/bin/python3 src/lib/get_trends.py`를 직접 실행한다.
- Flask 서버(`api/trends.py`)는 **기본 실행 경로에서 빠져 있음**. 유지/삭제 여부는 별도 결정.
- `npm run dev`는 Next.js 단독 실행이며, Flask 서버는 자동으로 띄우지 않는다.

**필수**:

1. 외부 호출은 service 함수 1곳에서만 발생 (HTTP self-call 금지)
2. 실패 시 빈 배열을 성공처럼 반환하지 않음
3. 에러 발생 시 명확한 응답 코드 반환

---

## 🎨 코드 표준

### TypeScript & 타입 안전성

- **필수**: strict 모드, any 타입 금지
- **필수**: 모든 API 입출력은 Zod 스키마 검증
- **금지**: `// @ts-ignore` 없는 any 사용

```typescript
// ❌ 금지
const data: any = await api.fetch()

// ✅ 정확
import { z } from 'zod'
const responseSchema = z.object({ data: z.array(z.string()) })
const data = responseSchema.parse(await api.fetch())
```

### 네이밍 컨벤션

| 대상            | 규칙             | 예시                                    |
| --------------- | ---------------- | --------------------------------------- |
| 파일/폴더       | kebab-case       | `keyword-search.ts`, `/keyword-search/` |
| 변수/함수       | camelCase        | `fetchKeywords`, `searchTrends`         |
| 타입/인터페이스 | PascalCase       | `KeywordData`, `SearchParams`           |
| 상수            | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_TIMEOUT`            |

### 주석 규칙

- **금지**: 자명한 코드 주석 (변수명이 의도를 드러내면 불필요)
- **필수**: 비자명한 로직, 워크어라운드, 외부 API 의존성
- **형식**: 한 줄 주석 선호, 여러 줄은 최소화

```typescript
// ❌ 불필요
const name = keyword.name // 키워드 이름

// ✅ 필요
// Pytrends API는 특수 문자 자동 제거하므로 정규화 후 검증 필요
const normalized = normalizeKeyword(keyword)
```

---

## 🚫 절대 금지 사항

| 금지                                                                              | 이유                            |
| --------------------------------------------------------------------------------- | ------------------------------- |
| ❌ `getOverlays(keyword_id)`                                                      | analysis별로 종목 분리되어야 함 |
| ❌ 필터 파라미터 무시                                                             | 조건별 데이터 혼동              |
| ❌ `keyword_id`로 종목 저장                                                       | analysis_id가 정확함            |
| ❌ 여러 분석의 종목을 한 화면에 표시                                              | 사용자 혼동                     |
| ❌ 마이그레이션 파일 없이 스키마 변경                                             | 롤백 불가능                     |
| ❌ 클라이언트에서 DB 직접 접근                                                    | 보안 위반                       |
| ❌ 환경변수를 클라이언트에 노출                                                   | 민감 정보 유출                  |
| ❌ API 라우트에 비즈니스 로직                                                     | 아키텍처 위반                   |
| ❌ `any` 타입 사용                                                                | 타입 안전성 위반                |
| ❌ 에러 무시 (try-catch 없음)                                                     | 디버깅 불가능                   |
| ❌ 키워드 오버레이를 `searches`에 저장                                            | 도메인 분리 위반                |
| ❌ 서버 내부에서 `fetch('/api/...')` self-call                                    | service 함수 직접 import로 대체 |
| ❌ 키워드 Trends 데이터 Redis 캐시                                                | 캐시 대상은 주가 ticker만       |
| ❌ 신규 코드에서 legacy `/api/keyword-searches` 또는 `/api/keyword-analysis` 호출 | 신형 RESTful route 사용         |

---

## ✅ AI 의사결정 우선순위

### 1순위: 타입 안전성

- TypeScript strict 모드
- Zod 스키마 검증
- 입출력 타입 명시

### 2순위: 데이터 무결성

- 마이그레이션 파일 필수
- analysis_id 기반 설계
- DB 제약 조건 명시

### 3순위: 아키텍처 분리

- API ↔ 서비스 ↔ DB 계층
- 클라이언트/서버 경계
- 관심사의 분리 (SoC)

### 4순위: 에러 처리

- 외부 API: 재시도 + 로깅
- DB: 트랜잭션
- 사용자: 명확한 에러 메시지

### 5순위: 코드 스타일

- 기존 코드 패턴 따르기
- 네이밍 컨벤션
- 주석 규칙

---

## 📋 모호한 상황 판단 트리

```
새로운 기능 구현
├─ 데이터 모델 필요? → 마이그레이션 + 타입 먼저
├─ API 필요? → 서비스 계층 설계 → API 라우트
└─ UI 필요? → 서버/클라이언트 컴포넌트 분리

데이터 모델 변경
├─ 마이그레이션 파일 작성 (UP & DOWN)
├─ /src/types/database.ts 업데이트
├─ /src/lib/adapters/db.ts 쿼리 수정
└─ 관련 서비스 로직 업데이트

UI 상태 관리
├─ useState로 충분? → 사용
├─ 여러 컴포넌트 공유? → Context (필요 최소화)
└─ 폼 데이터? → React Hook Form + Zod

에러 처리 방식
├─ 외부 API (Pytrends, Yahoo) → 재시도 + 로깅
├─ DB 조회 → 트랜잭션 + null 체크
└─ 사용자 입력 → Zod 검증 + 명확한 메시지
```

---

## 🔄 개발 워크플로우

### 커밋 규칙

**형식**: Conventional Commits

```
feat: 기능명 추가
fix: 버그명 수정
docs: 문서 업데이트
refactor: 코드 구조 개선
test: 테스트 추가/수정
```

### 검사 명령어

```bash
npm run check-all    # ESLint + Prettier + TypeScript + 테스트
npm run build        # 프로덕션 빌드 검증
npm run dev          # 개발 서버 실행 (Turbopack)
```

**필수**: 커밋 전 `npm run check-all` 통과 확인

---

## 📚 참고 문서

- `/docs/PRD.md`: 프로젝트 요구사항
- `/docs/ROADMAP.md`: 개발 로드맵
- `/docs/guides/`: 기술 가이드
  - `nextjs-15.md`: Next.js 15.5.3 전문 가이드
  - `component-patterns.md`: 컴포넌트 패턴
  - `forms-react-hook-form.md`: 폼 처리 완전 가이드
  - `styling-guide.md`: TailwindCSS + shadcn/ui
- `/CLAUDE.md`: 프로젝트 개발 지침
