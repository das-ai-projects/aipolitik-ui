'use client';

import PositionListItem from '@/components/PositionListItem';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';
import type { PositionReactionKind, UserPositionReaction } from '@/lib/graphql/types';

interface Props {
  row: UserPositionReaction;
  tabKind: PositionReactionKind;
  onListInvalidate: () => void;
}

export default function ProfileReactionRow({
  row,
  tabKind,
  onListInvalidate,
}: Props) {
  const unavailable = useTranslatedText('This position is no longer available.');

  if (!row.candidatePosition) {
    return (
      <article className="flex gap-4 px-6 py-5 text-slate-500">
        <p className="text-sm">{unavailable}</p>
      </article>
    );
  }

  return (
    <PositionListItem
      position={row.candidatePosition}
      listReactionFilter={tabKind}
      onLeaveReactionList={onListInvalidate}
    />
  );
}
