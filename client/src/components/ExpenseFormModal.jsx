// 지출 등록/수정 폼 (모달)
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { createExpense, updateExpense } from '../api/expenses.js';
import { invalidateGroup } from '../hooks/invalidate.js';
import { splitEvenly } from '../utils/settle.js';
import { CATEGORIES } from '../utils/constants.js';
import Modal from './Modal.jsx';
import { Button, ErrorText, Input, Label, Muted, Row, Select, Stack, won } from './ui.js';

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const CheckList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 6px;
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
  }
  label:has(input:checked) {
    border-color: var(--primary);
    background: var(--primary-soft);
  }
`;

export default function ExpenseFormModal({ group, expense, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(expense);
  const [form, setForm] = useState(() => ({
    title: expense?.title ?? '',
    category: expense?.category ?? CATEGORIES[0],
    amount: expense ? String(expense.amount) : '',
    payer_member_id: expense?.payer_member_id ?? group.members[0]?.id ?? '',
    // 기본값: 전원 참여
    participant_ids: expense ? expense.splits.map((s) => s.member_id) : group.members.map((m) => m.id),
  }));

  const mutation = useMutation({
    mutationFn: (data) => (isEdit ? updateExpense(expense.id, data) : createExpense(group.id, data)),
    onSuccess: () => {
      invalidateGroup(queryClient, group.id);
      onClose();
    },
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = (id) =>
    set('participant_ids', form.participant_ids.includes(id) ? form.participant_ids.filter((x) => x !== id) : [...form.participant_ids, id]);
  const allChecked = form.participant_ids.length === group.members.length;

  const amount = Number(form.amount);
  // 미리보기: 저장될 1인당 금액 (splitEvenly 결과)
  const preview = Number.isInteger(amount) && amount > 0 ? splitEvenly(amount, form.participant_ids) : [];
  const shares = [...new Set(preview.map((p) => p.share_amount))];

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, amount: Number(form.amount) });
  };

  return (
    <Modal title={isEdit ? '지출 수정' : '지출 등록'} onClose={onClose} width={520}>
      <form onSubmit={submit}>
        <Stack $gap={14}>
          <Label>
            제목
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="예) 1차 삼겹살" autoFocus />
          </Label>
          <Grid2>
            <Label>
              카테고리
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Label>
            <Label>
              금액(원)
              <Input
                inputMode="numeric"
                value={form.amount}
                // 숫자만 입력 (정수 원 단위)
                onChange={(e) => set('amount', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
              />
            </Label>
          </Grid2>
          <Label>
            결제자
            <Select value={form.payer_member_id} onChange={(e) => set('payer_member_id', Number(e.target.value))}>
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </Select>
          </Label>
          <Label as="div">
            <Row $justify="space-between">
              <span>참여자 ({form.participant_ids.length}명)</span>
              <Button
                $small
                $variant="ghost"
                onClick={() => set('participant_ids', allChecked ? [] : group.members.map((m) => m.id))}
              >
                {allChecked ? '전체 해제' : '전체 선택'}
              </Button>
            </Row>
            <CheckList>
              {group.members.map((m) => (
                <label key={m.id}>
                  <input type="checkbox" checked={form.participant_ids.includes(m.id)} onChange={() => toggle(m.id)} />
                  {m.display_name}
                </label>
              ))}
            </CheckList>
          </Label>
          {preview.length > 0 && (
            <Muted $size={13}>
              1인당 {shares.map(won).join(' / ')} (나머지 처리 규칙: utils/settle.js의 splitEvenly)
            </Muted>
          )}
          {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
          <Row $justify="flex-end">
            <Button $variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
            </Button>
          </Row>
        </Stack>
      </form>
    </Modal>
  );
}
