'use client';

import { usePathname } from 'next/navigation';

import ChatListItem from '@/components/ChatListItem';
import ScrollableList from '@/components/ScrollableList';
import { Chat } from '@/lib/graphql/types';

const GET_CHATS_QUERY = `
  query GetChats($searchAfter: String, $searchBefore: String) {
    chats: getChats(limit: 25, searchAfter: $searchAfter, searchBefore: $searchBefore) {
      pageInfo { count searchBefore searchAfter }
      edges {
        score
        node {
          id
          user_id
          last_updated
          candidate { id name small_image_path }
        }
      }
    }
  }
`;

// Defined outside the component so the reference is stable across renders.
const VARIABLES: Record<string, unknown> = {};
const getId = (c: Chat) => c.id;

export default function ChatSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-80 shrink-0 flex flex-col h-full border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Chats</h2>
      </div>

      {/* Scrollable chat list */}
      <div className="flex-1 min-h-0">
        <ScrollableList<Chat>
          query={GET_CHATS_QUERY}
          variables={VARIABLES}
          dataKey="chats"
          renderItem={(chat) => (
            <ChatListItem
              chat={chat}
              active={pathname === `/chats/${chat.id}`}
            />
          )}
          getItemId={getId}
          emptyMessage="No chats yet."
          emptySubMessage="Start a conversation with a leader."
        />
      </div>
    </div>
  );
}
