import { CandidatePosition } from '@/lib/graphql/types';
import { cn } from '@/lib/utils';
import { getPartyColor } from '@/lib/party-colors';
import CandidateAvatar from '@/components/CandidateAvatar';
import Link from 'next/link';

interface Props {
  position: CandidatePosition;
  /** Merged onto the root article (e.g. adjust padding in embedded contexts). */
  className?: string;
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
export default function PositionListItem({ position, className }: Props) {
  const { candidate, policy_position, date_generated } = position;

  const partyColor = getPartyColor(candidate.party);

  return (
    <article
      className={cn(
        'flex gap-4 px-6 py-5 transition-colors hover:bg-slate-50',
        className
      )}
    >
      <div className="shrink-0">
        <Link href={`/leaders/${candidate.id}`}>
          <CandidateAvatar
            imagePath={candidate.small_image_path}
            name={candidate.name}
            party={candidate.party}
          />
        </Link>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
          <Link href={`/leaders/${candidate.id}`}>
            <span className="truncate text-base font-bold text-slate-900">
              {candidate.name}
            </span>
          </Link>
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

        <Link href={`/posts/${position.id}`}>
          <p className="text-base leading-relaxed text-slate-700 whitespace-pre-line transition-colors hover:text-slate-900">
            {policy_position}
          </p>
        </Link>
      </div>
    </article>
  );
}
