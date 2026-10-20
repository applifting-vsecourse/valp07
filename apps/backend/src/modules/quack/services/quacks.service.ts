import { Poll } from '@/modules/quack/domain/poll';
import { Mood, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

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
    return this.quackRepository.deleteQuack(quackId, user.id);
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
