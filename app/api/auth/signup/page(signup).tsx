'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Button from '@/components/ui/Button';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'patient' | 'therapist'>('patient'); // 역할 상태
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ); 
    const router = useRouter();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        // Supabase Auth 가입
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role }, // 메타데이터에 역할 저장
            },
        });

        if (error) {
            alert(error.message);
            return;
        }

        alert('가입 성공! 메일을 확인해주세요.');
        router.push('/'); // 로그인 페이지로 이동
    };

    return (
        // 로그인 페이지의 레이아웃(브랜드 패널 + 폼 영역)을 그대로 가져와 사용
        <form onSubmit={handleSignUp} className="space-y-4">
            {/* 이메일/비밀번호 input은 기존과 동일 */}

            {/* 역할 선택 영역 추가 */}
            <div className="flex gap-4">
                <label>
                    <input type="radio" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} />
                    환자
                </label>
                <label>
                    <input type="radio" value="therapist" checked={role === 'therapist'} onChange={() => setRole('therapist')} />
                    치료사
                </label>
            </div>

            <Button type="submit">회원가입</Button>
        </form>
    );
}