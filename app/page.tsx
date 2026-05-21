'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function LoginPage() {
  const { login, isLoading } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = await login(email, password);
    if (!user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    if (user.role === 'therapist') router.push('/therapist/dashboard');
    else router.push('/patient/dashboard');
  };
  // LoginPage 코드의 버튼 하단에 추가
  <div className="mt-4 text-center text-sm text-slate-500">
    계정이 없으신가요?{' '}
    <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
      회원가입하기
    </Link>
  </div>

  const fillPatient = () => { setEmail('seoyeon@email.com'); setPassword('1234'); setError(''); };
  const fillTherapist = () => { setEmail('minjun@rehab.com'); setPassword('1234'); setError(''); };

  return (
    <div className="min-h-screen flex">
      {/* 왼쪽 브랜드 패널 */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-slate-900 p-12 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">RehabCare</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            스마트한<br />재활 관리
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            AI 기반 분석으로 환자의 재활 과정을 실시간 모니터링하고, 치료사와 원활하게 소통하세요.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '📊', title: '실시간 모니터링', desc: '통증 수준과 운동 수행률을 한눈에' },
            { icon: '🤖', title: 'AI 재활 요약', desc: '데이터 기반 맞춤형 인사이트 제공' },
            { icon: '💬', title: '1:1 채팅', desc: '치료사와 언제든 소통 가능' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
              <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span className="font-bold text-slate-900 text-lg">RehabCare</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">다시 오셨군요!</h1>
            <p className="text-slate-500 text-sm">계정에 로그인하세요</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="이메일을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span>⚠</span> {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          {/* 이 부분을 추가하세요 */}
          <div className="mt-6 mb-8 text-center text-sm text-slate-500">
            계정이 없으신가요?{' '}
            <a href="/signup" className="text-blue-600 font-semibold hover:underline">
              회원가입하기
            </a>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <p className="text-xs text-slate-400 font-medium">테스트 계정</p>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={fillPatient}
                type="button"
                className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all card-shadow"
              >
                <span className="text-2xl">🧑‍🦽</span>
                <span className="text-xs font-semibold text-slate-700">환자로 입장</span>
                <span className="text-xs text-slate-400">이서연</span>
              </button>
              <button
                onClick={fillTherapist}
                type="button"
                className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all card-shadow"
              >
                <span className="text-2xl">👨‍⚕️</span>
                <span className="text-xs font-semibold text-slate-700">치료사로 입장</span>
                <span className="text-xs text-slate-400">김민준</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
