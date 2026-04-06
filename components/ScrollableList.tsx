'use client';

import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslatedText } from "@/components/LanguagePreferenceContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props<T> {
  /** The GraphQL query string. Must accept $searchAfter and $searchBefore. */
  query: string;

  /** Extra variables passed to the query (e.g. search term, filters).
   *  Pass a stable object (defined outside the component) — the list captures
   *  this once on mount and never re-reads it, so a new object reference won't
   *  trigger a reload. Use the `key` prop on this component to force a full
   *  reload instead. */
  variables: Record<string, unknown>;

  /** The key inside the GraphQL response that holds the paginated result.
   *  E.g. if the query aliases the field as `positions: searchCandidatePositions(...)`,
   *  pass `"positions"` here. */
  dataKey: string;

  /** Renders one item in the list. */
  renderItem: (item: T) => React.ReactNode;

  /** Returns the unique ID for an item, used as the React list key. */
  getItemId: (item: T) => string;

  /** Main message shown when the search returns no results. */
  emptyMessage?: string;

  /** Sub-message shown below the main empty message. */
  emptySubMessage?: string;

  /** Called whenever the displayed items change (e.g. after each page load).
   *  Lets a parent component shadow the current list without owning the state. */
  onItemsChange?: (items: T[]) => void;

  /** When false, empty and loading strings are shown as-is (no preferred-language translation). */
  translateUi?: boolean;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"
      role="status"
    >
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}

// ── Default page size ─────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 15;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Generic scrollable paginated list.
 *
 * Handles all cursor-based pagination and scroll behaviour. The caller
 * supplies the query, variables, and a renderItem function. The component
 * takes care of:
 *   • Fetching the first page on mount.
 *   • Loading the next page when the user scrolls to the bottom.
 *   • Loading the previous page when the user scrolls to the top.
 *   • Restoring scroll position after each page swap so the transition
 *     feels smooth.
 *   • Showing a flashing empty state when no results are found.
 */
export default function ScrollableList<T>({
  query,
  variables,
  dataKey,
  renderItem,
  getItemId,
  emptyMessage = "No results found",
  emptySubMessage = "Try a different search",
  onItemsChange,
  translateUi = true,
}: Props<T>) {
  const tLoading = useTranslatedText("Loading…");
  const tEmpty = useTranslatedText(emptyMessage);
  const tSubEmpty = useTranslatedText(emptySubMessage);
  const loadingLabel = translateUi ? tLoading : "Loading…";
  const displayEmpty = translateUi ? tEmpty : emptyMessage;
  const displaySubEmpty = translateUi ? tSubEmpty : emptySubMessage;

  // ── State ──────────────────────────────────────────────────────────────────

  const [items, setItems] = useState<T[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const pageSize = Number(variables?.limit) || DEFAULT_PAGE_SIZE;

  const [searchAfter, setSearchAfter] = useState('');
  const [searchBefore, setSearchBefore] = useState('');

  // ── Refs ───────────────────────────────────────────────────────────────────

  // ID of the very first item loaded — used to detect when we're on page 1.
  const initialIdRef = useRef<string | null>(null);
  // True while a network request is in flight — prevents double-fetching.
  const isFetchingRef = useRef(false);
  // Captured once on mount so pagination callbacks always use the original filters.
  const baseVariablesRef = useRef(variables);
  // The scrollable container element.
  const containerRef = useRef<HTMLDivElement>(null);
  // Where to scroll after the next render: 'top', 'bottom', or null (no-op).
  const pendingScrollRef = useRef<'top' | 'bottom' | null>(null);
  // Timestamp before which scroll events are ignored (cooldown after page swap).
  const navLockUntilRef = useRef(0);

  // ── Apollo ─────────────────────────────────────────────────────────────────

  const parsedQuery = useMemo(() => gql(query), [query]);
  const [executeQuery, { loading }] = useLazyQuery<any>(parsedQuery, {
    fetchPolicy: 'network-only',
  });

  // ── applyResult ────────────────────────────────────────────────────────────

  const applyResult = useCallback(
    (data: any, isInitial = false) => {
      const { edges, pageInfo } = data[dataKey];
      const nodes: T[] = edges.map((e: any) => e.node);
      setItems(nodes);
      onItemsChange?.(nodes);
      setSearchAfter(pageInfo.searchAfter);
      setSearchBefore(pageInfo.searchBefore);
      if (isInitial) {
        setIsEmpty(nodes.length === 0);
        if (nodes.length > 0) initialIdRef.current = getItemId(nodes[0]);
      }
    },
    [dataKey, getItemId, onItemsChange],
  );

  // ── Scroll restoration ─────────────────────────────────────────────────────

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || pendingScrollRef.current === null || items.length === 0) return;
    el.scrollTop =
      pendingScrollRef.current === 'top'
        ? 1
        : Math.max(0, el.scrollHeight - el.clientHeight - 1);
    pendingScrollRef.current = null;
  }, [items]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    isFetchingRef.current = true;
    executeQuery({ variables: baseVariablesRef.current })
      .then((result) => { if (result.data) applyResult(result.data, true); })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError')
          console.error('[ScrollableList] initial load error:', err);
      })
      .finally(() => { isFetchingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── loadNext ───────────────────────────────────────────────────────────────

  const loadNext = useCallback(async () => {
    if (isFetchingRef.current || !searchAfter) return;
    isFetchingRef.current = true;
    pendingScrollRef.current = 'top';
    navLockUntilRef.current = Date.now() + 800;
    try {
      const result = await executeQuery({
        variables: { ...baseVariablesRef.current, searchAfter },
      });
      if (result.data) applyResult(result.data);
    } catch (err) {
      pendingScrollRef.current = null;
      if (err instanceof Error && err.name !== 'AbortError')
        console.error('[ScrollableList] loadNext error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [searchAfter, executeQuery, applyResult]);

  // ── loadPrev ───────────────────────────────────────────────────────────────

  const loadPrev = useCallback(async () => {
    if (isFetchingRef.current || !searchBefore) return;
    if (getItemId(items[0]) === initialIdRef.current) return;
    isFetchingRef.current = true;
    pendingScrollRef.current = 'bottom';
    navLockUntilRef.current = Date.now() + 800;
    try {
      const result = await executeQuery({
        variables: { ...baseVariablesRef.current, searchBefore },
      });
      if (result.data) applyResult(result.data);
    } catch (err) {
      pendingScrollRef.current = null;
      if (err instanceof Error && err.name !== 'AbortError')
        console.error('[ScrollableList] loadPrev error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [searchBefore, items, getItemId, executeQuery, applyResult]);

  // ── Scroll handler ─────────────────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isFetchingRef.current || items.length === 0) return;
    if (Date.now() < navLockUntilRef.current) return;

    if (el.scrollTop === 0) { loadPrev(); return; }

    if (el.scrollHeight - el.scrollTop - el.clientHeight < 1) {
      if (items.length < pageSize) return;
      loadNext();
    }
  }, [items.length, pageSize, loadPrev, loadNext]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto">

      {/* Initial loading spinner */}
      {loading && items.length === 0 && !isEmpty && (
        <div className="flex h-32 items-center justify-center">
          <Spinner loadingLabel={loadingLabel} />
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 animate-pulse">
          <span className="text-5xl">😱</span>
          <p className="text-base font-semibold text-slate-500">{displayEmpty}</p>
          <p className="text-sm text-slate-400">{displaySubEmpty}</p>
        </div>
      )}

      {/* Spinner at top while previous page loads */}
      {loading && items.length > 0 && pendingScrollRef.current === 'bottom' && (
        <div className="flex justify-center py-3"><Spinner loadingLabel={loadingLabel} /></div>
      )}

      {/* Items */}
      <div className="divide-y divide-slate-200">
        {items.map((item) => (
          <div key={getItemId(item)}>{renderItem(item)}</div>
        ))}
      </div>

      {/* Spinner at bottom while next page loads */}
      {loading && items.length > 0 && pendingScrollRef.current === 'top' && (
        <div className="flex justify-center py-3"><Spinner loadingLabel={loadingLabel} /></div>
      )}
    </div>
  );
}
