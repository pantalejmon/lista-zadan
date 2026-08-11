import { request } from '@platform/api/http';

// Ustawienia użytkownika — należą do konta, nie do gospodarstwa.

export async function updateUserSettings(settings: {
  theme: string;
  accent: string;
  fontSize: string;
}): Promise<void> {
  await request('/auth/me/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

