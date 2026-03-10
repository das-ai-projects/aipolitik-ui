import HomeTabs from '@/components/HomeTabs';
import RightSideBar from '@/components/RightSideBar';

const FOR_YOU_QUERY = `
  query SearchCandidatePositions($searchAfter: String, $searchBefore: String, $limit: Int) {
    positions: searchCandidatePositions(searchAfter: $searchAfter, searchBefore: $searchBefore, limit: $limit, sortKey: "score") {
      pageInfo {
        count
        searchAfter
        searchBefore
      }
      edges {
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

const FOLLOWING_QUERY = `
  query SearchFollowedCandidatePositions($searchAfter: String, $searchBefore: String, $limit: Int, $sortKey: String) {
    positions: searchFollowedCandidatePositions(searchAfter: $searchAfter, searchBefore: $searchBefore, limit: $limit, sortKey: $sortKey) {
      pageInfo {
        count
        searchAfter
        searchBefore
      }
      edges {
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

const variables: Record<string, unknown> = { limit: 15 };
const followingVariables: Record<string, unknown> = { limit: 15, sortKey: 'score' };

export default function HomePage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <HomeTabs
          forYouQuery={FOR_YOU_QUERY}
          forYouVariables={variables}
          followingQuery={FOLLOWING_QUERY}
          followingVariables={followingVariables}
        />
      </div>
      <RightSideBar />
    </div>
  );
}
