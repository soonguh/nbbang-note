// 로그인/회원가입 공통 폼 레이아웃
import styled from 'styled-components';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { Card, HEADER_HEIGHT } from './ui.js';

const Wrap = styled.div`
  min-height: calc(100vh - ${HEADER_HEIGHT}px);
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

const Notice = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 20px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 14px;
  font-weight: 600;
`;

export default function AuthForm({ subtitle, notice, onSubmit, children }) {
  return (
    <Wrap>
      <Box as="form" onSubmit={onSubmit} noValidate>
        <Title>
          <span>N빵</span>노트
        </Title>
        <Sub>{subtitle}</Sub>
        {notice && (
          <Notice role="status">
            <IoInformationCircleOutline size={18} /> {notice}
          </Notice>
        )}
        {children}
      </Box>
    </Wrap>
  );
}
