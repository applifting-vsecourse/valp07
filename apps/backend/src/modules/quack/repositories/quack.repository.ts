import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Poll as PrismaPoll,
  PollOption as PrismaPollOption,
  PollVote as PrismaPollVote,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Poll } from '@/modules/quack/domain/poll';
import { Mood, Quack } from '@/modules/quack/domain/quack';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type PrismaQuackWithRelations = PrismaQuack & {
  user?: PrismaUser;
  poll?:
    | (PrismaPoll & {
        options: PrismaPollOption[];
        votes: PrismaPollVote[];
      })
    | null;
};

export const mapPrismaPollToDomain = (
  poll: PrismaPoll & {
    options: PrismaPollOption[];
    votes: PrismaPollVote[];
  },
  currentUserId?: string,
): Poll => {
  const totalVotes = poll.votes.length;
  const options = poll.options.map((option) => {
    const voteCount = poll.votes.filter((v) => v.optionId === option.id).length;
    const percentage =
      totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    return {
      id: option.id,
      pollId: option.pollId,
      text: option.text,
      order: option.order,
      voteCount,
      percentage,
    };
  });

  const userVote = currentUserId
    ? poll.votes.find((v) => v.userId === currentUserId)
    : undefined;

  return {
    id: poll.id,
    quackId: poll.quackId,
    options,
    totalVotes,
    userVotedOptionId: userVote ? userVote.optionId : null,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
  };
};

const mapPrismaQuackToDomain = (
  quack: PrismaQuackWithRelations,
  currentUserId?: string,
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.displayUsername || quack.user.username || '',
      }
    : undefined,
  poll: quack.poll ? mapPrismaPollToDomain(quack.poll, currentUserId) : null,
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(
    search?: string,
    currentUserId?: string,
    mine?: boolean,
  ): Promise<Quack[]> {
    const trimmed = search?.trim();
    const conditions: Prisma.QuackWhereInput[] = [];

    if (mine && currentUserId) {
      conditions.push({ userId: currentUserId });
    }

    if (trimmed) {
      conditions.push({
        OR: [
          { text: { contains: trimmed, mode: 'insensitive' as const } },
          {
            user: {
              name: { contains: trimmed, mode: 'insensitive' as const },
            },
          },
          {
            user: {
              username: { contains: trimmed, mode: 'insensitive' as const },
            },
          },
          {
            user: {
              displayUsername: {
                contains: trimmed,
                mode: 'insensitive' as const,
              },
            },
          },
        ],
      });
    }

    const where: Prisma.QuackWhereInput | undefined =
      conditions.length > 0 ? { AND: conditions } : undefined;

    const quacks = await this.prisma.quack.findMany({
      where,
      include: {
        user: true,
        poll: {
          include: {
            options: { orderBy: { order: 'asc' } },
            votes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map((q) => mapPrismaQuackToDomain(q, currentUserId));
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: Mood | null;
    userId: string;
    pollOptions?: string[];
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood ?? null,
        user: { connect: { id: createQuackData.userId } },
        ...(createQuackData.pollOptions &&
        createQuackData.pollOptions.length >= 2
          ? {
              poll: {
                create: {
                  options: {
                    create: createQuackData.pollOptions.map((text, idx) => ({
                      text,
                      order: idx,
                    })),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        user: true,
        poll: {
          include: {
            options: { orderBy: { order: 'asc' } },
            votes: true,
          },
        },
      },
    });
    return mapPrismaQuackToDomain(quack, createQuackData.userId);
  }

  async vote(pollId: string, userId: string, optionId: string): Promise<Poll> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) {
      throw new NotFoundException(`Poll with id ${pollId} not found`);
    }

    const optionExists = poll.options.some((o) => o.id === optionId);
    if (!optionExists) {
      throw new BadRequestException(
        `Option ${optionId} does not belong to poll ${pollId}`,
      );
    }

    await this.prisma.pollVote.upsert({
      where: {
        pollId_userId: { pollId, userId },
      },
      create: {
        pollId,
        userId,
        optionId,
      },
      update: {
        optionId,
      },
    });

    const updatedPoll = await this.prisma.poll.findUniqueOrThrow({
      where: { id: pollId },
      include: {
        options: { orderBy: { order: 'asc' } },
        votes: true,
      },
    });
    return mapPrismaPollToDomain(updatedPoll, userId);
  }

  async retractVote(pollId: string, userId: string): Promise<Poll> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    });
    if (!poll) {
      throw new NotFoundException(`Poll with id ${pollId} not found`);
    }

    await this.prisma.pollVote.deleteMany({
      where: {
        pollId,
        userId,
      },
    });

    const updatedPoll = await this.prisma.poll.findUniqueOrThrow({
      where: { id: pollId },
      include: {
        options: { orderBy: { order: 'asc' } },
        votes: true,
      },
    });
    return mapPrismaPollToDomain(updatedPoll, userId);
  }

  async deleteQuack(
    quackId: string,
    userId: string,
    userRole?: string,
  ): Promise<void> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
    });

    if (!quack) {
      throw new NotFoundException(`Quack with id ${quackId} not found`);
    }

    const isAuthor = quack.userId === userId;
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this quack',
      );
    }

    await this.prisma.quack.delete({
      where: { id: quackId },
    });
  }
}
