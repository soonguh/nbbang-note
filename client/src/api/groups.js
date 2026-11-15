// 모임 / 멤버 API (server 연동)
//   GET    /api/groups                        → { owned, joined }  (화면에는 하나의 배열로 합쳐서 반환)
//   GET    /api/groups/:id                    → group
//   POST   /api/groups                        → group    body: { name, meeting_date, member_names: [] }
//   PATCH  /api/groups/:id                    → group    body: { name, meeting_date }
//   DELETE /api/groups/:id                    → { id }
//   POST   /api/groups/:id/members            → member   body: { display_name }
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

export function createGroup({ name, meeting_date, member_names = [] }) {
  return post('/groups', { name, meeting_date, member_names });
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

export function renameMember(groupId, memberId, name) {
  return patch(`/groups/${groupId}/members/${memberId}`, { display_name: name });
}

export function removeMember(groupId, memberId) {
  return del(`/groups/${groupId}/members/${memberId}`);
}
