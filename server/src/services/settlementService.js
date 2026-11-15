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
  // ====== TODO(USER-4): 재계산된 정산을 저장할 때 기존 입금 상태(is_paid, paid_at)를 어떻게 할지 결정 ======
  // 입력: conn    = 트랜잭션 중인 DB 연결 (반드시 pool 이 아니라 conn 으로 쿼리해야 같은 트랜잭션에 포함됨)
  //       groupId = 모임 id
  //       results = [{ from_member_id, to_member_id, amount }]  새로 계산된 송금 목록 (amount 는 1 이상 정수)
  // 출력: 저장 후의 settlements 행 배열 [{ id, group_id, from_member_id, to_member_id, amount, is_paid, paid_at }]
  // 힌트: - 지금 stub 은 "기존 행 전부 삭제 → is_paid = 0 으로 새로 INSERT" 라서, 지출이 바뀌면 입금 체크가 모두 풀린다
  //       - 기존 행을 먼저 읽고(SELECT ... WHERE group_id = ? FOR UPDATE),
  //         (from_member_id, to_member_id, amount) 가 같은 행은 남겨 두고 입금 상태를 유지하는 방법이 있다
  //       - 금액만 바뀐 경우(같은 from/to, 다른 amount)는 유지? 초기화? 직접 결정
  //         (이미 입금했는데 금액이 줄었다면 차액을 돌려줘야 하므로 초기화가 안전할 수 있음)
  //       - 새 목록에 없는 기존 행은 DELETE, 기존에 없던 결과는 INSERT
  //       - 모든 쿼리는 ? 파라미터 바인딩 사용
  // ====== END TODO(USER-4) ======
  await conn.execute('DELETE FROM settlements WHERE group_id = ?', [groupId]);
  for (const r of results) {
    await conn.execute(
      'INSERT INTO settlements (group_id, from_member_id, to_member_id, amount, is_paid, paid_at) VALUES (?, ?, ?, ?, 0, NULL)',
      [groupId, r.from_member_id, r.to_member_id, r.amount],
    );
  }
  const [rows] = await conn.execute('SELECT * FROM settlements WHERE group_id = ? ORDER BY id', [groupId]);
  return rows;
}

/**
 * 모임의 지출로 정산을 다시 계산해 저장한다. (지출 추가·수정·삭제 트랜잭션 안에서 호출)
 * 재계산 전에 이미 입금 완료된 건이 있으면 warning 문구를 돌려준다.
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

  const [[paid]] = await conn.execute('SELECT COUNT(*) AS cnt FROM settlements WHERE group_id = ? AND is_paid = 1', [groupId]);
  const results = calculateSettlements(members, withSplits)
    .filter((r) => Number.isInteger(r.amount) && r.amount > 0)
    .map((r) => ({ from_member_id: r.from, to_member_id: r.to, amount: r.amount }));
  const saved = await saveSettlements(conn, groupId, results);

  const paidCount = Number(paid.cnt);
  const warning =
    paidCount > 0
      ? `이미 입금 완료로 표시된 정산 ${paidCount}건이 있었어요. 지출이 바뀌어 정산을 다시 계산했으니 입금 상태를 확인해 주세요.`
      : null;
  return { settlements: saved, warning };
}
