// 멤버 이름 입력창 + [추가] 버튼
// - 쉼표(, ，)나 줄바꿈으로 여러 명을 한 번에 입력 (parseMemberNames)
// - [추가] 버튼과 Enter 키 모두 지원 (한글 조합 중 Enter는 무시)
// - 중복 이름은 추가하지 않고 안내 문구 표시
import { useState } from 'react';
import { parseMemberNames, duplicateMessage } from '../utils/memberNames.js';
import { Button, ErrorText, Input, Row, Stack } from './ui.js';

/**
 * @param {string[]} existingNames 이미 있는 이름들 (중복 검사용)
 * @param {(names: string[]) => (void|Promise<void>)} onAdd 새 이름 목록을 받아 추가. 실패하면 throw
 */
export default function MemberNameInput({ existingNames, onAdd, disabled, placeholder = '이름 입력 (쉼표로 여러 명)', autoFocus }) {
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const { names, duplicates } = parseMemberNames(value, existingNames);
    if (names.length === 0 && duplicates.length === 0) return; // 빈 입력
    let error = '';
    if (names.length > 0) {
      try {
        setBusy(true);
        await onAdd(names);
      } catch (e) {
        error = e.message;
      } finally {
        setBusy(false);
      }
    }
    setValue(error ? value : '');
    setMessage([duplicateMessage(duplicates), error].filter(Boolean).join(' / '));
  };

  const onKeyDown = (e) => {
    // 한글 IME 조합 중 Enter는 무시 (isComposing / keyCode 229)
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    add();
  };

  // 한 줄 입력창은 붙여 넣을 때 줄바꿈이 사라지므로, 줄바꿈을 ", " 로 바꿔서 넣는다
  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (!/[\r\n]/.test(text)) return;
    e.preventDefault();
    const input = e.currentTarget;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const pasted = text.replace(/[\r\n]+/g, ', ');
    setValue(value.slice(0, start) + pasted + value.slice(end));
  };

  return (
    <Stack $gap={6}>
      <Row>
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (message) setMessage('');
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          aria-label="멤버 이름"
          autoFocus={autoFocus}
          disabled={disabled}
        />
        <Button $variant="secondary" onClick={add} disabled={disabled || busy || !value.trim()}>
          추가
        </Button>
      </Row>
      {message && <ErrorText role="alert">{message}</ErrorText>}
    </Stack>
  );
}
