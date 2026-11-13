// 공통 UI 컴포넌트 (styled-components)
import styled, { css } from 'styled-components';

export const Page = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 16px 64px;
`;

export const Card = styled.section`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.$gap ?? 8}px;
  justify-content: ${(p) => p.$justify ?? 'flex-start'};
  flex-wrap: ${(p) => (p.$wrap ? 'wrap' : 'nowrap')};
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 12}px;
`;

export const Muted = styled.span`
  color: var(--text-sub);
  font-size: ${(p) => p.$size ?? 14}px;
`;

const variants = {
  primary: css`
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
    &:hover:not(:disabled) {
      background: var(--primary-hover);
    }
  `,
  secondary: css`
    background: var(--surface);
    color: var(--text);
    border-color: var(--border);
    &:hover:not(:disabled) {
      background: var(--bg);
    }
  `,
  danger: css`
    background: var(--surface);
    color: var(--danger);
    border-color: #ffc9c9;
    &:hover:not(:disabled) {
      background: var(--danger-soft);
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--text-sub);
    border-color: transparent;
    &:hover:not(:disabled) {
      background: var(--bg);
      color: var(--text);
    }
  `,
};

export const Button = styled.button.attrs((p) => ({ type: p.type ?? 'button' }))`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: ${(p) => (p.$small ? '5px 10px' : '9px 16px')};
  font-size: ${(p) => (p.$small ? 13 : 15)}px;
  font-weight: 600;
  border: 1px solid;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  ${(p) => variants[p.$variant ?? 'primary']}
  ${(p) => p.$block && 'width: 100%;'}
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const fieldStyle = css`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-soft);
  }
`;

export const Input = styled.input`
  ${fieldStyle}
`;

export const Select = styled.select`
  ${fieldStyle}
`;

export const TextArea = styled.textarea`
  ${fieldStyle}
  resize: vertical;
  line-height: 1.6;
`;

export const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
`;

export const ErrorText = styled.p`
  margin: 0;
  color: var(--danger);
  font-size: 14px;
`;

export const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${(p) => (p.$tone === 'success' ? 'var(--success-soft)' : p.$tone === 'danger' ? 'var(--danger-soft)' : 'var(--primary-soft)')};
  color: ${(p) => (p.$tone === 'success' ? 'var(--success)' : p.$tone === 'danger' ? 'var(--danger)' : 'var(--primary)')};
`;

export const Empty = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--text-sub);
  font-size: 14px;
`;

// 금액 표시: 120000 → "120,000원"
export function won(amount) {
  return `${Number(amount || 0).toLocaleString('ko-KR')}원`;
}

// 상단 내비게이션 바 높이 (px)
export const HEADER_HEIGHT = 57;

// 칩(멤버 이름 등) 묶음
export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;
