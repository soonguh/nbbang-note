// 인증 API (Mock)
// 2단계에서는 함수 시그니처와 반환 모양은 유지하고 내부만 axios 호출로 바꾼다.
//   login/signup → POST /api/auth/login, /api/auth/signup  응답: { token, user }
//   getMe        → GET  /api/auth/me                         응답: user
//   updateAccount→ PUT  /api/users/me/account                응답: user
import { ApiError, delay, loadDb, nextId, now, saveDb } from '../mock/db.js';

const TOKEN_KEY = 'token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

// 응답에서 password_hash는 절대 내보내지 않는다 (서버와 동일)
export function toPublicUser(user) {
  const { password_hash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

// Mock 전용: 실제 해시가 아니라 브라우저 안에서만 쓰는 표시용 변환
function mockHash(password) {
  return `mock$${btoa(unescape(encodeURIComponent(password)))}`;
}

// Mock 토큰에서 현재 사용자 id를 꺼낸다 (2단계에서는 서버가 JWT로 처리)
export function currentUserId() {
  const token = getToken();
  const match = token && token.match(/^mock-token-(\d+)$/);
  if (!match) throw new ApiError('로그인이 필요합니다.', 401);
  return Number(match[1]);
}

export function requireUser(db) {
  const user = db.users.find((u) => u.id === currentUserId());
  if (!user) {
    logout();
    throw new ApiError('로그인이 필요합니다.', 401);
  }
  return user;
}

export async function signup({ email, password, name }) {
  await delay();
  email = (email || '').trim().toLowerCase();
  name = (name || '').trim();
  if (!email || !password || !name) throw new ApiError('이메일, 비밀번호, 이름을 모두 입력해 주세요.');
  if (password.length < 4) throw new ApiError('비밀번호는 4자 이상이어야 합니다.');
  const db = loadDb();
  if (db.users.some((u) => u.email === email)) throw new ApiError('이미 가입된 이메일입니다.', 409);
  const user = {
    id: nextId(db, 'users'),
    email,
    password_hash: mockHash(password),
    name,
    bank_name: null,
    account_number: null,
    created_at: now(),
  };
  db.users.push(user);
  saveDb(db);
  const token = `mock-token-${user.id}`;
  localStorage.setItem(TOKEN_KEY, token);
  return { token, user: toPublicUser(user) };
}

export async function login({ email, password }) {
  await delay();
  email = (email || '').trim().toLowerCase();
  if (!email || !password) throw new ApiError('이메일과 비밀번호를 입력해 주세요.');
  const db = loadDb();
  const user = db.users.find((u) => u.email === email);
  // 시드 계정(password_hash = null)은 비밀번호 검사를 건너뛴다
  if (!user || (user.password_hash && user.password_hash !== mockHash(password))) {
    throw new ApiError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
  }
  const token = `mock-token-${user.id}`;
  localStorage.setItem(TOKEN_KEY, token);
  return { token, user: toPublicUser(user) };
}

export async function getMe() {
  await delay(50);
  const db = loadDb();
  return toPublicUser(requireUser(db));
}

export async function updateAccount({ bank_name, account_number }) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  user.bank_name = (bank_name || '').trim() || null;
  user.account_number = (account_number || '').trim() || null;
  saveDb(db);
  return toPublicUser(user);
}
