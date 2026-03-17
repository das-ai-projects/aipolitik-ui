'use client';

import { useCallback, useState } from 'react';

import { ChatsContext } from '@/components/ChatsContext';
import ChatSidebar from '@/components/ChatSidebar';

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  // When a message is sent in ChatPage, it stores the chat ID here.
  // ChatSidebar reads it to reorder the list and clears it via onConsumed.
  const [lastSentChatId, setLastSentChatId] = useState<string | null>(null);

  const notifyMessageSent = useCallback((chatId: string) => {
    setLastSentChatId(chatId);
  }, []);

  return (
    <ChatsContext.Provider value={{ notifyMessageSent }}>
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
