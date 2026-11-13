import { useSyncExternalStore } from 'react';
import { getToken, subscribeToken } from '../api/auth.js';
import { useMe } from './useMe.js';

// 현재 토큰 (로그인/로그아웃 시 자동으로 다시 렌더링)
export function useAuthToken() {
  return useSyncExternalStore(subscribeToken, getToken);
}

// 로그인 상태 한 번에 보기
// loggedIn: 토큰이 있고 사용자 정보까지 확인된 상태
// checking: 토큰은 있는데 사용자 정보를 아직 불러오는 중
export function useAuth() {
  const token = useAuthToken();
  const hasToken = Boolean(token);
  const { data: me, isPending, error } = useMe(hasToken);
  return {
    hasToken,
    me: hasToken ? me : undefined,
    error: hasToken ? error : null,
    loggedIn: hasToken && Boolean(me),
    checking: hasToken && isPending,
  };
}
