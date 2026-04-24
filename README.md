# StockInsight

종목 가격 데이터와 Google Trends 데이터를 함께 비교하고, 저장된 종목과 키워드 분석을 다시 조회할 수 있는 웹 애플리케이션입니다.

## 프로젝트 소개

StockInsight는 두 가지 분석 흐름을 제공합니다.

- 종목 분석
  Yahoo Finance 기반 주가 흐름, 지표, 차트, 테이블 확인
- 키워드 분석
  Google Trends 기반 5년 트렌드 조회, 저장, 종목 오버레이 비교

인증은 Supabase, 배포 기준 Trends 런타임은 Vercel Python Function을 사용합니다.

## 주요 기능

- 로그인/회원가입 기반 사용자별 데이터 관리
- 종목 검색, 저장, 최신화, 삭제
- 종목 상세 차트, 커스텀 차트, 테이블 뷰
- 키워드 Trends 조회, 저장, 복원
- 키워드 상세 분석과 종목 오버레이
- Excel / PNG 다운로드

## 설치

```bash
npm install
```

Trends Python runtime까지 로컬에서 직접 검증하려면:

```bash
pip install -r requirements.txt
```

## 환경 변수

필수 값:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
PYTRENDS_INTERNAL_SECRET=replace_with_a_long_random_secret
```

선택 값:

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
STOCK_DATA_CACHE_TTL_SECONDS=86400
TRENDS_CACHE_TTL_SECONDS=86400
PREVIEW_CACHE_TTL_SECONDS=86400
```

예시는 [`.env.example`](./.env.example) 를 참고하세요.

## 실행

일반 개발:

```bash
npm run dev
```

Trends Python runtime까지 포함한 로컬 검증:

```bash
vercel dev
```

중요:

- 키워드 Trends는 `/api/pytrends` Python runtime을 사용합니다.
- `next dev`에서는 이 경로가 없어서 로컬 Trends 검증이 실패할 수 있습니다.
- 그래서 Trends까지 확인할 때만 Python 의존성 설치 + `vercel dev`가 필요합니다.

## 배포 개요

- 배포 기준 플랫폼: Vercel
- Python runtime: `api/pytrends.py`
- Python 의존성: `requirements.txt`
- 내부 인증: `PYTRENDS_INTERNAL_SECRET`

배포 시 Vercel 환경 변수에도 `PYTRENDS_INTERNAL_SECRET` 를 반드시 설정해야 합니다.

## 문서

- [docs/PRD.md](./docs/PRD.md) : 제품 요구사항
- [docs/TRD.md](./docs/TRD.md) : 기술 구조, 런타임, 데이터 흐름
- [docs/ROADMAP.md](./docs/ROADMAP.md) : 앞으로 할 일
- [docs/API_CONVENTIONS.md](./docs/API_CONVENTIONS.md) : API 규약
- [CLAUDE.md](./CLAUDE.md) : AI 작업 규칙

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

## 라이선스

별도 확정 전까지 명시하지 않습니다.
