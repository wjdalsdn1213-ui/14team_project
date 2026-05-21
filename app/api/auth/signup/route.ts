import { signUpSchema } from '@/lib/validations/auth';
// ... 나머지 import

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, role } = signUpSchema.parse(body); // 기존 검증 로직 재사용
  
  // Supabase 로직 수행...
}