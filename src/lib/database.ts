import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * 데이터베이스 싱글톤 인스턴스 획득
 * 첫 호출 시 DB 파일을 생성하고 마이그레이션을 실행합니다
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  // data 디렉토리 생성
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // DB 파일 경로
  const dbPath = path.join(dataDir, 'stock-insight.db');

  // DB 연결
  db = new Database(dbPath);

  // Foreign key 제약조건 활성화
  db.pragma('foreign_keys = ON');

  // 저널 모드 설정 (성능 최적화)
  db.pragma('journal_mode = WAL');

  // 초기화 및 마이그레이션 실행
  runMigrations(db);

  return db;
}

/**
 * 마이그레이션 실행
 * 모든 SQL 마이그레이션 파일을 순서대로 실행합니다
 */
function runMigrations(database: Database.Database): void {
  const migrationsDir = path.join(process.cwd(), 'data', 'migrations');

  // migrations 디렉토리가 없으면 생성
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // migration 파일 목록
  const migrationFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  migrationFiles.forEach((file) => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      // 복수 statement를 하나씩 실행
      const statements = sql.split(';').filter((stmt) => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          database.exec(statement);
        }
      }
    } catch (error) {
      console.error(`Migration 실행 실패: ${file}`, error);
      throw error;
    }
  });
}

/**
 * 데이터베이스 연결 종료
 * 테스트나 서버 종료 시 호출
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 데이터베이스 초기화 (테스트용)
 * DB 파일과 모든 데이터 삭제 후 재생성
 */
export function resetDatabase(): void {
  closeDatabase();

  const dbPath = path.join(process.cwd(), 'data', 'stock-insight.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // 다시 초기화
  getDatabase();
}
