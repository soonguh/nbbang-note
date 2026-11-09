// 로그인/회원가입 공통 폼 레이아웃
import styled from 'styled-components';
import { Card } from './ui.js';

const Wrap = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
`;

const Box = styled(Card)`
  width: 100%;
  max-width: 380px;
  padding: 32px 28px;
`;

const Title = styled.h1`
  font-size: 22px;
  margin-bottom: 4px;
  span {
    color: var(--primary);
  }
`;

const Sub = styled.p`
  margin: 0 0 24px;
  color: var(--text-sub);
  font-size: 14px;
`;

export default function AuthForm({ subtitle, onSubmit, children }) {
  return (
    <Wrap>
      <Box as="form" onSubmit={onSubmit} noValidate>
        <Title>
          <span>총무</span>의 일지
        </Title>
        <Sub>{subtitle}</Sub>
        {children}
      </Box>
    </Wrap>
  );
}
