import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListQuacksDto {
  @ApiPropertyOptional({
    description: 'Search query to filter quacks by text or author',
    example: 'duck',
  })
  @IsOptional()
  @IsString()
  q?: string;
}

