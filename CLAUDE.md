# Claude Code 개발 지침

이 문서는 StockInsight 저장소에서 AI 작업 시 참고하는 최소 기준 문서다.

## 프로젝트 요약

- StockInsight는 종목 분석과 키워드 분석을 함께 제공하는 Next.js 앱이다.
- 인증과 저장은 Supabase를 사용한다.
- 기존 Trends 경로는 `/api/pytrends`를 호출하며 RabbitMQ worker로 이전 예정이다.
- 모든 GitHub CI/CD와 배포 설정은 사용자 요청으로 제거됐다.
  명시적인 새 요청 없이 워크플로를 만들거나 GitHub Actions를 활성화하지 않는다.

상세 제품 요구사항은 [docs/PRD.md](./docs/PRD.md), 기술 구조는 [docs/TRD.md](./docs/TRD.md)를 우선 참고한다.

## 문서 우선순위

1. `docs/PRD.md`
2. `docs/TRD.md`
3. `docs/ROADMAP.md`
4. `docs/API_CONVENTIONS.md`
5. `README.md`

## 작업 원칙

- 현재 코드 기준으로 문서와 구현을 맞춘다.
- 미래 목표보다 현재 실제 동작을 우선 설명한다.
- 보호 API는 401 JSON, 보호 페이지는 로그인 리다이렉트 규칙을 유지한다.
- 키워드 Trends 경로는 `/api/pytrends` 단일 런타임 기준으로 생각한다.
- 런타임 전환 상태는 `docs/architecture/MIGRATION_STATUS.md`를 확인한다.

## 품질 게이트

기본 확인:

```bash
npm run typecheck
npm run lint
npm run build
```

빠른 통합 확인:

```bash
npm run check
```

## 수정 시 같이 봐야 하는 것

- API 변경 시 `docs/API_CONVENTIONS.md`
- 제품 흐름 변경 시 `docs/PRD.md`
- 런타임/배포 구조 변경 시 `docs/TRD.md`
- 우선순위 변경 시 `docs/ROADMAP.md`
- 실행 방법/환경 변수 변경 시 `README.md`
