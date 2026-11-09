// 모임 관리 모달 (총무 전용): 이름·날짜 수정, 멤버 추가/제외, 모임 삭제
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { addMember, deleteGroup, removeMember, updateGroup } from '../api/groups.js';
import { invalidateGroup } from '../hooks/invalidate.js';
import Modal from './Modal.jsx';
import { Badge, Button, ErrorText, Input, Label, Muted, Row, Stack } from './ui.js';

const Section = styled.div`
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
  h3 {
    font-size: 15px;
    margin-bottom: 10px;
  }
`;

const MemberList = styled.ul`
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  li span.name {
    flex: 1;
  }
`;

export default function ManageGroupModal({ group, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(group.name);
  const [meetingDate, setMeetingDate] = useState(group.meeting_date ?? '');
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const refresh = () => invalidateGroup(queryClient, group.id);
  const onError = (e) => setError(e.message);

  const updateMut = useMutation({
    mutationFn: () => updateGroup(group.id, { name, meeting_date: meetingDate }),
    onSuccess: () => {
      setError('');
      setSaved(true);
      refresh();
    },
    onError,
  });
  const addMut = useMutation({
    mutationFn: () => addMember(group.id, newMember),
    onSuccess: () => {
      setError('');
      setNewMember('');
      refresh();
    },
    onError,
  });
  const removeMut = useMutation({
    mutationFn: (memberId) => removeMember(group.id, memberId),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError,
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteGroup(group.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['group', group.id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onClose();
      navigate('/groups', { replace: true });
    },
    onError,
  });

  return (
    <Modal title="모임 관리" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMut.mutate();
        }}
      >
        <Stack $gap={12}>
          <Label>
            모임 이름
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </Label>
          <Label>
            날짜
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => {
                setMeetingDate(e.target.value);
                setSaved(false);
              }}
            />
          </Label>
          <Row $justify="flex-end">
            {saved && <Muted>저장했어요</Muted>}
            <Button type="submit" $small disabled={updateMut.isPending}>
              저장
            </Button>
          </Row>
        </Stack>
      </form>

      <Section>
        <h3>멤버 ({group.members.length}명)</h3>
        <MemberList>
          {group.members.map((m) => {
            const isOwner = m.user_id === group.owner_id;
            return (
              <li key={m.id}>
                <span className="name">{m.display_name}</span>
                {isOwner && <Badge>총무</Badge>}
                {!isOwner && !m.user_id && <Badge $tone="danger">비회원</Badge>}
                {!isOwner && (
                  <Button
                    $small
                    $variant="ghost"
                    disabled={removeMut.isPending}
                    onClick={() => window.confirm(`${m.display_name} 님을 모임에서 제외할까요?`) && removeMut.mutate(m.id)}
                  >
                    제외
                  </Button>
                )}
              </li>
            );
          })}
        </MemberList>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate();
          }}
        >
          <Row>
            <Input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="추가할 멤버 이름" aria-label="추가할 멤버 이름" />
            <Button type="submit" $variant="secondary" disabled={addMut.isPending || !newMember.trim()}>
              추가
            </Button>
          </Row>
        </form>
      </Section>

      {error && <ErrorText style={{ marginTop: 12 }}>{error}</ErrorText>}

      <Section>
        <Row $justify="space-between">
          <Muted>모임을 삭제하면 지출·정산 기록도 모두 지워집니다.</Muted>
          <Button
            $small
            $variant="danger"
            disabled={deleteMut.isPending}
            onClick={() => window.confirm(`'${group.name}' 모임을 삭제할까요?`) && deleteMut.mutate()}
          >
            모임 삭제
          </Button>
        </Row>
      </Section>
    </Modal>
  );
}
