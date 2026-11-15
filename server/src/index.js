// N빵노트 API 서버 기동
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { asyncHandler, errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import expenseRoutes from './routes/expenses.js';
import settlementRoutes from './routes/settlements.js';
import statsRoutes from './routes/stats.js';

// 필수 환경변수 확인 (JWT_SECRET 은 코드에 절대 쓰지 않는다)
const missing = ['DB_USER', 'DB_NAME', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[설정 오류] .env 에 ${missing.join(', ')} 값이 없습니다. server/.env.example 을 참고해 server/.env 를 만들어 주세요.`);
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// DB 연결 확인
const health = asyncHandler(async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', message: '데이터베이스에 연결할 수 없습니다.', code: err.code });
  }
});
app.get('/health', health);

// 모든 API는 /api 아래 (client Vite proxy: /api → 이 서버)
const api = express.Router();
api.get('/health', health);
api.use(authRoutes);
api.use(groupRoutes);
api.use(expenseRoutes);
api.use(settlementRoutes);
api.use(statsRoutes);
app.use('/api', api);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;
app.listen(port, () => {
  console.log(`N빵노트 API 서버 실행 중: http://localhost:${port}  (DB: ${process.env.DB_NAME})`);
});
