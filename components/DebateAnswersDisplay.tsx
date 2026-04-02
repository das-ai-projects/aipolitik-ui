'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import DebateAnswerSourcesModal from '@/components/DebateAnswerSourcesModal';
import type { DebateAnswer, DebateAnswerEntry } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';

interface Props {
  latestAnswer: DebateAnswer | null;
}

/**
 * Fills the remaining vertical space in the debate view: question banner, then
 * one flexible row per answer (portrait, party stripe, justified short answer, plus action).
 */
export default function DebateAnswersDisplay({ latestAnswer }: Props) {
  const [sourcesEntry, setSourcesEntry] = useState<DebateAnswerEntry | null>(null);

  useEffect(() => {
    setSourcesEntry(null);
  }, [latestAnswer?.id, latestAnswer?.offset]);

  if (!latestAnswer?.answers?.length) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        No answers for this debate yet. When you run a round, the latest
        responses will appear here.
      </div>
    );
  }

  return (
    <>
    <DebateAnswerSourcesModal
      open={sourcesEntry !== null}
      onClose={() => setSourcesEntry(null)}
      question={latestAnswer.question}
      entry={sourcesEntry}
    />
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-200 bg-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-center text-lg font-bold leading-snug text-slate-900 sm:text-xl">
          {latestAnswer.question}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {latestAnswer.answers.map((entry) => {
          const partyColor = getPartyColor(entry.candidate.party);
          const imageSrc =
            entry.candidate.medium_image_path || entry.candidate.image_path;

          return (
            <div
              key={entry.candidateId}
              className="flex min-h-0 flex-1 basis-0 flex-row border-b border-slate-100 last:border-b-0"
            >
              {/* Candidate: large image + name — vertically centered in row */}
              <div className="flex w-40 shrink-0 flex-col items-center justify-center gap-2 px-3 py-3 sm:w-48 md:w-52 md:px-4 md:py-4">
                <div
                  className="rounded-full p-1"
                  style={{ backgroundColor: partyColor }}
                >
                  <div className="relative size-24 overflow-hidden rounded-full bg-slate-100 sm:size-28 md:size-32">
                    <Image
                      src={imageSrc}
                      alt={entry.candidate.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, 128px"
                    />
                  </div>
                </div>
                <p className="max-w-[11rem] truncate text-center text-xs font-semibold text-slate-900 sm:text-sm">
                  {entry.candidate.name}
                </p>
              </div>

              {/* Party stripe — full row height */}
              <div
                className="w-2.5 shrink-0 self-stretch sm:w-3 md:w-4"
                style={{ backgroundColor: partyColor }}
                aria-hidden
              />

              {/* Short answer — justified, inset from stripe */}
              <div className="flex min-h-0 min-w-0 flex-1 items-center py-4 pl-5 pr-4 sm:pl-6 sm:pr-6 md:pl-8 md:pr-8">
                <p className="w-full text-justify text-sm leading-relaxed text-slate-800 sm:text-base md:text-lg">
                  {entry.shortAnswer}
                </p>
              </div>

              {/* Spacer / action column (~1/5 row width), full row height */}
              <button
                type="button"
                aria-label={`View full answer and sources for ${entry.candidate.name}`}
                onClick={() => setSourcesEntry(entry)}
                className="group/plus flex w-[14%] min-w-[2.75rem] shrink-0 flex-col items-center justify-center self-stretch border-l border-slate-100 bg-slate-50/60 transition-colors duration-150 hover:border-[var(--party)] hover:bg-[var(--party)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
                style={{ ['--party' as string]: partyColor } as CSSProperties}
              >
                <Plus
                  size={28}
                  strokeWidth={2.25}
                  className="text-slate-400 transition-colors duration-150 group-hover/plus:text-white"
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
