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
 * - READ COMMITTED: 잠금을 기다린 뒤 읽는 SELECT 가 다른 트랜잭션이 방금 커밋한 내용까지 보도록
 * - 교착 상태(ER_LOCK_DEADLOCK)가 나면 fn 을 처음부터 최대 retries 번 다시 실행
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 */
export async function withTransaction(fn, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (err.code === 'ER_LOCK_DEADLOCK' && attempt < retries) continue;
      throw err;
    } finally {
      conn.release();
    }
  }
}

/**
 * 모임 단위 잠금: 같은 모임의 지출·정산을 바꾸는 트랜잭션을 한 번에 하나씩 처리한다.
 * (동시에 지출을 등록하면 정산 재계산끼리 교착 상태가 나거나 서로의 결과를 덮어쓰는 문제 방지)
 * 트랜잭션 안에서, 데이터를 바꾸기 전에 호출할 것.
 */
export async function lockGroup(conn, groupId) {
  const [rows] = await conn.execute('SELECT id FROM `groups` WHERE id = ? FOR UPDATE', [groupId]);
  return rows.length > 0;
}
