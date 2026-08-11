import type { HouseholdInvitation } from '@platform/api/types';

interface InvitationBannerProps {
  invitations: HouseholdInvitation[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function InvitationBanner({ invitations, onAccept, onDecline }: InvitationBannerProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-3 space-y-2">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-3 animate-fadeIn"
        >
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{inv.invitedByName}</strong> zaprasza Cię do gospodarstwa{' '}
            <strong>{inv.householdName}</strong>{' '}
            <span className="text-xs">
              ({inv.role === 'editor' ? 'edytor' : 'podgląd'})
            </span>
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onAccept(inv.id)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Akceptuj
            </button>
            <button
              onClick={() => onDecline(inv.id)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Odrzuć
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
