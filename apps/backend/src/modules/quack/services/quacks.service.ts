import { Poll } from '@/modules/quack/domain/poll';
import { Mood, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    search?: string,
    currentUserId?: string,
    mine?: boolean,
  ): Promise<Quack[]> {
    return this.quackRepository.getQuacks(search, currentUserId, mine);
  }

  async getQuackById(quackId: string, currentUserId?: string): Promise<Quack> {
    const quack = await this.quackRepository.getQuackById(
      quackId,
      currentUserId,
    );
    if (!quack) {
      throw new NotFoundException(`Quack with id ${quackId} not found`);
    }
    return quack;
  }

  async getReplies(quackId: string, currentUserId?: string): Promise<Quack[]> {
    const quack = await this.quackRepository.getQuackById(
      quackId,
      currentUserId,
    );
    if (!quack) {
      throw new NotFoundException(`Quack with id ${quackId} not found`);
    }
    return this.quackRepository.getReplies(quackId, currentUserId);
  }

  async createReply(
    quackId: string,
    user: Identity,
    text: string,
  ): Promise<Quack> {
    const parent = await this.quackRepository.getQuackById(quackId, user.id);
    if (!parent) {
      throw new NotFoundException(`Quack with id ${quackId} not found`);
    }
    if (parent.deletedAt) {
      throw new BadRequestException('Cannot reply to a deleted quack');
    }
    if (parent.replyToId) {
      throw new BadRequestException('Cannot reply to a reply');
    }

    return this.quackRepository.createReply({
      replyToId: quackId,
      text,
      userId: user.id,
    });
  }

  async deleteQuack(quackId: string, user: Identity): Promise<void> {
    const quack = await this.quackRepository.getQuackById(quackId);

    if (!quack) {
      throw new NotFoundException(`Quack with id ${quackId} not found`);
    }

    const isOwner = quack.userId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this quack',
      );
    }

    // If deleting a reply
    if (quack.replyToId) {
      await this.quackRepository.deleteQuack(quackId);
      // Clean up orphaned tombstoned parent if this was its last reply
      const parent = await this.quackRepository.getQuackById(quack.replyToId);
      if (parent && parent.deletedAt) {
        const remainingReplies = await this.quackRepository.countActiveReplies(
          parent.id,
        );
        if (remainingReplies === 0) {
          await this.quackRepository.deleteQuack(parent.id);
        }
      }
      return;
    }

    // Top-level quack
    const activeReplies =
      await this.quackRepository.countActiveReplies(quackId);
    if (activeReplies > 0) {
      await this.quackRepository.tombstoneQuack(quackId);
    } else {
      await this.quackRepository.deleteQuack(quackId);
    }
  }

  async createQuack(
    user: Identity,
    quackData: {
      text: string;
      mood?: Mood | null;
      poll?: { options: string[] };
    },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      userId: user.id,
      pollOptions: quackData.poll?.options,
    });
  }

  async vote(pollId: string, user: Identity, optionId: string): Promise<Poll> {
    return this.quackRepository.vote(pollId, user.id, optionId);
  }

  async retractVote(pollId: string, user: Identity): Promise<Poll> {
    return this.quackRepository.retractVote(pollId, user.id);
  }
}
