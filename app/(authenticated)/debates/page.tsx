'use client';

import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CandidateAvatar from '@/components/CandidateAvatar';
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
    <div className="h-full bg-white overflow-y-auto">
      <form onSubmit={handleCreateDebate} className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">New Debate</h1>
          <button
            type="button"
            onClick={closeNewDebate}
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-w-xl mx-auto">
          <label htmlFor="debate-name" className="sr-only">
            Debate Name
          </label>
          <input
            id="debate-name"
            type="text"
            value={debateName}
            onChange={(e) => setDebateName(e.target.value)}
            placeholder="Enter debate name"
            className="w-full text-center px-5 py-3 text-base rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search candidates by name"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />
          </div>
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
          >
            <option value="">All parties</option>
            {parties.map((party) => (
              <option key={party} value={party}>
                {party}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700">
            Search Results
          </div>
          {searchResults.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400 text-center">
              Search by candidate name or party to add participants.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((candidate) => {
                const selected = selectedCandidates.some((c) => c.id === candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handleSelectCandidate(candidate)}
                    disabled={selected || selectedCandidates.length >= 4}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-left"
                  >
                    <CandidateAvatar
                      imagePath={candidate.medium_image_path}
                      name={candidate.name}
                      party={candidate.party}
                      sizeClass="w-10 h-10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{candidate.name}</p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: getPartyColor(candidate.party) }}
                      >
                        {candidate.party}
                      </p>
                    </div>
                    {selected && <span className="text-xs font-semibold text-emerald-600">Selected</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Selected Candidates ({selectedCandidates.length}/4)
            </h2>
            {selectedCandidates.length < 2 && (
              <p className="text-xs text-rose-500">Select at least 2 candidates.</p>
            )}
          </div>
          {selectedCandidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-400 text-center">
              No candidates selected yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <CandidateAvatar
                    imagePath={candidate.medium_image_path}
                    name={candidate.name}
                    party={candidate.party}
                    sizeClass="w-12 h-12"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{candidate.name}</p>
                    <p className="text-xs" style={{ color: getPartyColor(candidate.party) }}>
                      {candidate.party}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCandidate(candidate.id)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || selectedCandidates.length < 2 || selectedCandidates.length > 4}
            className="mx-auto block px-7 py-2.5 text-sm font-semibold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Debate'}
          </button>
        </div>
      </form>
    </div>
  );
}
