import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoteDto {
  @ApiProperty({ description: 'ID of the selected option' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
