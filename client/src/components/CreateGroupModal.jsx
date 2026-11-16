// 모임 만들기 모달: 이름, 날짜, 멤버
// - 이름만 입력 → 비회원 멤버
// - 이메일 입력 → 가입한 회원을 찾아 회원 멤버로 (회원은 자기 "참여 중인 모임"에서 이 모임을 볼 수 있음)
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createGroup, lookupUser } from '../api/groups.js';
import { useMe } from '../hooks/useMe.js';
import { parseMemberNames, splitEmails } from '../utils/memberNames.js';
import Modal from './Modal.jsx';
import MemberNameInput from './MemberNameInput.jsx';
import { MemberChip } from './MemberChips.jsx';
import { Button, Chips, ErrorText, Input, Label, Muted, Row, Stack } from './ui.js';

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function CreateGroupModal({ onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [name, setName] = useState('');
  const [meetingDate, setMeetingDate] = useState(today());
  const [memberNames, setMemberNames] = useState([]); // 비회원 이름
  const [memberUsers, setMemberUsers] = useState([]); // 회원 [{ id, name, email }]
  const [memberInput, setMemberInput] = useState(''); // [추가]를 누르기 전 입력칸에 남아 있는 글자
  const [notMembers, setNotMembers] = useState([]); // 조회해 보니 가입한 회원이 아닌 이메일 (함께 추가 대상에서 제외)

  // 중복 검사 대상: 총무 이름 + 비회원 이름 + 회원 이메일·이름
  const existing = [me?.name ?? '', ...memberNames, ...memberUsers.flatMap((u) => [u.email, u.name])];
  // 입력칸에 남아 있는 이름·이메일 → [만들기] 때 함께 추가 (이메일은 서버가 회원인지 확인)
  const parsed = splitEmails(parseMemberNames(memberInput, existing).names);
  const pending = { names: parsed.names, emails: parsed.emails.filter((e) => !notMembers.includes(e)) };
  const totalCount = memberNames.length + memberUsers.length + pending.names.length + pending.emails.length + 1; // +1: 총무

  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onClose();
      navigate(`/groups/${group.id}`);
    },
  });

  // [추가] / Enter: 이메일은 회원인지 조회해서 회원 칩으로, 나머지는 비회원 칩으로
  const addTokens = async (tokens) => {
    const { emails, names: newNames } = splitEmails(tokens);
    // 현재 목록을 복사해 검사·수정한 뒤 마지막에 한 번에 반영
    let names = [...memberNames, ...newNames];
    const users = [...memberUsers];
    const failed = []; // 안내 문구
    const failedEmails = []; // 입력칸에 다시 남길 이메일 (고쳐서 다시 추가할 수 있게)

    for (const email of emails) {
      try {
        const user = await lookupUser(email);
        if (user.id === me?.id) failed.push(`본인(${email})은 총무로 자동 포함돼요`);
        else if (users.some((u) => u.id === user.id)) failed.push(`이미 추가한 회원이에요: ${user.name}`);
        else if (user.name === me?.name) failed.push(`총무와 이름이 같은 회원은 모임을 만든 뒤 [모임 관리]에서 추가해 주세요: ${user.name}`);
        else if (users.some((u) => u.name === user.name)) failed.push(`같은 이름의 회원이 이미 있어요: ${user.name}`);
        else {
          users.push(user);
          // 같은 이름의 비회원 칩이 있으면 회원으로 바꿔 끼운다 (아직 모임을 만들기 전이라 기록이 없음)
          names = names.filter((n) => n !== user.name);
        }
      } catch (e) {
        failed.push(e.status === 404 ? `가입한 회원이 아니에요: ${email}` : e.message);
        failedEmails.push(email);
        if (e.status === 404) setNotMembers((prev) => (prev.includes(email) ? prev : [...prev, email]));
      }
    }
    setMemberNames(names);
    setMemberUsers(users);
    if (failed.length > 0) throw Object.assign(new Error(failed.join(' / ')), { remaining: failedEmails.join(', ') });
  };

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate({
      name,
      meeting_date: meetingDate,
      member_names: [...memberNames, ...pending.names],
      member_emails: [...memberUsers.map((u) => u.email), ...pending.emails],
    });
  };

  const pendingLabels = [...pending.names, ...pending.emails];

  return (
    <Modal title="모임 만들기" onClose={onClose}>
      <form onSubmit={submit}>
        <Stack $gap={14}>
          <Label>
            모임 이름
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 강원도 MT" autoFocus />
          </Label>
          <Label>
            날짜
            <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </Label>
          <Label as="div">
            멤버
            <MemberNameInput
              existingNames={existing}
              onAdd={addTokens}
              value={memberInput}
              onValueChange={setMemberInput}
              placeholder="예) 김철수, 이영희, kim@example.com"
            />
            {pendingLabels.length > 0 && (
              <Muted $size={13}>[추가]를 누르지 않아도 {pendingLabels.join(', ')} 은(는) 모임을 만들 때 함께 추가돼요.</Muted>
            )}
            <Muted $size={13}>
              이름을 넣으면 비회원으로, <b>가입한 회원의 이메일</b>을 넣으면 회원으로 추가돼요. 회원은 자기 "참여 중인 모임"에서 이 모임을 볼 수 있어요.
              쉼표로 여러 명을 한 번에 넣을 수 있고, 총무({me?.name})는 자동으로 포함됩니다.
            </Muted>
          </Label>
          <Chips aria-label={`멤버 ${memberNames.length + memberUsers.length + 1}명`}>
            <MemberChip name={me?.name} tag="총무" />
            {memberUsers.map((u) => (
              <MemberChip key={u.email} name={u.name} tag="회원" onRemove={() => setMemberUsers((prev) => prev.filter((x) => x.id !== u.id))} />
            ))}
            {memberNames.map((n) => (
              <MemberChip key={n} name={n} tag="비회원" muted onRemove={() => setMemberNames((prev) => prev.filter((x) => x !== n))} />
            ))}
          </Chips>
          {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
          <Row $justify="flex-end">
            <Button $variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '만드는 중...' : `만들기 (${totalCount}명)`}
            </Button>
          </Row>
        </Stack>
      </form>
    </Modal>
  );
}
