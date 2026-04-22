'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';
import { useDebatesContext } from '@/components/DebatesContext';
import { Candidate } from '@/lib/graphql/types';
import { PARTY_COLORS, getPartyColor } from '@/lib/party-colors';

const SEARCH_CANDIDATES = gql`
  query SearchCandidatesForDebate($query: String, $party: String, $limit: Int) {
    candidates: searchCandidates(query: $query, party: $party, limit: $limit) {
      edges {
        node {
          id
          name
          party
          medium_image_path
        }
      }
    }
  }
`;

const CREATE_DEBATE = gql`
  mutation CreateDebate($candidateIds: [String!]!, $name: String) {
    createDebate(candidateIds: $candidateIds, name: $name) {
      id
      name
      user_id
      candidate_ids
      candidate_names
      last_updated
      candidates {
        id
        name
        party
        small_image_path
      }
    }
  }
`;

export default function DebatesPage() {
  const { isNewDebateMode, closeNewDebate, notifyDebateCreated } = useDebatesContext();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
  const [debateName, setDebateName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchCandidates] = useLazyQuery(SEARCH_CANDIDATES, { fetchPolicy: 'network-only' });
  const [createDebate] = useMutation(CREATE_DEBATE);

  const parties = useMemo(() => Object.keys(PARTY_COLORS), []);

  const step1Title = useTranslatedText('1. Enter the name of your debate');
  const step2Title = useTranslatedText('2. Select up to 4 candidates for comparison');
  const step3Title = useTranslatedText('3. Click below and start firing away!');
  const formSubtitle = useTranslatedText(
    'Name it, pick your lineup, then launch the debate.'
  );
  const searchResultsLabel = useTranslatedText('Search results');
  const selectedHeading = useTranslatedText('Selected candidates');
  const chooseTwoHint = useTranslatedText('Choose at least two people.');
  const createDebateLabel = useTranslatedText('Create debate');
  const creatingLabel = useTranslatedText('Creating…');

  useEffect(() => {
    if (!isNewDebateMode) return;
    setSearchValue('');
    setPartyFilter('');
    setSearchResults([]);
    setSelectedCandidates([]);
    setDebateName('');
  }, [isNewDebateMode]);

  useEffect(() => {
    if (!isNewDebateMode) return;
    const q = searchValue.trim();
    if (q.length < 2 && !partyFilter) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchCandidates({ variables: { query: q || undefined, party: partyFilter || undefined, limit: 20 } })
        .then((result) => {
          if (result.data) {
            const payload = result.data as any;
            setSearchResults(payload.candidates.edges.map((e: any) => e.node));
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('[DebatesPage] candidate search error:', err);
          }
        });
    }, 200);
    return () => clearTimeout(t);
  }, [searchValue, partyFilter, isNewDebateMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputBaseClass =
    'min-h-[3.25rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30';

  function handleSelectCandidate(candidate: Candidate) {
    if (selectedCandidates.some((c) => c.id === candidate.id)) return;
    if (selectedCandidates.length >= 4) return;
    setSelectedCandidates((prev) => [...prev, candidate]);
  }

  function handleRemoveCandidate(id: string) {
    setSelectedCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleCreateDebate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCandidates.length < 2 || selectedCandidates.length > 4 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data } = await createDebate({
        variables: {
          candidateIds: selectedCandidates.map((c) => c.id),
          name: debateName.trim() || undefined,
        },
      });
      const createdDebate = (data as any)?.createDebate;
      const newDebateId = createdDebate?.id as string | undefined;
      if (!newDebateId) return;

      notifyDebateCreated(createdDebate);
      closeNewDebate();
      router.push(`/debates/${newDebateId}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isNewDebateMode) {
    return (
      <div className="flex h-full items-center justify-center px-10 text-center">
        <p className="text-slate-400 text-base leading-relaxed">
          Ready to compare policies head-to-head?{' '}
          <span className="text-slate-600 font-semibold">Create a new debate to begin.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <form
        onSubmit={handleCreateDebate}
        className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-8 sm:py-8"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Debate</h1>
            <p className="mt-1.5 text-base text-slate-500">{formSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={closeNewDebate}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700 hover:shadow-sm"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <section
          aria-labelledby="debate-step-1"
          className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-10"
        >
          <h2
            id="debate-step-1"
            className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl"
          >
            {step1Title}
          </h2>
          <div className="mt-4">
            <label htmlFor="debate-name" className="sr-only">
              Debate Name
            </label>
            <input
              id="debate-name"
              type="text"
              value={debateName}
              onChange={(e) => setDebateName(e.target.value)}
              placeholder="Enter debate name"
              className={`${inputBaseClass} text-center text-xl`}
            />
          </div>
        </section>

        <section
          aria-labelledby="debate-step-2"
          className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-10"
        >
          <h2
            id="debate-step-2"
            className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl"
          >
            {step2Title}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,14rem)] md:items-stretch">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search candidates by name"
                className={`${inputBaseClass} pl-11`}
              />
            </div>
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className={`${inputBaseClass} cursor-pointer bg-white pr-10`}
            >
              <option value="">All parties</option>
              {parties.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="border-b border-slate-200/80 bg-slate-50 px-4 py-3.5 sm:px-5">
              <span className="text-base font-semibold text-slate-700">{searchResultsLabel}</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="flex min-h-[11rem] items-center justify-center px-4 py-6 text-center text-base text-slate-400">
                Search by candidate name or party to add participants.
              </div>
            ) : (
              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto bg-white">
                {searchResults.map((candidate) => {
                  const selected = selectedCandidates.some((c) => c.id === candidate.id);
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelectCandidate(candidate)}
                      disabled={selected || selectedCandidates.length >= 4}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-emerald-50/60 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                    >
                      <CandidateAvatar
                        imagePath={candidate.medium_image_path}
                        name={candidate.name}
                        party={candidate.party}
                        sizeClass="w-10 h-10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{candidate.name}</p>
                        <p className="mt-0.5 truncate text-xs" style={{ color: getPartyColor(candidate.party) }}>
                          {candidate.party}
                        </p>
                      </div>
                      {selected && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-800">
                {selectedHeading}{' '}
                <span className="font-normal text-slate-500">({selectedCandidates.length}/4)</span>
              </h3>
              {selectedCandidates.length < 2 && (
                <p className="text-xs font-medium text-rose-600">{chooseTwoHint}</p>
              )}
            </div>
            {selectedCandidates.length === 0 ? (
              <div className="mt-3 flex min-h-[9rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-base text-slate-400">
                No candidates selected yet.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selectedCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 transition-colors hover:border-slate-300"
                  >
                    <CandidateAvatar
                      imagePath={candidate.medium_image_path}
                      name={candidate.name}
                      party={candidate.party}
                      sizeClass="w-11 h-11"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{candidate.name}</p>
                      <p className="truncate text-xs" style={{ color: getPartyColor(candidate.party) }}>
                        {candidate.party}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCandidate(candidate.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="debate-step-3"
          className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-10"
        >
          <h2
            id="debate-step-3"
            className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl"
          >
            {step3Title}
          </h2>
          <button
            type="submit"
            disabled={isSubmitting || selectedCandidates.length < 2 || selectedCandidates.length > 4}
            className="mt-4 w-full rounded-xl bg-emerald-500 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? creatingLabel : createDebateLabel}
          </button>
        </section>
      </form>
    </div>
  );
}
