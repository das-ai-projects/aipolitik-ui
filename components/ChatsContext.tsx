'use client';

import { createContext, useContext } from 'react';

interface ChatsContextValue {
  /** Call this after a message is successfully sent in a chat. */
  notifyMessageSent: (chatId: string) => void;
  /** Whether the "new chat" search overlay is open in the main content area. */
  isNewChatMode: boolean;
  /** Open the new chat search overlay. */
  openNewChat: () => void;
  /** Close the new chat search overlay. */
  closeNewChat: () => void;
}

export const ChatsContext = createContext<ChatsContextValue>({
  notifyMessageSent: () => {},
  isNewChatMode: false,
  openNewChat: () => {},
  closeNewChat: () => {},
});

export function useChatsContext() {
  return useContext(ChatsContext);
}
