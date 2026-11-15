// mysql2 커넥션 풀
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'nbbang_note_20413',
  waitForConnections: true,
  connectionLimit: 10,
  // DATE/DATETIME 을 'YYYY-MM-DD HH:mm:ss' 문자열 그대로 받는다 (client Mock과 같은 모양)
  dateStrings: true,
  // SUM() 결과(DECIMAL)를 문자열이 아닌 숫자로 받는다
  decimalNumbers: true,
});

/**
 * 트랜잭션 실행 도우미: fn 안에서 던진 오류는 자동 ROLLBACK
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
