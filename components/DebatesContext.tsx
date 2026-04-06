'use client';

import { createContext, useContext } from 'react';
import { Debate } from '@/lib/graphql/types';

interface DebatesContextValue {
  notifyDebateCreated: (debate: Debate) => void;
  /** Merge into sidebar list so `last_updated` / time-ago stays fresh after execute without refetch. */
  notifyDebateUpdated: (payload: { id: string; last_updated: string }) => void;
  debateTimestampPatch: Record<string, string>;
  isNewDebateMode: boolean;
  openNewDebate: () => void;
  closeNewDebate: () => void;
}

export const DebatesContext = createContext<DebatesContextValue>({
  notifyDebateCreated: () => {},
  notifyDebateUpdated: () => {},
  debateTimestampPatch: {},
  isNewDebateMode: false,
  openNewDebate: () => {},
  closeNewDebate: () => {},
});

export function useDebatesContext() {
  return useContext(DebatesContext);
}
