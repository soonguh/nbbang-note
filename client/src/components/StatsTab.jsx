// 통계 탭: 카테고리별 지출 비율 + 결제자별 합계
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { getStats } from '../api/settlements.js';
import { CATEGORY_COLORS } from '../utils/constants.js';
import CategoryPieChart from './CategoryPieChart.jsx';
import { Card, Empty, ErrorText, Muted, Row, Stack, won } from './ui.js';

const Legend = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  li:last-child {
    border-bottom: 0;
  }
`;

const Swatch = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const Bar = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
  div {
    height: 100%;
    background: var(--primary);
  }
`;

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

export default function StatsTab({ group }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats', group.id], queryFn: () => getStats(group.id) });

  if (isLoading) return <Empty>불러오는 중...</Empty>;
  if (error) return <ErrorText>{error.message}</ErrorText>;
  if (data.total_amount === 0) {
    return (
      <Card>
        <Empty>지출을 등록하면 통계가 표시돼요.</Empty>
      </Card>
    );
  }

  return (
    <Stack $gap={16}>
      <Card>
        <Row $justify="space-between">
          <h3 style={{ fontSize: 15 }}>카테고리별 지출</h3>
          <Muted>총 {won(data.total_amount)}</Muted>
        </Row>
        <CategoryPieChart data={data.by_category} />
        <Legend>
          {data.by_category.map((c) => (
            <li key={c.category}>
              <Swatch $color={CATEGORY_COLORS[c.category]} />
              <span style={{ flex: 1 }}>
                {c.category} <Muted $size={12}>{c.count}건</Muted>
              </span>
              <Muted>{pct(c.total, data.total_amount)}%</Muted>
              <strong style={{ minWidth: 90, textAlign: 'right' }}>{won(c.total)}</strong>
            </li>
          ))}
        </Legend>
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>결제자별 합계</h3>
        <Legend>
          {data.by_payer.map((p) => (
            <li key={p.member_id}>
              <span style={{ width: 70 }}>{p.display_name}</span>
              <Bar>
                <div style={{ width: `${pct(p.total, data.total_amount)}%` }} />
              </Bar>
              <strong style={{ minWidth: 90, textAlign: 'right' }}>{won(p.total)}</strong>
            </li>
          ))}
        </Legend>
      </Card>
    </Stack>
  );
}
