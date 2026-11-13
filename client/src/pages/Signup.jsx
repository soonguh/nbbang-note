import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getToken, signup } from '../api/auth.js';
import AuthForm from '../components/AuthForm.jsx';
import { Button, ErrorText, Input, Label, Muted, Stack } from '../components/ui.js';

export default function Signup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  // 로그인 화면에서 넘어온 경우 원래 가려던 주소를 이어받는다
  const from = location.state?.from ?? '/groups';

  const mutation = useMutation({
    mutationFn: signup,
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
      subtitle="회원가입"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(form);
      }}
    >
      <Stack $gap={14}>
        <Label>
          이름
          <Input name="name" autoComplete="name" value={form.name} onChange={change} placeholder="홍길동" />
        </Label>
        <Label>
          이메일
          <Input name="email" type="email" autoComplete="email" value={form.email} onChange={change} placeholder="you@example.com" />
        </Label>
        <Label>
          비밀번호
          <Input name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} placeholder="4자 이상" />
        </Label>
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        <Button type="submit" $block disabled={mutation.isPending}>
          {mutation.isPending ? '가입 중...' : '가입하기'}
        </Button>
        <Muted style={{ textAlign: 'center' }}>
          이미 계정이 있나요? <Link to="/login" state={{ from }} style={{ color: 'var(--primary)', fontWeight: 600 }}>로그인</Link>
        </Muted>
      </Stack>
    </AuthForm>
  );
}
