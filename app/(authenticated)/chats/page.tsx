'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { Loader2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import CandidateAvatar from '@/components/CandidateAvatar';
import { useChatsContext } from '@/components/ChatsContext';
import { Candidate } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';

// ── GraphQL ───────────────────────────────────────────────────────────────────

const SEARCH_CANDIDATES = gql`
  query SearchCandidatesForChat($query: String, $limit: Int) {
    candidates: searchCandidates(query: $query, limit: $limit) {
      edges {
        node {
          id
          name
          party
          bio
          small_image_path
        }
      }
    }
  }
`;

const GET_CHAT_BY_CANDIDATE = gql`
  query GetChatByCandidateIdForNewChat($candidateId: String!) {
    getChatByCandidateId(candidateId: $candidateId) {
      chatExists
      chat { id }
    }
  }
`;

const CREATE_CHAT = gql`
  mutation CreateChatForNewChat($candidateId: String!) {
    createChat(candidateId: $candidateId) { id }
  }
`;

// ── Candidate result row ───────────────────────────────────────────────────────

function CandidateRow({
  candidate,
  loading,
  onClick,
  compact = false,
}: {
  candidate: Candidate;
  loading: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const partyColor = getPartyColor(candidate.party);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`
        w-full flex items-center gap-3 text-left transition-colors
        hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed
        ${compact ? 'px-4 py-2.5' : 'px-5 py-4'}
      `}
    >
      <CandidateAvatar
        imagePath={candidate.small_image_path}
        name={candidate.name}
        party={candidate.party}
        sizeClass={compact ? 'w-8 h-8' : 'w-11 h-11'}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-slate-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>
          {candidate.name}
        </p>
        {!compact && candidate.bio && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{candidate.bio}</p>
        )}
      </div>
      <span
        className={`shrink-0 font-semibold ${compact ? 'text-xs' : 'text-sm'}`}
        style={{ color: partyColor }}
      >
        {candidate.party}
      </span>
      {loading && <Loader2 size={14} className="shrink-0 animate-spin text-slate-400" />}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const { isNewChatMode, closeNewChat } = useChatsContext();
  const router = useRouter();

  const [inputValue, setInputValue] = useState('');
  const [dropdownCandidates, setDropdownCandidates] = useState<Candidate[]>([]);
  const [fullResults, setFullResults] = useState<Candidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingCandidateId, setLoadingCandidateId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [searchCandidates] = useLazyQuery(SEARCH_CANDIDATES, { fetchPolicy: 'network-only' });
  const [checkChat] = useLazyQuery(GET_CHAT_BY_CANDIDATE, { fetchPolicy: 'network-only' });
  const [createChat] = useMutation(CREATE_CHAT);

  // Reset state each time the panel opens.
  useEffect(() => {
    if (isNewChatMode) {
      setInputValue('');
      setDropdownCandidates([]);
      setFullResults([]);
      setHasSearched(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isNewChatMode]);

  // Fetch dropdown candidates on every character change (debounced 150ms).
  useEffect(() => {
    if (inputValue.length < 4) {
      setDropdownCandidates([]);
      return;
    }
    const t = setTimeout(() => {
      searchCandidates({ variables: { query: inputValue, limit: 6 } }).then((result) => {
        if (result.data) {
          setDropdownCandidates(result.data.candidates.edges.map((e: any) => e.node));
        }
      });
    }, 150);
    return () => clearTimeout(t);
  }, [inputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    setDropdownCandidates([]);
    const result = await searchCandidates({ variables: { query: q, limit: 20 } });
    if (result.data) {
      setFullResults(result.data.candidates.edges.map((e: any) => e.node));
    }
    setHasSearched(true);
  }

  async function handleSelectCandidate(candidateId: string) {
    if (loadingCandidateId) return;
    setLoadingCandidateId(candidateId);
    try {
      const { data } = await checkChat({ variables: { candidateId } });
      const result = data?.getChatByCandidateId;
      if (result?.chatExists && result.chat?.id) {
        closeNewChat();
        router.push(`/chats/${result.chat.id}`);
      } else {
        const { data: newChat } = await createChat({ variables: { candidateId } });
        closeNewChat();
        router.push(`/chats/${newChat.createChat.id}`);
      }
    } finally {
      setLoadingCandidateId(null);
    }
  }

  // ── Default placeholder ────────────────────────────────────────────────────

  if (!isNewChatMode) {
    return (
      <div className="flex h-full items-center justify-center px-10 text-center">
        <p className="text-slate-400 text-base leading-relaxed">
          What are you waiting for?{' '}
          <span className="text-slate-600 font-semibold">
            Start chatting with your favorite leaders right away!
          </span>
        </p>
      </div>
    );
  }

  // ── New chat search UI ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="flex-1 text-lg font-bold text-slate-900">New Chat</h2>
          <button
            onClick={closeNewChat}
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (hasSearched) setHasSearched(false);
              }}
              placeholder="Search for a leader…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />

            {/* Dropdown */}
            {dropdownCandidates.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
                {dropdownCandidates.map((c) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    loading={loadingCandidateId === c.id}
                    onClick={() => handleSelectCandidate(c.id)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-5 py-2 text-sm font-semibold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Full results */}
      <div className="flex-1 overflow-y-auto">
        {hasSearched && fullResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <p className="text-sm">No leaders found for &ldquo;{inputValue}&rdquo;.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {fullResults.map((c) => (
              <CandidateRow
                key={c.id}
                candidate={c}
                loading={loadingCandidateId === c.id}
                onClick={() => handleSelectCandidate(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
