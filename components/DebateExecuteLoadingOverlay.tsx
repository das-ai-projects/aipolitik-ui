'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
import { cn } from '@/lib/utils';

export type DebateLoaderCandidate = {
  id: string;
  name: string;
  party: string;
  small_image_path: string;
};

const CYCLE_MS = 820;

type Props = {
  open: boolean;
  candidates: DebateLoaderCandidate[];
};

/**
 * Full-viewport overlay while executeDebate runs: cycles through debate candidates’
 * small avatars with a soft blur→sharp entrance and progress dots.
 */
export default function DebateExecuteLoadingOverlay({ open, candidates }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open || candidates.length === 0) return;
    setIndex(0);
  }, [open, candidates.length]);

  useEffect(() => {
    if (!open || candidates.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % candidates.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [open, candidates.length]);

  if (!open) return null;

  const current = candidates[index] ?? candidates[0];
  const showAvatars = current != null;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px]">
      <div
        className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        {!showAvatars ? (
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" aria-hidden />
        ) : (
          <>
            <div className="relative flex h-[7.5rem] w-[7.5rem] items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-emerald-400/25 animate-debate-loader-ring"
                aria-hidden
              />
              <span
                className="absolute inset-2 rounded-full border-2 border-emerald-500/30"
                aria-hidden
              />
              <div
                key={`${current.id}-${index}`}
                className="relative animate-debate-loader-avatar-in"
              >
                <CandidateAvatar
                  imagePath={current.small_image_path}
                  name={current.name}
                  party={current.party}
                  sizeClass="w-20 h-20"
                />
              </div>
            </div>
            {candidates.length > 1 && (
              <div className="flex items-center justify-center gap-1.5" aria-hidden>
                {candidates.map((c, i) => (
                  <span
                    key={c.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300 ease-out',
                      i === index ? 'w-7 bg-emerald-500' : 'w-1.5 bg-slate-300'
                    )}
                  />
                ))}
              </div>
            )}
          </>
        )}
        <p className="text-center text-sm font-semibold text-slate-700">
          Getting candidate responses…
        </p>
        <span className="sr-only">Loading debate answers, please wait.</span>
      </div>
    </div>
  );
}
