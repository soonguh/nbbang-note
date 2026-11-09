import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/auth.js';

// 현재 로그인한 사용자 정보
export function useMe(enabled = true) {
  return useQuery({ queryKey: ['me'], queryFn: getMe, enabled, staleTime: 60_000 });
}
