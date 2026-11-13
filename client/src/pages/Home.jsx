// 홈(랜딩) 페이지: 로그인 없이 볼 수 있다
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { IoPeopleOutline, IoCalculatorOutline, IoCheckmarkDoneOutline, IoArrowForward } from 'react-icons/io5';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../components/ui.js';

const Wrap = styled.main`
  /* 한국어는 어절 단위로 줄바꿈 */
  word-break: keep-all;
  max-width: 960px;
  margin: 0 auto;
  padding: 56px 16px 72px;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 40px;
  align-items: center;
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: var(--primary);
  font-weight: 700;
  font-size: 14px;
`;

const Headline = styled.h1`
  font-size: clamp(28px, 5vw, 40px);
  line-height: 1.25;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  span {
    color: var(--primary);
  }
`;

const Lead = styled.p`
  margin: 0 0 28px;
  color: var(--text-sub);
  font-size: 16px;
  line-height: 1.7;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const CtaLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 22px;
  border-radius: 10px;
  font-weight: 700;
  border: 1px solid ${(p) => (p.$primary ? 'var(--primary)' : 'var(--border)')};
  background: ${(p) => (p.$primary ? 'var(--primary)' : 'var(--surface)')};
  color: ${(p) => (p.$primary ? '#fff' : 'var(--text)')};
  &:hover {
    background: ${(p) => (p.$primary ? 'var(--primary-hover)' : 'var(--bg)')};
  }
`;

// 송금 안내문 미리보기 (메신저 말풍선 모양)
const Preview = styled(Card)`
  padding: 20px;
  background: #b2c7d9;
  border: 0;
`;

const PreviewLabel = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: #3d5466;
`;

const Bubble = styled.pre`
  margin: 0;
  padding: 14px 16px;
  border-radius: 4px 14px 14px 14px;
  background: #fff;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
`;

const Features = styled.section`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 64px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Feature = styled(Card)`
  h3 {
    font-size: 16px;
    margin: 12px 0 6px;
  }
  p {
    margin: 0;
    color: var(--text-sub);
    font-size: 14px;
    line-height: 1.6;
  }
`;

const IconBox = styled.span`
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 20px;
`;

const FEATURES = [
  {
    icon: <IoPeopleOutline />,
    title: '모임 만들기',
    desc: '모임 이름과 날짜, 멤버 이름만 입력하면 끝. 가입하지 않은 친구도 이름만으로 추가할 수 있어요.',
  },
  {
    icon: <IoCalculatorOutline />,
    title: '지출 등록하면 자동 정산',
    desc: '누가 얼마를 냈고 누가 참여했는지만 적으면 "누가 누구에게 얼마"를 바로 계산해 줘요.',
  },
  {
    icon: <IoCheckmarkDoneOutline />,
    title: '입금 현황 체크',
    desc: '송금 항목마다 입금 완료를 체크하고, 아직 안 보낸 사람과 남은 금액을 한눈에 확인해요.',
  },
];

// 예시 문구 (실제 앱의 안내문은 utils/message.js 의 buildTransferMessage 결과)
const SAMPLE_MESSAGE = `[강원도 MT 정산 안내]
이영희님 → 홍길동님
37,500원

카카오뱅크 3333-01-1234567 (홍길동)
확인 후 입금 부탁드려요!`;

export default function Home() {
  const { me, loggedIn } = useAuth();

  return (
    <Wrap>
      <Hero>
        <div>
          <Eyebrow>모임 정산 & 입금 현황 관리</Eyebrow>
          <Headline>
            총무의 정산 고민,
            <br />
            <span>N빵노트</span>가 덜어 드려요
          </Headline>
          <Lead>
            지출만 기록하면 1원 단위까지 나눠서 누가 누구에게 보낼지 알려 주고, 송금 안내문까지 한 번에 복사할 수 있어요.
          </Lead>
          <Actions>
            {loggedIn ? (
              <CtaLink to="/groups" $primary>
                {me.name}님, 내 모임으로 가기 <IoArrowForward />
              </CtaLink>
            ) : (
              <>
                <CtaLink to="/signup" $primary>
                  시작하기 <IoArrowForward />
                </CtaLink>
                <CtaLink to="/login">로그인</CtaLink>
              </>
            )}
          </Actions>
        </div>
        <Preview aria-label="송금 안내문 예시">
          <PreviewLabel>송금 안내문 예시 · 버튼 한 번으로 복사</PreviewLabel>
          <Bubble>{SAMPLE_MESSAGE}</Bubble>
        </Preview>
      </Hero>

      <Features aria-label="핵심 기능">
        {FEATURES.map((f) => (
          <Feature key={f.title}>
            <IconBox aria-hidden="true">{f.icon}</IconBox>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </Feature>
        ))}
      </Features>
    </Wrap>
  );
}
