# StockInsight 프로젝트 규칙 (AI Agent용)

## 프로젝트 개요

**목적**: 특정 키워드의 검색 관심도(Google Trends)와 특정 종목의 주가를 비교 분석하는 로컬 분석 도구

**기술스택**: Next.js 15.5.3 / React 19 / TypeScript / Supabase / TailwindCSS / shadcn/ui

---

## 🚀 핵심 아키텍처 원칙

### 1. 조건 조합 기반 분리 (★가장 중요)

```
Keyword (단순 이름만)
  └─ KeywordAnalysis (keyword + region + period + search_type)
      ├─ 차트 데이터 (독립)
      ├─ 지표: MA13, YoY (독립)
      └─ KeywordStockOverlay (analysis_id 기준) ← ★반드시 analysis_id
          └─ 종목별 데이터
```

**규칙**:

- 1개 키워드 = N개 분석 가능
- 각 분석은 UNIQUE(keyword_id, region, period, search_type) 제약
- 종목 오버레이는 **반드시 analysis_id 기준** (keyword_id 아님)
- 필터 변경 시 → 해당 분석의 모든 데이터(차트/지표/종목) 독립적으로 변경

### 2. 쿼리 파라미터 기반 필터링

```
URL: /keywords/[keywordId]?region=US&period=5Y&type=WEB
     ↓
API: GET /api/keyword-analysis?keyword=축구&region=US&period=5Y&type=WEB
     ↓
Response: KeywordAnalysis + overlays
```

**규칙**:

- 필터는 쿼리 파라미터로 전달 (경로 변경 안 함)
- 기본값: region=GLOBAL, period=5Y, search_type=WEB
- 필터 변경 시 새로운 analysis 조회 (없으면 null 반환)

---

## 📁 주요 파일 맵핑

### 1. 타입 정의 → src/types/database.ts

```typescript
// 신규 (필수)
Keyword { id, name }
KeywordAnalysis { id, keyword_id, region, period, search_type, trends_data, ma13_data, yoy_data }
KeywordAnalysisOverlay { id, analysis_id ← ★keyword_id아님, ticker, company_name, ... }
```

**동시 수정 필수**:

- 타입 추가 → DB 마이그레이션
- 타입 변경 → src/lib/adapters/db.ts 동시 수정
- 타입 변경 → API 응답 스키마 동시 수정

### 2. DB 어댑터 → src/lib/adapters/db.ts

**필수 함수**:

```typescript
getKeywordAnalysis(keyword: string, region: string, period: string, type: string): Promise<KeywordAnalysis | null>
upsertKeywordAnalysis(record: KeywordAnalysis): Promise<string>
getKeywordAnalysisOverlays(analysisId: string): Promise<KeywordAnalysisOverlay[]>
addKeywordAnalysisOverlay(analysisId: string, ticker: string, company_name: string): Promise<string>
removeKeywordAnalysisOverlay(overlayId: string): Promise<boolean>
```

**금지**:

- ❌ keyword_id로 오버레이 조회
- ❌ 필터 파라미터 무시

### 3. API 엔드포인트

| 메서드 | 경로                                                       | 역할             |
| ------ | ---------------------------------------------------------- | ---------------- |
| GET    | `/api/keyword-analysis?keyword=X&region=Y&period=Z&type=W` | 조건별 분석 조회 |
| POST   | `/api/keyword-analysis`                                    | 조건별 분석 생성 |
| POST   | `/api/keyword-analysis/{analysisId}/stocks`                | 종목 추가        |
| DELETE | `/api/keyword-analysis/{analysisId}/stocks/{overlayId}`    | 종목 삭제        |

### 4. UI → src/app/(app)/keywords/[keywordId]/page.tsx

**필수 구성요소**:

- 필터 UI (지역/기간/타입)
- 쿼리 파라미터 처리
- 빈 상태 처리
- 동적 데이터 로딩

---

## 🚫 금지사항 (중대 위반)

| 금지                                 | 이유                              |
| ------------------------------------ | --------------------------------- |
| ❌ `getOverlays(keyword_id)`         | analysis별로 종목이 분리되어야 함 |
| ❌ 필터 파라미터 무시                | 조건별 데이터 혼동                |
| ❌ `keyword_id`로 종목 저장          | analysis_id가 있어야 정확함       |
| ❌ 여러 분석의 종목을 한 화면에 표시 | 사용자 혼동                       |
