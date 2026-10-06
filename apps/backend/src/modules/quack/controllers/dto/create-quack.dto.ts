import { Mood } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiPropertyOptional({
    description: 'Optional mood of the quack',
    enum: ['happy', 'sad', 'angry', 'silly'],
    example: 'happy',
    nullable: true,
  })
  @IsOptional()
  @IsIn(['happy', 'sad', 'angry', 'silly'])
  mood?: Mood;
}
