'use client';

import { useMutation } from '@apollo/client/react';
import { Loader2, Search } from 'lucide-react';
import { useRef, useState } from 'react';

import RightSideBar from '@/components/RightSideBar';
import ScrollableCandidateList from '@/components/ScrollableCandidateList';
import ScrollablePositionList from '@/components/ScrollablePositionList';
import {
  useLanguagePreference,
  useTranslatedText,
} from '@/components/LanguagePreferenceContext';
import { TRANSLATE_SEARCH_QUERIES } from '@/lib/graphql/languagePreference';
import { cn } from '@/lib/utils';

// ── Queries ───────────────────────────────────────────────────────────────────

const POSITIONS_QUERY = `
  query SearchCandidatePositions($query: String, $searchAfter: String, $searchBefore: String) {
    positions: searchCandidatePositions(query: $query, searchAfter: $searchAfter, searchBefore: $searchBefore, sortKey: "score", limit: 15) {
      pageInfo { count searchAfter searchBefore }
      edges {
        score
        node {
          id
          policy_position
          date_generated
          candidate { id name party small_image_path }
        }
      }
    }
  }
`;

const CANDIDATES_QUERY = `
  query SearchCandidates($query: String, $searchAfter: String, $searchBefore: String) {
    candidates: searchCandidates(query: $query, searchAfter: $searchAfter, searchBefore: $searchBefore, limit: 15) {
      pageInfo { count searchAfter searchBefore }
      edges {
        score
        node {
          id
          name
          party
          bio
          small_image_path
          follow { isFollowing }
        }
      }
    }
  }
`;

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'positions' | 'leaders';

const TAB_IDS: Tab[] = ['positions', 'leaders'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const { preferredLanguage } = useLanguagePreference();
  const [translateSearchQueries] = useMutation<{
    translateSearchQueries: string[];
  }>(TRANSLATE_SEARCH_QUERIES);

  const [activeTab, setActiveTab] = useState<Tab>('positions');
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [listVariables, setListVariables] = useState<Record<string, unknown> | null>(null);
  const [searchPreparing, setSearchPreparing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Raw user query → English search string (only used when preferredLanguage !== EN). */
  const queryToEnglishCache = useRef<Map<string, string>>(new Map());

  const labelPositions = useTranslatedText('Positions');
  const labelLeaders = useTranslatedText('Leaders');
  const phPositions = useTranslatedText('Search positions…');
  const phLeaders = useTranslatedText('Search leaders…');
  const searchLabel = useTranslatedText('Search');
  const hintPositions = useTranslatedText('Search for positions by keyword');
  const hintLeaders = useTranslatedText('Search for leaders by name or party');
  const tabLabel = (id: Tab) => (id === 'positions' ? labelPositions : labelLeaders);
  const placeholder = activeTab === 'positions' ? phPositions : phLeaders;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q || searchPreparing) return;

    setSearchPreparing(true);
    try {
      let searchQuery = q;
      if (preferredLanguage !== 'EN') {
        const cached = queryToEnglishCache.current.get(q);
        if (cached !== undefined) {
          searchQuery = cached;
        } else {
          const { data } = await translateSearchQueries({ variables: { texts: [q] } });
          const out = data?.translateSearchQueries?.[0]?.trim();
          searchQuery = out && out.length > 0 ? out : q;
          queryToEnglishCache.current.set(q, searchQuery);
        }
      }
      setSubmittedQuery(q);
      setListVariables({ query: searchQuery });
    } finally {
      setSearchPreparing(false);
    }
  }

  // Unique key so switching tab with the same query still remounts the list.
  const listKey = `${activeTab}:${submittedQuery}`;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        
        <div className="shrink-0 px-5 pt-4 pb-0 bg-white border-b border-slate-200">
          

          {/* Search bar */}
          <form onSubmit={handleSubmit} className="flex gap-3 pb-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={searchPreparing}
                placeholder={placeholder}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || searchPreparing}
              aria-busy={searchPreparing}
              className="px-5 py-2 text-sm font-semibold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 min-w-[5.5rem]"
            >
              {searchPreparing ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : null}
              {searchLabel}
            </button>
          </form>
          <div className="h-6" />
          {/* Tab bar */}
          <div className="shrink-0 border-b border-slate-200 bg-white">
            <div className="flex">
              {TAB_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'w-1/2 py-5 text-center text-xl font-bold transition-colors border-b-4 -mb-1',
                    activeTab === id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tabLabel(id)}
                </button>
              ))} 
            </div>
          </div>
          {/* Padding between tab bar and search bar */}
          
          
        </div>

        {/* Results area */}
        {listVariables ? (
          <div className="flex-1 min-h-0">
            {activeTab === 'positions' ? (
              <ScrollablePositionList
                key={listKey}
                dataKey="positions"
                query={POSITIONS_QUERY}
                variables={listVariables}
              />
            ) : (
              <ScrollableCandidateList
                key={listKey}
                dataKey="candidates"
                query={CANDIDATES_QUERY}
                variables={listVariables}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Search size={32} strokeWidth={1.5} />
            <p className="text-sm">
              {activeTab === 'positions' ? hintPositions : hintLeaders}
            </p>
          </div>
        )}
      </div>

      {/* ── Right sidebar ──────────────────────────────────────────────────── */}
      <RightSideBar />
    </div>
  );
}
