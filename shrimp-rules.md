# StockInsight 개발 규칙

**로컬 주식 분석 도구: Yahoo Finance + Google Trends 데이터 결합 비교**

---

## 프로젝트 개요

- **목적**: 특정 종목의 5년 가격 흐름과 대중 검색 관심도를 비교 분석하는 로컬 투자 판단 도구
- **범위**: 로컬 개발 환경 전용 (배포 없음, `npm run dev`로만 실행)
- **구조**: 3페이지 (대시보드 / 검색 / 상세) + 16개 기능
- **기술 스택**: Next.js 15.5.3 + React 19 + TypeScript 5 + better-sqlite3 + Recharts
- **외부 API**: yahoo-finance2 (주가), SerpAPI (Google Trends)

---

## 프로젝트 아키텍처

### 디렉토리 구조 및 역할

```
stock_insight/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 대시보드 페이지 (F014, F015, F016)
│   │   ├── search/page.tsx    # 새 종목 검색 페이지 (F001~F013)
│   │   ├── analysis/[id]/     # 종목 상세 페이지 (F002~F012)
│   │   └── layout.tsx         # 루트 레이아웃
│   ├── components/
│   │   ├── layout/            # Header, Container (공통 레이아웃)
│   │   ├── ui/                # shadcn/ui 컴포넌트 (Button, Dialog, etc)
│   │   └── providers/         # ThemeProvider
│   ├── lib/
│   │   ├── env.ts            # 환경변수 (SerpAPI_KEY)
│   │   ├── utils.ts          # 유틸 함수
│   │   └── db/               # better-sqlite3 데이터베이스 함수
│   └── hooks/                 # React custom hooks
├── data/
│   └── stock-insight.db      # SQLite 로컬 DB (git 무시됨)
├── docs/
│   ├── PRD.md                # 요구사항 (16개 기능 명세)
│   ├── ROADMAP.md            # 개발 로드맵 (18개 Task)
│   └── guides/               # 개발 가이드 (생략)
├── tasks/                     # 개별 Task 문서 (Task 001~017)
├── public/                    # 정적 자산 (필요 시만)
└── package.json              # 의존성 (변경 시 주의)
```

---

## 필수 의존성

### 반드시 유지해야 할 라이브러리 (제거/변경 금지)

| 라이브러리          | 버전   | 용도          | 변경 금지 이유       |
| ------------------- | ------ | ------------- | -------------------- |
| **next**            | 15.5.3 | 프레임워크    | 프로젝트 기초        |
| **react**           | 19     | UI 렌더링     | PRD 기반             |
| **better-sqlite3**  | 최신   | 로컬 DB       | 동기 API 필수        |
| **recharts**        | 3.x    | 차트 표시     | 이중 Y축 지원 필수   |
| **date-fns**        | 최신   | 날짜 처리     | ISO week 정규화 필수 |
| **yahoo-finance2**  | 최신   | 주가 데이터   | F003 구현 필수       |
| **serpapi**         | 최신   | Google Trends | F004 구현 필수       |
| **react-hook-form** | 최신   | 폼 관리       | 검색 폼 (F001)       |
| **zod**             | 최신   | 입력 검증     | 폼 검증              |
| **shadcn/ui**       | 최신   | UI 컴포넌트   | 디자인 일관성        |
| **tailwindcss**     | v4     | 스타일        | 프로젝트 스타일링    |

---

## 데이터 흐름 (핵심)

### 사용자 여정: 종목 조회 → 저장 → 표시

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 검색 페이지 (/search) - F001                           │
│    사용자가 ticker 입력 (예: AAPL)                        │
│    - 빈 값 검증, 대문자 자동 변환                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 2. 데이터 수집 (Server Action 또는 API Route)             │
│    ┌─────────────────────────────────────────────────┐    │
│    │ F003: yahoo-finance2.historical()               │    │
│    │ - interval: '1wk'                               │    │
│    │ - 5년 데이터 (period1 설정)                     │    │
│    │ - 반환: date (Date 객체), close, volume 등     │    │
│    └─────────────────────────────────────────────────┘    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ F004: SerpAPI Google Trends                     │    │
│    │ - 키워드: quoteSummary()로 회사명 조회           │    │
│    │ - 폴백: "{ticker} stock"                        │    │
│    │ - 반환: timestamp, values (관심도 0~100)        │    │
│    └─────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 3. 날짜 정규화 (ISO Week 기반) - 핵심!                   │
│    ┌─────────────────────────────────────────────────┐    │
│    │ yahoo-finance (금요일)                          │    │
│    │ 2024-01-05 (금요일) → startOfISOWeek()         │    │
│    │ → 2024-01-01 (월요일, ISO week 시작)           │    │
│    └─────────────────────────────────────────────────┘    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ SerpAPI (일요일)                                │    │
│    │ 2024-01-07 (일요일) → startOfISOWeek()         │    │
│    │ → 2024-01-01 (월요일, ISO week 시작)           │    │
│    └─────────────────────────────────────────────────┘    │
│    결과: 같은 주의 월요일로 통일 ✅                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 4. 지표 계산 (순수 함수) - F005, F006                     │
│    - MA13: 13주 이동평균 계산                             │
│    - YoY: 52주 전 대비 변화율 계산                        │
│    - 52주 최고가/최저가 계산                              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 5. 트랜잭션 기반 DB 저장 (F013) - better-sqlite3          │
│    BEGIN TRANSACTION                                      │
│    ├─ searches 테이블: UPSERT (id 보존, ticker UNIQUE)   │
│    ├─ price_data 테이블: DELETE + INSERT (배열 저장)     │
│    └─ trends_data 테이블: DELETE + INSERT (배열 저장)    │
│    COMMIT (또는 ROLLBACK)                                │
│    반환: search_id                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ 6. 상세 페이지로 리다이렉트 (/analysis/[id])             │
│    ┌─────────────────────────────────────────────────┐    │
│    │ F010: 지표 카드 (현재가, MA13, YoY, 52주H/L)    │    │
│    └─────────────────────────────────────────────────┘    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ F007: Recharts LineChart (주가 + MA13)         │    │
│    │ F008: Recharts AreaChart (Google Trends)       │    │
│    │ F009: Recharts ComposedChart (이중 Y축)       │    │
│    └─────────────────────────────────────────────────┘    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ F011: Excel 다운로드 (SheetJS)                  │    │
│    │ F012: PNG 다운로드 (html-to-image)             │    │
│    └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## API 통합 규칙

### Yahoo Finance (yahoo-finance2)

**필수 구현:**

- `historical(ticker, { interval: '1wk', period1, period2 })` 호출
- 응답: 배열 `[{ date: Date, close: number, volume: number, ... }]`
- 오류 처리:
  - `404 Not Found`: 존재하지 않는 ticker → 사용자에게 "잘못된 ticker입니다" 메시지
  - `Invalid interval`: 내부 에러 (이 경우 발생 불가, PRD 검증됨)

**주의:**

- `quoteSummary(ticker)` 응답에서 회사명 필드는 `longName` 또는 `shortName`일 수 있음
- Google Trends 키워드로 우선 사용, 조회 실패 시 `"{ticker} stock"` 폴백

### SerpAPI (Google Trends)

**필수 구현:**

- `search({ q: 'keyword', type: 'google_trends', date: 'today 5-y' })` 호출
- 응답: `timeline_data` 배열 `[{ date: 'May 30 - Jun 5, 2021', timestamp: 1234567890, values: [{ extracted_value: 45 }] }]`
- 오류 처리:
  - `429 Too Many Requests`: Rate Limit (월 100회 무료 제한) → 사용자에게 "일시적 오류, 잠시 후 다시 시도하세요" 메시지
  - `API Key Invalid`: .env.local의 SERPAPI_KEY 확인 필요

**주의:**

- 응답의 `timestamp`는 주간의 시작일(일요일) 기준
- `startOfISOWeek()`로 변환하면 ISO week의 월요일로 통일됨

---

## 데이터베이스 규칙

### SQLite 스키마 (better-sqlite3)

```sql
-- 프래그마 설정 (필수)
PRAGMA foreign_keys = ON;

-- 종목 메타데이터
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT UNIQUE NOT NULL,           -- AAPL, TSLA, MSFT
  company_name TEXT,                     -- Apple Inc.
  current_price REAL,                    -- 150.25
  yoy_change REAL,                       -- 12.5 (%)
  searched_at TEXT NOT NULL,             -- ISO 8601
  last_updated_at TEXT                   -- ISO 8601
);

-- 5년 주간 주가 (배열 JSON으로 저장)
CREATE TABLE IF NOT EXISTS price_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL UNIQUE,
  data TEXT NOT NULL,                    -- JSON 배열: [{"date":"2019-01-07","close":150.25},...]
  FOREIGN KEY(search_id) REFERENCES searches(id) ON DELETE CASCADE
);

-- 5년 주간 Google Trends (배열 JSON으로 저장)
CREATE TABLE IF NOT EXISTS trends_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL UNIQUE,
  data TEXT NOT NULL,                    -- JSON 배열: [{"date":"2019-01-07","value":45},...]
  FOREIGN KEY(search_id) REFERENCES searches(id) ON DELETE CASCADE
);
```

### 데이터베이스 작업 규칙

- **UPSERT 시**: `INSERT ... ON CONFLICT(ticker) DO UPDATE SET ...` 사용 (id 보존)
- **배열 업데이트**: `DELETE` + `INSERT` 패턴, **반드시 트랜잭션 래핑** (중간 실패 시 롤백)
- **쿼리 최적화**: `(search_id, date)` 복합 인덱스 고려 (스파크라인 조회 빠르게)
- **동기 API만**: `db.transaction()`, `db.exec()`, `db.prepare().run()` 사용
  - ❌ 비동기 API 금지 (`db.prepare().all()` async 버전은 없음)

**예시 코드 (좋은 예):**

```typescript
const db = new Database('data/stock-insight.db');
db.pragma('foreign_keys = ON');

const transaction = db.transaction((ticker, priceArray, trendsArray) => {
  const stmt = db.prepare('INSERT INTO searches ... ON CONFLICT(ticker) DO UPDATE ...');
  stmt.run(ticker, ...);

  db.prepare('DELETE FROM price_data WHERE search_id = ?').run(searchId);
  db.prepare('INSERT INTO price_data ...').run(searchId, JSON.stringify(priceArray));

  db.prepare('DELETE FROM trends_data WHERE search_id = ?').run(searchId);
  db.prepare('INSERT INTO trends_data ...').run(searchId, JSON.stringify(trendsArray));
});

transaction(ticker, prices, trends);  // 트랜잭션 실행
```

---

## 날짜/시간 처리 규칙

### ISO Week 기반 정규화 (필수!)

- **사용 함수**: `date-fns의 startOfISOWeek()`
- **목표**: Yahoo Finance(금요일) + SerpAPI(일요일) 데이터를 같은 주의 월요일로 통일

**정규화 단계:**

1. **수집 단계**:

   ```typescript
   import { startOfISOWeek, format } from 'date-fns'

   // yahoo-finance 데이터
   const yahooDate = new Date('2024-01-05') // 금요일
   const normalizedDate = startOfISOWeek(yahooDate) // 2024-01-01 (월요일)

   // SerpAPI 데이터
   const serpDate = new Date('2024-01-07') // 일요일
   const normalizedDate = startOfISOWeek(serpDate) // 2024-01-01 (월요일)
   ```

2. **저장 단계**: DB에 `normalizedDate`를 저장

3. **비교 단계** (F009 비교 차트):
   ```typescript
   const weekNumber = format(date, "YYYY-'W'II") // "2024-W01"
   // ISO week number로 매칭하여 두 데이터셋을 같은 주로 연결
   ```

**주의:**

- 일반 `startOfWeek()`은 사용 금지 (요일 기준이 다름)
- 모든 날짜는 ISO 8601 형식으로 저장

---

## 컴포넌트 및 UI 규칙

### Recharts 차트 (변경 금지)

**3가지 필수 차트:**

| 차트     | 컴포넌트        | 용도           | 특징                   |
| -------- | --------------- | -------------- | ---------------------- |
| **F007** | `LineChart`     | 주가 + MA13    | 2개 라인, 범례         |
| **F008** | `AreaChart`     | Google Trends  | 단일 영역, 0~100 범위  |
| **F009** | `ComposedChart` | 주가 vs 트렌드 | 이중 Y축, 선+영역 혼합 |

**구현 예시 (F009):**

```typescript
<ComposedChart data={mergedData}>
  <YAxis yAxisId="left" />
  <YAxis yAxisId="right" orientation="right" />
  <Line yAxisId="left" dataKey="close" stroke="blue" /> {/* 주가 */}
  <Area yAxisId="right" dataKey="trend" fill="orange" /> {/* 트렌드 */}
</ComposedChart>
```

### shadcn/ui 컴포넌트

- 기존 컴포넌트 (`Button`, `Dialog`, `Input`, `Card`) 활용
- 새 컴포넌트 필요 시: `npx shadcn-ui@latest add [component]`
- ❌ 직접 Radix UI 호출 금지 (shadcn/ui를 통해서만)

### 더미 데이터 활용 (Phase 2)

- **목적**: UI/레이아웃 먼저 완성, 나중에 실제 API로 교체
- **파일 위치**: `src/lib/mockData.ts` (또는 `src/lib/fixtures/`)
- **교체 시점**: Phase 3 시작 (Task 012)
- **주의**: 더미 데이터의 구조는 실제 API 응답과 동일해야 함

---

## 환경변수 규칙

### .env.local (로컬 개발 전용)

```bash
SERPAPI_KEY=your_api_key_here  # 필수! SerpAPI 무료 키 발급 필요
```

### .env.example

```bash
SERPAPI_KEY=your_api_key_here
```

**규칙:**

- ❌ `.env.local`은 `.gitignore`에 추가됨 (커밋 금지)
- ✅ `.env.example`은 커밋하여 필요한 환경변수 가이드 제공
- ❌ 배포 환경 설정(`.env.production`) 불필요 (로컬 전용)

### 환경변수 접근

```typescript
// src/lib/env.ts
export const SERPAPI_KEY = process.env.SERPAPI_KEY

if (!SERPAPI_KEY) {
  throw new Error('SERPAPI_KEY is not defined in .env.local')
}
```

---

## 파일 수정 시 체크리스트

### 다중 파일 수정이 필요한 경우

| 수정 대상                                 | 동시 수정 필요 파일                 | 확인 사항                                       |
| ----------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| **src/lib/db/** (DB 함수 추가)            | API 라우트, Server Actions          | 새 함수를 호출하는 곳 모두 확인                 |
| **src/components/** (컴포넌트 props 변경) | 모든 사용처 (페이지, 다른 컴포넌트) | `grep` 또는 IDE의 "Find References" 사용        |
| **docs/PRD.md** (요구사항 변경)           | docs/ROADMAP.md, 해당 Task 파일     | 일관성 확인, Task 내용 동기화                   |
| **docs/ROADMAP.md** (로드맵 업데이트)     | tasks/XXX-xxx.md                    | Task 파일과 상태 동기화                         |
| **package.json** (의존성 추가/제거)       | 관련 코드 확인                      | 불필요한 의존성 제거 금지 (필수 항목 섹션 참고) |

**예시:**

```
1. src/lib/db/queries.ts에서 새 함수 추가
   ↓
2. 이 함수를 사용할 파일들 검색
   - app/api/stocks/search.ts?
   - app/search/page.tsx의 Server Action?
   ↓
3. 해당 파일들에서 함수 import 및 호출 추가
```

---

## 테스트 규칙

### Playwright MCP 필수 테스트

**API 연동 및 비즈니스 로직 구현 Task (Phase 3)마다 필수:**

- Task 012 (통합 조회 플로우): 검색 → 수집 → 저장 → 표시
- Task 013 (데이터 연동): 대시보드 카드 표시, 갱신
- Task 014 (통합 테스트): 전체 사용자 플로우

**각 Task의 "테스트 체크리스트" 섹션:**

```markdown
## 테스트 체크리스트

### E2E 시나리오 1: 새 종목 조회 성공

- [ ] `/search` 페이지에서 ticker 입력
- [ ] 수집 로딩 상태 확인
- [ ] `/analysis/[id]`로 리다이렉트
- [ ] 차트 및 지표 표시 확인

### E2E 시나리오 2: 잘못된 ticker 입력

- [ ] 유효하지 않은 ticker (예: "XXXXX") 입력
- [ ] 에러 메시지 표시 확인

### API 연동 테스트

- [ ] yahoo-finance2 응답 검증 (5년 데이터)
- [ ] SerpAPI 응답 검증 (ISO week 정규화)
- [ ] 데이터베이스 저장 확인 (트랜잭션)
```

---

## 금지 사항 (엄격)

- ❌ **배포 설정 추가**: `vercel.json`, `docker`, GitHub Actions 배포 워크플로우
  - 이유: 로컬 전용 프로젝트
- ❌ **서버사이드 세션/쿠키**: 인증 미들웨어, NextAuth.js
  - 이유: 1인 개발, 로컬 환경
- ❌ **데이터베이스 마이그레이션**: db/migrations 폴더, 마이그레이션 스크립트
  - 이유: 초기 스키마만 사용, 개발 중 스키마 변경 시 `data/stock-insight.db` 삭제 후 재생성
- ❌ **Recharts 이외의 차트 라이브러리**: Chart.js, D3.js, Plotly
  - 이유: Recharts의 이중 Y축, 반응형 디자인이 최적
- ❌ **better-sqlite3 비동기 API**: async/await, `db.exec()` async 버전
  - 이유: 로컬 전용, 동기 API로 충분하고 더 간단함
- ❌ **환경별 분기**: `process.env.NODE_ENV === 'production'` 기반의 배포 분기
  - 이유: 항상 `development` 환경
- ❌ **다국어 지원**: i18n, 다국어 번역 파일
  - 이유: 한국어만 지원

---

## AI 의사결정 가이드

### 애매한 상황에서의 우선순위

**Q1: 새로운 의존성을 추가해야 할 때?**

1. 필수 의존성 섹션에서 유사한 라이브러리가 있는가? → 그것을 사용
2. 라이브러리가 npm에 있고, 활발히 유지되는가? → 추가 가능
3. 프로젝트 범위를 벗어나는가 (예: 배포, 인증)? → 금지 사항 확인 후 거부

**Q2: 파일 구조를 변경해야 할 때?**

1. 기존 구조(아키텍처 섹션)와의 일관성 유지
2. API 라우트는 `app/api/` 하위에, 컴포넌트는 `src/components/` 하위에
3. 새로운 유틸 함수는 `src/lib/` 하위에

**Q3: 더미 데이터를 실제 API로 교체할 때?**

1. Phase 3부터 진행 (Phase 2에서 UI 먼저 완성)
2. 데이터 구조가 동일한지 확인 (더미 데이터의 타입 재사용)
3. 에러 처리 추가 (네트워크 실패, Rate Limit)

**Q4: 날짜 데이터 처리할 때?**

1. **모든 날짜는 ISO 8601 문자열 또는 Date 객체**로 저장
2. **표시할 때만** `format(date, 'YYYY-MM-DD')` 변환
3. **비교할 때는 ISO week number** 사용 (`YYYY-Www` 형식)

**Q5: 차트 커스터마이징 필요할 때?**

1. **Recharts props로 가능한가?** → Recharts 공식 문서 확인
2. **불가능하면?** → CSS/Tailwind로 외부 스타일링
3. **그래도 안 되면?** → Issue 등록, 현재 상태 유지 (차트 라이브러리 변경 금지)

---

## 요약

이 규칙 문서는 **AI Agent가 StockInsight 개발 시 반드시 따라야 할 기준**을 정의합니다.

**핵심 원칙:**

1. 로컬 전용 → 배포 설정 금지
2. 3테이블 DB + 16개 기능 → 파일 상호작용 주의
3. 두 API 데이터 정규화 → ISO week 기반 통일
4. Phase 1→2→3→4 순서 → 구조 우선 접근법
5. API 연동 Task마다 Playwright 테스트

**불명확한 사항이 있을 때:**

1. PRD.md와 ROADMAP.md를 우선 참고
2. 기존 코드의 패턴 따르기
3. 금지 사항 확인하기
4. 작은 변경부터 시작해서 영향도 파악하기
