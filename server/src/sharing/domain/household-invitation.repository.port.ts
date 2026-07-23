import { HouseholdInvitation } from './household-invitation.model';

export abstract class HouseholdInvitationRepositoryPort {
  abstract findById(id: string): Promise<HouseholdInvitation | null>;
  abstract findPendingByEmail(email: string): Promise<HouseholdInvitation[]>;
  abstract save(invitation: HouseholdInvitation): Promise<void>;
  abstract update(invitation: HouseholdInvitation): Promise<void>;
  abstract deleteByHouseholdId(householdId: string): Promise<void>;
}
