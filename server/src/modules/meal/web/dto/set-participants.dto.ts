import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { MealParticipantDto } from './meal-participant.dto';

export class SetParticipantsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MealParticipantDto)
  participants!: MealParticipantDto[];
}
