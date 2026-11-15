import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getToken, logout } from './api/auth.js';
import './index.css';
import App from './App.jsx';

// 어떤 요청이든 401(토큰 만료·위조·탈퇴 계정)이 오면 로그아웃 → RequireAuth 가 /login 으로 보낸다
// (토큰이 없을 때의 401, 예: 로그인 실패는 그대로 화면에 오류 문구로 표시)
const logoutOn401 = (error) => {
  if (error?.status === 401 && getToken()) logout();
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: logoutOn401 }),
  mutationCache: new MutationCache({ onError: logoutOn401 }),
  defaultOptions: {
    queries: {
      // 401(로그인 필요)은 재시도해도 소용없으니 바로 실패 처리
      retry: (count, error) => error?.status !== 401 && count < 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
