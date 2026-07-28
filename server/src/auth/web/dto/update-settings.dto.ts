import { IsIn, IsArray, IsOptional, ArrayMaxSize } from 'class-validator';

// Whitelisted values keep the stored JSON in lockstep with the client's options
// (lib/settings.ts) and reject anything unexpected.
export class UpdateSettingsDto {
  @IsIn(['light', 'sand', 'dark', 'midnight'])
  theme!: string;

  @IsIn(['slate', 'blue', 'teal', 'emerald', 'violet', 'plum', 'rose', 'terracotta', 'amber'])
  accent!: string;

  @IsIn(['sm', 'md', 'lg', 'xl'])
  fontSize!: string;

  // Moduły ukryte w menu. Zadań nie da się ukryć, więc nie ma ich na liście.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(['meals', 'home', 'finance', 'chat'], { each: true })
  hiddenModules?: string[];
}
