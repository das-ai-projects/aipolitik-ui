'use client';

import { useState } from 'react';
import ScrollablePositionList from '@/components/ScrollablePositionList';
import { cn } from '@/lib/utils';

type TabId = 'for-you' | 'following';

interface HomeTabsProps {
  forYouQuery: string;
  forYouVariables: Record<string, unknown>;
  followingQuery: string;
  followingVariables: Record<string, unknown>;
}

export default function HomeTabs({
  forYouQuery,
  forYouVariables,
  followingQuery,
  followingVariables,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('for-you');

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-slate-200 bg-white">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab('for-you')}
            className={cn(
              'w-1/2 py-5 text-center text-xl font-bold transition-colors border-b-4 -mb-1',
              activeTab === 'for-you'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            For you
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={cn(
              'w-1/2 py-3 text-center text-xl font-bold transition-colors border-b-2 -mb-px',
              activeTab === 'following'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Following
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'for-you' && (
          <ScrollablePositionList query={forYouQuery} variables={forYouVariables}/>
        )}
        {activeTab === 'following' && (
          <ScrollablePositionList query={followingQuery} variables={followingVariables}/>
        )}
      </div>
    </div>
  );
}
