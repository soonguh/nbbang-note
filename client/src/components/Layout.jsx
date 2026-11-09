// 로그인 후 공통 레이아웃: 상단 헤더 + 본문
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { logout } from '../api/auth.js';
import { useMe } from '../hooks/useMe.js';
import { Button } from './ui.js';

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
`;

const Inner = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Logo = styled(NavLink)`
  font-weight: 800;
  font-size: 17px;
  margin-right: auto;
  span {
    color: var(--primary);
  }
`;

const NavItem = styled(NavLink)`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-sub);
  &.active {
    color: var(--primary);
  }
`;

export default function Layout() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Header>
        <Inner>
          <Logo to="/groups">
            <span>총무</span>의 일지
          </Logo>
          <NavItem to="/groups">모임</NavItem>
          <NavItem to="/profile">{me?.name ?? '내 정보'}</NavItem>
          <Button $small $variant="ghost" onClick={handleLogout}>
            로그아웃
          </Button>
        </Inner>
      </Header>
      <Outlet />
    </>
  );
}
