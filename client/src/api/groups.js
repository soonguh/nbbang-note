// 모임 / 멤버 API (Mock)
// 2단계 교체 대상 엔드포인트(예정):
//   GET    /api/groups                         → [group]  (group = { ...groups 행, owner_name, members: [group_members 행] })
//   GET    /api/groups/:id                     → group
//   POST   /api/groups                         → group    body: { name, meeting_date, member_names: [] }
//   PUT    /api/groups/:id                     → group    body: { name, meeting_date }
//   DELETE /api/groups/:id                     → { id }
//   POST   /api/groups/:id/members             → member   body: { display_name }
//   DELETE /api/groups/:id/members/:memberId   → { id }
import { ApiError, delay, loadDb, nextId, now, saveDb } from '../mock/db.js';
import { requireUser } from './auth.js';

// 내가 볼 수 있는 모임인지 확인 (총무이거나 멤버로 연결된 경우)
export function findAccessibleGroup(db, groupId, user, { ownerOnly = false } = {}) {
  const group = db.groups.find((g) => g.id === Number(groupId));
  if (!group) throw new ApiError('모임을 찾을 수 없습니다.', 404);
  const isOwner = group.owner_id === user.id;
  const isMember = db.group_members.some((m) => m.group_id === group.id && m.user_id === user.id);
  if (!isOwner && !isMember) throw new ApiError('이 모임에 접근할 권한이 없습니다.', 403);
  if (ownerOnly && !isOwner) throw new ApiError('총무만 할 수 있는 작업입니다.', 403);
  return group;
}

function withDetail(db, group) {
  const owner = db.users.find((u) => u.id === group.owner_id);
  const members = db.group_members.filter((m) => m.group_id === group.id);
  const total_amount = db.expenses.filter((e) => e.group_id === group.id).reduce((sum, e) => sum + e.amount, 0);
  return { ...group, owner_name: owner?.name ?? '', members, total_amount };
}

function cleanName(name) {
  return (name || '').trim();
}

export async function getGroups() {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const myGroupIds = new Set(db.group_members.filter((m) => m.user_id === user.id).map((m) => m.group_id));
  return db.groups
    .filter((g) => g.owner_id === user.id || myGroupIds.has(g.id))
    .sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || '') || b.id - a.id)
    .map((g) => withDetail(db, g));
}

export async function getGroup(groupId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  return withDetail(db, findAccessibleGroup(db, groupId, user));
}

export async function createGroup({ name, meeting_date, member_names = [] }) {
  await delay();
  name = cleanName(name);
  if (!name) throw new ApiError('모임 이름을 입력해 주세요.');
  const db = loadDb();
  const user = requireUser(db);
  const group = { id: nextId(db, 'groups'), name, meeting_date: meeting_date || null, owner_id: user.id, created_at: now() };
  db.groups.push(group);
  // 총무 본인은 회원 멤버로 자동 추가
  db.group_members.push({ id: nextId(db, 'group_members'), group_id: group.id, user_id: user.id, display_name: user.name });
  // 나머지는 비회원 멤버(user_id = null), 이름 중복은 건너뛴다
  const used = new Set([user.name]);
  member_names.map(cleanName).forEach((display_name) => {
    if (!display_name || used.has(display_name)) return;
    used.add(display_name);
    db.group_members.push({ id: nextId(db, 'group_members'), group_id: group.id, user_id: null, display_name });
  });
  saveDb(db);
  return withDetail(db, group);
}

export async function updateGroup(groupId, { name, meeting_date }) {
  await delay();
  name = cleanName(name);
  if (!name) throw new ApiError('모임 이름을 입력해 주세요.');
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user, { ownerOnly: true });
  group.name = name;
  group.meeting_date = meeting_date || null;
  saveDb(db);
  return withDetail(db, group);
}

export async function deleteGroup(groupId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user, { ownerOnly: true });
  // ON DELETE CASCADE 흉내
  const expenseIds = new Set(db.expenses.filter((e) => e.group_id === group.id).map((e) => e.id));
  db.expense_splits = db.expense_splits.filter((s) => !expenseIds.has(s.expense_id));
  db.expenses = db.expenses.filter((e) => e.group_id !== group.id);
  db.settlements = db.settlements.filter((s) => s.group_id !== group.id);
  db.group_members = db.group_members.filter((m) => m.group_id !== group.id);
  db.groups = db.groups.filter((g) => g.id !== group.id);
  saveDb(db);
  return { id: group.id };
}

export async function addMember(groupId, name) {
  await delay();
  const display_name = cleanName(name);
  if (!display_name) throw new ApiError('멤버 이름을 입력해 주세요.');
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user, { ownerOnly: true });
  if (db.group_members.some((m) => m.group_id === group.id && m.display_name === display_name)) {
    throw new ApiError('같은 이름의 멤버가 이미 있습니다.', 409);
  }
  const member = { id: nextId(db, 'group_members'), group_id: group.id, user_id: null, display_name };
  db.group_members.push(member);
  saveDb(db);
  return member;
}

export async function removeMember(groupId, memberId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user, { ownerOnly: true });
  const member = db.group_members.find((m) => m.id === Number(memberId) && m.group_id === group.id);
  if (!member) throw new ApiError('멤버를 찾을 수 없습니다.', 404);
  if (member.user_id === group.owner_id) throw new ApiError('총무는 모임에서 제외할 수 없습니다.');
  const groupExpenseIds = new Set(db.expenses.filter((e) => e.group_id === group.id).map((e) => e.id));
  const used =
    db.expenses.some((e) => e.payer_member_id === member.id) ||
    db.expense_splits.some((s) => s.member_id === member.id && groupExpenseIds.has(s.expense_id));
  if (used) throw new ApiError('지출 내역에 포함된 멤버는 제외할 수 없습니다. 관련 지출을 먼저 수정해 주세요.', 409);
  db.group_members = db.group_members.filter((m) => m.id !== member.id);
  db.settlements = db.settlements.filter((s) => s.from_member_id !== member.id && s.to_member_id !== member.id);
  saveDb(db);
  return { id: member.id };
}
