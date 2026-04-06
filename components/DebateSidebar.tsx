'use client';

import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { Pencil, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import DebateListItem from '@/components/DebateListItem';
import { useDebatesContext } from '@/components/DebatesContext';
import ScrollableList from '@/components/ScrollableList';
import { Debate } from '@/lib/graphql/types';

const GET_DEBATES_QUERY = `
  query GetDebates($searchAfter: String, $searchBefore: String) {
    debates: getDebates(limit: 25, searchAfter: $searchAfter, searchBefore: $searchBefore) {
      pageInfo { count searchBefore searchAfter }
      edges {
        score
        node {
          id
          name
          user_id
          candidate_names
          candidate_ids
          last_updated
          candidates {
            id
            name
            party
            small_image_path
          }
        }
      }
    }
  }
`;

const SEARCH_DEBATES_GQL = gql`
  query SearchDebates($query: String!) {
    debates: searchDebates(query: $query, limit: 25) {
      pageInfo { count searchBefore searchAfter }
      edges {
        score
        node {
          id
          name
          user_id
          candidate_names
          candidate_ids
          last_updated
          candidates {
            id
            name
            party
            small_image_path
          }
        }
      }
    }
  }
`;

const DEFAULT_VARIABLES: Record<string, unknown> = {};
const getId = (d: Debate) => d.id;

function debateWithTimestampPatch(d: Debate, patch: Record<string, string>): Debate {
  const ts = patch[d.id];
  return ts != null ? { ...d, last_updated: ts } : d;
}

interface Props {
  lastCreatedDebate: Debate | null;
  onConsumed: () => void;
}

export default function DebateSidebar({ lastCreatedDebate, onConsumed }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { openNewDebate, debateTimestampPatch } = useDebatesContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Debate[]>([]);
  const [optimisticDebates, setOptimisticDebates] = useState<Debate[] | null>(null);
  const [scrollableEpoch, setScrollableEpoch] = useState(0);
  const shadowDebatesRef = useRef<Debate[]>([]);

  const isSearching = debouncedTerm.length >= 2;
  const [runSearch] = useLazyQuery(SEARCH_DEBATES_GQL, { fetchPolicy: 'network-only' });

  const renderDebateItem = useCallback(
    (debate: Debate) => (
      <DebateListItem
        debate={debateWithTimestampPatch(debate, debateTimestampPatch)}
        active={pathname === `/debates/${debate.id}`}
      />
    ),
    [pathname, debateTimestampPatch]
  );

  const handleItemsChange = useCallback((items: Debate[]) => {
    shadowDebatesRef.current = items;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!isSearching) return;
    runSearch({ variables: { query: debouncedTerm } })
      .then((result) => {
        if (result.data) {
          const payload = result.data as any;
          setSearchResults(payload.debates.edges.map((e: any) => e.node));
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[DebateSidebar] search error:', err);
        }
      });
  }, [debouncedTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lastCreatedDebate) return;
    setSearchTerm('');
    setDebouncedTerm('');
    const reordered = [
      lastCreatedDebate,
      ...shadowDebatesRef.current.filter((debate) => debate.id !== lastCreatedDebate.id),
    ];
    setOptimisticDebates(reordered);
    const t = setTimeout(() => {
      setOptimisticDebates(null);
      setScrollableEpoch((e) => e + 1);
    }, 1200);
    onConsumed();
    return () => clearTimeout(t);
  }, [lastCreatedDebate, onConsumed]);

  function handleNewDebate() {
    openNewDebate();
    router.push('/debates');
  }

  function LocalList({ debates }: { debates: Debate[] }) {
    if (debates.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-1 py-12 text-center px-4">
          <p className="text-sm font-medium text-slate-500">No debates found.</p>
          <p className="text-xs text-slate-400">Try a different name.</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-slate-100">
        {debates.map((debate) => (
          <DebateListItem
            key={debate.id}
            debate={debateWithTimestampPatch(debate, debateTimestampPatch)}
            active={pathname === `/debates/${debate.id}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 flex flex-col h-full border-r border-slate-200 bg-white">
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-slate-900">Debates</h2>
          <button
            onClick={handleNewDebate}
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            aria-label="New debate"
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
            placeholder="Search debates…"
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        {optimisticDebates ? (
          <LocalList debates={optimisticDebates} />
        ) : isSearching ? (
          <LocalList debates={searchResults} />
        ) : (
          <ScrollableList<Debate>
            key={scrollableEpoch}
            query={GET_DEBATES_QUERY}
            variables={DEFAULT_VARIABLES}
            dataKey="debates"
            renderItem={renderDebateItem}
            getItemId={getId}
            onItemsChange={handleItemsChange}
            emptyMessage="No debates yet."
            emptySubMessage="Create your first debate."
          />
        )}
      </div>
    </div>
  );
}
