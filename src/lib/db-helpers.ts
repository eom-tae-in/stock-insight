import Database from 'better-sqlite3';
import { getDatabase } from './database';
import { SearchRecord, SearchRecordRaw, PriceDataPoint, TrendsDataPoint } from '@/types/database';
import { stringifySearchRecord, parseSearchRecordRaw } from './type-guards';

/**
 * 트랜잭션 실행 헬퍼
 * 자동 커밋/롤백 처리
 */
export function withTransaction<T>(callback: (db: Database.Database) => T): T {
  const db = getDatabase();
  const transaction = db.transaction(callback);
  return transaction(db);
}

/**
 * searches 테이블에 종목 저장 (UPSERT)
 */
export function upsertSearchRecord(record: SearchRecord): string {
  return withTransaction((db) => {
    const raw = stringifySearchRecord(record);

    const existing = db
      .prepare('SELECT id FROM searches WHERE ticker = ?')
      .get(record.ticker) as { id: string } | undefined;

    if (existing) {
      // UPDATE
      db.prepare(
        `UPDATE searches SET
          company_name = ?,
          current_price = ?,
          previous_close = ?,
          ma13 = ?,
          yoy_change = ?,
          week52_high = ?,
          week52_low = ?,
          price_data = ?,
          trends_data = ?,
          last_updated_at = ?
        WHERE id = ?`
      ).run(
        raw.company_name,
        raw.current_price,
        raw.previous_close,
        raw.ma13,
        raw.yoy_change,
        raw.week52_high,
        raw.week52_low,
        raw.price_data,
        raw.trends_data,
        raw.last_updated_at,
        existing.id
      );

      return existing.id;
    } else {
      // INSERT
      db.prepare(
        `INSERT INTO searches (
          id, ticker, company_name, current_price, previous_close,
          ma13, yoy_change, week52_high, week52_low,
          price_data, trends_data, last_updated_at, searched_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        raw.id,
        raw.ticker,
        raw.company_name,
        raw.current_price,
        raw.previous_close,
        raw.ma13,
        raw.yoy_change,
        raw.week52_high,
        raw.week52_low,
        raw.price_data,
        raw.trends_data,
        raw.last_updated_at,
        raw.searched_at,
        raw.created_at
      );

      return raw.id;
    }
  });
}

/**
 * searches 테이블에서 종목 조회
 */
export function getSearchRecord(searchId: string): SearchRecord | null {
  const db = getDatabase();
  const raw = db.prepare('SELECT * FROM searches WHERE id = ?').get(searchId) as SearchRecordRaw | undefined;
  if (!raw) return null;
  return parseSearchRecordRaw(raw);
}

/**
 * ticker로 종목 조회
 */
export function getSearchRecordByTicker(ticker: string): SearchRecord | null {
  const db = getDatabase();
  const raw = db.prepare('SELECT * FROM searches WHERE ticker = ?').get(ticker) as SearchRecordRaw | undefined;
  if (!raw) return null;
  return parseSearchRecordRaw(raw);
}

/**
 * 모든 저장된 종목 조회 (최신순)
 */
export function getAllSearchRecords(): SearchRecord[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM searches ORDER BY searched_at DESC')
    .all() as SearchRecordRaw[];
  return rows.map(parseSearchRecordRaw);
}

/**
 * 종목 삭제 (CASCADE 자동 처리)
 */
export function deleteSearchRecord(searchId: string): boolean {
  return withTransaction((db) => {
    const result = db.prepare('DELETE FROM searches WHERE id = ?').run(searchId);
    return result.changes > 0;
  });
}

/**
 * price_data 테이블에 주가 데이터 저장
 */
export function savePriceData(searchId: string, priceData: PriceDataPoint[]): void {
  withTransaction((db) => {
    // 기존 데이터 삭제
    db.prepare('DELETE FROM price_data WHERE search_id = ?').run(searchId);

    // 새 데이터 삽입
    const insertStmt = db.prepare(
      `INSERT INTO price_data (id, search_id, date, close, open, high, low, volume, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = new Date().toISOString();

    for (const point of priceData) {
      const id = `${searchId}-${point.date}-${Date.now()}`;
      insertStmt.run(
        id,
        searchId,
        point.date,
        point.close,
        point.open ?? null,
        point.high ?? null,
        point.low ?? null,
        point.volume ?? null,
        now
      );
    }
  });
}

/**
 * price_data 테이블에서 주가 데이터 조회
 */
export function getPriceData(searchId: string): PriceDataPoint[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT date, close, open, high, low, volume FROM price_data WHERE search_id = ? ORDER BY date')
    .all(searchId) as Array<{
    date: string;
    close: number;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
  }>;

  return rows.map((row) => ({
    date: row.date,
    close: row.close,
    open: row.open ?? undefined,
    high: row.high ?? undefined,
    low: row.low ?? undefined,
    volume: row.volume ?? undefined,
  }));
}

/**
 * trends_data 테이블에 트렌드 데이터 저장
 */
export function saveTrendsData(searchId: string, trendsData: TrendsDataPoint[]): void {
  withTransaction((db) => {
    // 기존 데이터 삭제
    db.prepare('DELETE FROM trends_data WHERE search_id = ?').run(searchId);

    // 새 데이터 삽입
    const insertStmt = db.prepare(
      `INSERT INTO trends_data (id, search_id, date, value, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );

    const now = new Date().toISOString();

    for (const point of trendsData) {
      const id = `${searchId}-${point.date}-${Date.now()}`;
      insertStmt.run(id, searchId, point.date, point.value, now);
    }
  });
}

/**
 * trends_data 테이블에서 트렌드 데이터 조회
 */
export function getTrendsData(searchId: string): TrendsDataPoint[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT date, value FROM trends_data WHERE search_id = ? ORDER BY date')
    .all(searchId) as Array<{
    date: string;
    value: number;
  }>;

  return rows.map((row) => ({
    date: row.date,
    value: row.value,
  }));
}

/**
 * 데이터베이스 통계 조회
 */
export function getDatabaseStats(): {
  totalSearches: number;
  totalPriceDataPoints: number;
  totalTrendsDataPoints: number;
} {
  const db = getDatabase();

  const totalSearches = (db.prepare('SELECT COUNT(*) as count FROM searches').get() as { count: number })
    .count;
  const totalPriceDataPoints = (db.prepare('SELECT COUNT(*) as count FROM price_data').get() as { count: number })
    .count;
  const totalTrendsDataPoints = (
    db.prepare('SELECT COUNT(*) as count FROM trends_data').get() as { count: number }
  ).count;

  return {
    totalSearches,
    totalPriceDataPoints,
    totalTrendsDataPoints,
  };
}
