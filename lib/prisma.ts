// @ts-expect-error
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(); // 7버전은 생성자 인자 전달 방식이 달라졌지만, 기본은 이겁니다.

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}