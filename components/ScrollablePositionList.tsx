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

import PositionListItem from '@/components/PositionListItem';
import { CandidatePosition, CandidatePositionResults } from '@/lib/graphql/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  /**
   * The GraphQL query to run. It must accept `$searchAfter` and
   * `$searchBefore` parameters so the component can request specific pages.
   */
  query: string;

  /**
   * Any extra filters or options to pass to the query (e.g. a search term).
   * Pass a stable object (defined outside the component) so the list doesn't
   * unnecessarily reload when the parent re-renders.
   */
  variables: Record<string, unknown>;
  dataKey: string;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

/** A small spinning circle shown while data is loading. */
function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"
      role="status"
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * A scrollable list of CandidatePosition cards that loads more items
 * automatically as the user scrolls.
 *
 * How paging works
 * ────────────────
 * The backend returns a "page" of results along with two cursor tokens:
 *   • searchAfter  – use this to fetch the NEXT page (scrolling down).
 *   • searchBefore – use this to fetch the PREVIOUS page (scrolling up).
 *
 * Only one page is kept in memory at a time. When a new page loads, the
 * old one is replaced.
 *
 * Scroll behaviour
 * ────────────────
 *   • Scroll to the bottom → loads the next page (older content).
 *   • Scroll to the top    → loads the previous page (newer content),
 *                            unless we are already on the very first page.
 *
 * After each page swap the list jumps to a sensible position so the
 * transition feels smooth:
 *   • After loading the next page  → lands near the top of new content.
 *   • After loading the previous page → lands near the bottom of new content,
 *                                       close to where the user was reading.
 *
 * A short cooldown (800 ms) after every page load prevents the scroll
 * handler from accidentally triggering another load straight away.
 */
/** Default page size when not provided in variables (used for "no more pages" check). */
const DEFAULT_PAGE_SIZE = 15;

export default function ScrollablePositionList({ query, variables, dataKey }: Props) {

  // ── State ──────────────────────────────────────────────────────────────────

  // The cards currently shown in the list.
  const [positions, setPositions] = useState<CandidatePosition[]>([]);

  // Page size from variables: if the server returns fewer than this, we don't try to load more.
  const pageSize = Number(variables?.limit) || DEFAULT_PAGE_SIZE;

  // Cursor tokens from the last server response.
  // Pass searchAfter to the server to get the next page.
  // Pass searchBefore to the server to get the previous page.
  const [searchAfter, setSearchAfter] = useState('');
  const [searchBefore, setSearchBefore] = useState('');

  // ── Internal bookkeeping (not visible in the UI) ────────────────────────────

  /**
   * The ID of the very first item ever loaded (from the first page).
   * This never changes. We use it to detect when the user is already on
   * page 1 so we don't try to load a page that doesn't exist.
   */
  const initialIdRef = useRef<string | null>(null);

  /**
   * Whether a network request is currently in flight.
   * Prevents two page loads from running at the same time.
   */
  const isFetchingRef = useRef(false);

  /**
   * A snapshot of the query options passed in by the parent component,
   * saved once when the list first appears. The scroll callbacks read
   * from here so they always use the original options even if the parent
   * re-renders with a new object reference later.
   */
  const baseVariablesRef = useRef(variables);

  /** A reference to the scrollable container element in the browser. */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Records where to scroll after the next page of cards is displayed:
   *   'top'    → scroll near the top (after loading the next page)
   *   'bottom' → scroll near the bottom (after loading the previous page)
   *   null     → don't scroll programmatically (initial load)
   */
  const pendingScrollRef = useRef<'top' | 'bottom' | null>(null);

  /**
   * A timestamp that marks when it is safe to respond to scroll events again.
   * After loading a page we scroll the list programmatically, which would
   * normally trigger another load. We ignore scroll events until this time
   * has passed (about 800 ms) to prevent that loop.
   */
  const navLockUntilRef = useRef(0);

  // ── Talking to the server ──────────────────────────────────────────────────

  // Convert the query string into a parsed query object once and reuse it,
  // because parsing it on every render would be wasteful.
  const parsedQuery = useMemo(() => gql(query), [query]);

  // executeQuery sends the query to the server on demand (not automatically).
  // loading becomes true while a request is in flight.
  // network-only means we always fetch fresh data instead of using a cache.
  const [executeQuery, { loading }] = useLazyQuery<any>(parsedQuery, {
    fetchPolicy: 'network-only',
  });

  // ── applyResult ────────────────────────────────────────────────────────────

  /**
   * Takes the data returned by the server and updates what's shown in the list.
   * On the very first load, records the first item's ID so we can later
   * tell when the user is on page 1.
   */
  const applyResult = useCallback(
    (data: any, isInitial = false) => {
      const { edges, pageInfo } = data[dataKey];
      const nodes = edges.map((e: any) => e.node);
      setPositions(nodes);
      setSearchAfter(pageInfo.searchAfter);
      setSearchBefore(pageInfo.searchBefore);
      if (isInitial && nodes.length > 0) {
        initialIdRef.current = nodes[0].id;
      }
    },
    [],
  );

  // ── Scroll restoration ─────────────────────────────────────────────────────

  /**
   * After the browser has drawn the new page of cards, this adjusts the
   * scroll position to a sensible spot so the page swap feels continuous.
   *
   * This runs *before* the browser shows the updated screen to the user,
   * so there is no visible flash of the wrong scroll position.
   *
   * A 1 px offset from the very top and very bottom ensures the scroll
   * handler doesn't immediately fire again the moment we land there.
   */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || pendingScrollRef.current === null || positions.length === 0) return;

    if (pendingScrollRef.current === 'top') {
      el.scrollTop = 1;
    } else {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight - 1);
    }

    pendingScrollRef.current = null;
  }, [positions]);

  // ── Initial load ───────────────────────────────────────────────────────────

  /**
   * Fetches the first page of results as soon as the list appears on screen.
   * Runs only once.
   */
  useEffect(() => {
    isFetchingRef.current = true;
    executeQuery({ variables: baseVariablesRef.current })
      .then((result) => {
        if (result.data) applyResult(result.data, true);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('[ScrollablePositionList] initial load error:', error);
        }
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── loadNext ───────────────────────────────────────────────────────────────

  /**
   * Fetches the next page (older content) when the user reaches the bottom.
   * After the new cards are drawn, the list jumps near the top so the user
   * can start reading from the beginning of the new page.
   */
  const loadNext = useCallback(async () => {
    if (isFetchingRef.current || !searchAfter) return;

    isFetchingRef.current = true;
    pendingScrollRef.current = 'top';
    // Block scroll-triggered loads for 800 ms to cover the network round-trip
    // and the subsequent scroll adjustment.
    navLockUntilRef.current = Date.now() + 800;

    try {
      const result = await executeQuery({
        variables: { ...baseVariablesRef.current, searchAfter },
      });
      if (result.data) applyResult(result.data);
    } catch (error) {
      // If the request fails, cancel the planned scroll so it doesn't misfire.
      pendingScrollRef.current = null;
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[ScrollablePositionList] loadNext error:', error);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [searchAfter, executeQuery, applyResult]);

  // ── loadPrev ───────────────────────────────────────────────────────────────

  /**
   * Fetches the previous page (newer content) when the user reaches the top.
   * Does nothing if the user is already on the first page.
   * After the new cards are drawn, the list jumps near the bottom so the
   * reading flow feels continuous — the content the user was just reading
   * is still nearby.
   */
  const loadPrev = useCallback(async () => {
    if (isFetchingRef.current || !searchBefore) return;
    // Already on page 1 — nothing to load before this.
    if (positions[0]?.id === initialIdRef.current) return;

    isFetchingRef.current = true;
    pendingScrollRef.current = 'bottom';
    navLockUntilRef.current = Date.now() + 800;

    try {
      const result = await executeQuery({
        variables: { ...baseVariablesRef.current, searchBefore },
      });
      if (result.data) applyResult(result.data);
    } catch (error) {
      pendingScrollRef.current = null;
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[ScrollablePositionList] loadPrev error:', error);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [searchBefore, positions, executeQuery, applyResult]);

  // ── Scroll handler ─────────────────────────────────────────────────────────

  /**
   * Called every time the user scrolls the list.
   * Checks whether the user has reached the very top or very bottom and
   * loads the adjacent page accordingly.
   * Does not load next page (searchAfter) if the current page is partial
   * (fewer items than requested), meaning there are no more results.
   * Ignored during the 800 ms cooldown after a page load.
   */
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isFetchingRef.current || positions.length === 0) return;
    if (Date.now() < navLockUntilRef.current) return;

    if (el.scrollTop === 0) {
      loadPrev();
      return;
    }

    if (el.scrollHeight - el.scrollTop - el.clientHeight < 1) {
      if (positions.length < pageSize) return;
      loadNext();
    }
  }, [positions.length, pageSize, loadPrev, loadNext]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto"
    >
      {/* Shown only on the very first load before any cards are available. */}
      {loading && positions.length === 0 && (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      )}

      {/* Spinner at the top while the previous page is being fetched. */}
      {loading && positions.length > 0 && pendingScrollRef.current === 'bottom' && (
        <div className="flex justify-center py-3">
          <Spinner />
        </div>
      )}

      {/* The list of cards, separated by thin gray borders. */}
      <div className="divide-y divide-slate-200">
        {positions.map((position) => (
          <PositionListItem key={position.id} position={position} />
        ))}
      </div>

      {/* Spinner at the bottom while the next page is being fetched. */}
      {loading && positions.length > 0 && pendingScrollRef.current === 'top' && (
        <div className="flex justify-center py-3">
          <Spinner />
        </div>
      )}
    </div>
  );
}
