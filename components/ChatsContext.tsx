'use client';

import { createContext, useContext } from 'react';

interface ChatsContextValue {
  /** Call this after a message is successfully sent in a chat. */
  notifyMessageSent: (chatId: string) => void;
}

export const ChatsContext = createContext<ChatsContextValue>({
  notifyMessageSent: () => {},
});

export function useChatsContext() {
  return useContext(ChatsContext);
}
