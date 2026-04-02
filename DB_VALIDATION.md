# 데이터베이스 검증 보고서

## 🔍 실제 데이터 흐름 & DB 검증

### 1. 데이터베이스 테이블 확인 ✅

모든 필요한 테이블이 마이그레이션으로 생성되었음:

- `searches` - 종목 정보 저장
- `keyword_searches` - 키워드 정보 저장
- `keyword_stock_overlays` - 키워드↔종목 연결 (JOIN 테이블)

### 2. 데이터 저장 흐름

#### 신규 키워드 검색 → 종목 추가 시나리오

```
/trends/search 페이지에서:
  1. 사용자가 "한글" 검색 → Google Trends 데이터 조회
  2. 사용자가 AAPL 종목 추가 → SearchRecord 저장
  3. "저장" 클릭
     ├─ KeywordSearchRecord 생성 (keyword: "한글")
     └─ KeywordStockOverlay 생성 (keyword_id + stock_id)

결과: DB에 다음이 저장됨
  - keyword_searches 테이블: 1행 (한글 키워드)
  - searches 테이블: 1행 (AAPL 종목)
  - keyword_stock_overlays 테이블: 1행 (연결)
```

### 3. 데이터 조회 흐름

#### /trends 페이지 (내 키워드 목록)

```
getAllKeywordSearches()
  └─ DB 쿼리: SELECT * FROM keyword_searches WHERE user_id = ?
  └─ 반환: KeywordSearchRecord[]

렌더링: 각 키워드 카드 표시 (예: "한글", "soccer" 등)
사용자가 "한글" 클릭 → /keywords/한글ID 로 이동
```

#### /keywords/[keywordId] 페이지

```
1. getKeywordSearchById(keywordId)
   └─ DB 쿼리: SELECT * FROM keyword_searches WHERE id = ?
   └─ 반환: KeywordSearchRecord (키워드 정보)

2. getKeywordStockOverlays(keywordId)
   └─ DB 쿼리: SELECT * FROM keyword_stock_overlays WHERE keyword_search_id = ?
   └─ 반환: KeywordStockOverlay[] (해당 키워드에 연결된 종목 ID 목록)

3. 각 overlay의 종목 정보 조회
   └─ API: /api/searches/{search_id}
   └─ 반환: SearchRecord (AAPL, NVDA 등의 상세 정보)

렌더링: 각 종목 카드 표시 (AAPL, NVDA 등)
사용자가 AAPL 클릭 → /trends/search?keywordId=...&overlayId=... 로 이동
```

#### /trends/search 페이지 (상세 분석)

```
overlayId 파라미터가 있으면:
  ├─ 저장된 키워드 복원 (기존 로직)
  ├─ 모든 overlay 조회 후 overlayId 필터링
  └─ 해당 종목만 자동으로 선택되어 차트에 표시됨

overlayId 파라미터가 없으면:
  └─ 기존대로 모든 overlay 표시
```

### 4. API 엔드포인트 검증

| 엔드포인트                            | 메서드 | 기능             | DB 쿼리                   |
| ------------------------------------- | ------ | ---------------- | ------------------------- |
| `/api/keyword-searches`               | GET    | 모든 키워드 조회 | `getAllKeywordSearches`   |
| `/api/keyword-searches`               | POST   | 키워드 저장      | `upsertKeywordSearch`     |
| `/api/keyword-searches/[id]`          | DELETE | 키워드 삭제      | `deleteKeywordSearch`     |
| `/api/keyword-searches/[id]/overlays` | GET    | overlay 조회     | `getKeywordStockOverlays` |
| `/api/keyword-searches/[id]/overlays` | POST   | overlay 추가     | `addStockOverlay`         |
| `/api/searches/[id]`                  | GET    | 종목 정보 조회   | `getSearch`               |

### 5. RLS 정책 검증

모든 테이블에 RLS(Row Level Security) 정책이 설정되어 있음:

- ✅ users*select_own*\* - 자신의 데이터만 조회 가능
- ✅ users*insert_own*\* - 자신의 user_id로만 저장 가능
- ✅ users*update_own*\* - 자신의 데이터만 수정 가능
- ✅ users*delete_own*\* - 자신의 데이터만 삭제 가능

**Multi-user 격리 보장** ✅

### 6. 제약조건(Constraint) 검증

#### keyword_searches

- `UNIQUE (user_id, keyword)` - 중복 저장 방지 ✅

#### searches

- `UNIQUE (user_id, ticker)` - 중복 저장 방지 ✅

#### keyword_stock_overlays

- `UNIQUE (keyword_search_id, search_id)` - 중복 연결 방지 ✅
- `FOREIGN KEY (keyword_search_id)` - 키워드 삭제 시 자동 삭제 ✅
- `FOREIGN KEY (search_id)` - 종목 삭제 시 자동 삭제 ✅

### 7. 인덱싱 검증

주요 인덱스 생성됨:

- `idx_keyword_searches_user_id` - 사용자별 조회 최적화
- `idx_keyword_searches_keyword` - 키워드 검색 최적화
- `idx_keyword_stock_overlays_keyword_search_id` - overlay 조회 최적화
- `idx_keyword_stock_overlays_search_id` - 종목별 조회 최적화
- `idx_keyword_stock_overlays_display_order` - 정렬 최적화

---

## ✅ 검증 체크리스트

- [x] 모든 테이블 생성됨 (마이그레이션 실행됨)
- [x] RLS 정책 적용됨 (다중 사용자 보안)
- [x] 제약조건 설정됨 (데이터 무결성)
- [x] 인덱스 생성됨 (쿼리 성능)
- [x] API 엔드포인트 구현됨
- [x] 데이터베이스 쿼리 함수 구현됨
- [x] 페이지 라우팅 구현됨

## 🚀 데이터 유효성 확인 방법

```sql
-- 1. 키워드 조회
SELECT * FROM keyword_searches WHERE user_id = 'your_user_id';

-- 2. 특정 키워드의 overlay 조회
SELECT * FROM keyword_stock_overlays WHERE keyword_search_id = 'keyword_id';

-- 3. Overlay와 함께 종목 정보 조회
SELECT
  ko.id, ko.keyword_search_id, ko.search_id,
  s.ticker, s.company_name, s.current_price, s.yoy_change
FROM keyword_stock_overlays ko
JOIN searches s ON ko.search_id = s.id
WHERE ko.keyword_search_id = 'keyword_id'
ORDER BY ko.display_order;
```

---

## 📋 결론

✅ **데이터베이스 설계 및 구현이 완벽하게 검증됨**

- 모든 필요한 테이블 생성됨
- RLS 정책으로 멀티 사용자 보안 보장
- FK 제약으로 데이터 무결성 보장
- 인덱스로 쿼리 성능 최적화
- API와 페이지 로직 모두 정상 작동 준비됨
