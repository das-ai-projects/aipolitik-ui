'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import CandidateAvatar from '@/components/CandidateAvatar';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';
import { getPartyColor } from '@/lib/party-colors';
import { cn } from '@/lib/utils';

const LIST_CANDIDATES = gql`
  query ListCandidates($limit: Int!, $searchAfter: String) {
    listCandidates(limit: $limit, searchAfter: $searchAfter) {
      pageInfo {
        count
        searchAfter
        searchBefore
      }
      edges {
        node {
          id
          name
          party
          small_image_path
          medium_image_path
        }
      }
    }
  }
`;

const PAGE_SIZE = 9;

type LeaderNode = {
  id: string;
  name: string;
  party: string;
  small_image_path?: string;
  medium_image_path?: string;
};

function LeaderGridCard({ candidate: c }: { candidate: LeaderNode }) {
  const partyColor = getPartyColor(c.party);
  const displayParty = useTranslatedText(c.party ?? '');
  const medium =
    typeof c.medium_image_path === 'string' && c.medium_image_path.trim() !== ''
      ? c.medium_image_path
      : null;
  const small =
    typeof c.small_image_path === 'string' && c.small_image_path.trim() !== ''
      ? c.small_image_path
      : null;
  const img = medium ?? small;

  return (
    <Link
      href={`/leaders/${c.id}`}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
    >
      {img ? (
        <CandidateAvatar
          imagePath={img}
          name={c.name}
          party={c.party}
          sizeClass="h-20 w-20 sm:h-24 sm:w-24"
        />
      ) : (
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[3px] bg-slate-100 text-sm font-medium text-slate-400 sm:h-24 sm:w-24"
          style={{ borderColor: partyColor }}
          aria-hidden
        >
          ?
        </div>
      )}
      <p className="line-clamp-2 w-full text-center text-sm font-bold leading-tight text-slate-900 group-hover:underline">
        {c.name}
      </p>
      <p
        className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight sm:text-sm"
        style={{ color: partyColor }}
      >
        {displayParty}
      </p>
    </Link>
  );
}

export default function LeadersDirectoryGrid() {
  const [items, setItems] = useState<LeaderNode[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const title = useTranslatedText('Leaders');
  const subtitle = useTranslatedText(
    'Browse every candidate in the prototype. Scroll to load more.'
  );
  const loadingLabel = useTranslatedText('Loading…');
  const endLabel = useTranslatedText('You have reached the end of the list.');
  const errorPrefix = useTranslatedText('Error:');

  const { data, loading, error, fetchMore } = useQuery<{
    listCandidates: {
      pageInfo: { count: number; searchAfter: string; searchBefore: string };
      edges: { node: LeaderNode }[];
    };
  }>(LIST_CANDIDATES, {
    variables: { limit: PAGE_SIZE },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    const conn = data?.listCandidates;
    if (!conn) return;
    const seen = new Set<string>();
    const merged: LeaderNode[] = [];
    for (const e of conn.edges) {
      if (!seen.has(e.node.id)) {
        seen.add(e.node.id);
        merged.push(e.node);
      }
    }
    setItems(merged);
    const next = conn.pageInfo.searchAfter?.trim();
    const token = next && next.length > 0 ? next : null;
    setCursor(token);
    setHasMore(Boolean(token));
  }, [data]);

  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      await fetchMore({
        variables: { limit: PAGE_SIZE, searchAfter: cursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.listCandidates) return prev;
          return {
            listCandidates: {
              ...fetchMoreResult.listCandidates,
              edges: [
                ...prev.listCandidates.edges,
                ...fetchMoreResult.listCandidates.edges,
              ],
            },
          };
        },
      });
    } catch (e) {
      console.error('[LeadersDirectoryGrid] fetchMore', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [cursor, fetchMore, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { root: null, rootMargin: '320px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const showInitialLoading = loading && items.length === 0 && !error;
  const showFooterSpinner = loading && items.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        {error && (
          <p className="mx-auto max-w-6xl text-sm text-red-600">
            {errorPrefix} {error.message}
          </p>
        )}

        <div
          className={cn(
            'mx-auto grid max-w-6xl gap-4',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {items.map((c) => (
            <LeaderGridCard key={c.id} candidate={c} />
          ))}
        </div>

        <div ref={sentinelRef} className="h-4 w-full shrink-0" aria-hidden />

        <div className="mx-auto flex max-w-6xl justify-center py-6">
          {showInitialLoading && (
            <p className="text-sm text-slate-500">{loadingLabel}</p>
          )}
          {showFooterSpinner && (
            <p className="text-sm text-slate-400">{loadingLabel}</p>
          )}
          {!hasMore && items.length > 0 && !showInitialLoading && (
            <p className="text-sm text-slate-400">{endLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
