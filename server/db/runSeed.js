// seed.sql 실행기: npm run db:seed
// mysql CLI 가 없어도 .env 의 접속 정보로 seed.sql 을 실행한다.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const sql = await readFile(new URL('./seed.sql', import.meta.url), 'utf8');

if (!process.env.DB_USER) {
  console.error('[설정 오류] server/.env 에 DB 접속 정보가 없습니다. server/.env.example 을 참고하세요.');
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'nbbang_note_20413',
  multipleStatements: true, // 이 스크립트에서만 사용 (API 서버 풀에서는 사용하지 않음)
});

try {
  await conn.query(sql);
  const [[counts]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM \`groups\`) AS \`groups\`,
            (SELECT COUNT(*) FROM group_members) AS members, (SELECT COUNT(*) FROM expenses) AS expenses,
            (SELECT COUNT(*) FROM expense_splits) AS splits, (SELECT COUNT(*) FROM settlements) AS settlements`,
  );
  console.log(`시드 완료 (${process.env.DB_NAME}):`, counts);
} catch (err) {
  console.error('[시드 실패]', err.code ?? '', err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
