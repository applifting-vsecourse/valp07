import { Poll } from '@/modules/quack/domain/poll';
import { Mood, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
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

    return this.quackRepository.deleteQuack(quackId);
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
