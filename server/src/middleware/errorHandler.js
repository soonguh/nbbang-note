// 공통 에러 처리
// 라우트에서 throw new HttpError(404, '...') 하면 { message } JSON 으로 응답한다.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// async 라우트 핸들러의 오류를 next()로 넘겨 주는 래퍼
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ message: `요청한 API를 찾을 수 없습니다: ${req.method} ${req.originalUrl}` });
}

// MySQL 오류 코드 → 사용자 메시지
const MYSQL_ERRORS = {
  ER_DUP_ENTRY: [409, '이미 존재하는 값입니다.'],
  ER_DATA_TOO_LONG: [400, '입력값이 너무 깁니다.'],
  ER_NO_REFERENCED_ROW_2: [400, '참조하는 데이터가 없습니다.'],
  ER_ROW_IS_REFERENCED_2: [409, '다른 데이터에서 사용 중이라 삭제할 수 없습니다.'],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, '입력값 형식이 올바르지 않습니다.'],
  WARN_DATA_TRUNCATED: [400, '입력값 형식이 올바르지 않습니다.'],
};
const DB_DOWN = ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'];

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: '요청 본문(JSON) 형식이 올바르지 않습니다.' });
  if (MYSQL_ERRORS[err.code]) {
    const [status, message] = MYSQL_ERRORS[err.code];
    return res.status(status).json({ message });
  }
  if (DB_DOWN.includes(err.code)) {
    console.error('[DB 연결 오류]', err.code, err.message);
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다.' });
  }
  console.error('[서버 오류]', err);
  // 내부 오류 내용은 응답에 노출하지 않는다
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
}
