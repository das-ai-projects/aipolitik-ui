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
  className?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Card variant for post detail "More from this candidate" rail:
 * - top area contains avatar/name/party/date and text
 * - reaction buttons sit in a dedicated full-width footer row
 */
export default function PostRelatedPositionItem({ position, className }: Props) {
  const { candidate, policy_position, date_generated } = position;
  const displayParty = useTranslatedText(candidate.party ?? '');
  const displayPosition = useTranslatedText(policy_position ?? '');
  const partyColor = getPartyColor(candidate.party);

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

  return (
    <article className={cn('flex h-full flex-col', className)}>
      <div className="flex min-h-0 flex-1 gap-3 px-4 py-4">
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
            <span className="text-sm font-semibold" style={{ color: partyColor }}>
              {displayParty}
            </span>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-400">
              {formatDate(date_generated)}
            </span>
          </div>

          <Link href={`/posts/${position.id}`}>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line transition-colors hover:text-slate-900">
              {displayPosition}
            </p>
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 pb-3">
        <PositionReactionBar
          candidatePositionId={position.id}
          reactionStats={reactionStats}
          myReaction={myReaction}
          onReactionChange={({ reaction_stats, my_reaction }) => {
            setReactionStats(reaction_stats);
            setMyReaction(my_reaction);
          }}
          className="pt-2"
        />
      </div>
    </article>
  );
}
