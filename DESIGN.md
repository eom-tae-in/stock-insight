# StockInsight 디자인 시스템

## 1. 분위기와 정체성

기존 분석 화면의 차분한 카드·데이터 중심 구성을 유지한다. 새로운 OIDC 및
비동기 작업 화면도 기존 shadcn/Radix 컴포넌트와 Tailwind 4 토큰을 재사용한다.
이번 작업은 브랜드 재설계가 아닌 기존 UI의 명시적 시스템 추출이다.

## 2. 색상

값의 원본은 `src/app/globals.css`의 :root, .dark, .calm이다. 임의 색상을
추가하지 않고 다음 의미 토큰을 사용한다.

| 역할         | CSS 토큰                        | Tailwind 사용                       |
| ------------ | ------------------------------- | ----------------------------------- |
| 배경·본문    | --background, --foreground      | bg-background, text-foreground      |
| 카드         | --card, --card-foreground       | bg-card, text-card-foreground       |
| 강조·버튼    | --primary, --primary-foreground | bg-primary, text-primary-foreground |
| 보조 텍스트  | --muted-foreground              | text-muted-foreground               |
| 보조 표면·선 | --muted, --border, --input      | bg-muted, border-border             |
| 위험·오류    | --destructive                   | text-destructive                    |
| 포커스       | --ring                          | focus-visible:ring-ring             |
| 차트         | --chart-1 ~ --chart-5           | var(--chart-1) 등                   |

기존 light는 따뜻한 중립색과 주황 강조, dark는 중립색과 파란 강조,
calm은 밝은 중립색과 초록 강조를 사용한다. 상태를 강조 테두리로 표시하지 않는다.

## 3. 타이포그래피

`src/app/layout.tsx`의 Geist와 Geist Mono를 사용한다. 기존 Tailwind 척도:
text-xs 12px(메타 정보), text-sm 14px(설명·버튼), text-base 16px(본문),
text-lg 18px(카드 제목), text-xl 20px(로고), text-2xl 24px(화면 제목),
text-3xl 30px(로그인 제목). 일반 본문은 14px 이상이다. 새 글꼴은 추가하지 않는다.

## 4. 간격과 레이아웃

기본 간격은 4px이다. gap/p/space-y의 2, 3, 4, 6, 8 단계를 사용한다.
Container는 기존 max-w-7xl과 모바일 px-4, sm:px-6, lg:px-8을 제공한다.
새 작업 화면은 max-w-5xl, 한 열 문서 스크롤 구조이며 sm(640px) 이상에서
검색 입력과 실행 버튼을 나란히 배치한다. 좁은 화면에서는 버튼이 줄바꿈된다.
신규 페이지 최소 높이는 min-h-dvh를 사용한다.

## 5. 컴포넌트와 상태

- Button: 기존 default/outline/destructive/ghost, size=lg의 입력 작업 버튼.
  hover·focus-visible·disabled 상태는 기존 primitive를 사용한다.
- Input/Label: 명시적 label과 연결된 기존 입력. 작업 중 disabled.
- 카드: bg-card, rounded-lg, border, p-6. 빈 상태는 안내 문장,
  진행 상태는 aria-live=polite, 오류는 role=alert와 복구 동작을 제공한다.
- 작업 상태: 대기·실행·완료·실패를 글자로 표시하고 색상만으로 구분하지 않는다.
- 차트: Recharts와 --chart-1, 고정 높이 h-72, 주변 요약과 같은 데이터의
  테이블을 함께 제공한다. 빈 결과에는 차트를 표시하지 않는다.
- OIDC 헤더: 로고, 현재 사용자 이름, 테마 토글, POST 로그아웃 폼.
  access/refresh token은 props나 브라우저 응답으로 전달하지 않는다.

기존 Input/Button/ThemeToggle의 상태를 새 폼의 컴포넌트 테스트와
브라우저 화면 검증에서 기본·포커스·비활성·오류·빈 상태로 확인한다.

## 6. 상호작용

기존 버튼의 색 전환을 사용하며 별도 진입 애니메이션은 추가하지 않는다.
요청 시작 즉시 관련 컨트롤을 비활성화한다. 완료·실패 시 폴링을 중지한다.
새 요청·갱신·삭제·페이지 이탈 시 이전 요청을 취소하고 늦은 응답을 무시한다.
진행률을 추정 숫자로 표시하지 않는다. 오류는 관련 작업 가까이에 표시한다.

## 7. 표면과 깊이

기존 카드의 border 및 톤 차이 조합을 유지한다. radius 원본은
--radius=0.625rem과 파생 radius-sm/md/lg/xl이다. 신규 임의 그림자나
유리 효과를 추가하지 않는다. 포커스 링 외에 상태 강조 테두리를 사용하지 않는다.

## 8. 접근성과 검증 부채

키보드 조작, label 연결, 보이는 포커스, 오류 안내, 읽을 수 있는 데이터
테이블을 필수로 한다. 모바일·데스크톱과 light/dark에서 신규 화면을 확인한다.
기존 calm 테마와 레거시 화면의 전체 디자인 정비는 이번 변경에 포함하지 않는다.
Docker 실제 서비스 연동은 사용자가 보류했고 #24에 남긴다. 브라우저 fixture
검증을 실제 Keycloak·Java·RabbitMQ 연동 통과라고 보고하지 않는다.
