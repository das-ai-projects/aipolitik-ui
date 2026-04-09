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
import PositionListItem from '@/components/PositionListItem';
import type { CandidatePosition, DebateAnswerEntry } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';

/**
 * Vertical scrollbars reserve space and use CSS vars (`--dm-scroll-thumb` / `--dm-scroll-track`)
 * from the candidate party color.
 */
const DM_PARTY_SCROLL =
  'overflow-y-scroll [scrollbar-gutter:stable] [scrollbar-width:thick] [&::-webkit-scrollbar]:w-[14px] [&::-webkit-scrollbar]:bg-[var(--dm-scroll-track)] [&::-webkit-scrollbar-track]:rounded-md [&::-webkit-scrollbar-track]:bg-[var(--dm-scroll-track)] [&::-webkit-scrollbar-thumb]:min-h-[3rem] [&::-webkit-scrollbar-thumb]:rounded-md [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[var(--dm-scroll-track)] [&::-webkit-scrollbar-thumb]:bg-[var(--dm-scroll-thumb)]';

/** Same scrollbar styling as DM_PARTY_SCROLL; scrollbar appears when content overflows. */
const DM_PARTY_SCROLL_AUTO =
  'overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thick] [&::-webkit-scrollbar]:w-[14px] [&::-webkit-scrollbar]:bg-[var(--dm-scroll-track)] [&::-webkit-scrollbar-track]:rounded-md [&::-webkit-scrollbar-track]:bg-[var(--dm-scroll-track)] [&::-webkit-scrollbar-thumb]:min-h-[3rem] [&::-webkit-scrollbar-thumb]:rounded-md [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[var(--dm-scroll-track)] [&::-webkit-scrollbar-thumb]:bg-[var(--dm-scroll-thumb)]';

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
      reaction_stats {
        like_count
        dislike_count
      }
      my_reaction
      reactionMade
    }
  }
`;

function textToParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\n\s*\n/);
  return blocks.map((b) => b.trim()).filter(Boolean);
}

type TabId = 'answer' | 'positions';

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
  const [activeTab, setActiveTab] = useState<TabId>('answer');
  const [fetchPositions] = useLazyQuery(GET_POSITIONS_BY_IDS, {
    fetchPolicy: 'network-only',
  });
  const [positions, setPositions] = useState<CandidatePosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState(false);

  const idsKey = entry?.ids?.length ? entry.ids.join('\0') : '';

  useEffect(() => {
    if (open) setActiveTab('answer');
  }, [open, entry?.candidateId, idsKey]);

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
    scrollbarColor: `${partyColor} ${scrollTrack}`,
  };

  const positionsPanelClass = `flex min-h-0 flex-1 flex-col ${DM_PARTY_SCROLL}`;
  /** Matches answer tab: centered column width + same horizontal padding from modal edges. */
  const tabInnerClass =
    'mx-auto flex w-full max-w-2xl flex-col px-3 pb-5 pt-1.5 sm:px-4 md:px-5';

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
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ ['--party' as string]: partyColor } as CSSProperties}
        >
          <div className="shrink-0 px-5 pb-4 pt-2 sm:px-8">
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
              role="tablist"
              aria-label="Answer and sources"
              className="mt-6 flex gap-0 border-b border-slate-200"
            >
              <button
                type="button"
                role="tab"
                id="debate-modal-tab-answer"
                aria-selected={activeTab === 'answer'}
                aria-controls="debate-modal-panel-answer"
                onClick={() => setActiveTab('answer')}
                className={`relative flex-1 border-b-2 pb-3 pt-1 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-t ${
                  activeTab === 'answer'
                    ? 'border-[var(--party)] text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Full Answer
              </button>
              <button
                type="button"
                role="tab"
                id="debate-modal-tab-positions"
                aria-selected={activeTab === 'positions'}
                aria-controls="debate-modal-panel-positions"
                onClick={() => setActiveTab('positions')}
                className={`relative flex-1 border-b-2 pb-3 pt-1 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-t ${
                  activeTab === 'positions'
                    ? 'border-[var(--party)] text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Supporting Positions
                {entry.ids?.length ? (
                  <span className="ml-1.5 tabular-nums text-slate-400">({entry.ids.length})</span>
                ) : null}
              </button>
            </div>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col ${
              activeTab === 'answer'
                ? DM_PARTY_SCROLL_AUTO
                : 'overflow-hidden'
            }`}
            style={activeTab === 'answer' ? partyScrollStyle : undefined}
          >
            {activeTab === 'answer' ? (
              <div
                id="debate-modal-panel-answer"
                role="tabpanel"
                aria-labelledby="debate-modal-tab-answer"
                className={tabInnerClass}
              >
                {paragraphs.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No answer text.</p>
                ) : (
                  paragraphs.map((para, i) => (
                    <p
                      key={i}
                      className="text-justify text-sm leading-relaxed text-slate-800 sm:text-[15px] [&+&]:mt-4"
                    >
                      {para}
                    </p>
                  ))
                )}
              </div>
            ) : (
              <div
                id="debate-modal-panel-positions"
                role="tabpanel"
                aria-labelledby="debate-modal-tab-positions"
                style={partyScrollStyle}
                className={positionsPanelClass}
              >
                <div className={tabInnerClass}>
                  {positionsLoading && (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                      <Loader2 className="size-6 animate-spin text-emerald-600" aria-hidden />
                      <span className="text-sm">Loading positions…</span>
                    </div>
                  )}
                  {!positionsLoading && positionsError && (
                    <p className="py-8 text-center text-sm text-rose-600">
                      Could not load positions.
                    </p>
                  )}
                  {!positionsLoading && !positionsError && positions.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No linked positions for this answer.
                    </p>
                  )}
                  {!positionsLoading && !positionsError && positions.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {positions.map((position) => (
                        <PositionListItem
                          key={position.id}
                          position={position}
                          className="px-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
