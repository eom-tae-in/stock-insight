# README 시각 자료

## 구조도

| 파일                                                 | 설명                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| [architecture-legacy.svg](./architecture-legacy.svg) | 기존 `prod` 구조. Next.js·Supabase·Vercel Python Function         |
| [architecture-target.svg](./architecture-target.svg) | 목표 역할과 요청·메시지 흐름. 부분 구현·미검증 범위를 그림에 명시 |
| [architecture.drawio](./architecture.drawio)         | 위 두 구조도를 각각 페이지로 담은 편집 원본                       |

[diagrams.net](https://app.diagrams.net/)에서 **File → Open From → Device**로 `.drawio` 파일을 연다.
도형과 텍스트·연결선을 개별 편집할 수 있다. 그림을 바꿀 때 SVG도 함께 갱신한다.
GitHub에서 읽기 쉽도록 정적 SVG를 사용하고, 외부 폰트·스크립트·애니메이션에 의존하지 않는다.
색·글꼴은 저장소 `DESIGN.md`의 라이트 토큰과 Pretendard/시스템 대체 글꼴을 따른다.

목표 구조의 선은 흐름을 요약한다. 소유권 검사는 각 서비스에 남으며 Gateway를 통과했다고 생략하지 않는다.
응답·결과 회신은 역방향이다. Redis 세션·캐시, IdP 전용 DB 등은 복잡도를 줄이기 위해 박스 일부를 생략하고 그림 하단에서 설명한다.
worker는 업무 컨텍스트가 아니며 현재 fixture 전용이다. 이 그림은 실제 클라우드 배포·통합 검증 증거가 아니다.

## Figma 화면

2026-10-26에 아래 파일에서 읽기 전용으로 내보냈다. 디자인 원본은 수정하지 않았다.

파일: [StockInsight](https://www.figma.com/design/WEmeHbbzBqEfBxez9dMk9o)

| 이미지                                                             | 원본 노드                                                                      | 의미                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------- |
| [renewal-home-desktop.png](./renewal-home-desktop.png)             | [8:2](https://www.figma.com/design/WEmeHbbzBqEfBxez9dMk9o?node-id=8-2)         | 홈 주간 루틴 · Desktop Dark       |
| [renewal-home-mobile.png](./renewal-home-mobile.png)               | [16:2795](https://www.figma.com/design/WEmeHbbzBqEfBxez9dMk9o?node-id=16-2795) | 짧은 확인 · Mobile                |
| [renewal-comparison-desktop.png](./renewal-comparison-desktop.png) | [10:980](https://www.figma.com/design/WEmeHbbzBqEfBxez9dMk9o?node-id=10-980)   | 키워드와 종목 비교 · Desktop Dark |

이미지의 수치·날짜·프로필은 Figma의 예시 데이터다. 실제 계정·서비스 데이터나 배포 화면을 캡처한 것이 아니다.
최신 페르소나의 모든 기대 기능이 이 디자인에 반영된 것은 아니다.
Figma 화면·현재 코드·목표 기능의 차이는 [고도화 문서](../../RENEWAL.md)에서 확인한다.
