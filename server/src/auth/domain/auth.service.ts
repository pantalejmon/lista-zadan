import { JwtService } from '@nestjs/jwt';
import { GoogleProfile, User } from './user.model';
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

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }
}
