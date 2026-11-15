import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getToken, login } from '../api/auth.js';
import AuthForm from '../components/AuthForm.jsx';
import { Button, ErrorText, Input, Label, Muted, Stack } from '../components/ui.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', password: '' });
  // 로그인 가드가 넘겨준 값: 원래 가려던 주소, 안내 문구
  const from = location.state?.from ?? '/groups';
  const notice = location.state?.notice;

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      queryClient.clear();
      queryClient.setQueryData(['me'], user);
      navigate(from, { replace: true });
    },
  });

  if (getToken()) return <Navigate to={from} replace />;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <AuthForm
      subtitle="모임 정산과 입금 현황을 한 곳에서"
      notice={notice}
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
    >
      <Stack $gap={14}>
        <Label>
          이메일
          <Input name="email" type="email" autoComplete="email" value={form.email} onChange={change} placeholder="you@example.com" />
        </Label>
        <Label>
          비밀번호
          <Input name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} />
        </Label>
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        <Button type="submit" $block disabled={mutation.isPending}>
          {mutation.isPending ? '로그인 중...' : '로그인'}
        </Button>
        <Muted style={{ textAlign: 'center' }}>
          계정이 없나요? <Link to="/signup" state={{ from }} style={{ color: 'var(--primary)', fontWeight: 600 }}>회원가입</Link>
        </Muted>
        <Muted $size={12} style={{ textAlign: 'center' }}>
          테스트 계정: demo@example.com / test1234 (server/db/seed.sql)
        </Muted>
      </Stack>
    </AuthForm>
  );
}
