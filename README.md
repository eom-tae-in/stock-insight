# 📈 StockInsight

> **특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 한눈에 비교하는 개인 투자자용 주식 분석 도구**

특정 종목의 장기 가격 추세와 대중의 검색 관심도 변화를 비교 분석하여, 투자 판단을 지원합니다.
조회한 모든 데이터는 Supabase 클라우드 데이터베이스에 저장되어 언제든지 재조회 가능합니다.

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

- **자동 저장**: 새로 조회한 종목은 자동으로 Supabase에 저장
- **클라우드 동기화**: 어디서든 저장된 종목 데이터에 접근 가능
- **재조회**: 저장된 종목 재클릭으로 즉시 데이터 확인
- **삭제**: 더 이상 필요 없는 종목 한 번에 삭제
- **새로고침**: 최신 데이터로 업데이트

### 📥 다운로드

- **Excel 내보내기**: 종목 및 키워드 분석 데이터를 .xlsx 파일로 다운로드
- **차트 이미지**: 종목/키워드 분석 차트를 고해상도 PNG로 저장
- **테이블 뷰**: 날짜별 상세 데이터를 표로 조회 가능

### 🔍 키워드 분석

- **구글 트렌드 검색**: 특정 키워드의 검색 관심도 추이 조회
- **종목 비교**: 키워드와 최대 5개 종목을 함께 분석하여 상관관계 파악
- **고급 필터링**: 종목 검색 및 Ticker/회사명 기반 정렬
- **데이터 내보내기**: 트렌드 데이터 및 오버레이 종목 Excel 내보내기

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

### 2단계: 환경 변수 설정

`.env.local` 파일 생성:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_public_key
PYTRENDS_INTERNAL_SECRET=replace_with_a_long_random_secret
# 선택: 로컬 Python 경로를 직접 지정하고 싶을 때만 사용
PYTRENDS_PYTHON_PATH=
```

**설정 정보:**

- **Supabase** (필수)
  - [Supabase 대시보드](https://supabase.com/dashboard)에서 프로젝트 생성
  - Settings → API 메뉴에서 Project URL과 anon public key 복사
  - 모든 종목 데이터는 Supabase에 저장됨

- **Finnhub** (선택사항)
  - [가입](https://finnhub.io) 후 발급 가능 (무료 계정 지원)
  - 현재가와 회사명 조회 시 사용
  - 없어도 Yahoo Finance에서 자동으로 데이터 수집

- **Google Trends**: 별도 API 키 불필요
  - 자동으로 검색 관심도 수집
  - 로컬에서는 `PYTRENDS_PYTHON_PATH`가 있으면 그 Python을 사용하고, 없으면
    `.venv`, `venv`, 기본 `python3` 순서로 자동 탐색
  - Vercel 배포 시 `/api/pytrends` 내부 호출 보호를 위해
    `PYTRENDS_INTERNAL_SECRET` 값을 Vercel 환경 변수에도 동일하게 설정

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
| **데이터베이스** | Supabase (PostgreSQL 클라우드)          |
| **데이터 소스**  | Yahoo Finance (주식), Google Trends     |
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
│   │   ├── db/                   # Supabase 쿼리
│   │   ├── adapters/             # DB 어댑터
│   │   ├── calculations/         # MA13, YoY 계산
│   │   └── export/               # Excel, PNG 내보내기
│   └── types/                    # TypeScript 타입 정의
├── migrations/
│   └── *.sql                     # Supabase 마이그레이션 파일
├── docs/
│   ├── PRD.md                    # 상세 요구사항
│   └── ROADMAP.md                # 개발 로드맵
└── README.md                     # 이 파일
```

---

## 🗄 데이터베이스

### 위치

Supabase 클라우드 (PostgreSQL)

### 테이블 구조

| 테이블          | 설명                 | 주요 컬럼                                                |
| --------------- | -------------------- | -------------------------------------------------------- |
| **searches**    | 종목 메타데이터      | id, ticker, company_name, current_price, last_updated_at |
| **price_data**  | 5년 주간 주가        | search_id, date, close, open, high, low, volume          |
| **trends_data** | 5년 주간 검색 관심도 | search_id, date, value (0-100)                           |

**마이그레이션 상태**: Phase 6 완료 ✅

- SQLite에서 Supabase PostgreSQL로 완전 마이그레이션
- 모든 데이터는 Supabase 클라우드에 저장되어 어디서든 접근 가능

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
  - Finnhub에서 5년 주간 주가 데이터 수집
  - pytrends로 Google Trends 검색 관심도 수집
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

### Q: 왜 Supabase 클라우드를 사용하나요?

**A**: Phase 6 마이그레이션을 통해 SQLite 로컬 DB에서 Supabase PostgreSQL로 전환했습니다. 이제 모든 데이터가 클라우드에 저장되어 여러 기기에서 동시에 접근 가능하며, 데이터 손실 위험이 없습니다.

### Q: 데이터 프라이버시는 어떻게 보장하나요?

**A**: Supabase는 업계 표준의 PostgreSQL 데이터베이스로, 프로젝트별 고유의 인증 키(API key)로 보호됩니다. SUPABASE_KEY만 관리하면 안전합니다.

### Q: Google Trends 데이터는 어떻게 수집하나요?

**A**: 공개된 Google Trends 데이터를 실시간으로 수집합니다. API 키나 인증이 필요하지 않습니다.

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

**마지막 업데이트**: 2026년 4월 9일
**버전**: 1.0.2 ✅ (Phase 4 + Phase 7 확장 완료)
