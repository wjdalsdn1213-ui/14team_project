import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 형식이 아닙니다." }),
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, { message: "이름을 입력해주세요." }),
  email: z.string().email({ message: "유효한 이메일 형식이 아닙니다." }),
  password: z.string().min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다." }),
  // 환자/치료사 역할 선택을 위한 필드
  role: z.enum(["patient", "therapist"], { 
    errorMap: () => ({ message: "역할을 선택해주세요." }) 
  }),
});
