// localStorage 기반 Mock DB
// 테이블 이름과 필드 이름은 MySQL 스키마(snake_case)와 동일하게 유지한다.
import { buildSeed } from './seed.js';

const DB_KEY = 'chongmu_mock_db';

// 서버 오류처럼 다루기 위한 에러 클래스 (status는 HTTP 상태 코드와 같은 의미)
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function loadDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // 깨진 데이터면 시드로 다시 만든다
    }
  }
  const seed = buildSeed();
  saveDb(seed);
  return seed;
}

export function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// AUTO_INCREMENT 흉내
export function nextId(db, table) {
  db._seq[table] = (db._seq[table] || 0) + 1;
  return db._seq[table];
}

// Mock 데이터를 시드 상태로 되돌린다
export function resetDb() {
  const seed = buildSeed();
  saveDb(seed);
  return seed;
}

// 네트워크 지연 흉내 (로딩 상태 확인용)
export function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// MySQL DATETIME 형태의 현재 시각 문자열 (YYYY-MM-DD HH:mm:ss)
export function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
