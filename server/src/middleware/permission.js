// 모임 접근 권한
import { HttpError } from './errorHandler.js';

/**
 * 모임을 수정할 수 있는지 (모임·멤버 수정/삭제, 지출 등록·수정·삭제, 입금 처리)
 * @param {{ id: number }} user   로그인한 사용자 (req.user)
 * @param {{ id: number, owner_id: number }} group  `groups` 행
 * @returns {boolean}
 */
export function canEditGroup(user, group) {
  // ====== TODO(USER-6): 모임 수정 권한 규칙 작성 (구현 완료) ======
  // 입력: user  = { id }                        로그인한 사용자 (JWT에서 꺼낸 users.id)
  //       group = { id, name, owner_id, ... }   `groups` 테이블 행
  // 출력: true(수정 가능) / false(불가 → 403 응답)
  // 규칙: 총무(owner_id)만 수정 가능. 회원 멤버는 조회만 가능 (조회 권한은 loadGroupForUser 가 따로 확인)
  //       이유: client 화면도 총무에게만 수정·삭제·입금 토글 버튼을 보여 주므로 서버 규칙을 같게 맞춘다
  //             (서버가 더 넓게 허용하면 화면에 없는 기능을 API로 우회해 쓸 수 있게 됨)
  // 방어: user·group 이 없거나 id 가 양의 정수가 아니면 false, 숫자로 바꿔 비교 ('1' 과 1 비교 문제 방지)
  if (!user || !group) return false;
  const userId = Number(user.id);
  const ownerId = Number(group.owner_id);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(ownerId)) return false;
  return userId === ownerId;
  // ====== END TODO(USER-6) (구현 완료) ======
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
