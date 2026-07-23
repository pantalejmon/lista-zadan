import { randomUUID } from 'crypto';
import { UserResponse } from '../web/dto/user.response';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export class User {
  readonly id: string;
  readonly googleId: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly createdAt: number;
  readonly usedStorageBytes: number;

  constructor(
    id: string,
    googleId: string,
    email: string,
    displayName: string,
    avatarUrl: string | null,
    createdAt: number,
    usedStorageBytes: number,
  ) {
    this.id = id;
    this.googleId = googleId;
    this.email = email;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
    this.createdAt = createdAt;
    this.usedStorageBytes = usedStorageBytes;
  }

  static createFromGoogleProfile(profile: GoogleProfile): User {
    return new User(
      randomUUID(),
      profile.googleId,
      profile.email,
      profile.displayName,
      profile.avatarUrl,
      Date.now(),
      0,
    );
  }

  toResponse(): UserResponse {
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
    };
  }
}
