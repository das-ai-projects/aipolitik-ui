'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useCallback } from 'react';

import type { PositionReactionKind, PositionReactionStats } from '@/lib/graphql/types';
import { cn } from '@/lib/utils';

const SET_POSITION_REACTION = gql`
  mutation SetCandidatePositionReaction(
    $candidatePositionId: String!
    $reaction: PositionReactionKind!
  ) {
    setCandidatePositionReaction(
      candidatePositionId: $candidatePositionId
      reaction: $reaction
    ) {
      candidatePositionId
      reaction_stats {
        like_count
        dislike_count
      }
      my_reaction
      reactionMade
    }
  }
`;

interface Props {
  candidatePositionId: string;
  reactionStats: PositionReactionStats;
  myReaction: PositionReactionKind | null;
  onReactionChange: (next: {
    reaction_stats: PositionReactionStats;
    my_reaction: PositionReactionKind | null;
    reactionMade: string | null;
  }) => void;
  className?: string;
}

export default function PositionReactionBar({
  candidatePositionId,
  reactionStats,
  myReaction,
  onReactionChange,
  className,
}: Props) {
  const [setReaction, { loading }] = useMutation(SET_POSITION_REACTION, {
    onCompleted(data) {
      const p = (data as {
        setCandidatePositionReaction: {
          reaction_stats: PositionReactionStats;
          my_reaction: PositionReactionKind | null;
          reactionMade: string | null;
        };
      }).setCandidatePositionReaction;
      onReactionChange({
        reaction_stats: p.reaction_stats,
        my_reaction: p.my_reaction ?? null,
        reactionMade: p.reactionMade ?? null,
      });
    },
  });

  const send = useCallback(
    (reaction: PositionReactionKind) => {
      if (loading) return;
      void setReaction({ variables: { candidatePositionId, reaction } });
    },
    [candidatePositionId, loading, setReaction]
  );

  const { like_count, dislike_count } = reactionStats;

  return (
    <div className={cn('w-full pt-3', className)}>
      <div className="flex w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          disabled={loading}
          onClick={() => send('LIKE')}
          className={cn(
            'group/like flex min-h-11 flex-1 min-w-0 items-center justify-center gap-1.5 border-r border-slate-200 py-2 text-sm font-medium transition-colors',
            'text-slate-600 hover:bg-emerald-50',
            'disabled:opacity-50',
            myReaction === 'LIKE' && 'bg-emerald-50'
          )}
          aria-pressed={myReaction === 'LIKE'}
          aria-label={myReaction === 'LIKE' ? 'Unlike' : 'Like'}
        >
          <ThumbsUp
            className={cn(
              'h-5 w-5 shrink-0 fill-transparent transition-colors',
              myReaction === 'LIKE'
                ? 'fill-current text-emerald-500'
                : 'text-slate-400 group-hover/like:fill-current group-hover/like:text-emerald-500'
            )}
            strokeWidth={1.75}
          />
          <span className="tabular-nums text-slate-600">{like_count}</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => send('DISLIKE')}
          className={cn(
            'group/dislike flex min-h-11 flex-1 min-w-0 items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors',
            'text-slate-600 hover:bg-orange-50',
            'disabled:opacity-50',
            myReaction === 'DISLIKE' && 'bg-orange-50'
          )}
          aria-pressed={myReaction === 'DISLIKE'}
          aria-label={myReaction === 'DISLIKE' ? 'Remove dislike' : 'Dislike'}
        >
          <ThumbsDown
            className={cn(
              'h-5 w-5 shrink-0 fill-transparent transition-colors',
              myReaction === 'DISLIKE'
                ? 'fill-current text-orange-500'
                : 'text-slate-400 group-hover/dislike:fill-current group-hover/dislike:text-orange-500'
            )}
            strokeWidth={1.75}
          />
          <span className="tabular-nums text-slate-600">{dislike_count}</span>
        </button>
      </div>
    </div>
  );
}
