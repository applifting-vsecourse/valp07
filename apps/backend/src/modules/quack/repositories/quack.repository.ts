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
  _count?: {
    replies?: number;
  };
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
  replyToId: quack.replyToId ?? null,
  replyCount: quack._count?.replies ?? 0,
  deletedAt: quack.deletedAt ?? null,
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
    const conditions: Prisma.QuackWhereInput[] = [
      { replyToId: null },
      { deletedAt: null },
    ];

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

    const where: Prisma.QuackWhereInput = { AND: conditions };

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
        _count: {
          select: {
            replies: {
              where: { deletedAt: null },
            },
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

  async getQuackById(
    quackId: string,
    currentUserId?: string,
  ): Promise<Quack | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      include: {
        user: true,
        poll: {
          include: {
            options: { orderBy: { order: 'asc' } },
            votes: true,
          },
        },
        _count: {
          select: {
            replies: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!quack) {
      return null;
    }

    return mapPrismaQuackToDomain(quack, currentUserId);
  }

  async getReplies(quackId: string, currentUserId?: string): Promise<Quack[]> {
    const replies = await this.prisma.quack.findMany({
      where: {
        replyToId: quackId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return replies.map((q) => mapPrismaQuackToDomain(q, currentUserId));
  }

  async createReply(data: {
    replyToId: string;
    text: string;
    userId: string;
  }): Promise<Quack> {
    const reply = await this.prisma.quack.create({
      data: {
        text: data.text,
        replyToId: data.replyToId,
        userId: data.userId,
      },
      include: {
        user: true,
      },
    });
    return mapPrismaQuackToDomain(reply, data.userId);
  }

  async countActiveReplies(quackId: string): Promise<number> {
    return this.prisma.quack.count({
      where: {
        replyToId: quackId,
        deletedAt: null,
      },
    });
  }

  async tombstoneQuack(quackId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.poll.deleteMany({
        where: { quackId },
      });
      await tx.quack.update({
        where: { id: quackId },
        data: {
          text: '[This quack was deleted by author]',
          mood: null,
          deletedAt: new Date(),
        },
      });
    });
  }

  async deleteQuack(quackId: string): Promise<void> {
    await this.prisma.quack.delete({
      where: { id: quackId },
    });
  }
}
