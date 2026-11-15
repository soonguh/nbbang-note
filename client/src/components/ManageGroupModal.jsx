// 모임 관리 모달 (총무 전용): 이름·날짜 수정, 멤버 추가/제외, 모임 삭제
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { addMember, deleteGroup, removeMember, renameMember, updateGroup } from '../api/groups.js';
import { invalidateGroup } from '../hooks/invalidate.js';
import Modal from './Modal.jsx';
import MemberNameInput from './MemberNameInput.jsx';
import { MemberChip } from './MemberChips.jsx';
import { Button, Chips, ErrorText, Input, Label, Muted, Row, Stack } from './ui.js';

const Section = styled.div`
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
  h3 {
    font-size: 15px;
    margin-bottom: 10px;
  }
`;

// 칩 자리에 나타나는 이름 수정 입력창
const RenameForm = styled.form`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  input {
    width: 120px;
    padding: 4px 10px;
    font-size: 13px;
  }
`;

export default function ManageGroupModal({ group, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(group.name);
  const [meetingDate, setMeetingDate] = useState(group.meeting_date ?? '');
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
  // 여러 이름을 순서대로 한 명씩 추가 (API는 한 번에 한 명)
  // 중간에 실패하면 거기서 멈추고 오류를 MemberNameInput 에 전달한다
  const addMembers = async (names) => {
    try {
      for (const n of names) {
        await addMember(group.id, n);
      }
    } finally {
      refresh();
    }
  };
  // 멤버 이름 수정: renaming = { id, value } (null 이면 수정 중 아님)
  const [renaming, setRenaming] = useState(null);
  const renameMut = useMutation({
    mutationFn: ({ id, value }) => renameMember(group.id, id, value),
    onSuccess: () => {
      setError('');
      setRenaming(null);
      refresh();
    },
    onError,
  });
  const submitRename = (e) => {
    e.preventDefault();
    const value = renaming.value.trim();
    const current = group.members.find((m) => m.id === renaming.id)?.display_name;
    if (!value || value === current) return setRenaming(null); // 비었거나 그대로면 취소
    renameMut.mutate({ id: renaming.id, value });
  };

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
        <Stack $gap={12}>
          <Chips>
            {group.members.map((m) => {
              const isOwner = m.user_id === group.owner_id;
              if (renaming?.id === m.id) {
                return (
                  <RenameForm key={m.id} onSubmit={submitRename}>
                    <Input
                      value={renaming.value}
                      onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setRenaming(null))}
                      maxLength={50}
                      aria-label={`${m.display_name} 새 이름`}
                      autoFocus
                    />
                    <Button type="submit" $small disabled={renameMut.isPending}>
                      저장
                    </Button>
                    <Button $small $variant="ghost" onClick={() => setRenaming(null)}>
                      취소
                    </Button>
                  </RenameForm>
                );
              }
              return (
                <MemberChip
                  key={m.id}
                  name={m.display_name}
                  tag={isOwner ? '총무' : m.user_id ? null : '비회원'}
                  muted={!isOwner && !m.user_id}
                  disabled={removeMut.isPending || renameMut.isPending}
                  onEdit={() => setRenaming({ id: m.id, value: m.display_name })}
                  // 총무는 제외할 수 없으니 X 버튼 없음
                  onRemove={
                    isOwner
                      ? undefined
                      : () => window.confirm(`${m.display_name} 님을 모임에서 제외할까요?`) && removeMut.mutate(m.id)
                  }
                />
              );
            })}
          </Chips>
          <MemberNameInput
            existingNames={group.members.map((m) => m.display_name)}
            onAdd={addMembers}
            placeholder="추가할 이름 (쉼표로 여러 명)"
          />
        </Stack>
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
