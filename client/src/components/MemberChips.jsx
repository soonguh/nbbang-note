// 멤버 칩: 이름 + (선택) X 삭제 버튼
import styled from 'styled-components';
import { IoClose } from 'react-icons/io5';

const ChipBox = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px ${(p) => (p.$removable ? 6 : 12)}px 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: ${(p) => (p.$muted ? 'var(--bg)' : 'var(--primary-soft)')};
  color: ${(p) => (p.$muted ? 'var(--text)' : 'var(--primary)')};
  border: 1px solid ${(p) => (p.$muted ? 'var(--border)' : 'transparent')};
  small {
    font-weight: 500;
    color: var(--text-sub);
  }
  button {
    display: inline-grid;
    place-items: center;
    border: 0;
    border-radius: 999px;
    padding: 2px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/**
 * @param {string} name      표시할 이름
 * @param {string} [tag]     이름 옆 보조 표시 (예: "총무", "비회원")
 * @param {Function} [onRemove] 있으면 X 버튼 표시
 * @param {boolean} [muted]  회색 스타일
 */
export function MemberChip({ name, tag, onRemove, disabled, muted }) {
  return (
    <ChipBox $removable={Boolean(onRemove)} $muted={muted}>
      {name}
      {tag && <small>{tag}</small>}
      {onRemove && (
        <button type="button" aria-label={`${name} 빼기`} onClick={onRemove} disabled={disabled}>
          <IoClose size={14} />
        </button>
      )}
    </ChipBox>
  );
}
