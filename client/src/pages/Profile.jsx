// 내 정보: 받을 계좌(은행명·계좌번호) 저장
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAccount, updateAccount } from '../api/auth.js';
import { useMe } from '../hooks/useMe.js';
import { Button, Card, ErrorText, Input, Label, Muted, Page, Row, Select, Stack } from '../components/ui.js';

const BANKS = ['카카오뱅크', '토스뱅크', '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '케이뱅크', 'SC제일은행', '새마을금고', '우체국'];

function AccountForm({ me }) {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState(me.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(me.account_number ?? '');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: updateAccount,
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      // 정산 안내문에 들어가는 계좌 정보도 갱신
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      setSaved(true);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate({ bank_name: bankName, account_number: accountNumber });
  };

  return (
    <form onSubmit={submit}>
      <Stack $gap={14}>
        <Label>
          은행
          <Select value={bankName} onChange={(e) => setBankName(e.target.value)}>
            <option value="">선택 안 함</option>
            {BANKS.map((b) => (
              <option key={b}>{b}</option>
            ))}
            {/* 목록에 없는 기존 값도 보이도록 */}
            {bankName && !BANKS.includes(bankName) && <option>{bankName}</option>}
          </Select>
        </Label>
        <Label>
          계좌번호
          <Input
            inputMode="numeric"
            value={accountNumber}
            // 숫자와 하이픈만 허용
            onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
            placeholder="예) 3333-01-1234567"
          />
        </Label>
        <Muted $size={13}>내가 받을 돈이 있을 때 송금 안내문에 이 계좌가 표시돼요.</Muted>
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        <Row $justify="flex-end">
          {saved && <Muted>저장했어요</Muted>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </Row>
      </Stack>
    </form>
  );
}

// 회원 탈퇴: 비밀번호 확인 후 삭제. 총무인 모임이 있으면 서버가 거부하고 이유를 알려 준다.
function WithdrawForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.clear();
      navigate('/', { replace: true });
    },
  });

  if (!open) {
    return (
      <Row $justify="space-between" $wrap>
        <Muted $size={13}>탈퇴하면 계정과 계좌 정보가 삭제돼요. 참여했던 다른 모임에는 이름만 남아요.</Muted>
        <Button $small $variant="danger" onClick={() => setOpen(true)}>
          회원 탈퇴
        </Button>
      </Row>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (window.confirm('정말 탈퇴할까요? 되돌릴 수 없어요.')) mutation.mutate(password);
      }}
    >
      <Stack $gap={12}>
        <Muted $size={13}>
          · 내가 총무인 모임이 있으면 먼저 그 모임을 삭제해야 해요.
          <br />· 다른 사람 모임의 지출·정산 기록은 그대로 남고, 나는 비회원 멤버로 표시돼요.
        </Muted>
        <Label>
          비밀번호 확인
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Label>
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        <Row $justify="flex-end">
          <Button
            $variant="secondary"
            onClick={() => {
              setOpen(false);
              setPassword('');
              mutation.reset();
            }}
          >
            취소
          </Button>
          <Button type="submit" $variant="danger" disabled={!password || mutation.isPending}>
            {mutation.isPending ? '탈퇴 중...' : '탈퇴하기'}
          </Button>
        </Row>
      </Stack>
    </form>
  );
}

export default function Profile() {
  const { data: me } = useMe();

  return (
    <Page>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>내 정보</h1>
      <Stack $gap={16}>
        <Card>
          <Stack $gap={4}>
            <strong style={{ fontSize: 17 }}>{me.name}</strong>
            <Muted>{me.email}</Muted>
          </Stack>
        </Card>
        <Card>
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>받을 계좌</h2>
          <AccountForm key={me.id} me={me} />
        </Card>
        <Card>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>회원 탈퇴</h2>
          <WithdrawForm />
        </Card>
      </Stack>
    </Page>
  );
}
