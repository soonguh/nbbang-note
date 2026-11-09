// Mock 시드 데이터
// 테스트 시나리오와 기대 결과는 /client/README-test.md 참고.
// expense_splits는 splitEvenly(USER-2) 결과로 만들기 때문에,
// USER-2를 구현한 뒤 [내 정보 > Mock 데이터 초기화]를 누르면 새 규칙으로 다시 계산된다.
import { splitEvenly } from '../utils/settle.js';

export function buildSeed() {
  const db = {
    users: [],
    groups: [],
    group_members: [],
    expenses: [],
    expense_splits: [],
    settlements: [],
    _seq: {},
  };
  const id = (table) => {
    db._seq[table] = (db._seq[table] || 0) + 1;
    return db._seq[table];
  };
  const created_at = '2026-11-01 12:00:00';

  // ----- users -----
  // Mock 인증: 시드 계정은 password_hash가 null 이라 비밀번호를 아무거나 입력해도 로그인된다.
  const addUser = (email, name, bank_name = null, account_number = null) => {
    const user = { id: id('users'), email, password_hash: null, name, bank_name, account_number, created_at };
    db.users.push(user);
    return user;
  };
  const hong = addUser('demo@example.com', '홍길동', '카카오뱅크', '3333-01-1234567');
  const kim = addUser('kim@example.com', '김철수', '국민은행', '123456-01-234567');

  // ----- groups + group_members -----
  const addGroup = (name, meeting_date, owner, memberDefs) => {
    const group = { id: id('groups'), name, meeting_date, owner_id: owner.id, created_at };
    db.groups.push(group);
    const members = memberDefs.map(([display_name, user]) => {
      const m = { id: id('group_members'), group_id: group.id, user_id: user ? user.id : null, display_name };
      db.group_members.push(m);
      return m;
    });
    return { group, members };
  };

  const addExpense = (group, payer, title, category, amount, participants) => {
    const expense = {
      id: id('expenses'),
      group_id: group.id,
      payer_member_id: payer.id,
      title,
      category,
      amount,
      created_at,
    };
    db.expenses.push(expense);
    splitEvenly(amount, participants.map((p) => p.id)).forEach((s) => {
      db.expense_splits.push({ id: id('expense_splits'), expense_id: expense.id, member_id: s.member_id, share_amount: s.share_amount });
    });
  };

  // 시나리오 A: 홍길동(로그인 사용자)이 총무인 모임, 4명 균등 분배
  {
    const { group, members } = addGroup('강원도 MT', '2026-11-07', hong, [
      ['홍길동', hong],
      ['김철수', kim],
      ['이영희', null],
      ['박민수', null],
    ]);
    const [mHong, mKim] = members;
    addExpense(group, mHong, '1차 삼겹살', '식비', 120000, members);
    addExpense(group, mKim, '2차 카페', '식비', 30000, members);
  }

  // 시나리오 B: 김철수가 총무이고 홍길동은 참여자인 모임, 1원 단위 나머지 발생
  {
    const { group, members } = addGroup('금요일 점심', '2026-11-06', kim, [
      ['김철수', kim],
      ['홍길동', hong],
      ['최지우', null],
    ]);
    const [mKim, mHong, mChoi] = members;
    addExpense(group, mKim, '점심 식사', '식비', 50000, members);
    addExpense(group, mHong, '택시', '교통', 10000, [mHong, mChoi]);
  }

  return db;
}
