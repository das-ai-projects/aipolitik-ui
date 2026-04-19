'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useState } from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
import type { Candidate } from '@/lib/graphql/types';
import Link from 'next/link';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';

const RANDOM_CANDIDATES = gql`
  query RandomCandidates($size: Int) {
    randomCandidates(size: $size) {
      id
      name
      party
      small_image_path
    }
  }
`;

const SET_CANDIDATE_FOLLOW = gql`
  mutation SetCandidateFollow($candidateId: String!, $follow: Boolean!) {
    setCandidateFollow(candidateId: $candidateId, follow: $follow) {
      id
      isFollowing
    }
  }
`;

const LIST_SIZE = 6;
const REPLACEMENT_SIZE = 1;

function RandomFollowRow({
  candidate,
  index,
  followLoading,
  onFollow,
}: {
  candidate: Candidate;
  index: number;
  followLoading: boolean;
  onFollow: (index: number) => void;
}) {
  const displayParty = useTranslatedText(candidate.party ?? '');
  const followLabel = useTranslatedText('Follow');
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 transition-colors">
      <Link href={`/leaders/${candidate.id}`}>
        <CandidateAvatar
          imagePath={candidate.small_image_path}
          name={candidate.name}
          party={candidate.party}
          sizeClass="w-12 h-12"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/leaders/${candidate.id}`}>
          <p className="text-base font-bold text-slate-900 truncate">{candidate.name}</p>
        </Link>
        <p className="text-sm text-slate-500 truncate">{displayParty}</p>
      </div>
      <button
        type="button"
        onClick={() => onFollow(index)}
        disabled={followLoading}
        className="shrink-0 rounded-full bg-emerald-500 text-white px-5 py-2 text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
      >
        {followLabel}
      </button>
    </div>
  );
}

export default function RandomCandidatesFollow() {
  const client = useApolloClient();
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const { data, loading } = useQuery<{ randomCandidates: Candidate[] }>(
    RANDOM_CANDIDATES,
    {
      variables: { size: LIST_SIZE },
      fetchPolicy: 'network-only',
    }
  );

  const whoToFollow = useTranslatedText('Who to follow');
  const loadingAria = useTranslatedText('Loading');

  const [setFollow, { loading: followLoading }] = useMutation(
    SET_CANDIDATE_FOLLOW,
    {
      onError: (err) => console.error('Follow mutation error:', err),
    }
  );

  useEffect(() => {
    if (data?.randomCandidates?.length) {
      setCandidates(data.randomCandidates);
    }
  }, [data]);

  const handleFollow = useCallback(
    async (index: number) => {
      const candidate = candidates[index];
      if (!candidate) return;

      try {
        await setFollow({
          variables: { candidateId: candidate.id, follow: true },
        });
        const result = await client.query<{ randomCandidates: Candidate[] }>({
          query: RANDOM_CANDIDATES,
          variables: { size: REPLACEMENT_SIZE },
          fetchPolicy: 'network-only',
        });
        const newCandidates = result.data?.randomCandidates ?? [];
        const replacement = newCandidates[0];
        if (replacement) {
          setCandidates((prev) =>
            prev.map((c, i) => (i === index ? replacement : c))
          );
        }
      } catch (_) {
        // Error already logged in onError
      }
    },
    [candidates, setFollow, client]
  );

  if (loading && candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{whoToFollow}</h2>
        </div>
        <div className="flex justify-center py-10">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"
            role="status"
            aria-label={loadingAria}
          />
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">{whoToFollow}</h2>
      </div>

      <div className="py-3">
        {candidates.map((candidate, index) => (
          <RandomFollowRow
            key={`${candidate.id}-${index}`}
            candidate={candidate}
            index={index}
            followLoading={followLoading}
            onFollow={handleFollow}
          />
        ))}
      </div>
    </div>
  );
}
