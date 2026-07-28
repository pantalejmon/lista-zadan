import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

// Porcje jako ułamek pełnej porcji przepisu: 0,5 = pół, 2 = dokładka.
// Górny limit chroni bilans przed literówką w stylu „20 porcji".
export class MealParticipantDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @Min(0.25)
  @Max(10)
  portions!: number;
}
