// 멤버 이름 입력 처리 유틸 (모임 만들기 / 모임 관리에서 같이 사용)

// 구분자: 쉼표(,) · 전각 쉼표(，) · 줄바꿈
const SEPARATOR = /[,，\r\n]+/;

/**
 * 입력 문자열을 멤버 이름 목록으로 나눈다.
 * - 앞뒤 공백 제거, 빈 이름 무시
 * - 이미 있는 이름(existingNames)이나 입력 안에서 중복된 이름은 names에서 빼고 duplicates에 모은다
 *
 * @param {string} input          예) "홍길동, 김철수,이영희"
 * @param {string[]} existingNames 이미 추가된 이름들
 * @returns {{ names: string[], duplicates: string[] }}
 *
 * 예) parseMemberNames('홍길동, 김철수,김철수 ,,이영희', ['홍길동'])
 *     → { names: ['김철수', '이영희'], duplicates: ['홍길동', '김철수'] }
 */
export function parseMemberNames(input, existingNames = []) {
  const taken = new Set(existingNames.map((n) => n.trim()));
  const names = [];
  const duplicates = [];

  (input ?? '')
    .split(SEPARATOR)
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name) => {
      if (taken.has(name)) {
        if (!duplicates.includes(name)) duplicates.push(name);
        return;
      }
      taken.add(name);
      names.push(name);
    });

  return { names, duplicates };
}

// 입력 조각이 이메일이면 "가입한 회원"으로, 아니면 "이름만 있는 비회원"으로 다룬다
export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value ?? '').trim());
}

// 이름 목록을 이메일(회원) / 이름(비회원)으로 나눈다. 이메일은 소문자로 맞춘다
export function splitEmails(tokens) {
  const emails = [];
  const names = [];
  tokens.forEach((t) => (isEmail(t) ? emails.push(t.trim().toLowerCase()) : names.push(t)));
  return { emails, names };
}

// 중복 안내 문구: "이미 추가된 이름이에요: 김철수, 이영희"
export function duplicateMessage(duplicates) {
  return duplicates.length > 0 ? `이미 추가된 이름이에요: ${duplicates.join(', ')}` : '';
}
