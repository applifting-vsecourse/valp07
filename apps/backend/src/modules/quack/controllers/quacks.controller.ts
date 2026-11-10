import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { CreateQuackDto } from './dto/create-quack.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListQuacksDto } from './dto/list-quacks.dto';
import { QuackResponseDto } from './dto/quack.response.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({ summary: 'List all quacks' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: ListQuacksDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(
      query.q,
      user.id,
      query.mine,
    );
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single quack by ID' })
  @ApiResponse({ status: 200, type: QuackResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async getById(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.getQuackById(id, user.id);
    return QuackResponseDto.fromDomain(quack);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'List replies for a quack' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async getReplies(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<QuackResponseDto[]> {
    const replies = await this.quacksService.getReplies(id, user.id);
    return replies.map(QuackResponseDto.fromDomain);
  }

  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cannot reply to deleted or nested quack',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async reply(
    @User() user: Identity,
    @Param('id') id: string,
    @Body() body: CreateReplyDto,
  ): Promise<QuackResponseDto> {
    const reply = await this.quacksService.createReply(id, user, body.text);
    return QuackResponseDto.fromDomain(reply);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      poll: body.poll,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quack' })
  @ApiResponse({ status: 204, description: 'Quack deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not author of this quack',
  })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async delete(@User() user: Identity, @Param('id') id: string): Promise<void> {
    await this.quacksService.deleteQuack(id, user);
  }
}
