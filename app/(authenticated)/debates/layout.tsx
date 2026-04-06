'use client';

import { useCallback, useState } from 'react';
import DebateSidebar from '@/components/DebateSidebar';
import { DebatesContext } from '@/components/DebatesContext';
import { Debate } from '@/lib/graphql/types';

export default function DebatesLayout({ children }: { children: React.ReactNode }) {
  const [lastCreatedDebate, setLastCreatedDebate] = useState<Debate | null>(null);
  const [debateTimestampPatch, setDebateTimestampPatch] = useState<Record<string, string>>({});
  const [isNewDebateMode, setIsNewDebateMode] = useState(false);

  const notifyDebateCreated = useCallback((debate: Debate) => {
    setLastCreatedDebate(debate);
  }, []);

  const notifyDebateUpdated = useCallback((payload: { id: string; last_updated: string }) => {
    setDebateTimestampPatch((prev) => ({ ...prev, [payload.id]: payload.last_updated }));
  }, []);

  const openNewDebate = useCallback(() => setIsNewDebateMode(true), []);
  const closeNewDebate = useCallback(() => setIsNewDebateMode(false), []);

  return (
    <DebatesContext.Provider
      value={{
        notifyDebateCreated,
        notifyDebateUpdated,
        debateTimestampPatch,
        isNewDebateMode,
        openNewDebate,
        closeNewDebate,
      }}
    >
      <div className="flex h-full overflow-hidden">
        <DebateSidebar
          lastCreatedDebate={lastCreatedDebate}
          onConsumed={() => setLastCreatedDebate(null)}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </DebatesContext.Provider>
  );
}
