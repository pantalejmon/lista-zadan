import { AuthService } from '../../../auth/domain/auth.service';
import { UpdateSettingsDto } from '../../../auth/web/dto/update-settings.dto';
import { McpTool, requireStringArg } from '../mcp-tool';

const THEMES = ['light', 'sand', 'dark', 'midnight'];
const ACCENTS = ['slate', 'blue', 'teal', 'emerald', 'violet', 'plum', 'rose', 'terracotta', 'amber'];
const FONT_SIZES = ['sm', 'md', 'lg', 'xl'];
const HIDEABLE_MODULES = ['meals', 'home', 'finance', 'chat'];

// Ustawienia aplikacji użytkownika (wygląd + widoczne moduły). To dane konta,
// nie gospodarstwa — stąd własny scope `settings:*`, a nie `households:*`.
export function buildSettingsTools(authService: AuthService): McpTool[] {
  return [
    {
      name: 'get_settings',
      description:
        'Zwraca ustawienia aplikacji użytkownika: motyw, kolor akcentu, rozmiar tekstu oraz ukryte moduły ' +
        '(sekcje niewidoczne w menu).',
      requiredScopes: ['settings:read'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async (_args, ctx) => {
        const user = await authService.findUserById(ctx.userId);
        return user?.toResponse().settings ?? null;
      },
    },
    {
      name: 'update_settings',
      description:
        'Zmienia ustawienia aplikacji. Wymaga kompletu: theme, accent, fontSize. Opcjonalnie hiddenModules — ' +
        'lista modułów ukrytych w menu (meals/home/finance/chat); Zadań nie da się ukryć.',
      requiredScopes: ['settings:write'],
      inputSchema: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: THEMES, description: 'Motyw' },
          accent: { type: 'string', enum: ACCENTS, description: 'Kolor akcentu' },
          fontSize: { type: 'string', enum: FONT_SIZES, description: 'Rozmiar tekstu' },
          hiddenModules: {
            type: 'array',
            description: 'Moduły ukryte w menu',
            items: { type: 'string', enum: HIDEABLE_MODULES },
          },
        },
        required: ['theme', 'accent', 'fontSize'],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const dto = new UpdateSettingsDto();
        dto.theme = requireStringArg(args, 'theme');
        dto.accent = requireStringArg(args, 'accent');
        dto.fontSize = requireStringArg(args, 'fontSize');
        if (Array.isArray(args.hiddenModules)) {
          dto.hiddenModules = args.hiddenModules.filter(
            (module): module is string => typeof module === 'string' && HIDEABLE_MODULES.includes(module),
          );
        }
        await authService.updateUserSettings(ctx.userId, {
          theme: dto.theme,
          accent: dto.accent,
          fontSize: dto.fontSize,
          hiddenModules: dto.hiddenModules,
        });
        return { updated: true, settings: dto };
      },
    },
  ];
}
