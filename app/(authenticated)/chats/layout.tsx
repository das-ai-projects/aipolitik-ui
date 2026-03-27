'use client';

import { useCallback, useState } from 'react';

import { ChatsContext } from '@/components/ChatsContext';
import ChatSidebar from '@/components/ChatSidebar';

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  const [lastSentChatId, setLastSentChatId] = useState<string | null>(null);
  const [isNewChatMode, setIsNewChatMode] = useState(false);

  const notifyMessageSent = useCallback((chatId: string) => {
    setLastSentChatId(chatId);
  }, []);

  const openNewChat = useCallback(() => setIsNewChatMode(true), []);
  const closeNewChat = useCallback(() => setIsNewChatMode(false), []);

  return (
    <ChatsContext.Provider value={{ notifyMessageSent, isNewChatMode, openNewChat, closeNewChat }}>
      <div className="flex h-full overflow-hidden">
        <ChatSidebar
          lastSentChatId={lastSentChatId}
          onConsumed={() => setLastSentChatId(null)}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </ChatsContext.Provider>
  );
}
