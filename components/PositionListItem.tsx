import { CandidatePosition } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';

interface Props {
  position: CandidatePosition;
}

/**
 * Turns a raw date string (e.g. "2026-03-03T12:00:00Z") into something
 * readable like "March 3, 2026".
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Displays one candidate's position as a card in the feed.
 *
 * Each card shows:
 *   • A circular photo with a coloured ring matching the candidate's party
 *   • The candidate's name, party, and the date the position was generated
 *   • The full policy position text below
 */
export default function PositionListItem({ position }: Props) {
  const { candidate, policy_position, date_generated } = position;

  // Look up this party's colour; if the party isn't in our list, use grey.
  const partyColor = getPartyColor(candidate.party);

  return (
    <article className="flex gap-4 px-6 py-5 hover:bg-slate-50 transition-colors">

      {/*
       * Photo column (left side).
       * To draw a coloured ring around the photo we use two nested circles:
       * the outer one is filled with the party colour, and the inner one sits
       * on top with a small gap, creating the ring effect.
       */}
      <div className="shrink-0">
        <div
          className="w-16 h-16 rounded-full p-[3px]"
          style={{ backgroundColor: partyColor }}
        >
          {/* Inner circle: clips the photo to a circle shape. */}
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={candidate.small_image_path}
              alt={candidate.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Text column (right side) — stretches to fill the remaining width */}
      <div className="flex-1 min-w-0">

        {/*
         * Top row: candidate name, party, and date.
         * All three items sit on the same line and wrap onto a second line
         * if the screen is too narrow. The party name is shown in the
         * party's colour so it stands out at a glance.
         */}
        <div className="flex flex-wrap items-baseline gap-x-2 mb-2">
          <span className="text-base font-bold text-slate-900 truncate">
            {candidate.name}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: partyColor }}
          >
            {candidate.party}
          </span>
          <span className="text-sm text-slate-400">·</span>
          <span className="text-sm text-slate-400">
            {formatDate(date_generated)}
          </span>
        </div>

        {/* The policy position text — the main content of the card. */}
        <p className="text-base text-slate-700 leading-relaxed">
          {policy_position}
        </p>

      </div>

    </article>
  );
}
