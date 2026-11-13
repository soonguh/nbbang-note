// 공통 레이아웃: 상단 내비게이션 바 + 본문
// 로그인 상태에 따라 [로그인/가입] 또는 [내 모임/프로필/로그아웃]을 보여준다.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { logout } from '../api/auth.js';
import { useAuth } from '../hooks/useAuth.js';
import { Button, HEADER_HEIGHT } from './ui.js';

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  height: ${HEADER_HEIGHT}px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
`;

const Inner = styled.nav`
  max-width: 960px;
  height: 100%;
  margin: 0 auto;
  padding: 0 16px;
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
  white-space: nowrap;
  &.active {
    color: var(--primary);
  }
`;

const SignupLink = styled(NavLink)`
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  white-space: nowrap;
`;

export default function Layout() {
  const { loggedIn, checking } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/', { replace: true });
  };

  return (
    <>
      <Header>
        <Inner aria-label="주요 메뉴">
          <Logo to="/" end>
            <span>N빵</span>노트
          </Logo>
          {loggedIn ? (
            <>
              <NavItem to="/groups">내 모임</NavItem>
              <NavItem to="/profile">프로필</NavItem>
              <Button $small $variant="ghost" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            // 토큰은 있는데 사용자 정보를 불러오는 중이면 버튼을 잠깐 숨긴다 (깜빡임 방지)
            !checking && (
              <>
                <NavItem to="/login">로그인</NavItem>
                <SignupLink to="/signup">가입</SignupLink>
              </>
            )
          )}
        </Inner>
      </Header>
      <Outlet />
    </>
  );
}
