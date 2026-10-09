# StockInsight 디자인 시스템

## 1. 구현 계약과 범위

확정된 StockInsight UI 리디자인 명세 §1을 토큰 원본으로 사용한다.
Figma [Foundations](https://www.figma.com/design/WEmeHbbzBqEfBxez9dMk9o?node-id=2-2),
[상태·공유·계정 패턴](https://www.figma.com/design/WEmeHbbzBqEfBxez9dMk9o?node-id=15-2366)이 대응 참조다.
UI-1은 기존 화면의 토큰·글꼴과 D2를 적용했다. UI-2는 명세 §2·§3의 공통 컴포넌트와
숫자 표시 도우미·개발 미리보기를 추가한다. 제품 화면 구조는 후속 단계다.
Pretendard는 Figma의 대체 표시 글꼴보다 우선한다.

## 2. 색상

원본은 `src/app/globals.css`다. `:root, .light`는 라이트, `.dark`는 다크다.
하위 `.light`는 다크 안에서도 라이트 토큰을 사용한다. 차트·SVG도 CSS 변수를 참조한다.

| CSS 변수             | Dark    | Light   |
| -------------------- | ------- | ------- |
| --background         | #0B0D12 | #F3F4F6 |
| --card               | #12151C | #FFFFFF |
| --surface-raised     | #1A1E27 | #F1F3F5 |
| --surface-sunken     | #0E1116 | #F8F9FA |
| --overlay            | #05070A | #0B0D12 |
| --border-subtle      | #1D222C | #EBEDF0 |
| --border             | #272D39 | #DFE2E7 |
| --border-strong      | #3A4252 | #C4C9D2 |
| --foreground         | #E9ECF1 | #12151C |
| --text-secondary     | #A7B0BF | #4A5261 |
| --text-tertiary      | #8590A3 | #656D7B |
| --primary-foreground | #FFFFFF | #FFFFFF |
| --primary            | #7A45F0 | #6B3FE8 |
| --brand-hover        | #8B5CF6 | #5A30D6 |
| --brand-subtle       | #221A40 | #F1EDFF |
| --brand-text         | #C0A8FF | #5A30D6 |
| --up                 | #FF5B67 | #CF2238 |
| --up-subtle          | #361B21 | #FDEDEF |
| --down               | #5A97FF | #1F63D6 |
| --down-subtle        | #16243F | #E8F0FD |
| --warning            | #F2B33D | #9A6100 |
| --warning-subtle     | #33280F | #FFF3D6 |
| --success            | #34D399 | #0E7C4F |
| --success-subtle     | #11291D | #E1F5EA |
| --danger             | #FF7A45 | #B93C0B |
| --danger-subtle      | #3A1F14 | #FFEEE6 |
| --chart-interest     | #B38AFA | #7A45F0 |
| --chart-price        | #E9ECF1 | #1A1E27 |
| --chart-ma13         | #F2B33D | #C78100 |
| --chart-series-a     | #2DD4BF | #0D9488 |
| --chart-series-b     | #FB923C | #EA6A0A |
| --chart-series-c     | #F472B6 | #DB2777 |
| --chart-grid         | #1B2029 | #ECEEF2 |

shadcn 매핑: background=canvas, foreground=text/primary, card/popover=surface,
primary=brand/primary, primary-foreground=흰색, secondary/muted/accent=surface-raised,
muted-foreground=text/secondary, destructive=danger, border/input=border/default,
ring=brand/primary. chart-1~5는 interest/series-a/series-b/series-c/ma13이다.
sidebar=surface, sidebar-accent=brand/subtle, sidebar-accent-foreground=brand/text,
sidebar-border=border/subtle이다. 추가 변수도 Tailwind color 유틸리티에 등록한다.

상승은 up(빨강), 하락은 down(파랑), 관심도는 보라다. 오류·삭제는 danger(주홍)다.
0·결측은 사용자가 정정한 D7에 따라 text/secondary다(Figma Flat 상태).
등락 표시의 색은 ChangeBadge/ChangeText에서만 정한다. 화면별 연결과 YoY 막대는 후속 단계다.
UI-1의 기존 YoY 단색은 up, open/high/low는 series-a/b/c를 사용한다.
기존 계산·차트 구조를 유지한다. 밝은 PNG 프레임과 워터마크는 UI-9 범위다.

## 3. 글꼴과 타이포그래피

Pretendard Variable 1.3.9의 패키지 dynamic subset CSS를 import해 자체 호스팅한다.
스택: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif.
mono는 ui-monospace, SFMono-Regular, Menlo, monospace다.
숫자 셀·KPI·배지·축에는 tabular-nums를 사용한다.

| 스타일      | 크기/행간 px | 굵기        | 자간     |
| ----------- | ------------ | ----------- | -------- |
| Display     | 32/42        | 700         | -2%      |
| Heading     | 24/32        | 700         | -1.5%    |
| Heading     | 20/28        | 600         | -1%      |
| Title       | 16/24        | 600         | -0.5%    |
| Title       | 14/20        | 600         | -0.3%    |
| Body        | 14/22        | 400/500     | -0.3%    |
| Body        | 13/20        | 400/500     | -0.2%    |
| Caption     | 12/16        | 400/500     | 0        |
| Overline    | 11/14        | 600         | +3%      |
| Num Display | 40/48        | 600         | -2.5%    |
| Num         | 28/36, 20/28 | 600         | -2%, -1% |
| Num         | 16/24, 14/20 | 500         | 0        |
| Num         | 13/20, 12/16 | 400/500/600 | 0        |

모바일 축과 본문은 12px 이상이다. 화면별 타이포와 숫자 표시는 후속 단계다.

## 4. 간격과 레이아웃

간격은 2/4/6/8/12/16/20/24/32/40/48px, 기본 단위4px다.
반경 sm/md/lg/xl/full은 6/10/14/20/999px, --radius는 10px다.
버튼·입력은 md, 카드 lg, 모달 xl, 배지·토글 full이다.
Card 그림자는 0 1px 2px rgba(0,0,0,.06), 대부분 카드에는 테두리만 쓴다.
Popover·모달·드롭다운은 0 16px 40px -8px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.12)다.

후속 셸: ≥1024px 사이드바240, 상단바64, 패딩 좌우32/위28/아래48, 섹션 간격24.
<1024px 헤더52, 탭86(safe-area 포함), 본문 좌우16, 주요 행동 줄64.
터치 영역44×44 이상, 세그먼트·토글 높이36 이상이다. UI-1은 기존 레이아웃을 유지한다.

UI-3는 명세 §6.1·§6.12와 Figma Sidebar 8:3, Topbar 8:146, 모바일 16:2795,
계정 메뉴 39:4928을 적용한다. 로고32px·내비38px/반경10/아이콘20,
관심 종목 사용자 순서 앞5개·데이터 기준 카드·미갱신 배지·프로필을 구성한다.
메뉴 폭300px, 모바일 계정은 아래 시트와 포커스 복귀를 제공한다.
상단바 검색·새 분석·모바일 검색은 UI-8 전까지 기존 조회 경로를 사용한다.
OIDC 축소 셸은 서버 displayName과 POST/hidden csrf 로그아웃을 유지하고 저장 링크는 표시하지 않는다.
종목 순서는 기존 stock-sort-order 키와 id→index 형식을 공유하며 같은 탭과 다른 탭 변경을 반영한다.
원본 시계열을 셸 클라이언트에 전달하지 않고 서버에서 요약한다.

## 5. 컴포넌트와 상태

UI-5a 커스텀 차트 모달은560px·반경20·패딩24, 최대 화면 높이90dvh다.
헤더·본문·푸터를 분리하고 본문이 스크롤을 소유한다. 모바일은 화면 좌우16px를 남기고
기간 입력과 시리즈 설명·푸터를 줄바꿈한다. 기간 축소로 선택 해제된 시리즈는
동일 위치의 상태 문구로 이유를 알린다. 저장 키와 customChartUpdated 이벤트를 유지한다.

기존 shadcn/Radix Button/Input/Card/DropdownMenu를 재사용한다.
hover·focus·disabled·오류·빈 상태를 구분한다.
비활성은 40% 불투명도와 cursor-not-allowed, 포커스는 배경색 간격2px + 브랜드 링2px다.
UI-2는 명세 §2의 공통 primitive와 개발 전용 미리보기를 구현한다.
Button md=36/14/10px, sm=30/10/8px, 모바일=44px. 아이콘16px·간격6px.
Primary는 brand/primary-hover, Secondary는 raised/default border, Ghost는 raised hover,
Danger는 danger-subtle/danger이며 hover 테두리를 사용한다. 기존 variant 이름은 호환 별칭으로 유지한다.
Segmented는 raised 트랙(반경10·패딩3), 항목28px(모바일36)·반경8·좌우12,
선택 brand-subtle/brand-text/600. Tabs는44px·활성밑줄2px. SelectChip은32px·반경8.
SearchField는38px·raised·검색 아이콘·데스크톱 Kbd, TextField는44px·연결 라벨/설명/오류.
Checkbox는18px·반경5·brand 선택. StatusBadge는22px·full·좌우8·선택적6px점.
ChangeBadge는22px·반경6·좌우6·13px/500, ChangeText는배경없음. null은—와사유툴팁.
SeriesToggle은28px(모바일36)·full·10×3막대·aria-pressed. AlertBanner는반경12·패딩16/14.
MetricTile은반경14·패딩16·값20/28px. Sparkline은목록96×32/카드폭×48·선1.5px·면14%,
최대52점이며 결측 구간을 잇지 않는다. TickerLogo는36/28px·2글자·해시색16%배경.
Kbd는20px·반경6·11px. Dialog는420px·반경20·패딩24·popover그림자·overlay60%.
Menu는반경12·패딩6·항목최소36px/반경8. 표헤더40·목록행64·데이터행44·subtle구분선.
컴포넌트별 명세 반경8/12/5는 공통 CSS 토큰으로 정의한다. 브랜드 테두리는 입력 focus·SelectChip 열림만,
danger 테두리는 Danger hover·오류 입력만 허용하는 명세 예외다. 키보드 링은2px/offset2px.
모션은 색·opacity 전환이며 reduced-motion에서 전환/진입을 끈다. 라디오·탭은 Radix의 키보드 규칙을 따른다.
숫자는 §3 기준: 등락2자리/U+2212/항상부호, 비율1자리, 관심도정수와/100,
차이p, 가격통화기호와2자리, 거래량K/M/B최대2자리, 주차ISO, null은대시.
기존 통화 유틸의 통화 판정과 계산은 유지하고 새 표시 도우미만 별도로 제공한다.

ThemeToggle은 해석된 모드의 반대 라이트/다크를 선택한다.
계정 메뉴의 화면 모드는 시스템/라이트/다크이며 기본값은 시스템이다.
시스템은 prefers-color-scheme을 따르고 고정 선택은 브라우저에 저장한다.
이전 제거된 테마 저장값은 system으로 한 번 이전한다. 기존 OIDC 헤더의 사용자 이름에서도
화면 모드 메뉴를 제공한다. 새 셸의 계정 메뉴 배치는 UI-3에서 조립한다.

ChangeBadge/ChangeText, StatusBadge, MetricTile, Sparkline, Segmented,
SelectChip, AlertBanner, Kbd, TickerLogo, EmptyState, 표 행 variant는 UI-2 범위다.
작업 상태는 대기·실행·완료·실패를 글자로 표시하며 색상만으로 구분하지 않는다.

## 6. 상호작용과 보안

OIDC access/refresh token은 props나 브라우저 응답으로 전달하지 않는다.
서버의 displayName/csrf, 로그아웃 POST 폼과 CSRF 경계를 유지한다.
요청 시작 즉시 관련 컨트롤을 비활성화한다. 완료·실패 시 폴링을 중지한다.
새 요청·갱신·삭제·페이지 이탈 시 이전 요청을 취소하고 늦은 응답을 무시한다.
진행률을 추정 숫자로 표시하지 않는다. 오류는 관련 작업 가까이에 표시한다.
role="alert"와 aria-live를 유지한다. 테마 변경 중 전환은 끈다.

## 7. 접근성과 검증

키보드 조작, 연결된 label, 보이는 포커스, 읽을 수 있는 데이터 표를 유지한다.
테마 선택은 native radio group이며 화살표 키로 선택한다.
390/1440/1920px × light/dark와 지시서의 1280px를 확인한다.
토큰 값은 그대로 쓰되 실제 조합 대비는 확인한다. 명세의 대비 주장과 다르면
임의로 색을 바꾸지 않고 검증 부채로 기록한다.
UI-2 실측에서 다크 Primary hover의 #8B5CF6와 흰 글자는 약4.23:1이다.
지정 토큰과 지시서의4.5:1 기준이 충돌해 디자인 검토가 필요하다.

## 8. 검증 부채와 후속 단계

UI-4는 `src/lib/insights/`의 순수 표시 규칙을 추가한다. 기존 TypeScript 계산 함수는
이전 호환 기준으로 유지한다. 대표 분석은 5Y 조건의 표시 순서·갱신일·생성일 기준,
관심 급등은 YoY ≥20%, 둔화는 ≤−15%, MA13은13주·YoY는65주 미만이면 결측이다.
브리핑은 관심↑ 주가↓·급등·둔화 순 최대3개이며 새 데이터 수집을 하지 않는다.
완료 주는 기존 로컬 ISO 주 경계를 따르고 ISO 주차 연도를 사용한다.
이는 화면 표현을 위한 규칙이며 Spring 서비스나 클라우드 연동 완료를 뜻하지 않는다.

레거시 Supabase 없는 빌드·E2E는 기존 실패로 면제됐다. Docker 실제 서비스는
사용자 지시대로 보류하며 #24에 남긴다. fixture는 실제 Keycloak·Java·RabbitMQ
연동 통과가 아니다. 전체 화면 재구성과 하드코딩 유틸리티 교체는 UI-2~UI-10 범위다.
UI-1은 구조·문구·API·계산·인증 권한을 바꾸지 않는다.
