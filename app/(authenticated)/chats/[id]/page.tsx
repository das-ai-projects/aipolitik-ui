'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import Link from 'next/link';
import CandidateAvatar from '@/components/CandidateAvatar';
import { useChatsContext } from '@/components/ChatsContext';
import { ChatMessage } from '@/lib/graphql/types';

// ── GraphQL ───────────────────────────────────────────────────────────────────

// Fetches only the chat metadata and candidate info — no messages here,
// those are loaded separately via getChatMessages.
const GET_CHAT = gql`
  query GetChatById($id: String!) {
    getChatById(id: $id) {
      id
      user_id
      last_updated
      candidate {
        id
        name
        medium_image_path
        party
      }
    }
  }
`;

// Fetches a page of messages for a chat, sorted newest-first on the server.
// searchAfter points past the oldest message we currently have, so passing it
// retrieves the next batch of even older messages.
const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($chatId: String!, $limit: Int, $searchAfter: String) {
    messages: getChatMessages(chatId: $chatId, limit: $limit, searchAfter: $searchAfter) {
      pageInfo {
        count
        searchAfter
        searchBefore
      }
      edges {
        node {
          id
          chatId
          dateGenerated
          userMessage
          aiMessage
          ids
        }
      }
    }
  }
`;

const CREATE_CHAT_MESSAGE = gql`
  mutation CreateChatMessage($chatId: String!, $userMessage: String!) {
    createChatMessage(chatId: $chatId, userMessage: $userMessage) {
      id
      chatId
      dateGenerated
      userMessage
      aiMessage
      ids
    }
  }
`;

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Parses **bold** markdown into <strong> elements.
function parseBoldSegments(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 self-start">
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="block w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ source, content, ids }: { source: 'user' | 'candidate'; content: string; ids?: string[] }) {
  const isUser = source === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[50%] px-4 py-2.5 text-base leading-relaxed rounded-lg shadow-sm whitespace-pre-line
          ${isUser
            ? 'bg-emerald-500 text-white rounded-br-none'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
          }
        `}
      >
        {parseBoldSegments(content)}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);

  // ── Chat metadata ───────────────────────────────────────────────────────────

  const { data: chatData, loading: chatLoading, error: chatError } = useQuery(GET_CHAT, {
    variables: { id: chatId },
  });
  const chat = (chatData as any)?.getChatById;
  const candidate = chat?.candidate;

  // ── Message state ───────────────────────────────────────────────────────────

  // Accumulated messages, ordered oldest-first for display (bottom = newest).
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // The cursor returned by the last fetch. Pass it as searchAfter to get
  // the next batch of older messages (server sorts newest-first, so
  // searchAfter of the current oldest item yields even older items).
  const [olderCursor, setOlderCursor] = useState('');

  // False once a fetch returns a partial page or an empty cursor,
  // meaning we've reached the very first message in the conversation.
  const [hasMore, setHasMore] = useState(false);

  // True while the load-older request is in flight.
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // The user's message shown optimistically while the mutation is in flight.
  // Shown as a bubble + typing indicator until the real response arrives.
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState('');

  // ── Scroll intent ───────────────────────────────────────────────────────────

  // Set before any state update that changes the message list.
  // useLayoutEffect reads it synchronously before paint and acts accordingly.
  //   'initial'     → jump to bottom (first page loaded)
  //   'prepend'     → restore scroll position after older messages are prepended
  //   'new-message' → jump to bottom (new exchange appended)
  const scrollIntentRef = useRef<'initial' | 'prepend' | 'new-message' | null>(null);

  // Snapshot of scrollHeight taken just before a prepend, used to compute
  // how far to offset scrollTop so the view stays anchored to the same content.
  const savedScrollHeightRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Apollo ──────────────────────────────────────────────────────────────────

  const [fetchMessages] = useLazyQuery(GET_CHAT_MESSAGES, { fetchPolicy: 'network-only' });
  const [createChatMessage, { loading: waitingForResponse }] = useMutation(CREATE_CHAT_MESSAGE);
  const { notifyMessageSent } = useChatsContext();

  // ── Scroll restoration (runs synchronously before browser paint) ────────────

  useLayoutEffect(() => {
    const el = containerRef.current;
    const intent = scrollIntentRef.current;
    scrollIntentRef.current = null;

    if (!el) return;

    if (intent === 'initial' || intent === 'new-message') {
      el.scrollTop = el.scrollHeight;
    } else if (intent === 'prepend') {
      // Push scrollTop down by however much taller the container became,
      // keeping the previously visible content in exactly the same position.
      el.scrollTop = el.scrollHeight - savedScrollHeightRef.current;
      savedScrollHeightRef.current = 0;
    }
  }, [messages, pendingUserMessage]);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chatId) return;

    // Clear previous chat's messages immediately when chatId changes.
    setMessages([]);
    setOlderCursor('');
    setHasMore(false);
    setPendingUserMessage(null);

    fetchMessages({ variables: { chatId, limit: PAGE_LIMIT } })
      .then((result) => {
        if (!result.data) return;
        const { edges, pageInfo } = (result.data as any).messages;

        // Server returns newest-first; reverse so the array is oldest-first.
        const loaded: ChatMessage[] = edges.map((e: any) => e.node).reverse();

        scrollIntentRef.current = 'initial';
        setMessages(loaded);
        setOlderCursor(pageInfo.searchAfter);
        setHasMore(loaded.length === PAGE_LIMIT && !!pageInfo.searchAfter);
      })
      .catch((err: unknown) => {
        // Ignore aborts — these are expected in React Strict Mode (dev only)
        // where effects run twice, aborting the first in-flight request.
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[ChatPage] initial load error:', err);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // ── Load older messages ───────────────────────────────────────────────────────

  const loadOlder = useCallback(async () => {
    if (!hasMore || isLoadingMore || !olderCursor) return;

    setIsLoadingMore(true);
    // Snapshot scroll height before the DOM changes.
    savedScrollHeightRef.current = containerRef.current?.scrollHeight ?? 0;
    scrollIntentRef.current = 'prepend';

    const result = await fetchMessages({
      variables: { chatId, limit: PAGE_LIMIT, searchAfter: olderCursor },
    });

    if (result.data) {
      const { edges, pageInfo } = (result.data as any).messages;
      const older: ChatMessage[] = edges.map((e: any) => e.node).reverse();

      setMessages((prev) => [...older, ...prev]);
      setOlderCursor(pageInfo.searchAfter);
      setHasMore(older.length === PAGE_LIMIT && !!pageInfo.searchAfter);
    } else {
      // If the fetch failed, cancel the scroll intent so it doesn't misfire.
      scrollIntentRef.current = null;
    }

    setIsLoadingMore(false);
  }, [chatId, hasMore, isLoadingMore, olderCursor, fetchMessages]);

  // ── Scroll handler ────────────────────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isLoadingMore || !hasMore) return;
    if (el.scrollTop === 0) loadOlder();
  }, [isLoadingMore, hasMore, loadOlder]);

  // ── Send message ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || waitingForResponse) return;

    setInputValue('');
    scrollIntentRef.current = 'new-message';
    setPendingUserMessage(text);

    const result = await createChatMessage({ variables: { chatId, userMessage: text } });
    const newMsg: ChatMessage = (result.data as any).createChatMessage;

    scrollIntentRef.current = 'new-message';
    setMessages((prev) => [...prev, newMsg]);
    setPendingUserMessage(null);
    notifyMessageSent(chatId);
  }

  // ── Loading / error ───────────────────────────────────────────────────────────

  if (chatLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (chatError || !chat) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        {chatError ? `Error: ${chatError.message}` : 'Chat not found.'}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col items-center gap-2 pt-5 pb-4 border-b border-slate-200 bg-white">
        <Link href={`/leaders/${candidate.id}`}>
          <CandidateAvatar
            imagePath={candidate.medium_image_path}
            name={candidate.name}
            party={candidate.party}
            sizeClass="w-16 h-16"
          />
        </Link>
        <p className="text-base font-bold text-slate-900">{candidate.name}</p>
      </div>

      {/* ── Message area ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4"
      >
        <div className="flex flex-col justify-end min-h-full gap-3">

          {/* "Beginning of conversation" label — shown once hasMore is false
              and there is at least one message loaded. */}
          {!hasMore && messages.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-2">
              Beginning of conversation
            </p>
          )}

          {/* Loading spinner for older messages */}
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !pendingUserMessage && (
            <div className="flex items-center justify-center text-center px-6 py-8">
              <p className="text-slate-400 text-sm leading-relaxed">
                Ask {candidate.name} anything about their policies and positions.{' '}
                <span className="text-slate-500 font-medium">Type your first question below!</span>
              </p>
            </div>
          )}

          {/* Each ChatMessage contains one user turn and one AI turn. */}
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-3">
              <MessageBubble source="user" content={msg.userMessage} />
              <MessageBubble source="candidate" content={msg.aiMessage} ids={msg.ids} />
            </div>
          ))}

          {/* Optimistic user bubble + typing indicator while mutation is in flight. */}
          {pendingUserMessage && (
            <>
              <MessageBubble source="user" content={pendingUserMessage} />
              <TypingIndicator />
            </>
          )}
        </div>
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={waitingForResponse}
            placeholder={`Message ${candidate.name}…`}
            className="flex-1 px-4 py-2.5 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || waitingForResponse}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <SendHorizonal size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
