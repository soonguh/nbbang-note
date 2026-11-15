// 정산 재계산 / 저장
// 계산 로직은 서버로 옮기지 않고 client 의 settle.js 를 그대로 import 해서 쓴다 (규칙이 한 곳에만 존재).
import { calculateSettlements } from '../../../client/src/utils/settle.js';

/**
 * 계산된 정산 결과를 settlements 테이블에 저장한다.
 * @param {import('mysql2/promise').PoolConnection} conn  트랜잭션 중인 연결 (conn.execute 사용)
 * @param {number} groupId
 * @param {{ from_member_id: number, to_member_id: number, amount: number }[]} results
 * @returns {Promise<object[]>} 저장된 settlements 행 목록
 */
export async function saveSettlements(conn, groupId, results) {
  // ====== TODO(USER-4): 재계산된 정산을 저장할 때 기존 입금 상태(is_paid, paid_at)를 어떻게 할지 결정 (구현 완료) ======
  // 입력: conn    = 트랜잭션 중인 DB 연결 (반드시 pool 이 아니라 conn 으로 쿼리해야 같은 트랜잭션에 포함됨)
  //       groupId = 모임 id
  //       results = [{ from_member_id, to_member_id, amount }]  새로 계산된 송금 목록 (amount 는 1 이상 정수)
  // 출력: 저장 후의 settlements 행 배열 [{ id, group_id, from_member_id, to_member_id, amount, is_paid, paid_at }]
  // 규칙: 1) 기존 행을 FOR UPDATE 로 잠그고 읽는다 (동시에 입금 토글이 들어와도 꼬이지 않게)
  //       2) (from_member_id, to_member_id, amount) 가 완전히 같은 기존 행은 그대로 둔다 → 입금 상태·paid_at 유지
  //       3) 금액만 바뀐 경우(같은 from/to, 다른 amount)는 유지하지 않고 새 행(미입금)으로 만든다
  //          이유: 이미 보낸 금액과 새 금액이 다르면 차액을 주고받아야 하므로, 총무가 다시 확인하게 하는 것이 안전
  //       4) 새 목록에 없는 기존 행은 DELETE, 기존에 없던 결과는 is_paid = 0 으로 INSERT
  //       - 같은 (from, to, amount) 가 여러 건이어도 1:1 로만 짝지음 (한 기존 행을 두 번 재사용하지 않음)
  const [existing] = await conn.execute(
    'SELECT id, from_member_id, to_member_id, amount FROM settlements WHERE group_id = ? ORDER BY id FOR UPDATE',
    [groupId],
  );
  const sameKey = (row, r) =>
    Number(row.from_member_id) === Number(r.from_member_id) &&
    Number(row.to_member_id) === Number(r.to_member_id) &&
    Number(row.amount) === Number(r.amount);

  const keptIds = new Set();
  const toInsert = [];
  for (const r of results) {
    const match = existing.find((row) => !keptIds.has(row.id) && sameKey(row, r));
    if (match) keptIds.add(match.id);
    else toInsert.push(r);
  }

  for (const row of existing) {
    if (!keptIds.has(row.id)) await conn.execute('DELETE FROM settlements WHERE id = ?', [row.id]);
  }
  for (const r of toInsert) {
    await conn.execute(
      'INSERT INTO settlements (group_id, from_member_id, to_member_id, amount, is_paid, paid_at) VALUES (?, ?, ?, ?, 0, NULL)',
      [groupId, r.from_member_id, r.to_member_id, r.amount],
    );
  }
  const [rows] = await conn.execute('SELECT * FROM settlements WHERE group_id = ? ORDER BY id', [groupId]);
  return rows;
  // ====== END TODO(USER-4) (구현 완료) ======
}

/**
 * 모임의 지출로 정산을 다시 계산해 저장한다. (지출 추가·수정·삭제 트랜잭션 안에서 호출)
 * 재계산 전에 이미 입금 완료된 건이 있으면 warning 문구를 돌려준다 (유지됐는지 / 초기화됐는지 구분).
 * @returns {Promise<{ settlements: object[], warning: string | null }>}
 */
export async function recalculateSettlements(conn, groupId) {
  const [members] = await conn.execute('SELECT id, user_id, display_name FROM group_members WHERE group_id = ? ORDER BY id', [groupId]);
  const [expenses] = await conn.execute(
    'SELECT id, title, amount, payer_member_id FROM expenses WHERE group_id = ? ORDER BY id',
    [groupId],
  );
  const [splits] = await conn.execute(
    `SELECT s.expense_id, s.member_id, s.share_amount
       FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
      WHERE e.group_id = ? ORDER BY s.id`,
    [groupId],
  );
  const withSplits = expenses.map((e) => ({
    ...e,
    splits: splits.filter((s) => s.expense_id === e.id).map(({ member_id, share_amount }) => ({ member_id, share_amount })),
  }));

  const [paidBefore] = await conn.execute('SELECT id FROM settlements WHERE group_id = ? AND is_paid = 1', [groupId]);
  const results = calculateSettlements(members, withSplits)
    .filter((r) => Number.isInteger(r.amount) && r.amount > 0)
    .map((r) => ({ from_member_id: r.from, to_member_id: r.to, amount: r.amount }));
  const saved = await saveSettlements(conn, groupId, results);

  // 입금 완료였던 행 중 살아남은 것(유지)과 사라진 것(금액이 바뀌어 미입금으로 다시 시작)을 구분해 안내
  const stillPaid = new Set(saved.filter((s) => Number(s.is_paid) === 1).map((s) => s.id));
  const kept = paidBefore.filter((p) => stillPaid.has(p.id)).length;
  const reset = paidBefore.length - kept;
  let warning = null;
  if (paidBefore.length > 0) {
    warning =
      reset > 0
        ? `입금 완료였던 정산 ${paidBefore.length}건 중 ${reset}건의 금액이 바뀌어 '미입금'으로 다시 계산됐어요. 이미 보낸 금액과 차액을 확인해 주세요.`
        : `입금 완료된 정산 ${kept}건은 금액이 그대로라 입금 상태를 유지했어요. 바뀐 정산이 있는지 확인해 주세요.`;
  }
  return { settlements: saved, warning };
}
