'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import FollowButton from '@/components/FollowButton';
import { getPartyColor } from '@/lib/party-colors';

interface Props {
  candidate: any;
}

export default function CandidateListItem({ candidate }: Props) {
  // Local follow state so the button updates instantly on click.
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  const partyColor = getPartyColor(candidate.party);
  const followState =
    isFollowing !== null ? isFollowing : candidate.follow?.isFollowing ?? false;
  const hasImage =
    typeof candidate.small_image_path === 'string' &&
    candidate.small_image_path.trim() !== '';

  return (
    <article className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">

      {/* Avatar linking to the leader profile */}
      <Link href={`/leaders/${candidate.id}`} className="shrink-0">
        <div
          className="rounded-full p-[3px]"
          style={{ backgroundColor: partyColor }}
        >
          <div className="w-14 h-14 rounded-full overflow-hidden bg-white">
            {hasImage ? (
              <Image
                src={candidate.small_image_path}
                alt={candidate.name}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            ) : (
              <div
                className="w-full h-full bg-slate-200"
                aria-hidden
              />
            )}
          </div>
        </div>
      </Link>

      {/* Name, party, and bio — takes up the remaining space */}
      <Link href={`/leaders/${candidate.id}`} className="flex-1 min-w-0 group">
        <p className="text-base font-bold text-slate-900 leading-tight group-hover:underline truncate">
          {candidate.name}
        </p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: partyColor }}>
          {candidate.party}
        </p>
        {candidate.bio && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-snug">
            {candidate.bio}
          </p>
        )}
      </Link>

      {/* Follow button — right-aligned, doesn't navigate */}
      <div className="shrink-0" onClick={(e) => e.preventDefault()}>
        <FollowButton
          candidateId={candidate.id}
          isFollowing={followState}
          onToggle={setIsFollowing}
        />
      </div>
    </article>
  );
}
