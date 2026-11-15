// 내 정보: 받을 계좌(은행명·계좌번호) 저장
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAccount } from '../api/auth.js';
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
      </Stack>
    </Page>
  );
}
