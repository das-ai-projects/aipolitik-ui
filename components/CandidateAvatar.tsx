'use client';

import { getPartyColor } from '@/lib/party-colors';

export interface CandidateAvatarProps {
  /** URL for the candidate's small profile image. */
  imagePath: string;
  /** Candidate name (used for alt text). */
  name: string;
  /** Political party (used for border color). */
  party: string;
  /** Optional size: default is 4rem (w-16 h-16). */
  sizeClass?: string;
}

/**
 * Circular candidate profile image with a bold border color derived from
 * the candidate's political party. Reused in position cards and random
 * candidate follow lists.
 */
export default function CandidateAvatar({
  imagePath,
  name,
  party,
  sizeClass = 'w-16 h-16',
}: CandidateAvatarProps) {
  const partyColor = getPartyColor(party);

  return (
    <div
      className={`shrink-0 rounded-full p-[4px] ${sizeClass}`}
      style={{ backgroundColor: partyColor }}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePath}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
