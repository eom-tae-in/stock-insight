# StockInsight

특정 종목의 5년 가격 흐름과 Google Trends 검색 관심도를 비교하여 투자 판단을 지원하는 로컬 주식 분석 도구.

## 프로젝트 개요

**목적**: 특정 종목의 5년 가격 흐름과 대중 검색 관심도를 비교하여 투자 판단에 활용. 조회한 종목 데이터를 로컬에 저장하여 재사용하고 관리한다.

**사용자**: 특정 종목의 5년 데이터와 대중 관심도를 반복 분석하는 개인 투자자 (로컬 개발 환경 단독 사용)

**운영 환경**: `npm run dev`로 실행되는 로컬 Next.js 개발 환경 (배포 없음)

## 페이지 구조

| 경로 | 역할 |
|------|------|
| `/` | 대시보드 - 저장된 종목 카드 그리드, 추가/삭제/새로고침 |
| `/search` | 새 종목 조회 - Ticker 입력 후 5년 데이터 수집 및 DB 저장 |
| `/analysis/[id]` | 종목 상세 - 지표 요약 카드 5개 + 차트 3종 + 다운로드 |

## 핵심 기능

- **F001** Ticker 입력 및 조회 (영문 대문자 자동 변환, 빈 값 방지)
- **F003** Yahoo Finance 5년 주간 주가 수집
- **F004** SerpAPI Google Trends 5년 주간 검색 관심도 수집
- **F005** MA13 (13주 이동평균) 계산
- **F006** YoY (전년 동기 대비 변화율) 계산
- **F007** 주가 + MA13 라인 차트
- **F008** Google Trends 영역 차트
- **F009** 주가 vs 트렌드 이중 Y축 비교 차트
- **F011** 엑셀(.xlsx) 다운로드
- **F012** 차트 PNG 다운로드
- **F013** 로컬 SQLite DB 저장 (better-sqlite3)
- **F014** 저장된 종목 목록 조회 (스파크라인 포함)
- **F015** 종목 삭제 (확인 다이얼로그 + CASCADE)
- **F016** 저장 데이터 새로고침

## 기술 스택

- **Framework**: Next.js 15.5.3 (App Router + Turbopack)
- **Runtime**: React 19.1.0 + TypeScript 5
- **Styling**: TailwindCSS v4 + shadcn/ui (new-york style)
- **Database**: better-sqlite3 (로컬 SQLite, `data/stock-insight.db`)
- **Data Sources**: Yahoo Finance (yahoo-finance2), SerpAPI (Google Trends)
- **Forms**: React Hook Form + Zod
- **UI Components**: Radix UI + Lucide Icons
- **Development**: ESLint + Prettier + Husky + lint-staged

## 시작하기

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.local 생성)
SERPAPI_KEY=your_serpapi_key_here

# 개발 서버 실행
npm run dev
```

`http://localhost:3000` 에서 확인

## 개발 명령어

```bash
npm run dev         # 개발 서버 실행 (Turbopack)
npm run build       # 프로덕션 빌드
npm run check-all   # 타입체크 + 린트 + 포맷 통합 검사
```

## 데이터베이스

SQLite 파일 위치: `data/stock-insight.db` (앱 시작 시 자동 생성)

| 테이블 | 설명 |
|--------|------|
| `searches` | 종목 메타데이터 + 핵심 지표 |
| `price_data` | 5년 주간 주가 시계열 |
| `trends_data` | 5년 주간 Google Trends 시계열 |

상세 스키마는 [PRD 문서](./docs/PRD.md#데이터-모델) 참조.

## 개발 상태

- [x] 기본 프로젝트 구조 설정
- [x] 페이지 라우팅 구조 (대시보드 / 검색 / 상세)
- [ ] Ticker 입력 폼 및 유효성 검사 (F001)
- [ ] Yahoo Finance 데이터 수집 (F003)
- [ ] SerpAPI Trends 데이터 수집 (F004)
- [ ] 지표 계산 로직 (F005, F006)
- [ ] SQLite DB 연동 (F013, F014, F015, F016)
- [ ] 차트 컴포넌트 (F007, F008, F009)
- [ ] 다운로드 기능 (F011, F012)

## 문서

- [PRD 문서](./docs/PRD.md) - 상세 요구사항 및 기능 명세
- [개발 로드맵](./docs/ROADMAP.md) - 개발 계획
- [개발 가이드](./CLAUDE.md) - 개발 지침
