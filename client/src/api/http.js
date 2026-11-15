// axios 공통 인스턴스
// - baseURL '/api' → Vite proxy 가 server(기본 http://localhost:5000)로 전달
// - localStorage 의 토큰을 Authorization 헤더에 자동으로 붙인다
// - 오류는 화면이 쓰던 모양 그대로 { message, status } 를 가진 ApiError 로 바꿔 던진다
import axios from 'axios';

const TOKEN_KEY = 'token';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const http = axios.create({ baseURL: '/api', timeout: 10000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      (status === 0 ? '서버에 연결할 수 없습니다. server 가 실행 중인지 확인해 주세요.' : '요청을 처리하지 못했습니다.');
    return Promise.reject(new ApiError(message, status));
  },
);

// 응답 본문만 꺼내는 도우미
export const get = (url) => http.get(url).then((r) => r.data);
export const post = (url, body) => http.post(url, body).then((r) => r.data);
export const patch = (url, body) => http.patch(url, body).then((r) => r.data);
export const del = (url) => http.delete(url).then((r) => r.data);
