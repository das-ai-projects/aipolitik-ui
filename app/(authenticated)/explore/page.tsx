'use client';

import { Search } from 'lucide-react';
import { useRef, useState } from 'react';

import RightSideBar from '@/components/RightSideBar';
import ScrollableCandidateList from '@/components/ScrollableCandidateList';
import ScrollablePositionList from '@/components/ScrollablePositionList';
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

const TABS: { id: Tab; label: string }[] = [
  { id: 'positions', label: 'Positions' },
  { id: 'leaders', label: 'Leaders' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<Tab>('positions');
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [listVariables, setListVariables] = useState<Record<string, unknown> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    setSubmittedQuery(q);
    setListVariables({ query: q });
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
                placeholder={activeTab === 'positions' ? 'Search positions…' : 'Search leaders…'}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-5 py-2 text-sm font-semibold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </form>
          <div className="h-6" />
          {/* Tab bar */}
          <div className="shrink-0 border-b border-slate-200 bg-white">
            <div className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-1/2 py-5 text-center text-xl font-bold transition-colors border-b-4 -mb-1',
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
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
              {activeTab === 'positions' ? 'Search for positions by keyword' : 'Search for leaders by name or party'}
            </p>
          </div>
        )}
      </div>

      {/* ── Right sidebar ──────────────────────────────────────────────────── */}
      <RightSideBar />
    </div>
  );
}
