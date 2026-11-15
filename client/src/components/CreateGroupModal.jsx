// 모임 만들기 모달: 이름, 날짜, 멤버 이름(비회원도 이름만으로 추가)
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../api/groups.js';
import { useMe } from '../hooks/useMe.js';
import { parseMemberNames } from '../utils/memberNames.js';
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
  const [memberNames, setMemberNames] = useState([]);
  const [memberInput, setMemberInput] = useState(''); // [추가]를 누르기 전 입력칸에 남아 있는 글자

  // 입력칸에 남아 있는 이름 (중복·빈 이름 제외) → [만들기] 때 함께 추가
  const pendingNames = parseMemberNames(memberInput, [me?.name ?? '', ...memberNames]).names;
  const totalCount = memberNames.length + pendingNames.length + 1; // +1: 총무

  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onClose();
      navigate(`/groups/${group.id}`);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate({ name, meeting_date: meetingDate, member_names: [...memberNames, ...pendingNames] });
  };

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
              // 총무 본인 이름도 중복 검사에 포함
              existingNames={[me?.name ?? '', ...memberNames]}
              onAdd={(names) => setMemberNames((prev) => [...prev, ...names])}
              value={memberInput}
              onValueChange={setMemberInput}
              placeholder="예) 김철수, 이영희, 박민수"
            />
            {pendingNames.length > 0 && (
              <Muted $size={13}>[추가]를 누르지 않아도 {pendingNames.join(', ')} 님은 모임을 만들 때 함께 추가돼요.</Muted>
            )}
            <Muted $size={13}>
              쉼표로 여러 명을 한 번에 넣을 수 있어요. 회원이 아니어도 이름만으로 추가돼요. 총무({me?.name})는 자동으로 포함됩니다.
            </Muted>
          </Label>
          <Chips aria-label={`멤버 ${memberNames.length + 1}명`}>
            <MemberChip name={me?.name} tag="총무" />
            {memberNames.map((n) => (
              <MemberChip key={n} name={n} onRemove={() => setMemberNames((prev) => prev.filter((x) => x !== n))} />
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
