# Task 001: TypeScript 타입 정의 및 인터페이스 설계

**상태**: 예정
**Phase**: Phase 1 - 애플리케이션 골격 구축
**예상 기간**: 3-5일
**의존성**: 없음 (최우선)

---

## 개요

PRD의 16개 기능을 구현하기 위해 필요한 모든 TypeScript 타입과 인터페이스를 정의합니다.

- **목적**: 데이터 구조의 타입 안전성 확보, Phase 2 UI 컴포넌트의 Props 타입 제공
- **범위**: API 응답 타입, DB 모델, UI 컴포넌트 Props, 검증 스키마
- **완료 기준**: 모든 타입이 TypeScript strict mode에서 컴파일, JSDoc 주석 포함

---

## 구현 내용

### 1. API 응답 타입

```typescript
// Yahoo Finance (F003 주가 데이터)
export interface YahooFinanceHistorical {
  date: Date;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  adjClose?: number;
  volume?: number;
}

// SerpAPI Google Trends (F004 트렌드 데이터)
export interface SerpAPITrendsResponse {
  timeline_data: Array<{
    date: string;  // "May 30 - Jun 5, 2021"
    timestamp: number;  // Unix timestamp
    values: Array<{ extracted_value: number }>;
  }>;
}
```

### 2. 데이터베이스 모델

```typescript
// searches 테이블 (F014 저장 종목 조회용)
export interface SearchRecord {
  id: number;
  ticker: string;
  company_name: string;
  current_price: number;
  yoy_change: number;
  searched_at: string;  // ISO 8601
  last_updated_at: string;
}

// price_data 테이블 (F003 주가, JSON 배열 저장)
export interface PriceDataPoint {
  date: string;  // ISO 8601, ISO week 정규화된 월요일
  close: number;
  volume?: number;
  adjClose?: number;
}

// trends_data 테이블 (F004 트렌드, JSON 배열 저장)
export interface TrendsDataPoint {
  date: string;  // ISO 8601, ISO week 정규화된 월요일
  value: number;  // 0~100
}
```

### 3. 지표 계산 타입 (F005, F006)

```typescript
export interface Metrics {
  currentPrice: number;  // F002
  ma13: number | null;  // F005
  yoy: number;  // F006
  high52w: number;  // F010
  low52w: number;  // F010
}

export interface ChartDataPoint {
  date: string;
  close?: number;
  ma13?: number;
  trendValue?: number;  // 0~100
}
```

### 4. UI 컴포넌트 Props

```typescript
// 대시보드 카드 (F014, F015, F016)
export interface StockCardProps {
  id: number;
  ticker: string;
  company_name: string;
  current_price: number;
  yoy_change: number;
  sparklineData: PriceDataPoint[];  // 최근 52주
  onRefresh?: () => void;
  onDelete?: () => void;
}

// 지표 카드 (F010)
export interface IndicatorCardProps {
  label: string;
  value: string | number;
  isPositive?: boolean;
}

// 차트 (F007, F008, F009)
export interface ChartProps {
  data: ChartDataPoint[];
  title: string;
}
```

### 5. API 라우트 응답

```typescript
export interface SearchResponse {
  success: boolean;
  search_id?: number;
  error?: string;
}

export interface DashboardResponse {
  searches: SearchRecord[];
}

export interface DetailResponse {
  record: SearchRecord;
  prices: PriceDataPoint[];
  trends: TrendsDataPoint[];
  metrics: Metrics;
}
```

### 6. Zod 검증 스키마 (F001 입력 검증용)

```typescript
import { z } from 'zod';

export const SearchFormSchema = z.object({
  ticker: z.string()
    .min(1, '종목 심볼을 입력하세요')
    .max(10, '종목 심볼은 10자 이하')
    .toUpperCase(),
});

export type SearchFormInput = z.infer<typeof SearchFormSchema>;
```

### 7. Type Guards (런타임 검증)

```typescript
export function isPriceDataArray(data: unknown): data is PriceDataPoint[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' && item !== null &&
    'date' in item && 'close' in item
  );
}

export function isTrendsDataArray(data: unknown): data is TrendsDataPoint[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' && item !== null &&
    'date' in item && 'value' in item
  );
}
```

---

## 체크리스트

- [ ] src/types/index.ts 파일 생성
- [ ] 모든 타입 정의 완료
- [ ] 각 타입에 JSDoc 주석 추가 (용도, PRD 기능 ID)
- [ ] npm run typecheck 실행 - 0 에러 확인
- [ ] Zod 스키마 작성 및 검증
- [ ] Type guards 함수 구현
- [ ] 다음 Task에서 import 테스트

---

## 검증 기준

✅ 모든 API 응답 타입이 yaml-finance2, SerpAPI 공식 문서와 일치
✅ DB 모델이 PRD의 3테이블 구조와 일치
✅ UI Props가 실제 컴포넌트에서 사용될 형태
✅ TypeScript strict: true 모드에서 0 에러
✅ JSDoc으로 각 타입의 용도와 PRD 기능 ID 명시

---

## 다음 단계

Task 002 (DB 스키마)에서 이 타입들을 기반으로 데이터베이스 테이블을 설계합니다.
Task 004~007 (UI)에서 이 타입들을 Props로 사용합니다.
