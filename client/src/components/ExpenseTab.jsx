// 지출 탭: 목록 + 등록/수정/삭제 (수정 권한은 총무만)
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { IoAdd, IoClose, IoWarningOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import { deleteExpense, getExpenses } from '../api/expenses.js';
import { invalidateGroup } from '../hooks/invalidate.js';
import { CATEGORY_COLORS } from '../utils/constants.js';
import ExpenseFormModal from './ExpenseFormModal.jsx';
import { Button, Card, Empty, ErrorText, Muted, Row, Stack, won } from './ui.js';

const Item = styled(Card)`
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CategoryDot = styled.span`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: ${(p) => CATEGORY_COLORS[p.$category] ?? '#868e96'};
`;

// 지출 변경으로 입금 완료 정산이 다시 계산됐을 때의 안내
const Warning = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: #fff9db;
  border: 1px solid #ffe066;
  color: #7c5e00;
  font-size: 14px;
  line-height: 1.5;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
  p {
    flex: 1;
    margin: 0;
  }
  a {
    font-weight: 700;
    text-decoration: underline;
  }
  button {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    line-height: 0;
    padding: 2px;
  }
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  strong {
    display: block;
  }
`;

export default function ExpenseTab({ group, isOwner }) {
  const queryClient = useQueryClient();
  const { data: expenses, isLoading, error } = useQuery({
    queryKey: ['expenses', group.id],
    queryFn: () => getExpenses(group.id),
  });
  const [editing, setEditing] = useState(null); // null: 닫힘, 'new': 등록, expense 객체: 수정
  const [warning, setWarning] = useState(null); // 서버가 보낸 정산 재계산 안내

  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: (result) => {
      invalidateGroup(queryClient, group.id);
      setWarning(result?.warning ?? null);
    },
  });

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <Stack>
      <Row $justify="space-between">
        <Muted>
          총 {expenses?.length ?? 0}건 · <strong style={{ color: 'var(--text)' }}>{won(total)}</strong>
        </Muted>
        {isOwner && (
          <Button onClick={() => setEditing('new')}>
            <IoAdd /> 지출 등록
          </Button>
        )}
      </Row>

      {warning && (
        <Warning role="alert">
          <IoWarningOutline size={18} />
          <p>
            {warning} <Link to="?tab=settlement">정산 탭에서 확인</Link>
          </p>
          <button type="button" aria-label="안내 닫기" onClick={() => setWarning(null)}>
            <IoClose size={16} />
          </button>
        </Warning>
      )}
      {isLoading && <Empty>불러오는 중...</Empty>}
      {error && <ErrorText>{error.message}</ErrorText>}
      {deleteMut.error && <ErrorText>{deleteMut.error.message}</ErrorText>}
      {expenses?.length === 0 && (
        <Card>
          <Empty>등록된 지출이 없어요.</Empty>
        </Card>
      )}

      {expenses?.map((e) => (
        <Item key={e.id}>
          <CategoryDot $category={e.category}>{e.category}</CategoryDot>
          <Info>
            <strong>{e.title}</strong>
            <Muted $size={13}>
              {e.payer_name} 결제 · {e.splits.length === group.members.length ? '전원' : e.splits.map((s) => s.display_name).join(', ')} 참여
            </Muted>
          </Info>
          <Stack $gap={4} style={{ alignItems: 'flex-end' }}>
            <strong>{won(e.amount)}</strong>
            {isOwner && (
              <Row $gap={2}>
                <Button $small $variant="ghost" onClick={() => setEditing(e)}>
                  수정
                </Button>
                <Button
                  $small
                  $variant="ghost"
                  disabled={deleteMut.isPending}
                  onClick={() => window.confirm(`'${e.title}' 지출을 삭제할까요?`) && deleteMut.mutate(e.id)}
                >
                  삭제
                </Button>
              </Row>
            )}
          </Stack>
        </Item>
      ))}

      {editing && (
        <ExpenseFormModal
          group={group}
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={setWarning}
        />
      )}
    </Stack>
  );
}
