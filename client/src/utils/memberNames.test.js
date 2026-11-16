// 멤버 이름 입력 유틸 테스트 (vitest)  실행: npm test
import { describe, expect, it } from 'vitest';
import { isEmail, parseMemberNames, splitEmails } from './memberNames.js';

describe('isEmail', () => {
  it('이메일 모양이면 true', () => {
    expect(isEmail('kim@example.com')).toBe(true);
    expect(isEmail('  kim@example.co.kr ')).toBe(true);
  });
  it('이름이나 잘못된 모양이면 false', () => {
    expect(isEmail('김철수')).toBe(false);
    expect(isEmail('kim@')).toBe(false);
    expect(isEmail('kim@example')).toBe(false);
    expect(isEmail('')).toBe(false);
  });
});

describe('splitEmails', () => {
  it('입력 조각을 이메일(회원)과 이름(비회원)으로 나누고 이메일은 소문자로', () => {
    expect(splitEmails(['김철수', 'Kim@Example.com', '이영희'])).toEqual({
      emails: ['kim@example.com'],
      names: ['김철수', '이영희'],
    });
  });
  it('parseMemberNames 와 함께: 쉼표로 섞어 입력해도 나뉜다', () => {
    const { names } = parseMemberNames('김철수, kim@example.com，이영희');
    expect(splitEmails(names)).toEqual({ emails: ['kim@example.com'], names: ['김철수', '이영희'] });
  });
});
