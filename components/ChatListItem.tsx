'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Chat } from '@/lib/graphql/types';

interface Props {
  chat: Chat;
  active: boolean;
}

/** Turns a date string into a short "X ago" label, e.g. "3h ago" or "2d ago". */
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

export default function ChatListItem({ chat, active }: Props) {
  const { candidate } = chat;

  return (
    <Link
      href={`/chats/${chat.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        active ? 'bg-emerald-50' : 'hover:bg-slate-50'
      }`}
    >
      {/* Candidate avatar */}
      <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-slate-200">
        <Image
          src={candidate.small_image_path}
          alt={candidate.name}
          width={44}
          height={44}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Name + last updated */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${active ? 'text-emerald-700' : 'text-slate-900'}`}>
          {candidate.name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {timeAgo(chat.last_updated)}
        </p>
      </div>
    </Link>
  );
}
