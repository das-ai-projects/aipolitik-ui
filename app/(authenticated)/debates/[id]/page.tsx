'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
import DebateAnswersDisplay from '@/components/DebateAnswersDisplay';
import { useDebatesContext } from '@/components/DebatesContext';
import type { DebateAnswer } from '@/lib/graphql/types';

const GET_DEBATE = gql`
  query GetDebateById($id: String!) {
    debate: getDebateById(id: $id) {
      id
      name
      message_count
      candidates {
        id
        name
        party
        medium_image_path
      }
      latestAnswer {
        id
        debateId
        offset
        question
        dateGenerated
        answers {
          candidateId
          answer
          shortAnswer
          ids
          candidate {
            id
            party
            name
            image_path
            medium_image_path
          }
        }
      }
    }
  }
`;

const DEBATE_ANSWER_FIELDS = gql`
  fragment DebateAnswerFields on DebateAnswer {
    id
    debateId
    offset
    question
    dateGenerated
    answers {
      candidateId
      answer
      shortAnswer
      ids
      candidate {
        id
        party
        name
        image_path
        medium_image_path
      }
    }
  }
`;

const GET_DEBATE_ANSWER_BY_OFFSET = gql`
  query GetDebateAnswerByDebateIdAndOffset($debateId: String!, $offset: Int!) {
    debateAnswer: getDebateAnswerByDebateIdAndOffset(debateId: $debateId, offset: $offset) {
      ...DebateAnswerFields
    }
  }
  ${DEBATE_ANSWER_FIELDS}
`;

const EXECUTE_DEBATE = gql`
  mutation ExecuteDebate($debateId: String!, $question: String!) {
    executeDebate(debateId: $debateId, question: $question) {
      ...DebateAnswerFields
    }
  }
  ${DEBATE_ANSWER_FIELDS}
`;

/** Last whitespace-delimited segment (simple surname heuristic for display). */
function candidateSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  return parts[parts.length - 1];
}

export default function DebatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: debateId } = use(params);
  const { notifyDebateUpdated } = useDebatesContext();
  const { data, loading, error } = useQuery(GET_DEBATE, {
    variables: { id: debateId },
    // Fresh debate + latest answer on every visit; do not read or persist this payload in the cache.
    fetchPolicy: 'no-cache',
  });
  const debate = (data as any)?.debate;

  const [currentAnswer, setCurrentAnswer] = useState<DebateAnswer | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [bottomInput, setBottomInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [navLoading, setNavLoading] = useState(false);

  const [fetchAnswerByOffset] = useLazyQuery(GET_DEBATE_ANSWER_BY_OFFSET, {
    fetchPolicy: 'no-cache',
  });

  const [executeDebateMutation, { loading: executeLoading }] = useMutation(EXECUTE_DEBATE, {
    fetchPolicy: 'no-cache',
  });

  // Initialize from server when this debate id loads (not on every Apollo refetch).
  // `message_count` can lag or be wrong for legacy rows; never set count below latestAnswer.offset + 1.
  useEffect(() => {
    const d = (data as {
      debate?: { id: string; message_count?: number; latestAnswer?: DebateAnswer | null };
    })?.debate;
    if (!d || d.id !== debateId) return;
    const stored = Number(d.message_count) || 0;
    const latestOff = d.latestAnswer?.offset;
    const implied =
      typeof latestOff === 'number' && Number.isFinite(latestOff) ? latestOff + 1 : 0;
    setMessageCount(Math.max(stored, implied));
    setCurrentAnswer((d.latestAnswer ?? null) as DebateAnswer | null);
  }, [debateId, (data as { debate?: { id: string } })?.debate?.id]);

  const canGoLeft =
    currentAnswer != null &&
    currentAnswer.offset > 0 &&
    !navLoading &&
    !executeLoading;
  const canGoRight =
    currentAnswer != null &&
    messageCount > 0 &&
    currentAnswer.offset < messageCount - 1 &&
    !navLoading &&
    !executeLoading;

  const loadOffset = useCallback(
    async (offset: number) => {
      setNavLoading(true);
      try {
        const { data: ansData } = await fetchAnswerByOffset({
          variables: { debateId, offset },
        });
        const next = (ansData as any)?.debateAnswer as DebateAnswer | null | undefined;
        if (next) {
          setCurrentAnswer(next);
          const o = next.offset;
          if (typeof o === 'number' && Number.isFinite(o)) {
            setMessageCount((prev) => Math.max(prev, o + 1));
          }
        }
      } finally {
        setNavLoading(false);
      }
    },
    [debateId, fetchAnswerByOffset]
  );

  async function handleSubmitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = bottomInput.trim();
    if (!q || executeLoading || navLoading) return;
    setSubmitError(null);
    try {
      const result = await executeDebateMutation({
        variables: { debateId, question: q },
      });
      const newAnswer = (result.data as { executeDebate?: DebateAnswer } | undefined)
        ?.executeDebate;
      if (!newAnswer) {
        setSubmitError('No response returned from the server.');
        return;
      }
      const o = newAnswer.offset;
      const implied =
        typeof o === 'number' && Number.isFinite(o) ? o + 1 : 0;
      setMessageCount((c) => Math.max(c + 1, implied));
      setCurrentAnswer(newAnswer);
      setBottomInput('');
      notifyDebateUpdated({ id: debateId, last_updated: newAnswer.dateGenerated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run debate.';
      setSubmitError(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (error || !debate) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        {error ? `Error: ${error.message}` : 'Debate not found.'}
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-50">
      {/* Full-width header: title + medium avatars (medium_image_path) */}
      <div className="w-full shrink-0 border-b border-slate-200 bg-white px-6 py-8">
        <h1 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">
          {debate.name}
        </h1>
        <div className="mt-6 flex flex-wrap items-start justify-center gap-8">
          {debate.candidates.map((candidate: { id: string; name: string; party: string; medium_image_path: string }) => {
            const surname = candidateSurname(candidate.name);
            return (
              <Link
                key={candidate.id}
                href={`/candidates/${candidate.id}`}
                aria-label={`View ${candidate.name} profile`}
                className="group relative inline-flex max-w-[11rem] flex-col items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <span className="relative inline-block rounded-full">
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                    role="tooltip"
                  >
                    <span className="max-w-[14rem] rounded-md bg-slate-900 px-2.5 py-1.5 text-center text-xs font-semibold text-white shadow-md">
                      {candidate.name}
                    </span>
                    <span
                      className="h-0 w-0 border-x-[7px] border-t-[8px] border-transparent border-t-slate-900"
                      aria-hidden
                    />
                  </span>
                  <CandidateAvatar
                    imagePath={candidate.medium_image_path}
                    name={candidate.name}
                    party={candidate.party}
                    sizeClass="w-20 h-20"
                  />
                </span>
                <span className="block w-full truncate text-center text-xs font-semibold text-slate-900 sm:text-sm">
                  {surname}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Answer round pagination — each half is a full-width tap target; arrow centered */}
      <div className="flex w-full shrink-0 border-b border-slate-200 bg-white">
        <button
          type="button"
          aria-label="Previous answer round"
          disabled={!canGoLeft}
          onClick={() => {
            if (!currentAnswer || currentAnswer.offset <= 0) return;
            void loadOffset(currentAnswer.offset - 1);
          }}
          className="flex min-h-[3rem] flex-1 items-center justify-center border-r border-slate-200 py-3 text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:text-slate-400"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Next answer round"
          disabled={!canGoRight}
          onClick={() => {
            if (!currentAnswer || currentAnswer.offset >= messageCount - 1) return;
            void loadOffset(currentAnswer.offset + 1);
          }}
          className="flex min-h-[3rem] flex-1 items-center justify-center py-3 text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:text-slate-400"
        >
          <ChevronRight size={24} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        <DebateAnswersDisplay latestAnswer={currentAnswer} />
      </div>

      <div className="w-full shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <form className="flex w-full flex-col gap-2" onSubmit={handleSubmitQuestion}>
          <div className="flex w-full items-center gap-3">
            <input
              type="text"
              value={bottomInput}
              onChange={(e) => setBottomInput(e.target.value)}
              disabled={executeLoading || navLoading}
              placeholder="Ask a question…"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!bottomInput.trim() || executeLoading || navLoading}
              className="shrink-0 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {executeLoading ? 'Sending…' : 'Submit'}
            </button>
          </div>
          {submitError && (
            <p className="text-center text-xs font-medium text-rose-600">{submitError}</p>
          )}
        </form>
      </div>

      {executeLoading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px]">
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-2xl"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="h-12 w-12 animate-spin text-emerald-600"
              aria-hidden
            />
            <p className="text-sm font-semibold text-slate-800">
              Getting candidate responses…
            </p>
            <span className="sr-only">Loading, please wait.</span>
          </div>
        </div>
      )}
    </div>
  );
}
