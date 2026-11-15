// 정산 유틸 테스트 (vitest)  실행: npm test
// 시나리오 A·B는 /client/README-test.md 와 같은 데이터
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calculateSettlements, splitEvenly } from './settle.js';

const sum = (list, key) => list.reduce((acc, x) => acc + x[key], 0);
const shares = (result) => result.map((s) => s.share_amount);

// 테스트용 지출 만들기: splits는 실제 앱처럼 splitEvenly 결과를 쓴다
const expense = (id, payer, amount, participants) => ({
  id,
  amount,
  payer_member_id: payer,
  splits: splitEvenly(amount, participants),
});

// 송금 결과가 잔액을 정확히 0으로 만드는지 검사
function expectSettled(members, expenses, transfers) {
  const balance = new Map(members.map((m) => [m.id, 0]));
  expenses.forEach((e) => {
    balance.set(e.payer_member_id, balance.get(e.payer_member_id) + e.amount);
    e.splits.forEach((s) => balance.set(s.member_id, balance.get(s.member_id) - s.share_amount));
  });
  transfers.forEach((t) => {
    expect(Number.isInteger(t.amount)).toBe(true);
    expect(t.amount).toBeGreaterThan(0);
    balance.set(t.from, balance.get(t.from) + t.amount);
    balance.set(t.to, balance.get(t.to) - t.amount);
  });
  balance.forEach((v) => expect(v).toBe(0));
}

describe('splitEvenly (USER-2)', () => {
  it('나누어떨어지면 모두 같은 금액', () => {
    expect(shares(splitEvenly(120000, [1, 2, 3, 4]))).toEqual([30000, 30000, 30000, 30000]);
  });

  it('반올림 후 합계가 1원 초과하면 앞쪽부터 1원 뺀다 (50,000원 / 3명)', () => {
    // 16,666.67 → 반올림 16,667 × 3 = 50,001 → 1원 초과
    const result = splitEvenly(50000, [5, 6, 7]);
    expect(result).toEqual([
      { member_id: 5, share_amount: 16666 },
      { member_id: 6, share_amount: 16667 },
      { member_id: 7, share_amount: 16667 },
    ]);
    expect(sum(result, 'share_amount')).toBe(50000);
  });

  it('반올림 후 합계가 1원 부족하면 앞쪽부터 1원 더한다 (10,000원 / 3명)', () => {
    // 3,333.33 → 반올림 3,333 × 3 = 9,999 → 1원 부족
    expect(shares(splitEvenly(10000, [1, 2, 3]))).toEqual([3334, 3333, 3333]);
  });

  it('반올림 차액이 2원 이상이어도 합계가 맞는다 (100원 / 6명, 5원 / 2명)', () => {
    // 16.67 → 17 × 6 = 102 → 2원 초과
    expect(shares(splitEvenly(100, [1, 2, 3, 4, 5, 6]))).toEqual([16, 16, 17, 17, 17, 17]);
    // 2.5 → 3 × 2 = 6 → 1원 초과
    expect(shares(splitEvenly(5, [1, 2]))).toEqual([2, 3]);
  });

  it('0원이면 전원 0원', () => {
    expect(shares(splitEvenly(0, [1, 2, 3]))).toEqual([0, 0, 0]);
  });

  it('1명이면 금액 전부', () => {
    expect(splitEvenly(12345, [9])).toEqual([{ member_id: 9, share_amount: 12345 }]);
  });

  it('빈 배열·null이면 빈 배열', () => {
    expect(splitEvenly(10000, [])).toEqual([]);
    expect(splitEvenly(10000, null)).toEqual([]);
  });

  it('여러 금액·인원에서 항상 정수, 합계 일치, 사람 간 차이 최대 1원', () => {
    for (let n = 1; n <= 12; n++) {
      const ids = Array.from({ length: n }, (_, i) => i + 1);
      for (const amount of [1, 7, 99, 1000, 10001, 33333, 50000, 123457, 999999]) {
        const result = splitEvenly(amount, ids);
        const values = shares(result);
        expect(values.every(Number.isInteger)).toBe(true);
        expect(sum(result, 'share_amount')).toBe(amount);
        expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('같은 입력이면 같은 결과', () => {
    expect(splitEvenly(50000, [5, 6, 7])).toEqual(splitEvenly(50000, [5, 6, 7]));
  });
});

describe('calculateSettlements (USER-1)', () => {
  it('지출이 없으면 빈 배열', () => {
    expect(calculateSettlements([{ id: 1 }, { id: 2 }], [])).toEqual([]);
  });

  it('시나리오 A: 강원도 MT (4명 균등) → 송금 3건', () => {
    const members = [1, 2, 3, 4].map((id) => ({ id }));
    const all = [1, 2, 3, 4];
    const expenses = [
      expense(1, 1, 120000, all), // 1차 삼겹살, 홍길동 결제
      expense(2, 2, 30000, all), //  2차 카페, 김철수 결제
    ];
    const result = calculateSettlements(members, expenses);
    expect(result).toEqual([
      { from: 3, to: 1, amount: 37500 }, // 이영희 → 홍길동
      { from: 4, to: 1, amount: 37500 }, // 박민수 → 홍길동
      { from: 2, to: 1, amount: 7500 }, //  김철수 → 홍길동
    ]);
    expectSettled(members, expenses, result);
  });

  it('시나리오 B: 금요일 점심 (반올림 차액 + 일부 참여) → 송금 2건', () => {
    // 김철수=5, 홍길동=6, 최지우=7
    const members = [5, 6, 7].map((id) => ({ id }));
    const expenses = [
      expense(1, 5, 50000, [5, 6, 7]), // 점심: 16666 / 16667 / 16667
      expense(2, 6, 10000, [6, 7]), //    택시: 5000 / 5000
    ];
    // 잔액: 김철수 +33,334 / 홍길동 -11,667 / 최지우 -21,667
    const result = calculateSettlements(members, expenses);
    expect(result).toEqual([
      { from: 7, to: 5, amount: 21667 },
      { from: 6, to: 5, amount: 11667 },
    ]);
    expectSettled(members, expenses, result);
  });

  it('결제자가 참여자에서 빠진 지출 (대신 결제만 함)', () => {
    // 1번이 9,000원을 결제했지만 2·3번만 먹음
    const members = [1, 2, 3].map((id) => ({ id }));
    const expenses = [expense(1, 1, 9000, [2, 3])];
    const result = calculateSettlements(members, expenses);
    expect(result).toEqual([
      { from: 2, to: 1, amount: 4500 },
      { from: 3, to: 1, amount: 4500 },
    ]);
    expectSettled(members, expenses, result);
  });

  it('참여하지 않은 멤버는 송금에 나오지 않는다', () => {
    const members = [1, 2, 3, 4].map((id) => ({ id }));
    const expenses = [expense(1, 1, 20000, [1, 2])]; // 3·4번은 미참여
    const result = calculateSettlements(members, expenses);
    expect(result).toEqual([{ from: 2, to: 1, amount: 10000 }]);
  });

  it('반올림 후 합계 불일치 케이스(100원 / 3명)도 잔액이 정확히 0이 된다', () => {
    // 33.33 → 33 × 3 = 99 → 1원 부족 → [34, 33, 33]
    const members = [1, 2, 3].map((id) => ({ id }));
    const expenses = [expense(1, 1, 100, [1, 2, 3])];
    const result = calculateSettlements(members, expenses);
    expect(result).toEqual([
      { from: 2, to: 1, amount: 33 },
      { from: 3, to: 1, amount: 33 },
    ]);
    expectSettled(members, expenses, result);
  });

  it('금액이 딱 맞는 쌍을 먼저 정리해 송금 횟수를 줄인다', () => {
    // 잔액: A(1) +70, B(2) +30 / C(3) -50, D(4) -30, E(5) -20
    // 단순 그리디는 4건, 정확히 맞는 쌍(D→B 30)을 먼저 정리하면 3건
    const members = [1, 2, 3, 4, 5].map((id) => ({ id }));
    const expenses = [
      { id: 1, amount: 70, payer_member_id: 1, splits: [{ member_id: 3, share_amount: 50 }, { member_id: 5, share_amount: 20 }] },
      { id: 2, amount: 30, payer_member_id: 2, splits: [{ member_id: 4, share_amount: 30 }] },
    ];
    const result = calculateSettlements(members, expenses);
    expect(result).toEqual([
      { from: 4, to: 2, amount: 30 },
      { from: 3, to: 1, amount: 50 },
      { from: 5, to: 1, amount: 20 },
    ]);
    expectSettled(members, expenses, result);
  });

  it('여러 명이 결제한 복잡한 경우에도 송금 수는 (사람 수 - 1) 이하이고 잔액이 0이 된다', () => {
    const members = [1, 2, 3, 4, 5, 6].map((id) => ({ id }));
    const all = [1, 2, 3, 4, 5, 6];
    const expenses = [
      expense(1, 1, 87650, all),
      expense(2, 2, 33333, [1, 2, 3]),
      expense(3, 4, 12001, [4, 5, 6]),
      expense(4, 6, 99999, [2, 3, 4, 5, 6]),
    ];
    const result = calculateSettlements(members, expenses);
    expect(result.length).toBeLessThanOrEqual(members.length - 1);
    expectSettled(members, expenses, result);
  });

  it('같은 입력이면 항상 같은 결과, 입력 배열은 수정하지 않는다', () => {
    const members = [1, 2, 3, 4].map((id) => ({ id }));
    const expenses = [expense(1, 1, 120000, [1, 2, 3, 4]), expense(2, 2, 30000, [1, 2, 3, 4])];
    const snapshot = JSON.stringify({ members, expenses });
    const first = calculateSettlements(members, expenses);
    const second = calculateSettlements(members, expenses);
    expect(second).toEqual(first);
    expect(JSON.stringify({ members, expenses })).toBe(snapshot);
  });
});

// server/db/seed.sql 에 손으로 적어 둔 분배(expense_splits)·정산(settlements) 값이
// 현재 splitEvenly / calculateSettlements 규칙과 같은지 확인 (규칙을 바꾸면 seed.sql 도 고치라는 신호)
describe('server/db/seed.sql 과 현재 규칙 일치', () => {
  const seed = readFileSync(fileURLToPath(new URL('../../../server/db/seed.sql', import.meta.url)), 'utf8');

  // "INSERT INTO <table> (...) VALUES (...), (...);" 의 각 행을 값 배열로 꺼낸다
  const rowsOf = (table) => {
    const block = seed.match(new RegExp(`INSERT INTO \`?${table}\`? \\(([^)]*)\\) VALUES([\\s\\S]*?);`));
    const columns = block[1].split(',').map((c) => c.trim());
    return [...block[2].matchAll(/\(([^()]*)\)/g)].map((m) => {
      const values = m[1].split(',').map((v) => v.trim().replace(/^'(.*)'$/, '$1'));
      const row = Object.fromEntries(columns.map((c, i) => [c, values[i]]));
      for (const key of Object.keys(row)) if (/^-?\d+$/.test(row[key])) row[key] = Number(row[key]);
      return row;
    });
  };
  const members = rowsOf('group_members');
  const expenses = rowsOf('expenses');
  const splits = rowsOf('expense_splits');
  const settlements = rowsOf('settlements');

  it('시드 지출의 분배 금액이 splitEvenly 결과와 같다', () => {
    for (const e of expenses) {
      const saved = splits.filter((s) => s.expense_id === e.id);
      const expected = splitEvenly(e.amount, saved.map((s) => s.member_id));
      expect(saved.map((s) => s.share_amount), e.title).toEqual(expected.map((s) => s.share_amount));
    }
  });

  it('시드 정산 행이 calculateSettlements 결과와 같다 (시나리오 A·B)', () => {
    for (const groupId of [...new Set(expenses.map((e) => e.group_id))]) {
      const groupMembers = members.filter((m) => m.group_id === groupId);
      const groupExpenses = expenses
        .filter((e) => e.group_id === groupId)
        .map((e) => ({ ...e, splits: splits.filter((s) => s.expense_id === e.id) }));
      const expected = calculateSettlements(groupMembers, groupExpenses);
      const saved = settlements
        .filter((s) => s.group_id === groupId)
        .map((s) => ({ from: s.from_member_id, to: s.to_member_id, amount: s.amount }));
      expect(saved, `group ${groupId}`).toEqual(expected);
    }
    // 시나리오 B 점심(50,000원 / 3명) 분배가 반올림 규칙인지도 직접 확인
    const lunch = expenses.find((e) => e.title === '점심 식사');
    expect(splits.filter((s) => s.expense_id === lunch.id).map((s) => s.share_amount)).toEqual([16666, 16667, 16667]);
  });
});
