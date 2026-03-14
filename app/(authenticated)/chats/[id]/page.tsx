'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { use, useEffect, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import Link from 'next/link';
import CandidateAvatar from '@/components/CandidateAvatar';

// ── GraphQL ───────────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  source: 'user' | 'candidate';
  content: string;
  timestamp: string;
}

// ── Typing indicator ──────────────────────────────────────────────────────────

/** Three bouncing dots shown while the candidate's response is being "typed". */
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

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.source === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[75%] px-4 py-2.5 text-base leading-relaxed rounded-2xl shadow-sm
          ${isUser
            ? 'bg-emerald-500 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, loading, error } = useQuery(GET_CHAT, { variables: { id } });
  const chat = (data as any)?.getChatById;
  const candidate = chat?.candidate;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Ref to the invisible sentinel at the bottom of the message list —
  // scrolling it into view keeps the conversation pinned to the bottom.
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change or the typing indicator appears.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaiting]);

  function handleSendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isWaiting) return;

    const userMsg: Message = {
      source: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Use the functional form of setMessages so the setTimeout callback
    // always appends to the latest array, not a stale snapshot.
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsWaiting(true);

    setTimeout(() => {
      setIsWaiting(false);
      setMessages((prev) => [
        ...prev,
        {
          source: 'candidate',
          content: 'This is a test response',
          timestamp: new Date().toISOString(),
        },
      ]);
    }, 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSendMessage(inputValue);
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        {error ? `Error: ${error.message}` : 'Chat not found.'}
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
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* min-h-full + justify-end pins messages to the bottom of the container
            when there aren't enough to fill the space, just like a real chat app. */}
        <div className="flex flex-col justify-end min-h-full gap-3">
          {messages.length === 0 && !isWaiting && (
            // Empty state — shown before the first message is sent.
            <div className="flex items-center justify-center text-center px-6 py-8">
              <p className="text-slate-400 text-sm leading-relaxed">
                Ask {candidate.name} anything about their policies and positions.{' '}
                <span className="text-slate-500 font-medium">Type your first question below!</span>
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isWaiting && <TypingIndicator />}
          {/* Invisible sentinel — scrolled into view to keep the bottom visible. */}
          <div ref={bottomRef} />
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
            disabled={isWaiting}
            placeholder={`Message ${candidate.name}…`}
            className="flex-1 px-4 py-2.5 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isWaiting}
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
