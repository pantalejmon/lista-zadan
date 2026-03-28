import { IsEmail, IsIn } from 'class-validator';
import type { ListRole } from '../../domain/list-role';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn(['editor', 'viewer'])
  role!: ListRole;
}
