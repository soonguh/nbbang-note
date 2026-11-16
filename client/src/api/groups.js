// 모임 / 멤버 API (server 연동)
//   GET    /api/groups                        → { owned, joined }  (화면에는 하나의 배열로 합쳐서 반환)
//   GET    /api/groups/:id                    → group
//   POST   /api/groups                        → group    body: { name, meeting_date, member_names: [] }
//   PATCH  /api/groups/:id                    → group    body: { name, meeting_date }
//   DELETE /api/groups/:id                    → { id }
//   POST   /api/groups/:id/members            → member   body: { display_name } | { email[, link_member_id] }
//   GET    /api/users/lookup?email=           → { id, name, email }
//   PATCH  /api/groups/:id/members/:memberId  → member   body: { display_name }
//   DELETE /api/groups/:id/members/:memberId  → { id }
// group = { ...groups 행, owner_name, members: [group_members 행], total_amount }
import { del, get, patch, post } from './http.js';

// 화면(Groups.jsx)은 owner_id 로 "내가 총무인 모임 / 참여 중인 모임"을 나누므로 배열 하나로 돌려준다
export async function getGroups() {
  const { owned = [], joined = [] } = await get('/groups');
  return [...owned, ...joined];
}

export function getGroup(groupId) {
  return get(`/groups/${groupId}`);
}

// member_names: 비회원(이름만), member_emails: 가입한 회원(이메일)
export function createGroup({ name, meeting_date, member_names = [], member_emails = [] }) {
  return post('/groups', { name, meeting_date, member_names, member_emails });
}

// 가입한 회원 찾기 → { id, name, email } (없으면 404 ApiError)
export function lookupUser(email) {
  return get(`/users/lookup?email=${encodeURIComponent(email)}`);
}

export function updateGroup(groupId, { name, meeting_date }) {
  return patch(`/groups/${groupId}`, { name, meeting_date });
}

export function deleteGroup(groupId) {
  return del(`/groups/${groupId}`);
}

export function addMember(groupId, name) {
  return post(`/groups/${groupId}/members`, { display_name: name });
}

// 가입한 회원을 회원 멤버로 추가. linkMemberId 를 주면 그 비회원 멤버를 이 회원과 연결
// 같은 이름의 비회원이 있으면 409 + error.data = { code: 'NAME_CONFLICT', member_id, member_name }
export function addMemberByEmail(groupId, email, linkMemberId) {
  return post(`/groups/${groupId}/members`, linkMemberId ? { email, link_member_id: linkMemberId } : { email });
}

export function renameMember(groupId, memberId, name) {
  return patch(`/groups/${groupId}/members/${memberId}`, { display_name: name });
}

export function removeMember(groupId, memberId) {
  return del(`/groups/${groupId}/members/${memberId}`);
}
