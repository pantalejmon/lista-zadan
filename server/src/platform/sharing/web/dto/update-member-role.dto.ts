import { IsIn } from 'class-validator';
import type { ListRole } from '../../domain/list-role';

export class UpdateMemberRoleDto {
  @IsIn(['owner', 'editor', 'viewer'])
  role!: ListRole;
}
