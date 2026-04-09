'use client';

import { useState } from 'react';

import ProfileFollowsScrollList from '@/components/ProfileFollowsScrollList';
import ProfileReactionsScrollList from '@/components/ProfileReactionsScrollList';
import { cn } from '@/lib/utils';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';

type ProfileTab = 'liked' | 'disliked' | 'follows';

export default function ProfileTabs() {
  const [active, setActive] = useState<ProfileTab>('liked');
  const title = useTranslatedText('Profile');
  const likedLabel = useTranslatedText('Liked positions');
  const dislikedLabel = useTranslatedText('Disliked positions');
  const followsLabel = useTranslatedText('Followed candidates');

  const introLead = useTranslatedText(
    'Everything you have saved in one place. Use the tabs below to browse; lists update when you change your mind.'
  );
  const introReactionsTitle = useTranslatedText('Positions');
  const introReactionsBody = useTranslatedText(
    'Tap the same button again to remove a like or dislike. Switching from dislike to like (or the reverse) moves the item to the other list or drops it from this one.'
  );
  const introFollowsTitle = useTranslatedText('Candidates');
  const introFollowsBody = useTranslatedText(
    'Use Following / Unfollow on a row to update who you track. Unfollowing removes them from this list immediately.'
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="shrink-0 space-y-4 border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-700">
          <p className="leading-relaxed text-slate-600">{introLead}</p>
          <ul className="mt-3 list-none space-y-3 border-t border-slate-200/80 pt-3">
            <li className="flex gap-3">
              <span
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
              <div>
                <span className="font-semibold text-slate-800">
                  {introReactionsTitle}
                </span>
                <span className="text-slate-600"> — </span>
                <span className="leading-relaxed text-slate-600">
                  {introReactionsBody}
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
              <div>
                <span className="font-semibold text-slate-800">
                  {introFollowsTitle}
                </span>
                <span className="text-slate-600"> — </span>
                <span className="leading-relaxed text-slate-600">
                  {introFollowsBody}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </header>

      <div className="shrink-0 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-3 gap-0">
          {(
            [
              ['liked', likedLabel] as const,
              ['disliked', dislikedLabel] as const,
              ['follows', followsLabel] as const,
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                'px-2 py-4 text-center text-base font-bold transition-colors border-b-4 -mb-px sm:text-lg',
                active === id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {active === 'liked' && <ProfileReactionsScrollList kind="LIKE" />}
        {active === 'disliked' && <ProfileReactionsScrollList kind="DISLIKE" />}
        {active === 'follows' && <ProfileFollowsScrollList />}
      </div>
    </div>
  );
}
