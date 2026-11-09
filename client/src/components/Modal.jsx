// 공통 모달: 배경 클릭 / ESC 로 닫힘
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { IoClose } from 'react-icons/io5';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 20, 30, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: ${(p) => p.$width ?? 480}px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: var(--surface);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 0;
  h2 {
    font-size: 18px;
  }
`;

const Close = styled.button`
  border: 0;
  background: transparent;
  font-size: 22px;
  line-height: 0;
  padding: 4px;
  cursor: pointer;
  color: var(--text-sub);
`;

const Body = styled.div`
  padding: 16px 20px 20px;
`;

export default function Modal({ title, onClose, width, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <Backdrop onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Dialog role="dialog" aria-modal="true" aria-label={title} $width={width}>
        <Head>
          <h2>{title}</h2>
          <Close onClick={onClose} aria-label="닫기">
            <IoClose />
          </Close>
        </Head>
        <Body>{children}</Body>
      </Dialog>
    </Backdrop>,
    document.body,
  );
}
