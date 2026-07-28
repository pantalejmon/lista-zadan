import { IsIn, IsArray, IsOptional, ArrayMaxSize } from 'class-validator';
import { ACCENTS, FONT_SIZES, HIDEABLE_MODULES, THEMES } from '../../../common/appearance';

// Dopuszczalne wartości pochodzą z kontraktu wyglądu (`common/appearance.ts`) —
// tej samej listy używa klient i narzędzie MCP, więc nie da się dodać opcji
// w UI, której serwer nie przyjmie.
export class UpdateSettingsDto {
  @IsIn([...THEMES])
  theme!: string;

  @IsIn([...ACCENTS])
  accent!: string;

  @IsIn([...FONT_SIZES])
  fontSize!: string;

  // Moduły ukryte w menu. Zadań nie da się ukryć, więc nie ma ich na liście.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HIDEABLE_MODULES.length)
  @IsIn([...HIDEABLE_MODULES], { each: true })
  hiddenModules?: string[];
}
