'use client';

import { useCallback, useState } from 'react';

import CandidateListItem from '@/components/CandidateListItem';
import ScrollableList from '@/components/ScrollableList';
import type { Follow } from '@/lib/graphql/types';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';

const PROFILE_FOLLOWS_QUERY = `
  query ProfileSearchFollowedCandidates(
    $searchAfter: String
    $searchBefore: String
    $limit: Int
  ) {
    followsConnection: searchFollowedCandidates(
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
          dateFollowed
          candidate {
            id
            name
            party
            bio
            small_image_path
            follow {
              isFollowing
            }
          }
        }
      }
    }
  }
`;

const LIMIT = 15;

export default function ProfileFollowsScrollList() {
  const [refreshKey, setRefreshKey] = useState(0);
  const invalidate = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const emptyMain = useTranslatedText('You are not following any candidates yet.');
  const emptySub = useTranslatedText('Follow leaders from their profile or the sidebar.');

  return (
    <ScrollableList<Follow>
      key={refreshKey}
      query={PROFILE_FOLLOWS_QUERY}
      variables={{ limit: LIMIT }}
      dataKey="followsConnection"
      getItemId={(follow) => follow.id}
      renderItem={(follow) => (
        <CandidateListItem
          candidate={follow.candidate}
          onUnfollowed={invalidate}
        />
      )}
      emptyMessage={emptyMain}
      emptySubMessage={emptySub}
    />
  );
}
