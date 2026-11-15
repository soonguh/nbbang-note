// 통계
//   GET /api/groups/:id/stats → { group_id, total_amount, by_category: [{ category, total, count }], by_payer }
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { loadGroupForUser } from '../middleware/permission.js';
import { CATEGORIES } from './expenses.js';

const router = Router();
router.use('/groups/:id/stats', requireAuth);

// ====== TODO(USER-5): 모임의 카테고리별 지출 합계를 구하는 SQL 작성 (구현 완료) ======
// 입력: ? 자리에 group_id 하나가 바인딩된다 (pool.execute(CATEGORY_TOTALS_SQL, [groupId]))
// 출력: [{ category, total, count }] 행 목록  예) [{ category: '식비', total: 150000, count: 2 }]
// - 해당 모임의 지출만 WHERE 로 고르고 category 별로 묶어 합계(SUM)와 건수(COUNT)를 구한다
// - group_id 는 ? 파라미터로 바인딩 (SQL 인젝션 방지), 지출이 없는 카테고리는 아래 코드가 0원으로 채움
// - 금액 큰 순으로 정렬 (같으면 카테고리 이름순)
const CATEGORY_TOTALS_SQL = `
  SELECT category, SUM(amount) AS total, COUNT(*) AS count
    FROM expenses
   WHERE group_id = ?
   GROUP BY category
   ORDER BY total DESC, category`;
// ====== END TODO(USER-5) (구현 완료) ======

router.get(
  '/groups/:id/stats',
  asyncHandler(async (req, res) => {
    const group = await loadGroupForUser(pool, req.params.id, req.user);
    const [rows] = await pool.execute(CATEGORY_TOTALS_SQL, [group.id]);
    const byCategory = new Map(rows.map((r) => [r.category, r]));

    const [[{ total }]] = await pool.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE group_id = ?', [group.id]);
    const [byPayer] = await pool.execute(
      `SELECT gm.id AS member_id, gm.display_name, COALESCE(SUM(e.amount), 0) AS total
         FROM group_members gm LEFT JOIN expenses e ON e.payer_member_id = gm.id
        WHERE gm.group_id = ?
        GROUP BY gm.id, gm.display_name
        ORDER BY gm.id`,
      [group.id],
    );

    res.json({
      group_id: group.id,
      total_amount: Number(total),
      // 4개 카테고리를 항상 같은 순서로, 결과에 없으면 0
      by_category: CATEGORIES.map((category) => ({
        category,
        total: Number(byCategory.get(category)?.total ?? 0),
        count: Number(byCategory.get(category)?.count ?? 0),
      })),
      by_payer: byPayer.map((p) => ({ ...p, total: Number(p.total) })),
    });
  }),
);

export default router;
