import { Poll, PollOption } from '@/modules/quack/domain/poll';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PollOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  voteCount!: number;

  @ApiProperty()
  percentage!: number;

  static fromDomain(option: PollOption): PollOptionResponseDto {
    return {
      id: option.id,
      text: option.text,
      order: option.order,
      voteCount: option.voteCount,
      percentage: option.percentage,
    };
  }
}

export class PollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  quackId!: string;

  @ApiProperty({ type: [PollOptionResponseDto] })
  options!: PollOptionResponseDto[];

  @ApiProperty()
  totalVotes!: number;

  @ApiPropertyOptional({ nullable: true })
  userVotedOptionId?: string | null;

  static fromDomain(poll: Poll): PollResponseDto {
    return {
      id: poll.id,
      quackId: poll.quackId,
      options: poll.options.map(PollOptionResponseDto.fromDomain),
      totalVotes: poll.totalVotes,
      userVotedOptionId: poll.userVotedOptionId ?? null,
    };
  }
}
