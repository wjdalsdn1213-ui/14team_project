import { signUpSchema } from '@/lib/validations/auth';
// 파일 최상단 import 문을 이렇게 바꿔보세요
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();

    // 1. Zod로 검증 (여기서 email, password, role 변수가 생성됨)
    const result = signUpSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json({ error: '유효하지 않은 입력값입니다.' }, { status: 400 });
    }

    const { email, password, role } = result.data;
    const cookieStore = cookies();

    // 2. Supabase 클라이언트 생성
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            // cookies 부분 전체를 아래 코드로 교체하세요
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    // 3. 변수(email, password, role)를 사용하는 Supabase 로직 추가!
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role }, // 여기서 role 변수를 사용하게 되므로 에러가 사라집니다.
        },
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
}