'use client';

import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
import type { CandidatePosition, DebateAnswerEntry } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';

/**
 * Vertical scrollbars always reserve space (`overflow-y-scroll`) and use CSS vars for colors
 * (`--dm-scroll-thumb` / `--dm-scroll-track`) set inline from the candidate party color.
 */
const DM_PARTY_SCROLL =
  'overflow-y-scroll [scrollbar-gutter:stable] [scrollbar-width:thick] [&::-webkit-scrollbar]:w-[14px] [&::-webkit-scrollbar]:bg-[var(--dm-scroll-track)] [&::-webkit-scrollbar-track]:rounded-md [&::-webkit-scrollbar-track]:bg-[var(--dm-scroll-track)] [&::-webkit-scrollbar-thumb]:min-h-[3rem] [&::-webkit-scrollbar-thumb]:rounded-md [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[var(--dm-scroll-track)] [&::-webkit-scrollbar-thumb]:bg-[var(--dm-scroll-thumb)]';

const GET_POSITIONS_BY_IDS = gql`
  query DebateGetCandidatePositionsByIds($ids: [String!]!) {
    getCandidatePositionsByIds(ids: $ids) {
      id
      policy_position
      policy_category
      policy_subcategory
      policy_topic
      date_generated
      candidate {
        id
        name
        party
        small_image_path
        medium_image_path
      }
    }
  }
`;

/** Splits stored text on blank lines so multiple paragraphs render distinctly. */
function textToParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\n\s*\n/);
  return blocks.map((b) => b.trim()).filter(Boolean);
}

interface Props {
  open: boolean;
  onClose: () => void;
  question: string;
  entry: DebateAnswerEntry | null;
}

export default function DebateAnswerSourcesModal({
  open,
  onClose,
  question,
  entry,
}: Props) {
  const [fetchPositions] = useLazyQuery(GET_POSITIONS_BY_IDS, {
    fetchPolicy: 'network-only',
  });
  const [positions, setPositions] = useState<CandidatePosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState(false);

  const idsKey = entry?.ids?.length ? entry.ids.join('\0') : '';

  // Refetch positions when the id list changes (idsKey); entry also drives answer paragraphs in render.
  useEffect(() => {
    if (!open || !entry) {
      setPositions([]);
      setPositionsLoading(false);
      setPositionsError(false);
      return;
    }

    if (!entry.ids?.length) {
      setPositions([]);
      setPositionsLoading(false);
      setPositionsError(false);
      return;
    }

    let cancelled = false;
    setPositions([]);
    setPositionsLoading(true);
    setPositionsError(false);

    void (async () => {
      try {
        const result = await fetchPositions({ variables: { ids: entry.ids } });
        if (cancelled) return;
        const raw = (result.data as { getCandidatePositionsByIds?: CandidatePosition[] } | undefined)
          ?.getCandidatePositionsByIds;
        const list = raw ?? [];
        const seen = new Set<string>();
        const ordered: CandidatePosition[] = [];
        for (const p of list) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          ordered.push(p);
        }
        setPositions(ordered);
      } catch {
        if (!cancelled) setPositionsError(true);
      } finally {
        if (!cancelled) setPositionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, idsKey, entry, fetchPositions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const paragraphs = useMemo(
    () => (entry ? textToParagraphs(entry.answer) : []),
    [entry]
  );

  const handleBackdropMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open || !entry) return null;

  const imagePath =
    entry.candidate.medium_image_path || entry.candidate.image_path;
  const partyColor = getPartyColor(entry.candidate.party);
  const scrollTrack = `color-mix(in srgb, ${partyColor} 28%, rgb(241 245 249))`;
  const partyScrollStyle: CSSProperties = {
    ['--dm-scroll-thumb' as string]: partyColor,
    ['--dm-scroll-track' as string]: scrollTrack,
    scrollbarGutter: 'stable',
    scrollbarWidth: 'thick',
    scrollbarColor: `${partyColor} ${scrollTrack}`,
  };

  return (
    <div
      className="absolute inset-0 z-[110] flex bg-slate-900/50 p-4 backdrop-blur-[1px] sm:p-6"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="debate-answer-modal-title"
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-end border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Close"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div
          style={partyScrollStyle}
          className={`min-h-0 flex-1 px-5 pb-6 pt-1 sm:px-8 ${DM_PARTY_SCROLL}`}
        >
          <div className="flex flex-col items-center gap-3">
            <Link
              href={`/candidates/${entry.candidate.id}`}
              className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <CandidateAvatar
                imagePath={imagePath}
                name={entry.candidate.name}
                party={entry.candidate.party}
                sizeClass="w-24 h-24 sm:w-28 sm:h-28"
              />
            </Link>
            <Link
              href={`/candidates/${entry.candidate.id}`}
              className="cursor-pointer text-center text-lg font-bold text-slate-900 no-underline hover:text-slate-900 hover:no-underline active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-sm"
            >
              {entry.candidate.name}
            </Link>
          </div>

          <p
            id="debate-answer-modal-title"
            className="mt-5 text-center text-base font-bold leading-snug text-slate-900"
          >
            {question}
          </p>

          <div
            style={partyScrollStyle}
            className={`mt-4 max-h-[min(30vh,15.5rem)] min-h-0 shrink-0 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 ${DM_PARTY_SCROLL}`}
          >
            {paragraphs.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No answer text.</p>
            ) : (
              paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-slate-800 sm:text-[15px] [&+&]:mt-3"
                >
                  {para}
                </p>
              ))
            )}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Positions supporting this answer
          </p>

          <div className="mt-3 flex gap-8 overflow-x-auto pb-3 pl-1 pr-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:thin]">
            {positionsLoading && (
              <div className="flex w-full min-w-0 items-center justify-center gap-2 py-8 text-slate-500">
                <Loader2 className="size-6 animate-spin text-emerald-600" aria-hidden />
                <span className="text-sm">Loading positions…</span>
              </div>
            )}
            {!positionsLoading && positionsError && (
              <p className="text-sm text-rose-600">Could not load positions.</p>
            )}
            {!positionsLoading && !positionsError && positions.length === 0 && (
              <p className="text-sm text-slate-500">No linked positions for this answer.</p>
            )}
            {!positionsLoading &&
              !positionsError &&
              positions.map((position) => {
                const c = position.candidate;
                const pc = getPartyColor(c.party);
                const policyParagraphs = textToParagraphs(position.policy_position);
                return (
                  <article
                    key={position.id}
                    className="flex w-[min(22rem,85vw)] shrink-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:w-[26rem] md:w-[28rem]"
                  >
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="shrink-0 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <CandidateAvatar
                          imagePath={c.small_image_path || c.medium_image_path}
                          name={c.name}
                          party={c.party}
                          sizeClass="w-12 h-12"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/candidates/${c.id}`}
                          className="block cursor-pointer font-semibold leading-snug text-slate-900 no-underline hover:text-slate-900 hover:no-underline active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 rounded-sm"
                        >
                          {c.name}
                        </Link>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: pc }}
                        >
                          {c.party}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/posts/${position.id}`}
                      className="block cursor-pointer text-base leading-relaxed text-slate-800 no-underline hover:text-slate-900 hover:no-underline active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 rounded-sm"
                    >
                      {policyParagraphs.length === 0 ? (
                        <span className="text-slate-500">No position text.</span>
                      ) : (
                        policyParagraphs.map((para, i) => (
                          <p
                            key={i}
                            className="whitespace-pre-line text-base leading-relaxed [&+&]:mt-3"
                          >
                            {para}
                          </p>
                        ))
                      )}
                    </Link>
                  </article>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
