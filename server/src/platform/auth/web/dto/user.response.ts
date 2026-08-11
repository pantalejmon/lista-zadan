import type { UserSettings } from '../../domain/user.model';

export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly settings: UserSettings | null;
}
