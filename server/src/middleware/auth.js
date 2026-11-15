// 인증 미들웨어: Authorization: Bearer <JWT> 확인 후 req.user = { id } 설정
import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, '로그인이 필요합니다.'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: Number(payload.sub) };
    next();
  } catch {
    next(new HttpError(401, '로그인이 만료되었거나 올바르지 않습니다.'));
  }
}
