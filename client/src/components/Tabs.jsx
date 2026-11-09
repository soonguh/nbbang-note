// 탭 메뉴
import styled from 'styled-components';

const Bar = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin: 20px 0 16px;
`;

const Tab = styled.button`
  border: 0;
  background: transparent;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  color: ${(p) => (p.$active ? 'var(--primary)' : 'var(--text-sub)')};
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--primary)' : 'transparent')};
  margin-bottom: -1px;
`;

export default function Tabs({ tabs, value, onChange }) {
  return (
    <Bar role="tablist">
      {tabs.map((t) => (
        <Tab key={t.key} role="tab" aria-selected={value === t.key} $active={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
        </Tab>
      ))}
    </Bar>
  );
}
