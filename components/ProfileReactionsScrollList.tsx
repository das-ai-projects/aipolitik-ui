'use client';

import { useCallback, useState } from 'react';

import ProfileReactionRow from '@/components/ProfileReactionRow';
import ScrollableList from '@/components/ScrollableList';
import { POSITION_REACTION_FIELDS } from '@/lib/graphql/positionReactionFields';
import type { PositionReactionKind, UserPositionReaction } from '@/lib/graphql/types';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';

const PROFILE_REACTIONS_QUERY = `
  query ProfileSearchMyPositionReactions(
    $searchAfter: String
    $searchBefore: String
    $limit: Int
    $kind: PositionReactionKind!
  ) {
    reactionRows: searchMyPositionReactions(
      kind: $kind
      searchAfter: $searchAfter
      searchBefore: $searchBefore
      limit: $limit
    ) {
      pageInfo {
        count
        searchAfter
        searchBefore
      }
      edges {
        node {
          id
          candidatePositionId
          kind
          reactionMade
          candidatePosition {
            id
            policy_position
            date_generated
            candidate {
              id
              name
              party
              small_image_path
            }
            ${POSITION_REACTION_FIELDS}
          }
        }
      }
    }
  }
`;

const LIMIT = 15;

interface Props {
  kind: PositionReactionKind;
}

export default function ProfileReactionsScrollList({ kind }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const invalidate = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const emptyLiked = useTranslatedText('You have not liked any positions yet.');
  const emptyDisliked = useTranslatedText('You have not disliked any positions yet.');
  const emptySub = useTranslatedText('Your reactions will show up here.');
  const emptyMain = kind === 'LIKE' ? emptyLiked : emptyDisliked;

  const variables = { limit: LIMIT, kind };

  return (
    <ScrollableList<UserPositionReaction>
      key={`${kind}-${refreshKey}`}
      query={PROFILE_REACTIONS_QUERY}
      variables={variables}
      dataKey="reactionRows"
      getItemId={(row) => row.id}
      renderItem={(row) => (
        <ProfileReactionRow
          row={row}
          tabKind={kind}
          onListInvalidate={invalidate}
        />
      )}
      emptyMessage={emptyMain}
      emptySubMessage={emptySub}
    />
  );
}
