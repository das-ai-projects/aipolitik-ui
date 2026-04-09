'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Heart, ThumbsDown } from 'lucide-react';
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
            'flex min-h-11 flex-1 min-w-0 items-center justify-center gap-1.5 border-r border-slate-200 py-2 text-sm font-medium transition-colors',
            'text-slate-600 hover:bg-rose-50 hover:text-rose-600',
            'disabled:opacity-50',
            myReaction === 'LIKE' && 'bg-rose-50 text-rose-600'
          )}
          aria-pressed={myReaction === 'LIKE'}
          aria-label={myReaction === 'LIKE' ? 'Unlike' : 'Like'}
        >
          <Heart
            className="h-5 w-5 shrink-0"
            strokeWidth={1.75}
            fill={myReaction === 'LIKE' ? 'currentColor' : 'none'}
          />
          <span className="tabular-nums">{like_count}</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => send('DISLIKE')}
          className={cn(
            'flex min-h-11 flex-1 min-w-0 items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors',
            'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            'disabled:opacity-50',
            myReaction === 'DISLIKE' && 'bg-slate-200 text-slate-900'
          )}
          aria-pressed={myReaction === 'DISLIKE'}
          aria-label={myReaction === 'DISLIKE' ? 'Remove dislike' : 'Dislike'}
        >
          <ThumbsDown className="h-5 w-5 shrink-0" strokeWidth={1.75} />
          <span className="tabular-nums">{dislike_count}</span>
        </button>
      </div>
    </div>
  );
}
