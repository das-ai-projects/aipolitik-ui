import ScrollablePositionList from '@/components/ScrollablePositionList';

const QUERY = `
  query SearchCandidatePositions($searchAfter: String, $searchBefore: String) {
    searchCandidatePositions(searchAfter: $searchAfter, searchBefore: $searchBefore, limit: 15) {
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

const VARIABLES: Record<string, unknown> = {};

export default function HomePage() {
  return (
    <div className="h-full">
      <ScrollablePositionList query={QUERY} variables={VARIABLES} />
    </div>
  );
}
