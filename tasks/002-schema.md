# Task 002: 데이터베이스 스키마 설계 및 초기화

**상태**: 예정
**Phase**: Phase 1 - 애플리케이션 골격 구축
**예상 기간**: 3-5일
**의존성**: Task 001 (타입 정의 완료 후)

---

## 개요

better-sqlite3를 사용하여 로컬 SQLite 데이터베이스의 스키마를 설계하고 초기화 함수를 구현합니다.

- **목적**: 3개 테이블(searches, price_data, trends_data) 정의, 데이터 무결성 보장
- **범위**: DDL 작성, PRAGMA 설정, 초기화 함수 구현, 싱글톤 패턴
- **완료 기준**: 앱 시작 시 DB 자동 생성, FOREIGN_KEY 활성화, 트랜잭션 헬퍼 함수

---

## 구현 내용

### 1. 데이터베이스 스키마 (SQL DDL)

```sql
-- PRAGMA 설정 (필수)
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 종목 메타데이터 테이블
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT UNIQUE NOT NULL,
  company_name TEXT,
  current_price REAL,
  yoy_change REAL,
  searched_at TEXT NOT NULL,  -- ISO 8601
  last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5년 주간 주가 데이터 (JSON 배열로 저장)
CREATE TABLE IF NOT EXISTS price_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL UNIQUE,
  data TEXT NOT NULL,  -- JSON: [{date, close, volume, adjClose}]
  FOREIGN KEY(search_id) REFERENCES searches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_price_search_id ON price_data(search_id);

-- 5년 주간 Google Trends 데이터 (JSON 배열로 저장)
CREATE TABLE IF NOT EXISTS trends_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL UNIQUE,
  data TEXT NOT NULL,  -- JSON: [{date, value}]
  FOREIGN KEY(search_id) REFERENCES searches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trends_search_id ON trends_data(search_id);
```

### 2. 초기화 함수 (src/lib/db/schema.ts)

```typescript
import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function initializeDatabase(): void {
  const dbPath = path.join(process.cwd(), 'data', 'stock-insight.db');

  try {
    db = new Database(dbPath);

    // PRAGMA 설정
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // DDL 실행
    db.exec(`
      CREATE TABLE IF NOT EXISTS searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT UNIQUE NOT NULL,
        company_name TEXT,
        current_price REAL,
        yoy_change REAL,
        searched_at TEXT NOT NULL,
        last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_id INTEGER NOT NULL UNIQUE,
        data TEXT NOT NULL,
        FOREIGN KEY(search_id) REFERENCES searches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_price_search_id ON price_data(search_id);

      CREATE TABLE IF NOT EXISTS trends_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_id INTEGER NOT NULL UNIQUE,
        data TEXT NOT NULL,
        FOREIGN KEY(search_id) REFERENCES searches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_trends_search_id ON trends_data(search_id);
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    initializeDatabase();
  }
  return db!;
}

// 트랜잭션 헬퍼 함수
export function withTransaction<T>(
  fn: (database: Database.Database) => T
): T {
  const database = getDatabase();
  const transaction = database.transaction(fn);
  return transaction(database);
}
```

### 3. DB 인스턴스 export (src/lib/db/index.ts)

```typescript
export { initializeDatabase, getDatabase, withTransaction } from './schema';
```

---

## 테이블 설계 상세

### searches 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| ticker | TEXT UNIQUE | 종목 심볼 (AAPL, MSFT) |
| company_name | TEXT | 회사명 (Apple Inc.) |
| current_price | REAL | 현재 종가 |
| yoy_change | REAL | YoY 변화율 (%) |
| searched_at | TEXT | 조회 시간 (ISO 8601) |
| last_updated_at | TEXT | 마지막 갱신 시간 |

**UPSERT 규칙**: 동일 ticker 재조회 시 `INSERT OR REPLACE` 대신 `INSERT ... ON CONFLICT(ticker) DO UPDATE` 사용 (id 보존)

### price_data 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| search_id | INTEGER FK UNIQUE | searches.id 참조 |
| data | TEXT | JSON 배열 저장: `[{"date":"2019-01-07","close":150.25,...}]` |

**저장 형식 (JSON)**:
```json
[
  {"date":"2019-01-07","close":150.25,"volume":12345678,"adjClose":150.0},
  {"date":"2019-01-14","close":151.50,"volume":12345678,"adjClose":151.25}
]
```

### trends_data 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| search_id | INTEGER FK UNIQUE | searches.id 참조 |
| data | TEXT | JSON 배열 저장: `[{"date":"2019-01-07","value":45}]` |

**저장 형식 (JSON)**:
```json
[
  {"date":"2019-01-07","value":45},
  {"date":"2019-01-14","value":48}
]
```

---

## 체크리스트

- [ ] src/lib/db/schema.ts 파일 생성
- [ ] src/lib/db/index.ts 파일 생성 (또는 기존 확장)
- [ ] 모든 테이블 생성 DDL 작성
- [ ] PRAGMA 설정 포함
- [ ] initializeDatabase() 함수 구현
- [ ] getDatabase() 싱글톤 구현
- [ ] 트랜잭션 헬퍼 함수 작성
- [ ] npm run dev 시 data/stock-insight.db 파일 생성 확인
- [ ] sqlite3 CLI로 테이블 3개 검증
- [ ] PRAGMA foreign_keys 활성화 확인

---

## 검증 기준

✅ data/stock-insight.db 파일이 자동으로 생성됨
✅ 3개 테이블 (searches, price_data, trends_data) 존재
✅ PRAGMA foreign_keys = ON 설정됨 (PRAGMA foreign_keys; 명령으로 확인)
✅ CASCADE DELETE 동작 확인 (searches 행 삭제 시 연관 데이터도 삭제)
✅ 인덱스 2개 생성됨 (idx_price_search_id, idx_trends_search_id)

---

## 다음 단계

Task 003 (환경 설정)에서 이 초기화 함수를 호출합니다.
Task 012+ (API 개발)에서 이 테이블들에 대한 CRUD 쿼리를 작성합니다.
