// 인증 / 내 정보
//   POST  /api/auth/signup   body: { email, password, name }     → { token, user }
//   POST  /api/auth/login    body: { email, password }           → { token, user }
//   GET   /api/me                                                → user
//   PATCH /api/me/account    body: { bank_name, account_number } → user
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

const router = Router();
const BCRYPT_ROUNDS = 10;
// password_hash 는 절대 응답에 포함하지 않는다
const PUBLIC_USER_COLUMNS = 'id, email, name, bank_name, account_number, created_at';

async function findPublicUser(id) {
  const [rows] = await pool.execute(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`, [id]);
  return rows[0];
}

const text = (v) => (typeof v === 'string' ? v.trim() : '');

router.post(
  '/auth/signup',
  asyncHandler(async (req, res) => {
    const email = text(req.body.email).toLowerCase();
    const name = text(req.body.name);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password || !name) throw new HttpError(400, '이메일, 비밀번호, 이름을 모두 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
    // schema.sql: email VARCHAR(255), name VARCHAR(50)
    if (email.length > 255) throw new HttpError(400, '이메일은 255자 이하로 입력해 주세요.');
    if (name.length > 50) throw new HttpError(400, '이름은 50자 이하로 입력해 주세요.');
    if (password.length < 4) throw new HttpError(400, '비밀번호는 4자 이상이어야 합니다.');
    if (password.length > 72) throw new HttpError(400, '비밀번호는 72자 이하여야 합니다.'); // bcrypt 입력 한계

    const [dup] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (dup.length > 0) throw new HttpError(409, '이미 가입된 이메일입니다.');

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await pool.execute('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [
      email,
      password_hash,
      name,
    ]);
    const user = await findPublicUser(result.insertId);
    res.status(201).json({ token: signToken(user.id), user });
  }),
);

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) throw new HttpError(400, '이메일과 비밀번호를 입력해 주세요.');

    const [rows] = await pool.execute('SELECT id, password_hash FROM users WHERE email = ?', [email]);
    const found = rows[0];
    // 이메일이 없는 경우와 비밀번호가 틀린 경우를 같은 메시지로 응답 (계정 존재 여부 노출 방지)
    const ok = found ? await bcrypt.compare(password, found.password_hash) : false;
    if (!ok) throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');

    const user = await findPublicUser(found.id);
    res.json({ token: signToken(user.id), user });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await findPublicUser(req.user.id);
    if (!user) throw new HttpError(401, '로그인이 필요합니다.'); // 탈퇴 등으로 사라진 계정
    res.json(user);
  }),
);

router.patch(
  '/me/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bank_name = text(req.body.bank_name) || null;
    const account_number = text(req.body.account_number) || null;
    if (account_number && !/^[0-9-]+$/.test(account_number)) throw new HttpError(400, '계좌번호는 숫자와 - 만 입력할 수 있습니다.');
    // schema.sql: bank_name VARCHAR(30), account_number VARCHAR(50)
    if (bank_name && bank_name.length > 30) throw new HttpError(400, '은행명은 30자 이하로 입력해 주세요.');
    if (account_number && account_number.length > 50) throw new HttpError(400, '계좌번호는 50자 이하로 입력해 주세요.');
    await pool.execute('UPDATE users SET bank_name = ?, account_number = ? WHERE id = ?', [
      bank_name,
      account_number,
      req.user.id,
    ]);
    const user = await findPublicUser(req.user.id);
    if (!user) throw new HttpError(401, '로그인이 필요합니다.');
    res.json(user);
  }),
);

export default router;
