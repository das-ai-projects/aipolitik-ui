'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';

import FollowButton from '@/components/FollowButton';
import PositionReactionBar from '@/components/PositionReactionBar';
import RightSideBar from '@/components/RightSideBar';
import { getPartyColor } from '@/lib/party-colors';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';
import type { PositionReactionKind, PositionReactionStats } from '@/lib/graphql/types';

// ── GraphQL ───────────────────────────────────────────────────────────────────

const GET_POSITION = gql`
  query GetCandidatePositionById($id: String!) {
    getCandidatePositionById(id: $id) {
      id
      policy_position
      date_generated
      candidate {
        id
        name
        party
        medium_image_path
        follow {
          isFollowing
        }
      }
      reaction_stats {
        like_count
        dislike_count
      }
      my_reaction
      reactionMade
    }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, loading, error } = useQuery(GET_POSITION, {
    variables: { id },
  });

  // Local follow state — mirrors the server value but updates immediately
  // when the user clicks Follow/Unfollow, without waiting for a refetch.
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [reactionStats, setReactionStats] = useState<PositionReactionStats | null>(null);
  const [myReaction, setMyReaction] = useState<PositionReactionKind | null>(null);

  const position = (data as any)?.getCandidatePositionById;

  useEffect(() => {
    if (!position) return;
    setReactionStats(
      position.reaction_stats ?? { like_count: 0, dislike_count: 0 }
    );
    setMyReaction(position.my_reaction ?? null);
  }, [position?.id, position?.reaction_stats, position?.my_reaction]);
  const candidate = position?.candidate;
  const partyColor = candidate ? getPartyColor(candidate.party) : '#6b7280';
  const followState =
    isFollowing !== null ? isFollowing : candidate?.follow?.isFollowing ?? false;

  const loadingLabel = useTranslatedText('Loading…');
  const postNotFound = useTranslatedText('Post not found.');
  const errorPrefix = useTranslatedText('Error:');
  const postTitle = useTranslatedText('Post');
  const displayParty = useTranslatedText(candidate?.party ?? '');
  const displayPosition = useTranslatedText(position?.policy_position ?? '');

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-base">
        {loadingLabel}
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-base">
        {error ? `${errorPrefix} ${error.message}` : postNotFound}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">

        {/* Header bar: back arrow + "Post" title" */}
        <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-white/90 backdrop-blur border-b border-slate-100">
          <span className="text-xl font-bold text-slate-900">{postTitle}</span>
        </div>

        {/* Post card */}
        <div className="px-5 py-5">

          {/* Candidate row: avatar + name/party + follow button */}
          <div className="flex items-start justify-between gap-3">

            {/* Left: avatar + name + party */}
            <Link
              href={`/leaders/${candidate.id}`}
              className="flex items-center gap-3 group min-w-0"
            >
              {/* Party-coloured ring around the avatar */}
              <div
                className="shrink-0 rounded-full p-[3px]"
                style={{ backgroundColor: partyColor }}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white">
                  <Image
                    src={candidate.medium_image_path}
                    alt={candidate.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              {/* Name + party tag */}
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-tight group-hover:underline truncate">
                  {candidate.name}
                </p>
                <p
                  className="text-base font-semibold truncate"
                  style={{ color: partyColor }}
                >
                  {displayParty}
                </p>
              </div>
            </Link>

            {/* Right: follow button */}
            <div className="shrink-0">
              <FollowButton
                candidateId={candidate.id}
                isFollowing={followState}
                onToggle={setIsFollowing}
              />
            </div>
          </div>

          {/* Policy position text */}
          <p className="mt-5 text-lg text-slate-800 leading-relaxed whitespace-pre-line">
            {displayPosition}
          </p>

          {/* Date */}
          <p className="mt-4 text-base text-slate-400">
            {formatDate(position.date_generated)}
          </p>

          {reactionStats !== null && (
            <PositionReactionBar
              candidatePositionId={position.id}
              reactionStats={reactionStats}
              myReaction={myReaction}
              onReactionChange={({ reaction_stats, my_reaction }) => {
                setReactionStats(reaction_stats);
                setMyReaction(my_reaction);
              }}
            />
          )}

          {/* Divider */}
          <div className="mt-4 border-t border-slate-100" />
        </div>
      </div>

      {/* ── Right sidebar ──────────────────────────────────────────────────── */}
      <RightSideBar />
    </div>
  );
}
