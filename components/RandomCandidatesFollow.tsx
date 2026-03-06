'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useState } from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
import type { Candidate } from '@/lib/graphql/types';

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

const LIST_SIZE = 5;
const REPLACEMENT_SIZE = 1;

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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Who to follow</h2>
        </div>
        <div className="flex justify-center py-8">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"
            role="status"
            aria-label="Loading"
          />
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Who to follow</h2>
      </div>

      <div className="py-2">
        {candidates.map((candidate, index) => (
          <div
            key={`${candidate.id}-${index}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <CandidateAvatar
              imagePath={candidate.small_image_path}
              name={candidate.name}
              party={candidate.party}
              sizeClass="w-10 h-10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {candidate.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{candidate.party}</p>
            </div>
            <button
              type="button"
              onClick={() => handleFollow(index)}
              disabled={followLoading}
              className="shrink-0 rounded-full bg-emerald-500 text-slate-200 px-4 py-1.5 text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
