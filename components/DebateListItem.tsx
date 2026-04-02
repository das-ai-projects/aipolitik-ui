'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Debate } from '@/lib/graphql/types';
import { getPartyColor } from '@/lib/party-colors';

interface Props {
  debate: Debate;
  active: boolean;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function DebateListItem({ debate, active }: Props) {
  return (
    <Link
      href={`/debates/${debate.id}`}
      className={`block px-4 py-3 transition-colors ${active ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
    >
      <p className={`text-sm font-bold truncate ${active ? 'text-emerald-700' : 'text-slate-900'}`}>
        {debate.name}
      </p>
      <div className="flex items-center gap-2.5 mt-2">
        {debate.candidates.slice(0, 4).map((candidate) => (
          <div
            key={candidate.id}
            className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-4"
            style={{ borderColor: getPartyColor(candidate.party) }}
            title={candidate.name}
          >
            <Image
              src={candidate.small_image_path}
              alt={candidate.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1">{timeAgo(debate.last_updated)}</p>
    </Link>
  );
}
