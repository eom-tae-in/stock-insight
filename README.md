# StockInsight

Yahoo Finance 주가 데이터와 Google Trends 검색 관심도를 같은 주간 축에서 비교하고, 사용자별로 저장한 종목과 키워드 분석을 다시 조회하는 웹 애플리케이션입니다.

## 현재 제품 범위

StockInsight는 로그인한 개인 사용자를 기준으로 세 가지 흐름을 제공합니다.

- 종목 분석: 티커/회사명 검색, 조건 기반 5년 주간 데이터 조회, 저장, OHLC/지표/차트/테이블 조회
- 키워드 분석: Google Trends 조회, 키워드 저장, 조건별 5년 분석 복원
- 키워드-종목 비교: 저장된 키워드 분석에 종목 오버레이를 추가하고 정렬/삭제/최신화

관리자 이메일로 접근한 사용자는 `/admin`에서 운영 상태, 저장 데이터 수, 최근 분석/오버레이, 이상 데이터 후보를 읽기 전용으로 확인할 수 있습니다.

## 주요 기능

- Supabase Auth 기반 로그인/회원가입/비밀번호 설정
- 사용자별 종목, 키워드, 분석, 오버레이 데이터 격리
- Yahoo Finance 기반 5년 주간 주가 수집
- Google Trends 기반 5년 검색 관심도 수집
- 13주 이동평균, 52주 YoY, 주간 OHLC 지표 계산
- Redis 기반 조건별 주가/Trends 조회 캐시
- 키워드 사전형 목록, 분석 조건 목록, 드래그 정렬
- 종목 차트, 커스텀 차트, 테이블 뷰
- 키워드 상세 차트와 normalized price 오버레이
- Excel 및 PNG 다운로드
- 운영 대시보드와 헬스 체크 API

## 기술 스택

- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Recharts
- Supabase Auth + PostgreSQL + RLS
- Upstash Redis REST
- Yahoo Finance, pytrends
- Vercel, Vercel Python Function

## 설치

```bash
npm install
```

Trends Python runtime까지 로컬에서 검증하려면 Python 의존성도 설치합니다.

```bash
pip install -r requirements.txt
```

## 환경 변수

필수 값:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.....
PYTRENDS_INTERNAL_SECRET=.....
```

운영/기능별 권장 값:

```env
SUPABASE_SECRET_KEY=.....
ADMIN_EMAILS=admin@example.com
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
STOCK_DATA_CACHE_TTL_SECONDS=86400
TRENDS_CACHE_TTL_SECONDS=86400
```

예시는 [`.env.example`](./.env.example)를 참고하세요.

주의:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 클라이언트 공개 키입니다.
- `SUPABASE_SECRET_KEY`는 관리자/서버 전용입니다. `NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다.
- 프로덕션에서는 `PYTRENDS_INTERNAL_SECRET`가 필요합니다.
- Redis 환경 변수가 없으면 주가/Trends 조회 캐시는 비활성화되며, 조회 시 외부 API를 직접 호출합니다.

## 현재 조회/저장 흐름

종목은 저장 전 조회와 저장 후 상세를 분리합니다.

- 조회: `/api/stock-data?ticker=AAPL&period=5Y&interval=1wk`
- 조회 화면: `/stock-analysis/search?ticker=AAPL&period=5Y&interval=1wk`
- 캐시 키: `stock-data:v1:{ticker}:5y:1wk:{completedWeek}`
- 저장: 화면에 표시된 회사명, 통화, 5년 주간 가격 데이터를 `POST /api/searches`로 저장
- 저장 후: `/stock-analysis/{searchId}` 상세 화면으로 이동

키워드는 조회 조건별 Trends 결과를 캐시하고, 사용자가 저장할 때 화면의 5년 Trends 데이터를 `keywords`와 `keyword_analysis`에 저장합니다.

## 실행

일반 Next.js 개발 서버:

```bash
npm run dev
```

Trends Python Function까지 포함한 로컬 검증:

```bash
vercel dev
```

`/api/trends`는 내부적으로 `/api/pytrends` Python Function을 self-fetch합니다. `next dev`만 실행하면 Python Function 경로가 없어서 로컬 Trends 조회가 실패할 수 있습니다.

## 기본 명령어

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run format
npm run check-all
```

## 배포 개요

- 배포 기준 플랫폼: Vercel
- 빌드 명령: `npm run build`
- Python runtime: [api/pytrends.py](./api/pytrends.py)
- Python 의존성: [requirements.txt](./requirements.txt)
- Python Function 번들 제외 규칙: [vercel.json](./vercel.json)

배포 전 확인:

- Supabase URL/publishable key 설정
- `PYTRENDS_INTERNAL_SECRET`를 Next와 Python Function 양쪽에서 동일하게 읽을 수 있도록 설정
- 필요 시 `SUPABASE_SECRET_KEY`, `ADMIN_EMAILS` 설정
- 필요 시 Upstash Redis REST URL/token 설정
- Supabase 마이그레이션 적용

## 문서

- [docs/PRD.md](./docs/PRD.md): 제품 요구사항
- [docs/TRD.md](./docs/TRD.md): 기술 구조, 런타임, 데이터 흐름
- [docs/ROADMAP.md](./docs/ROADMAP.md): 앞으로 할 일
- [docs/API_CONVENTIONS.md](./docs/API_CONVENTIONS.md): API 규약
- [CLAUDE.md](./CLAUDE.md): AI 작업 규칙

## 라이선스

별도 확정 전까지 명시하지 않습니다.
