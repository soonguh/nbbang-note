// 모임 만들기 모달: 이름, 날짜, 멤버 이름(비회원도 이름만으로 추가)
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { IoClose } from 'react-icons/io5';
import { createGroup } from '../api/groups.js';
import { useMe } from '../hooks/useMe.js';
import Modal from './Modal.jsx';
import { Button, ErrorText, Input, Label, Muted, Row, Stack } from './ui.js';

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 12px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  button {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    line-height: 0;
    padding: 2px;
  }
`;

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
  const [memberInput, setMemberInput] = useState('');
  const [memberNames, setMemberNames] = useState([]);
  const [localError, setLocalError] = useState('');

  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onClose();
      navigate(`/groups/${group.id}`);
    },
  });

  const addName = () => {
    const value = memberInput.trim();
    if (!value) return;
    if (value === me?.name || memberNames.includes(value)) {
      setLocalError('이미 추가된 이름입니다.');
      return;
    }
    setMemberNames([...memberNames, value]);
    setMemberInput('');
    setLocalError('');
  };

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate({ name, meeting_date: meetingDate, member_names: memberNames });
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
            <Row>
              <Input
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  // 한글 조합 중 Enter는 무시
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addName();
                  }
                }}
                placeholder="이름 입력 후 Enter"
                aria-label="멤버 이름"
              />
              <Button $variant="secondary" onClick={addName}>
                추가
              </Button>
            </Row>
            <Muted $size={13}>회원이 아니어도 이름만으로 추가할 수 있어요. 총무({me?.name})는 자동으로 포함됩니다.</Muted>
          </Label>
          <Chips>
            <Chip>{me?.name} (총무)</Chip>
            {memberNames.map((n) => (
              <Chip key={n}>
                {n}
                <button type="button" aria-label={`${n} 빼기`} onClick={() => setMemberNames(memberNames.filter((x) => x !== n))}>
                  <IoClose />
                </button>
              </Chip>
            ))}
          </Chips>
          {(localError || mutation.error) && <ErrorText>{localError || mutation.error.message}</ErrorText>}
          <Row $justify="flex-end">
            <Button $variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '만드는 중...' : '만들기'}
            </Button>
          </Row>
        </Stack>
      </form>
    </Modal>
  );
}
