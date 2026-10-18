export type PollOption = {
  id: string;
  pollId: string;
  text: string;
  order: number;
  voteCount: number;
  percentage: number;
};

export type Poll = {
  id: string;
  quackId: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
