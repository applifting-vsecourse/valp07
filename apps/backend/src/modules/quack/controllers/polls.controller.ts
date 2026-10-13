import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Param,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PollResponseDto } from './dto/poll.response.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('polls')
@Controller('polls')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PollsController {
  constructor(private readonly quacksService: QuacksService) {}

  @Put(':pollId/vote')
  @ApiOperation({ summary: 'Cast or change vote on a poll' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 400, description: 'Option does not belong to poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async vote(
    @Param('pollId') pollId: string,
    @User() user: Identity,
    @Body() body: VoteDto,
  ): Promise<PollResponseDto> {
    const poll = await this.quacksService.vote(pollId, user, body.optionId);
    return PollResponseDto.fromDomain(poll);
  }

  @Delete(':pollId/vote')
  @ApiOperation({ summary: 'Retract vote from a poll' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async retractVote(
    @Param('pollId') pollId: string,
    @User() user: Identity,
  ): Promise<PollResponseDto> {
    const poll = await this.quacksService.retractVote(pollId, user);
    return PollResponseDto.fromDomain(poll);
  }
}
