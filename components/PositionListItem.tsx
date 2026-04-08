'use client';

import CandidateAvatar from '@/components/CandidateAvatar';
import PositionReactionBar from '@/components/PositionReactionBar';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';
import type { CandidatePosition, PositionReactionKind } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  position: CandidatePosition;
  /** Merged onto the root article (e.g. adjust padding in embedded contexts). */
  className?: string;
}

/**
 * Turns a raw date string (e.g. "2026-03-03T12:00:00Z") into something
 * readable like "March 3, 2026".
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Displays one candidate's position as a card in the feed.
 *
 * Each card shows:
 *   • A circular photo with a coloured ring matching the candidate's party
 *   • The candidate's name, party, and the date the position was generated
 *   • The full policy position text below
 */
export default function PositionListItem({ position, className }: Props) {
  const { candidate, policy_position, date_generated } = position;
  const displayParty = useTranslatedText(candidate.party ?? '');
  const displayPosition = useTranslatedText(policy_position ?? '');

  const [reactionStats, setReactionStats] = useState(() => ({
    like_count: position.reaction_stats?.like_count ?? 0,
    dislike_count: position.reaction_stats?.dislike_count ?? 0,
  }));
  const [myReaction, setMyReaction] = useState<PositionReactionKind | null>(
    () => position.my_reaction ?? null
  );

  useEffect(() => {
    setReactionStats({
      like_count: position.reaction_stats?.like_count ?? 0,
      dislike_count: position.reaction_stats?.dislike_count ?? 0,
    });
    setMyReaction(position.my_reaction ?? null);
  }, [
    position.id,
    position.reaction_stats?.like_count,
    position.reaction_stats?.dislike_count,
    position.my_reaction,
  ]);

  const partyColor = getPartyColor(candidate.party);

  return (
    <article
      className={cn(
        'flex gap-4 px-6 py-5 transition-colors hover:bg-slate-50',
        className
      )}
    >
      <div className="shrink-0">
        <Link href={`/leaders/${candidate.id}`}>
          <CandidateAvatar
            imagePath={candidate.small_image_path}
            name={candidate.name}
            party={candidate.party}
          />
        </Link>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
          <Link href={`/leaders/${candidate.id}`}>
            <span className="truncate text-base font-bold text-slate-900">
              {candidate.name}
            </span>
          </Link>
          <span
            className="text-sm font-semibold"
            style={{ color: partyColor }}
          >
            {displayParty}
          </span>
          <span className="text-sm text-slate-400">·</span>
          <span className="text-sm text-slate-400">
            {formatDate(date_generated)}
          </span>
        </div>

        <Link href={`/posts/${position.id}`}>
          <p className="text-base leading-relaxed text-slate-700 whitespace-pre-line transition-colors hover:text-slate-900">
            {displayPosition}
          </p>
        </Link>

        <PositionReactionBar
          candidatePositionId={position.id}
          reactionStats={reactionStats}
          myReaction={myReaction}
          onReactionChange={({ reaction_stats, my_reaction }) => {
            setReactionStats(reaction_stats);
            setMyReaction(my_reaction);
          }}
        />
      </div>
    </article>
  );
}
