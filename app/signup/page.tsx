'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useApp } from '@/lib/context/AppContext';

type Role = 'patient' | 'therapist';

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export default function SignupPage() {
  const router = useRouter();
  const { login } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('patient');
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
        body: JSON.stringify({ name, email, password, role }),
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

      router.push(user.role === 'therapist' ? '/therapist/dashboard' : '/patient/dashboard');
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
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">RehabCare</span>
          </div>
          <h1 className="mt-7 text-2xl font-bold text-slate-900">회원가입</h1>
          <p className="mt-1 text-sm text-slate-500">계정을 만들면 바로 Supabase에 등록됩니다.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="email@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="6자 이상 입력하세요"
              minLength={6}
              required
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-semibold text-slate-700 mb-2">역할</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'patient' as const, label: '환자' },
                { value: 'therapist' as const, label: '치료사' },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    role === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입하기'}
          </Button>
        </form>
      </div>
    </div>
  );
}
