import { JwtService } from '@nestjs/jwt';
import { GoogleProfile, User, type UserSettings } from './user.model';
import { UserRepositoryPort } from './user.repository.port';

export class AuthService {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User> {
    const existing = await this.userRepository.findByGoogleId(profile.googleId);
    if (existing) {
      return existing;
    }
    const user = User.createFromGoogleProfile(profile);
    await this.userRepository.save(user);
    return user;
  }

  generateJwt(user: User): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  async validateJwtPayload(payload: { sub: string }): Promise<User | null> {
    return this.userRepository.findById(payload.sub);
  }

  // Resolves the logged-in user from a session cookie, or null when there is no
  // valid session. Used by flows (OAuth authorize) that must fall back to login
  // rather than reject with 401 when the caller is unauthenticated.
  async userFromSession(cookieToken: string | undefined): Promise<User | null> {
    if (!cookieToken) {
      return null;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(cookieToken);
      return await this.userRepository.findById(payload.sub);
    } catch {
      return null;
    }
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
    await this.userRepository.updateSettings(userId, JSON.stringify(settings));
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }
}
