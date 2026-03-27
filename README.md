# 📈 StockInsight

> **특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 한눈에 비교하는 개인 투자자용 주식 분석 도구**

특정 종목의 장기 가격 추세와 대중의 검색 관심도 변화를 비교 분석하여, 투자 판단을 지원합니다.
조회한 모든 데이터는 로컬 SQLite 데이터베이스에 저장되어 언제든지 재조회 가능합니다.

---

## 🎯 주요 기능

### 🔍 종목 검색

- **자동완성 기능**: Ticker 또는 회사명으로 빠르게 검색
- **방향키 네비게이션**: ↑↓ 키로 제안 항목 선택, Enter로 조회
- **자동 대문자 변환**: 소문자 입력도 자동으로 대문자로 변환
- 예: `aapl` → `AAPL`, `tesla` → `TESLA`

### 📊 분석 대시보드

- **지표 요약**: 현재가, 52주 최고/최저, MA13, YoY 한눈에 확인
- **이중 Y축 비교 차트**: 주가(좌)와 Google Trends(우)를 동시에 분석
- **커스텀 차트**: 원하는 데이터만 선택해서 분석 차트 생성
- **반응형 차트**: 마우스 호버로 정확한 수치 확인

### 💾 데이터 관리

- **자동 저장**: 새로 조회한 종목은 자동으로 로컬 DB에 저장
- **재조회**: 저장된 종목 재클릭으로 즉시 데이터 확인
- **삭제**: 더 이상 필요 없는 종목 한 번에 삭제
- **새로고침**: 최신 데이터로 업데이트

### 📥 다운로드

- **Excel 내보내기**: 전체 데이터를 .xlsx 파일로 다운로드
- **차트 이미지**: 분석 차트를 고해상도 PNG로 저장
- **테이블 뷰**: 날짜별 상세 데이터를 표로 조회 가능

### 🎨 사용자 경험

- **라이트/다크 모드**: 환경에 맞게 테마 선택
- **빠른 로딩**: Turbopack 기반으로 개발 시 빠른 성능
- **직관적 UI**: shadcn/ui 컴포넌트로 깔끔하고 일관된 디자인

---

## 🚀 시작하기

### 1단계: 환경 설정

```bash
# 저장소 클론
git clone <repository>
cd stock_insight

# 의존성 설치
npm install
```

### 2단계: API 키 설정

`.env.local` 파일 생성:

```
SERPAPI_KEY=your_serpapi_key_here
```

[SerpAPI](https://serpapi.com) 가입 후 API 키 발급 필요 (Google Trends 수집용)

### 3단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열기

---

## 📖 사용 방법

### 첫 번째 종목 조회

1. **홈 페이지**(`/`) → "새 종목 조회" 버튼 클릭
2. **검색 폼** 입력:
   - Ticker: `AAPL`, `TSLA`, `MSFT` 등
   - 또는 회사명: `Apple`, `Tesla`, `Microsoft`
3. **방향키(↑↓)** 로 원하는 항목 선택 → **Enter** 조회
4. 몇 초 후 데이터 자동 저장

### 분석 차트 확인

- **통합 차트**: 주가 + Google Trends 이중 Y축 비교
- **커스텀 차트**: 원하는 데이터만 선택해서 새로운 분석 차트 생성
  - 기간: 1년 ~ 5년 선택
  - 시리즈: 종가, 13주 MA, 52주 최고/최저, 검색 관심도, YoY

### 데이터 내보내기

- **Excel**: 테이블 우상단 "다운로드" 버튼
- **차트 이미지**: 각 차트 상단의 이미지 아이콘

---

## 🛠 개발 명령어

```bash
# 개발 서버 (Turbopack)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드된 앱 실행
npm start

# 코드 검사 (타입 + 린트 + 포맷)
npm run check-all

# 타입 검사만
npm run typecheck

# ESLint 검사
npm run lint

# Prettier 포맷 확인
npm run format:check
npm run format         # 자동 포맷
```

---

## 📊 기술 스택

| 분야             | 기술                                    |
| ---------------- | --------------------------------------- |
| **프레임워크**   | Next.js 15.5.3 (App Router + Turbopack) |
| **런타임**       | React 19.1.0, TypeScript 5              |
| **UI/스타일**    | TailwindCSS v4, shadcn/ui, Radix UI     |
| **데이터베이스** | better-sqlite3 (로컬 SQLite)            |
| **데이터 소스**  | Yahoo Finance, SerpAPI (Google Trends)  |
| **폼/유효성**    | React Hook Form, Zod                    |
| **아이콘**       | Lucide Icons                            |
| **차트**         | Recharts                                |
| **개발 도구**    | ESLint, Prettier, Husky, lint-staged    |

---

## 📁 프로젝트 구조

```
stock_insight/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 홈 - 저장된 종목 목록
│   │   ├── search/               # 새 종목 검색
│   │   └── analysis/[id]/        # 종목 상세 분석
│   ├── components/
│   │   ├── search-form.tsx       # 검색 폼 (자동완성)
│   │   ├── unified-chart.tsx     # 통합 분석 차트
│   │   ├── custom-chart-builder.tsx  # 커스텀 차트 생성
│   │   └── ...
│   ├── lib/
│   │   ├── db/                   # SQLite 쿼리
│   │   ├── calculations/         # MA13, YoY 계산
│   │   └── export/               # Excel, PNG 내보내기
│   └── types/                    # TypeScript 타입 정의
├── data/
│   └── stock-insight.db          # SQLite 데이터베이스 (자동 생성)
├── docs/
│   ├── PRD.md                    # 상세 요구사항
│   └── ROADMAP.md                # 개발 로드맵
└── README.md                     # 이 파일
```

---

## 🗄 데이터베이스

### 위치

`data/stock-insight.db` (앱 첫 시작 시 자동 생성)

### 테이블 구조

| 테이블          | 설명                 | 주요 컬럼                                                |
| --------------- | -------------------- | -------------------------------------------------------- |
| **searches**    | 종목 메타데이터      | id, ticker, company_name, current_price, last_updated_at |
| **price_data**  | 5년 주간 주가        | search_id, date, close, volume                           |
| **trends_data** | 5년 주간 검색 관심도 | search_id, date, value (0-100)                           |

상세 스키마는 [PRD 문서](./docs/PRD.md#데이터-모델) 참조

---

## 📋 페이지 가이드

### 홈 (`/`)

- **목적**: 저장된 종목 한눈에 확인
- **기능**:
  - 카드 그리드로 종목 목록 표시 (스파크라인 포함)
  - "새 종목 조회" 버튼으로 검색 페이지 이동
  - 종목 카드 클릭으로 상세 분석 페이지 이동
  - 종목 삭제 및 데이터 새로고침

### 검색 (`/search`)

- **목적**: 새로운 종목 데이터 조회 및 저장
- **기능**:
  - Ticker/회사명 자동완성 검색
  - Yahoo Finance에서 5년 주간 데이터 수집
  - SerpAPI로 Google Trends 검색 관심도 수집
  - 수집 데이터 자동 DB 저장

### 상세 분석 (`/analysis/[id]`)

- **목적**: 종목 상세 분석 및 차트 조회
- **섹션**:
  1. **지표 요약**: 현재가, MA13, YoY, 52주 최고/최저
  2. **통합 차트**: 주가 + Google Trends 비교
  3. **커스텀 차트**: 원하는 데이터만 선택해서 분석
  4. **저장된 차트**: 생성한 커스텀 차트 목록
  5. **표로 보기**: 날짜별 상세 데이터 조회

---

## 💡 팁 & 자주 묻는 질문

### Q: 왜 로컬 데이터베이스를 사용하나요?

**A**: 개인 투자자가 자신의 컴퓨터에서 독립적으로 사용하기 위해 설계되었습니다. 클라우드 저장소나 계정이 필요 없고, 모든 데이터가 본인 PC에 안전하게 저장됩니다.

### Q: SerpAPI 무료 플랜으로 충분한가요?

**A**: 네, 월 100회 무료 요청으로 시작할 수 있습니다. 정기적인 사용자라면 유료 플랜 전환을 추천합니다. ([SerpAPI 가격](https://serpapi.com/pricing))

### Q: 데이터를 어떻게 백업하나요?

**A**: `data/stock-insight.db` 파일을 복사해서 안전한 위치에 보관하면 됩니다.

### Q: 모바일에서도 사용 가능한가요?

**A**: 로컬 PC 개발 환경용으로 설계되어 배포되지 않습니다. 필요시 `npm run build` 후 배포 플랫폼을 이용해 호스팅할 수 있습니다.

---

## 📚 추가 문서

- **[PRD (상세 요구사항)](./docs/PRD.md)** - 기능 명세, 데이터 모델, API
- **[개발 로드맵](./docs/ROADMAP.md)** - 개발 진행 상황, 예정된 기능
- **[개발 가이드](./CLAUDE.md)** - 코딩 스타일, 아키텍처 결정사항

---

## 🤝 피드백

이 프로젝트에 대한 의견이나 개선 제안이 있으신가요?
Issue나 Pull Request를 통해 언제든지 피드백 주시면 감사하겠습니다!

---

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

**마지막 업데이트**: 2026년 3월 27일
**버전**: 1.0.0 ✅ (개발 완료)
