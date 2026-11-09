// 모임 상세: 지출 / 정산 / 통계 탭
import { lazy, Suspense, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { IoChevronBack, IoSettingsOutline } from 'react-icons/io5';
import { getGroup } from '../api/groups.js';
import { useMe } from '../hooks/useMe.js';
import Tabs from '../components/Tabs.jsx';
import ExpenseTab from '../components/ExpenseTab.jsx';
import SettlementTab from '../components/SettlementTab.jsx';
import ManageGroupModal from '../components/ManageGroupModal.jsx';
import { Badge, Button, Empty, ErrorText, Muted, Page, Row } from '../components/ui.js';

// 통계 탭은 Recharts가 커서 처음 열 때 불러온다 (번들 분리)
const StatsTab = lazy(() => import('../components/StatsTab.jsx'));

const TABS = [
  { key: 'expenses', label: '지출' },
  { key: 'settlement', label: '정산' },
  { key: 'stats', label: '통계' },
];

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-sub);
  font-size: 14px;
  margin-bottom: 12px;
`;

const Members = styled(Row)`
  margin-top: 10px;
`;

export default function GroupDetail() {
  const { id } = useParams();
  const groupId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'expenses';
  const [managing, setManaging] = useState(false);
  const { data: me } = useMe();
  const { data: group, isLoading, error } = useQuery({ queryKey: ['group', groupId], queryFn: () => getGroup(groupId) });

  if (isLoading) return <Page><Empty>불러오는 중...</Empty></Page>;
  if (error) {
    return (
      <Page>
        <Back to="/groups"><IoChevronBack /> 모임 목록</Back>
        <ErrorText>{error.message}</ErrorText>
      </Page>
    );
  }

  const isOwner = group.owner_id === me?.id;

  return (
    <Page>
      <Back to="/groups"><IoChevronBack /> 모임 목록</Back>
      <Row $justify="space-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22 }}>{group.name}</h1>
          <Muted>
            {group.meeting_date ?? '날짜 미정'} · 총무 {group.owner_name}
          </Muted>
        </div>
        {isOwner ? (
          <Button $variant="secondary" $small onClick={() => setManaging(true)}>
            <IoSettingsOutline /> 모임 관리
          </Button>
        ) : (
          <Badge>참여 중 (보기 전용)</Badge>
        )}
      </Row>
      <Members $wrap $gap={6}>
        {group.members.map((m) => (
          <Badge key={m.id} $tone={m.user_id ? undefined : 'danger'} title={m.user_id ? '회원' : '비회원'}>
            {m.display_name}
          </Badge>
        ))}
      </Members>

      <Tabs tabs={TABS} value={tab} onChange={(key) => setSearchParams({ tab: key }, { replace: true })} />

      {tab === 'expenses' && <ExpenseTab group={group} isOwner={isOwner} />}
      {tab === 'settlement' && <SettlementTab group={group} isOwner={isOwner} />}
      {tab === 'stats' && (
        <Suspense fallback={<Empty>불러오는 중...</Empty>}>
          <StatsTab group={group} />
        </Suspense>
      )}

      {managing && <ManageGroupModal group={group} onClose={() => setManaging(false)} />}
    </Page>
  );
}
