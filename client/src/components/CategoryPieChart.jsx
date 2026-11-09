// 카테고리별 지출 파이 차트 (Recharts)
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_COLORS } from '../utils/constants.js';
import { won } from './ui.js';

export default function CategoryPieChart({ data }) {
  // 금액이 0인 카테고리는 차트에서 뺀다
  const items = data.filter((d) => d.total > 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={items} dataKey="total" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
          {items.map((d) => (
            <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [won(value), name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
