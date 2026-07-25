import { User } from './user.model';

export abstract class UserRepositoryPort {
  abstract findById(id: string): Promise<User | null>;
  abstract findByGoogleId(googleId: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract save(user: User): Promise<void>;
  abstract addStorageUsed(userId: string, deltaBytes: number): Promise<void>;
  abstract updateSettings(userId: string, settingsJson: string): Promise<void>;
}
