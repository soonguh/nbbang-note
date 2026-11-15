// 정산
//   GET   /api/groups/:id/settlement  → { group_id, total_amount, balances, settlements }
//   PATCH /api/settlements/:id/paid   body: { is_paid } → settlement
// settlement = { ...settlements 행, is_paid(boolean), from_name, to_name,
//                to_account: { bank_name, account_number, holder_name } | null }
// ※ 계좌번호(to_account)는 이 모임을 볼 수 있는 사람(총무·회원 멤버)에게만 응답한다.
// ※ 정산 재계산은 지출이 바뀔 때(routes/expenses.js) 수행하고, 조회는 저장된 행을 그대로 돌려준다.
import { Router } from 'express';
import { lockGroup, pool, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { loadEditableGroup, loadGroupForUser } from '../middleware/permission.js';

const router = Router();
router.use(['/groups/:id/settlement', '/settlements'], requireAuth);

const SETTLEMENT_SELECT = `
  SELECT s.id, s.group_id, s.from_member_id, s.to_member_id, s.amount, s.is_paid, s.paid_at,
         fm.display_name AS from_name, tm.display_name AS to_name,
         u.bank_name, u.account_number, u.name AS holder_name
    FROM settlements s
    JOIN group_members fm ON fm.id = s.from_member_id
    JOIN group_members tm ON tm.id = s.to_member_id
    LEFT JOIN users u ON u.id = tm.user_id`;

function toSettlement({ bank_name, account_number, holder_name, ...row }) {
  return {
    ...row,
    is_paid: Boolean(row.is_paid),
    to_account: bank_name && account_number ? { bank_name, account_number, holder_name } : null,
  };
}

router.get(
  '/groups/:id/settlement',
  asyncHandler(async (req, res) => {
    const group = await loadGroupForUser(pool, req.params.id, req.user);

    // 멤버별 낸 돈 / 부담액 요약
    const [balances] = await pool.execute(
      `SELECT gm.id AS member_id, gm.display_name,
              COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.payer_member_id = gm.id), 0) AS paid,
              COALESCE((SELECT SUM(s.share_amount) FROM expense_splits s WHERE s.member_id = gm.id), 0) AS owed
         FROM group_members gm
        WHERE gm.group_id = ?
        ORDER BY gm.id`,
      [group.id],
    );
    const [[{ total }]] = await pool.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE group_id = ?', [group.id]);
    const [rows] = await pool.execute(`${SETTLEMENT_SELECT} WHERE s.group_id = ? ORDER BY s.id`, [group.id]);

    res.json({
      group_id: group.id,
      total_amount: Number(total),
      balances: balances.map((b) => ({
        ...b,
        paid: Number(b.paid),
        owed: Number(b.owed),
        balance: Number(b.paid) - Number(b.owed),
      })),
      settlements: rows.map(toSettlement),
    });
  }),
);

router.patch(
  '/settlements/:id/paid',
  asyncHandler(async (req, res) => {
    if (typeof req.body.is_paid !== 'boolean') throw new HttpError(400, 'is_paid 는 true 또는 false 여야 합니다.');
    const id = Number(req.params.id) || 0;
    const [[row]] = await pool.execute('SELECT id, group_id FROM settlements WHERE id = ?', [id]);
    if (!row) throw new HttpError(404, '정산 항목을 찾을 수 없습니다.');
    await loadEditableGroup(pool, row.group_id, req.user);

    const updated = await withTransaction(async (conn) => {
      // 정산 재계산(지출 변경)과 겹치지 않도록 모임을 잠근 뒤, 그 사이 행이 사라졌는지 다시 확인
      await lockGroup(conn, row.group_id);
      const paid = req.body.is_paid ? 1 : 0;
      // 이미 입금 완료인 행을 다시 완료로 보내도 처음 입금 시각(paid_at)은 유지
      const [result] = await conn.execute(
        'UPDATE settlements SET is_paid = ?, paid_at = IF(? = 1, COALESCE(paid_at, NOW()), NULL) WHERE id = ?',
        [paid, paid, row.id],
      );
      if (result.affectedRows === 0) {
        throw new HttpError(409, '정산이 방금 다시 계산되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
      }
      const [[fresh]] = await conn.execute(`${SETTLEMENT_SELECT} WHERE s.id = ?`, [row.id]);
      return fresh;
    });
    res.json(toSettlement(updated));
  }),
);

export default router;
