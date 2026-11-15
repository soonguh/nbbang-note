// 모임 접근 권한
import { HttpError } from './errorHandler.js';

/**
 * 모임을 수정할 수 있는지 (모임·멤버 수정/삭제, 지출 등록·수정·삭제, 입금 처리)
 * @param {{ id: number }} user   로그인한 사용자 (req.user)
 * @param {{ id: number, owner_id: number }} group  `groups` 행
 * @returns {boolean}
 */
export function canEditGroup(user, group) {
  // ====== TODO(USER-6): 모임 수정 권한 규칙 작성 ======
  // 입력: user  = { id }                        로그인한 사용자 (JWT에서 꺼낸 users.id)
  //       group = { id, name, owner_id, ... }   `groups` 테이블 행
  // 출력: true(수정 가능) / false(불가 → 403 응답)
  // 힌트: - 기본 규칙은 "총무(owner_id)만 수정 가능"
  //       - 규칙을 넓히고 싶다면 예) 회원으로 연결된 멤버(group_members.user_id = user.id)도 지출 등록 허용 등
  //         단, 이 함수는 동기 함수라 DB를 조회할 수 없으니, 필요한 정보(예: group.is_member)를
  //         loadGroupForUser 에서 미리 담아 넘기는 방식을 생각해 볼 것
  //       - user 나 group 이 없으면 false
  //       - owner_id 와 user.id 는 둘 다 숫자인지 확인 (문자열 '1' 과 숫자 1 비교 주의)
  // ====== END TODO(USER-6) ======
  return Boolean(user && group) && group.owner_id === user.id;
}

/**
 * 모임을 불러오고 "볼 수 있는지" 확인한다. 총무이거나 회원으로 연결된 멤버면 볼 수 있다.
 * @returns {Promise<object>} `groups` 행 + is_owner, is_member
 */
export async function loadGroupForUser(db, groupId, user) {
  const id = Number(groupId);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, '모임을 찾을 수 없습니다.');
  const [rows] = await db.execute(
    `SELECT g.*,
            EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = ?) AS is_member
       FROM \`groups\` g
      WHERE g.id = ?`,
    [user.id, id],
  );
  const group = rows[0];
  if (!group) throw new HttpError(404, '모임을 찾을 수 없습니다.');
  group.is_owner = group.owner_id === user.id;
  group.is_member = Boolean(group.is_member);
  if (!group.is_owner && !group.is_member) throw new HttpError(403, '이 모임에 접근할 권한이 없습니다.');
  return group;
}

/** 볼 수 있고 + 수정 권한(canEditGroup)까지 있는지 확인 */
export async function loadEditableGroup(db, groupId, user) {
  const group = await loadGroupForUser(db, groupId, user);
  if (!canEditGroup(user, group)) throw new HttpError(403, '총무만 할 수 있는 작업입니다.');
  return group;
}
