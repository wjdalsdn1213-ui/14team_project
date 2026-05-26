'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useApp } from '@/lib/context/AppContext';

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export default function SignupPage() {
  const router = useRouter();
  const { login } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, role: 'patient' }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        setError(data?.error ?? '회원가입에 실패했습니다.');
        return;
      }

      const user = await login(email, password);
      if (!user) {
        router.push('/');
        return;
      }

      router.push('/patient/dashboard');
    } catch {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <span aria-hidden="true">←</span>
            로그인으로 돌아가기
          </Link>
          <div className="mt-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">RehabCare</span>
          </div>
          <h1 className="mt-7 text-2xl font-bold text-slate-900">회원가입</h1>
          <p className="mt-1 text-sm text-slate-500">환자 계정을 생성합니다. 치료사 계정은 관리자 승인 후 별도 생성됩니다.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-slate-700">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6자 이상 입력하세요"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입'}
          </Button>
        </form>
      </div>
    </div>
  );
}
