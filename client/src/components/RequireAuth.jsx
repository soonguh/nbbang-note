// 로그인 확인 가드: 토큰이 없거나 만료(401)면 안내 문구와 함께 /login 으로 보낸다
// 원래 가려던 주소(쿼리 포함)를 state.from 에 담아 두면 로그인 후 그곳으로 돌아간다.
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { logout } from '../api/auth.js';
import { Empty, ErrorText } from './ui.js';

const LOGIN_REQUIRED_NOTICE = '로그인이 필요한 기능이에요';

export default function RequireAuth() {
  const location = useLocation();
  const { hasToken, me, error, checking } = useAuth();
  const expired = error?.status === 401;

  // 인증 실패(401, 만료·삭제된 계정)일 때만 토큰을 지운다 (렌더 중이 아니라 effect에서 처리)
  // 토큰이 지워지면 아래 !hasToken 분기로 같은 안내와 함께 /login 으로 이동한다
  useEffect(() => {
    if (expired) logout();
  }, [expired]);

  const toLogin = (notice) => (
    <Navigate to="/login" replace state={{ from: location.pathname + location.search, notice }} />
  );

  if (!hasToken || expired) return toLogin(LOGIN_REQUIRED_NOTICE);
  if (error) return <Empty><ErrorText>{error.message}</ErrorText></Empty>;
  if (checking || !me) return <Empty>불러오는 중...</Empty>;
  return <Outlet />;
}
