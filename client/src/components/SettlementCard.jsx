// 정산 카드: "누가 → 누구에게 얼마" + 입금 상태 토글 + 송금 안내문
import { useState } from 'react';
import styled from 'styled-components';
import { IoArrowForward, IoCopyOutline, IoCheckmarkCircle, IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { buildTransferMessage } from '../utils/message.js';
import { copyText } from '../utils/clipboard.js';
import { Badge, Button, Card, Muted, Row, Stack, TextArea, won } from './ui.js';

const Box = styled(Card)`
  padding: 14px 16px;
  opacity: ${(p) => (p.$paid ? 0.75 : 1)};
`;

const Names = styled(Row)`
  flex: 1;
  min-width: 0;
  font-weight: 700;
  svg {
    color: var(--text-sub);
    flex-shrink: 0;
  }
`;

export default function SettlementCard({ group, settlement, isOwner, onToggle, toggling }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = buildTransferMessage(group, settlement, settlement.to_account);

  const copy = async () => {
    const ok = await copyText(message);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box $paid={settlement.is_paid}>
      <Row $gap={12} $wrap>
        <Names>
          <span>{settlement.from_name}</span>
          <IoArrowForward />
          <span>{settlement.to_name}</span>
        </Names>
        <strong style={{ fontSize: 17 }}>{won(settlement.amount)}</strong>
      </Row>
      <Row $justify="space-between" $wrap style={{ marginTop: 10 }}>
        <Row $gap={8}>
          {isOwner ? (
            <Button
              $small
              $variant={settlement.is_paid ? 'secondary' : 'danger'}
              disabled={toggling}
              onClick={() => onToggle(settlement)}
              aria-pressed={settlement.is_paid}
              title="클릭해서 입금 상태 변경"
            >
              {settlement.is_paid ? (
                <>
                  <IoCheckmarkCircle color="var(--success)" /> 입금 완료
                </>
              ) : (
                '미입금'
              )}
            </Button>
          ) : (
            <Badge $tone={settlement.is_paid ? 'success' : 'danger'}>{settlement.is_paid ? '입금 완료' : '미입금'}</Badge>
          )}
          {settlement.is_paid && settlement.paid_at && <Muted $size={12}>{settlement.paid_at}</Muted>}
        </Row>
        <Button $small $variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          <IoChatbubbleEllipsesOutline /> 안내문
        </Button>
      </Row>
      {open && (
        <Stack $gap={8} style={{ marginTop: 12 }}>
          <TextArea readOnly rows={Math.min(8, message.split('\n').length + 1)} value={message} aria-label="송금 안내문" />
          <Row $justify="space-between">
            <Muted $size={12}>
              {settlement.to_account ? `받는 계좌: ${settlement.to_account.bank_name} ${settlement.to_account.account_number}` : '받는 사람의 계좌 정보가 없어요'}
            </Muted>
            <Button $small $variant="secondary" onClick={copy}>
              <IoCopyOutline /> {copied ? '복사됨!' : '복사'}
            </Button>
          </Row>
        </Stack>
      )}
    </Box>
  );
}
