// 내 정보: 받을 계좌(은행명·계좌번호) 저장
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAccount } from '../api/auth.js';
import { resetDb } from '../mock/db.js';
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
  const queryClient = useQueryClient();

  const handleReset = () => {
    if (!window.confirm('Mock 데이터를 시드 상태로 초기화할까요? 직접 추가한 모임·지출·계정이 모두 지워집니다.')) return;
    resetDb();
    queryClient.invalidateQueries();
  };

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
        {/* 1단계(Mock) 전용 도구. 2단계에서 서버로 바꾸면 삭제 */}
        <Card>
          <Row $justify="space-between" $wrap>
            <Stack $gap={2}>
              <strong>Mock 데이터 초기화</strong>
              <Muted $size={13}>USER-2(splitEvenly)를 바꾼 뒤 누르면 시드 지출의 분배 금액이 새 규칙으로 다시 계산돼요.</Muted>
            </Stack>
            <Button $variant="danger" $small onClick={handleReset}>
              초기화
            </Button>
          </Row>
        </Card>
      </Stack>
    </Page>
  );
}
