// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Poll } from '@/modules/quack/domain/poll';
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  ...overrides,
});

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  quackId: 'q1',
  options: [
    {
      id: 'opt1',
      pollId: 'p1',
      text: 'Yes',
      order: 0,
      voteCount: 1,
      percentage: 100,
    },
    {
      id: 'opt2',
      pollId: 'p1',
      text: 'No',
      order: 1,
      voteCount: 0,
      percentage: 0,
    },
  ],
  totalVotes: 1,
  userVotedOptionId: 'opt1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(undefined, 'u1')).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    expect(repository.getQuacks).toHaveBeenCalledWith(undefined, 'u1', undefined);
  });

  it('passes search query to the repository', async () => {
    const quacks = [aQuack({ text: 'duck pond' })];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks('duck', 'u1', true)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledWith('duck', 'u1', true);
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: undefined,
      userId: 'u1',
      pollOptions: undefined,
    });
  });

  it('creates a quack with a mood and poll', async () => {
    const created = aQuack({
      id: 'q3',
      text: 'feeling funny',
      mood: 'silly',
      poll: aPoll(),
    });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, {
        text: 'feeling funny',
        mood: 'silly',
        poll: { options: ['Yes', 'No'] },
      }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'feeling funny',
      mood: 'silly',
      userId: 'u1',
      pollOptions: ['Yes', 'No'],
    });
  });

  it('casts a vote on a poll', async () => {
    const poll = aPoll();
    const repository = mock<QuackRepository>();
    repository.vote.mockResolvedValue(poll);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.vote('p1', user, 'opt1')).resolves.toEqual(poll);
    expect(repository.vote).toHaveBeenCalledWith('p1', 'u1', 'opt1');
  });

  it('retracts a vote on a poll', async () => {
    const poll = aPoll({ totalVotes: 0, userVotedOptionId: null });
    const repository = mock<QuackRepository>();
    repository.retractVote.mockResolvedValue(poll);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.retractVote('p1', user)).resolves.toEqual(poll);
    expect(repository.retractVote).toHaveBeenCalledWith('p1', 'u1');
  });

  it('deletes a quack', async () => {
    const repository = mock<QuackRepository>();
    repository.deleteQuack.mockResolvedValue();

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.deleteQuack('q1', user)).resolves.toBeUndefined();
    expect(repository.deleteQuack).toHaveBeenCalledWith('q1', 'u1');
  });
});
