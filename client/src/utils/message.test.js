// 송금 안내문 테스트 (vitest)  실행: npm test
import { describe, expect, it } from 'vitest';
import { buildTransferMessage } from './message.js';

const group = { id: 1, name: '강원도 MT', meeting_date: '2026-11-07' };
const settlement = { id: 1, from_name: '이영희', to_name: '홍길동', amount: 37500, is_paid: false };
const account = { bank_name: '카카오뱅크', account_number: '3333-01-1234567', holder_name: '홍길동' };

describe('buildTransferMessage (USER-3)', () => {
  it('모임 이름·보내는 사람·받는 사람·금액(쉼표)·계좌가 들어간다', () => {
    expect(buildTransferMessage(group, settlement, account)).toBe(
      [
        '[강원도 MT] 정산 안내',
        '모임일: 2026-11-07',
        '',
        '보내는 분: 이영희',
        '받는 분: 홍길동',
        '금액: 37,500원',
        '계좌: 카카오뱅크 3333-01-1234567 (예금주 홍길동)',
        '',
        '확인 후 입금 부탁드려요!',
      ].join('\n'),
    );
  });

  it('계좌 정보가 없으면 "계좌는 직접 문의"', () => {
    const message = buildTransferMessage(group, settlement, null);
    expect(message).toContain('계좌: 계좌는 직접 문의');
    // 은행만 있고 계좌번호가 없는 경우도 같은 처리
    expect(buildTransferMessage(group, settlement, { bank_name: '국민은행', account_number: null })).toContain('계좌는 직접 문의');
  });

  it('모임일이 없으면 그 줄을 생략한다', () => {
    expect(buildTransferMessage({ name: '번개' }, settlement, account)).not.toContain('모임일');
  });

  it('입금 완료된 항목이면 마무리 문구가 바뀐다', () => {
    expect(buildTransferMessage(group, { ...settlement, is_paid: true }, account)).toContain('입금 완료된 항목이에요');
  });

  it('큰 금액도 천 단위 쉼표', () => {
    expect(buildTransferMessage(group, { ...settlement, amount: 1234567 }, account)).toContain('금액: 1,234,567원');
  });
});
