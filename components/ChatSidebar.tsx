'use client';

import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { Pencil, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import ChatListItem from '@/components/ChatListItem';
import { useChatsContext } from '@/components/ChatsContext';
import ScrollableList from '@/components/ScrollableList';
import { Chat } from '@/lib/graphql/types';

// ── GraphQL ───────────────────────────────────────────────────────────────────

const GET_CHATS_QUERY = `
  query GetChats($searchAfter: String, $searchBefore: String) {
    chats: getChats(limit: 25, searchAfter: $searchAfter, searchBefore: $searchBefore) {
      pageInfo { count searchBefore searchAfter }
      edges { score node { id user_id last_updated candidate { id name small_image_path } } }
    }
  }
`;

const SEARCH_CHATS_GQL = gql`
  query SearchChats($query: String!) {
    chats: searchChats(query: $query, limit: 25) {
      pageInfo { count searchBefore searchAfter }
      edges { score node { id user_id last_updated candidate { id name small_image_path } } }
    }
  }
`;

const GET_LATEST_CHATS_GQL = gql`
  query GetChatsLatest {
    chats: getChats(limit: 25) {
      pageInfo { count searchBefore searchAfter }
      edges { score node { id user_id last_updated candidate { id name small_image_path } } }
    }
  }
`;

// Stable empty object so ScrollableList's default mode never remounts
// spuriously due to a new variable reference.
const DEFAULT_VARIABLES: Record<string, unknown> = {};
const getId = (c: Chat) => c.id;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  lastSentChatId: string | null;
  onConsumed: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatSidebar({ lastSentChatId, onConsumed }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { openNewChat } = useChatsContext();

  function handleNewChat() {
    openNewChat();
    router.push('/chats');
  }

  // Raw search input value.
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced value — drives the actual query switch.
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // True while the post-send animation is playing.
  // During this window we render a local reordered list instead of ScrollableList.
  const [isAnimating, setIsAnimating] = useState(false);

  // The locally reordered list shown during animation.
  const [animatingChats, setAnimatingChats] = useState<Chat[]>([]);

  // ID of the chat that was just bumped to the top.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Search results fetched via searchChats.
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  // Freshly refetched chats shown briefly after sending a message.
  const [refreshedChats, setRefreshedChats] = useState<Chat[] | null>(null);

  // A counter incremented to give ScrollableList a new key, forcing it to
  // remount and re-fetch from the server after the animation finishes.
  const [scrollableEpoch, setScrollableEpoch] = useState(0);

  // Mirror of ScrollableList's current items — kept up to date via
  // onItemsChange so we have something to reorder when a message is sent.
  const shadowChatsRef = useRef<Chat[]>([]);

  // ── Debounce ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Search query (only when debouncedTerm >= 3 chars) ───────────────────────

  const isSearching = debouncedTerm.length >= 3;

  const [runSearch] = useLazyQuery(SEARCH_CHATS_GQL, { fetchPolicy: 'network-only' });
  const [runGetLatestChats] = useLazyQuery(GET_LATEST_CHATS_GQL, { fetchPolicy: 'network-only' });

  useEffect(() => {
    if (!isSearching) return;
    runSearch({ variables: { query: debouncedTerm } })
      .then((result) => {
        if (result.data) {
          const payload = result.data as any;
          setSearchResults(payload.chats.edges.map((e: any) => e.node));
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[ChatSidebar] search error:', err);
        }
      });
  }, [debouncedTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Message-sent notification ────────────────────────────────────────────────

  useEffect(() => {
    if (!lastSentChatId) return;

    // 1. Clear the search bar so we return to the default list.
    setSearchTerm('');
    setDebouncedTerm('');

    // 2. Reorder the shadowed list locally: bump the chat to the top and
    //    stamp its timestamp so "just now" appears immediately.
    const current = shadowChatsRef.current;
    const idx = current.findIndex((c) => c.id === lastSentChatId);

    if (idx !== -1) {
      const bumped = [
        { ...current[idx], last_updated: new Date().toISOString() },
        ...current.slice(0, idx),
        ...current.slice(idx + 1),
      ];
      setAnimatingChats(bumped);
      setIsAnimating(true);
      setHighlightedId(lastSentChatId);
    }

    // 3. Always fetch latest chats after a send; keep the just-updated chat at top.
    const t = setTimeout(() => {
      runGetLatestChats()
        .then((result) => {
          const payload = result.data as any;
          if (!payload?.chats?.edges) {
            setScrollableEpoch((e) => e + 1);
            return;
          }
          const latest = payload.chats.edges.map((e: any) => e.node) as Chat[];
          const sentIdx = latest.findIndex((c) => c.id === lastSentChatId);
          const ordered =
            sentIdx === -1
              ? latest
              : [latest[sentIdx], ...latest.slice(0, sentIdx), ...latest.slice(sentIdx + 1)];
          setRefreshedChats(ordered);
          setTimeout(() => {
            setRefreshedChats(null);
            setHighlightedId(null);
            setIsAnimating(false);
            setScrollableEpoch((e) => e + 1);
          }, 800);
        })
        .catch(() => {
          setHighlightedId(null);
          setIsAnimating(false);
          setScrollableEpoch((e) => e + 1);
        });
    }, idx === -1 ? 0 : 1200);

    onConsumed();
    return () => clearTimeout(t);
  }, [lastSentChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Callbacks ────────────────────────────────────────────────────────────────

  const handleItemsChange = useCallback((items: Chat[]) => {
    shadowChatsRef.current = items;
  }, []);

  const renderChatItem = useCallback(
    (chat: Chat) => (
      <ChatListItem chat={chat} active={pathname === `/chats/${chat.id}`} />
    ),
    [pathname],
  );

  // ── Render helpers ────────────────────────────────────────────────────────────

  // Render a plain local list (used for search results and animation frames).
  function LocalList({ chats }: { chats: Chat[] }) {
    if (chats.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-1 py-12 text-center px-4">
          <p className="text-sm font-medium text-slate-500">No chats found.</p>
          <p className="text-xs text-slate-400">Try a different name.</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-slate-100">
        {chats.map((chat) => {
          const isHighlighted = chat.id === highlightedId;
          return (
            <div
              key={chat.id}
              className={`
                transition-colors duration-700
                ${isHighlighted ? 'animate-slide-in bg-emerald-50' : ''}
              `}
            >
              <ChatListItem chat={chat} active={pathname === `/chats/${chat.id}`} />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="w-80 shrink-0 flex flex-col h-full border-r border-slate-200 bg-white">

      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-slate-900">Chats</h2>
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            aria-label="New chat"
          >
            <Pencil size={15} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-8 pr-7 py-1.5 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* List area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isAnimating ? (
          // Post-send: show locally-reordered list with slide-in animation.
          <LocalList chats={animatingChats} />
        ) : refreshedChats ? (
          // Freshly fetched list after send, with sent chat pinned to top.
          <LocalList chats={refreshedChats} />
        ) : isSearching ? (
          // Active search: show results from searchChats.
          <LocalList chats={searchResults} />
        ) : (
          // Default: ScrollableList handles pagination and fetching.
          <ScrollableList<Chat>
            key={scrollableEpoch}
            query={GET_CHATS_QUERY}
            variables={DEFAULT_VARIABLES}
            dataKey="chats"
            renderItem={renderChatItem}
            getItemId={getId}
            onItemsChange={handleItemsChange}
            emptyMessage="No chats yet."
            emptySubMessage="Start a conversation with a leader."
          />
        )}
      </div>
    </div>
  );
}
