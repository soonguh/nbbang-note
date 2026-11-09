// 정산 탭: 멤버별 요약 + 송금 목록 + 입금 현황
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { IoCopyOutline } from 'react-icons/io5';
import { getSettlement, markPaid } from '../api/settlements.js';
import { buildTransferMessage } from '../utils/message.js';
import { copyText } from '../utils/clipboard.js';
import SettlementCard from './SettlementCard.jsx';
import { Button, Card, Empty, ErrorText, Muted, Row, Stack, won } from './ui.js';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  th,
  td {
    padding: 8px 6px;
    text-align: right;
    border-bottom: 1px solid var(--border);
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  th {
    color: var(--text-sub);
    font-weight: 600;
  }
  tr:last-child td {
    border-bottom: 0;
  }
`;

const Amount = styled.span`
  font-weight: 700;
  color: ${(p) => (p.$value > 0 ? 'var(--primary)' : p.$value < 0 ? 'var(--danger)' : 'var(--text-sub)')};
`;

const Progress = styled.div`
  height: 8px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
  div {
    height: 100%;
    background: var(--success);
    transition: width 0.3s;
  }
`;

export default function SettlementTab({ group, isOwner }) {
  const queryClient = useQueryClient();
  const queryKey = ['settlement', group.id];
  const { data, isLoading, error } = useQuery({ queryKey, queryFn: () => getSettlement(group.id) });
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleMut = useMutation({
    mutationFn: (s) => markPaid(s.id, !s.is_paid),
    onSuccess: (updated) => {
      // 응답으로 받은 행만 바꿔 끼운다 (전체 재계산 없이 즉시 반영)
      queryClient.setQueryData(queryKey, (old) =>
        old ? { ...old, settlements: old.settlements.map((s) => (s.id === updated.id ? updated : s)) } : old,
      );
    },
  });

  if (isLoading) return <Empty>불러오는 중...</Empty>;
  if (error) return <ErrorText>{error.message}</ErrorText>;

  const { balances, settlements } = data;
  const paidCount = settlements.filter((s) => s.is_paid).length;
  const unpaidAmount = settlements.filter((s) => !s.is_paid).reduce((sum, s) => sum + s.amount, 0);

  const copyAll = async () => {
    const text = settlements.map((s) => buildTransferMessage(group, s, s.to_account)).join('\n\n');
    const ok = await copyText(text);
    setCopiedAll(ok);
    if (ok) setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <Stack $gap={16}>
      <Card>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>멤버별 요약</h3>
        <Table>
          <thead>
            <tr>
              <th>멤버</th>
              <th>낸 돈</th>
              <th>부담액</th>
              <th>차액</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.member_id}>
                <td>{b.display_name}</td>
                <td>{won(b.paid)}</td>
                <td>{won(b.owed)}</td>
                <td>
                  <Amount $value={b.balance}>
                    {b.balance > 0 ? '+' : ''}
                    {won(b.balance)}
                  </Amount>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Muted $size={12}>차액이 +면 받을 돈, -면 보낼 돈이에요.</Muted>
      </Card>

      <Stack $gap={10}>
        <Row $justify="space-between" $wrap>
          <h3 style={{ fontSize: 15 }}>
            송금 목록 <Muted>입금 완료 {paidCount}/{settlements.length} · 남은 금액 {won(unpaidAmount)}</Muted>
          </h3>
          {settlements.length > 0 && (
            <Button $small $variant="secondary" onClick={copyAll}>
              <IoCopyOutline /> {copiedAll ? '복사됨!' : '전체 안내문 복사'}
            </Button>
          )}
        </Row>
        {settlements.length > 0 && (
          <Progress aria-label={`입금 진행률 ${paidCount}/${settlements.length}`}>
            <div style={{ width: `${(paidCount / settlements.length) * 100}%` }} />
          </Progress>
        )}
        {toggleMut.error && <ErrorText>{toggleMut.error.message}</ErrorText>}
        {settlements.length === 0 ? (
          <Card>
            <Empty>
              정산할 송금 내역이 없어요.
              <br />
              <Muted $size={12}>(utils/settle.js의 calculateSettlements가 아직 stub이면 비어 있는 것이 정상이에요)</Muted>
            </Empty>
          </Card>
        ) : (
          settlements.map((s) => (
            <SettlementCard
              key={s.id}
              group={group}
              settlement={s}
              isOwner={isOwner}
              toggling={toggleMut.isPending && toggleMut.variables?.id === s.id}
              onToggle={(target) => toggleMut.mutate(target)}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
}
