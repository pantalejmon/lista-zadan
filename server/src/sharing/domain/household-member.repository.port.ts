import { HouseholdMember } from './household-member.model';

export abstract class HouseholdMemberRepositoryPort {
  abstract findByHouseholdId(householdId: string): Promise<HouseholdMember[]>;
  abstract findByUserId(userId: string): Promise<HouseholdMember[]>;
  abstract findByHouseholdAndUser(householdId: string, userId: string): Promise<HouseholdMember | null>;
  abstract save(member: HouseholdMember): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByHouseholdId(householdId: string): Promise<void>;
}
