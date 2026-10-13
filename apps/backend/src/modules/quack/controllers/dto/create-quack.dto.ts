import { Mood } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreatePollDto {
  @ApiProperty({
    description: 'Array of poll options',
    example: ['Pizza', 'Burgers'],
    minItems: 2,
    maxItems: 4,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(80, { each: true })
  options!: string[];
}

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

  @ApiPropertyOptional({
    description: 'Optional poll attached to the quack',
    type: CreatePollDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePollDto)
  poll?: CreatePollDto;
}
