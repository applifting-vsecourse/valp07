import { PrismaService } from '@/core/prisma/prisma.service';
import { Mood, Quack } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  mood?: Mood | null;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, mood, userId, createdAt } = params;

  return await prisma.quack.create({
    data: {
      text,
      mood: mood ?? null,
      createdAt,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}
