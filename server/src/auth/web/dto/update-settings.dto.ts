import { IsIn } from 'class-validator';

// Whitelisted values keep the stored JSON in lockstep with the client's options
// (lib/settings.ts) and reject anything unexpected.
export class UpdateSettingsDto {
  @IsIn(['light', 'sand', 'dark', 'midnight'])
  theme!: string;

  @IsIn(['slate', 'emerald', 'violet', 'amber', 'rose'])
  accent!: string;

  @IsIn(['sm', 'md', 'lg', 'xl'])
  fontSize!: string;
}
