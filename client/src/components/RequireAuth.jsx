// 로그인 확인 가드: 토큰이 없거나 만료(401)면 /login 으로 보낸다
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../hooks/useMe.js';
import { getToken, logout } from '../api/auth.js';
import { Empty, ErrorText } from './ui.js';

export default function RequireAuth() {
  const location = useLocation();
  const hasToken = Boolean(getToken());
  const { data: me, isPending, error } = useMe(hasToken);

  if (!hasToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // 인증 실패(401)일 때만 토큰을 지운다. 그 외 오류는 메시지만 보여준다.
  if (error?.status === 401) {
    logout();
    return <Navigate to="/login" replace />;
  }
  if (error) return <Empty><ErrorText>{error.message}</ErrorText></Empty>;
  if (isPending || !me) return <Empty>불러오는 중...</Empty>;
  return <Outlet />;
}
