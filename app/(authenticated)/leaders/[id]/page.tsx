'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import Image from 'next/image';
import { use, useState } from 'react';

import FollowButton from '@/components/FollowButton';
import RightSideBar from '@/components/RightSideBar';
import ScrollablePositionList from '@/components/ScrollablePositionList';
import { getPartyColor } from '@/lib/party-colors';

// ── GraphQL ───────────────────────────────────────────────────────────────────

const GET_CANDIDATE = gql`
  query GetCandidateById($id: String!) {
    candidate: getCandidateById(id: $id) {
      id
      name
      party
      bio
      medium_image_path
      follow {
        id
        isFollowing
      }
    }
  }
`;

// ── Positions query (used per-tab) ────────────────────────────────────────────

const POSITIONS_QUERY = `
  query SearchCandidatePositions($candidateId: String, $policyCategory: String, $searchAfter: String, $searchBefore: String) {
    positions: searchCandidatePositions(candidate_id: $candidateId, policy_category: $policyCategory, searchAfter: $searchAfter, searchBefore: $searchBefore, sortKey: "date_generated", limit: 15) {
      pageInfo {
        count
        searchAfter
        searchBefore
      }
      edges {
        score
        node {
          id
          policy_position
          date_generated
          candidate {
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

// ── Category tabs ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Economy & Taxation',
  'Health & Social Care',
  'Education & Skills',
  'Housing & Planning',
  'Climate, Energy & Environment',
  'Immigration, Borders & Citizenship',
  'Law, Justice & Civil Rights',
  'Foreign Policy & Defence',
  'Transport & Infrastructure',
  'Democracy, Governance & Devolution',
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap the route params (Next.js 15+ passes params as a Promise).
  const { id } = use(params);

  const { data, loading, error } = useQuery(GET_CANDIDATE, {
    variables: { id },
  });

  // Which policy category tab is active.
  const [currentCategory, setCurrentCategory] = useState(CATEGORIES[0]);

  // Local copy of follow state so the button updates instantly without
  // waiting for a full refetch.
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);

  const candidate = (data as any)?.candidate;

  // Initialise local follow state from the server once data arrives.
  const followState =
    isFollowing !== null ? isFollowing : candidate?.follow?.isFollowing ?? false;

  const partyColor = candidate ? getPartyColor(candidate.party) : '#6b7280';

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        {error ? `Error: ${error.message}` : 'Candidate not found.'}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── Profile header (scrolls with the page) ──────────────────── */}
        <div className="shrink-0">

          {/* Banner image */}
          <div className="relative w-full h-40 sm:h-52 bg-slate-200">
            <Image
              src="https://ddk4x72zkug5e.cloudfront.net/logo_images/banner_placeholder.png"
              alt="AiPolitik banner"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Profile row: avatar + follow button */}
          <div className="px-5 relative">
            {/* Avatar — sits half over the banner */}
            <div className="absolute -top-12 left-5">
              <div
                className="rounded-full p-[3px]"
                style={{ backgroundColor: partyColor }}
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white">
                  <Image
                    src={candidate.medium_image_path}
                    alt={candidate.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Follow button — top-right of the profile row */}
            <div className="flex justify-end pt-3 pb-2">
              <FollowButton
                candidateId={candidate.id}
                isFollowing={followState}
                onToggle={setIsFollowing}
              />
            </div>
          </div>

          {/* Candidate info */}
          <div className="px-5 mt-10 pb-3">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {candidate.name}
            </h1>
            <p
              className="text-sm font-semibold mt-0.5"
              style={{ color: partyColor }}
            >
              {candidate.party}
            </p>
            {candidate.bio && (
              <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {candidate.bio}
              </p>
            )}
          </div>

          {/* ── Category tabs ─────────────────────────────────────────────── */}
          <div className="mt-2 border-b border-slate-200">
            <div className="flex overflow-x-auto scrollbar-hide px-5 gap-1">
              {CATEGORIES.map((cat) => {
                const active = cat === currentCategory;
                return (
                  <button
                    key={cat}
                    onClick={() => setCurrentCategory(cat)}
                    className={`
                      shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                      ${active
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                      }
                    `}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Positions list (fills remaining height, scrolls independently) */}
        {/* key forces a full remount when the category changes so the list
            starts fresh with the correct variables for the new tab.       */}
        <div className="flex-1 min-h-0">
          <ScrollablePositionList
            key={currentCategory}
            query={POSITIONS_QUERY}
            variables={{ candidateId: id, policyCategory: currentCategory }}
          />
        </div>
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────────── */}
      <RightSideBar />
    </div>
  );
}
