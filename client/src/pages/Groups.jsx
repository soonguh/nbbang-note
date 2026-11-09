// 모임 목록: 내가 총무인 모임 / 참여 중인 모임
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { IoAdd, IoPeopleOutline, IoCalendarOutline, IoSettingsOutline } from 'react-icons/io5';
import { getGroups } from '../api/groups.js';
import { useMe } from '../hooks/useMe.js';
import CreateGroupModal from '../components/CreateGroupModal.jsx';
import ManageGroupModal from '../components/ManageGroupModal.jsx';
import { Button, Card, Empty, ErrorText, Muted, Page, Row, Stack, won } from '../components/ui.js';

const SectionTitle = styled.h2`
  font-size: 16px;
  margin: 28px 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;

const GroupCard = styled(Card)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
  &:hover {
    border-color: var(--primary);
  }
  h3 {
    font-size: 16px;
  }
`;

const Meta = styled(Row)`
  color: var(--text-sub);
  font-size: 13px;
`;

function GroupItem({ group, canManage, onManage }) {
  return (
    <GroupCard as={Link} to={`/groups/${group.id}`}>
      <Row $justify="space-between">
        <h3>{group.name}</h3>
        {canManage && (
          <Button
            $small
            $variant="ghost"
            aria-label={`${group.name} 관리`}
            onClick={(e) => {
              e.preventDefault();
              onManage(group);
            }}
          >
            <IoSettingsOutline />
          </Button>
        )}
      </Row>
      <Meta $gap={12}>
        <Row $gap={4}>
          <IoCalendarOutline /> {group.meeting_date ?? '날짜 미정'}
        </Row>
        <Row $gap={4}>
          <IoPeopleOutline /> {group.members.length}명
        </Row>
      </Meta>
      <Row $justify="space-between">
        <Muted $size={13}>총무 {group.owner_name}</Muted>
        <strong>{won(group.total_amount)}</strong>
      </Row>
    </GroupCard>
  );
}

export default function Groups() {
  const { data: me } = useMe();
  const { data: groups, isLoading, error } = useQuery({ queryKey: ['groups'], queryFn: getGroups });
  const [creating, setCreating] = useState(false);
  const [managingId, setManagingId] = useState(null);

  const owned = (groups ?? []).filter((g) => g.owner_id === me?.id);
  const joined = (groups ?? []).filter((g) => g.owner_id !== me?.id);
  // 모달은 항상 최신 쿼리 데이터를 보도록 id로 찾는다
  const managing = groups?.find((g) => g.id === managingId);

  return (
    <Page>
      <Row $justify="space-between">
        <h1 style={{ fontSize: 22 }}>내 모임</h1>
        <Button onClick={() => setCreating(true)}>
          <IoAdd /> 모임 만들기
        </Button>
      </Row>

      {isLoading && <Empty>불러오는 중...</Empty>}
      {error && <ErrorText>{error.message}</ErrorText>}

      {groups && (
        <Stack $gap={0}>
          <SectionTitle>내가 총무인 모임 <Muted>{owned.length}</Muted></SectionTitle>
          {owned.length === 0 ? (
            <Card>
              <Empty>아직 만든 모임이 없어요. [모임 만들기]로 시작해 보세요.</Empty>
            </Card>
          ) : (
            <Grid>
              {owned.map((g) => (
                <GroupItem key={g.id} group={g} canManage onManage={(group) => setManagingId(group.id)} />
              ))}
            </Grid>
          )}

          <SectionTitle>참여 중인 모임 <Muted>{joined.length}</Muted></SectionTitle>
          {joined.length === 0 ? (
            <Card>
              <Empty>다른 사람이 만든 모임 중 내가 멤버로 연결된 모임이 여기에 표시돼요.</Empty>
            </Card>
          ) : (
            <Grid>
              {joined.map((g) => (
                <GroupItem key={g.id} group={g} />
              ))}
            </Grid>
          )}
        </Stack>
      )}

      {creating && <CreateGroupModal onClose={() => setCreating(false)} />}
      {managing && <ManageGroupModal group={managing} onClose={() => setManagingId(null)} />}
    </Page>
  );
}
