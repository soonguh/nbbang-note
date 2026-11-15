// 인증 API (server 연동)
//   signup        → POST  /api/auth/signup   응답: { token, user }
//   login         → POST  /api/auth/login    응답: { token, user }
//   getMe         → GET   /api/me            응답: user
//   updateAccount → PATCH /api/me/account    응답: user
//   deleteAccount → DELETE /api/me           응답: { id }   body: { password }
import { del, get, patch, post } from './http.js';

const TOKEN_KEY = 'token';
const AUTH_EVENT = 'auth-change';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// 토큰 저장/삭제 시 이벤트를 보내 화면(useAuthToken)이 즉시 다시 그려지게 한다
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

// 토큰 변경 구독 (다른 탭에서 로그인/로그아웃한 경우도 storage 이벤트로 반영)
export function subscribeToken(callback) {
  const onStorage = (e) => e.key === TOKEN_KEY && callback();
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

export async function signup({ email, password, name }) {
  const data = await post('/auth/signup', { email, password, name });
  setToken(data.token);
  return data;
}

export async function login({ email, password }) {
  const data = await post('/auth/login', { email, password });
  setToken(data.token);
  return data;
}

export function getMe() {
  return get('/me');
}

export function updateAccount({ bank_name, account_number }) {
  return patch('/me/account', { bank_name, account_number });
}

// 회원 탈퇴: 성공하면 토큰도 지운다
export async function deleteAccount(password) {
  const data = await del('/me', { password });
  logout();
  return data;
}
