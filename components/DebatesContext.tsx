'use client';

import { createContext, useContext } from 'react';
import { Debate } from '@/lib/graphql/types';

interface DebatesContextValue {
  notifyDebateCreated: (debate: Debate) => void;
  isNewDebateMode: boolean;
  openNewDebate: () => void;
  closeNewDebate: () => void;
}

export const DebatesContext = createContext<DebatesContextValue>({
  notifyDebateCreated: () => {},
  isNewDebateMode: false,
  openNewDebate: () => {},
  closeNewDebate: () => {},
});

export function useDebatesContext() {
  return useContext(DebatesContext);
}
