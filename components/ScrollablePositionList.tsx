'use client';

import PositionListItem from '@/components/PositionListItem';
import ScrollableList from '@/components/ScrollableList';
import { CandidatePosition } from '@/lib/graphql/types';

interface Props {
  query: string;
  variables: Record<string, unknown>;
  /** Key in the GraphQL response that holds the paginated result (default: "positions"). */
  dataKey?: string;
}

const getId = (p: CandidatePosition) => p.id;

export default function ScrollablePositionList({ query, variables, dataKey = 'positions' }: Props) {
  return (
    <ScrollableList<CandidatePosition>
      query={query}
      variables={variables}
      dataKey={dataKey}
      renderItem={(position) => <PositionListItem position={position} />}
      getItemId={getId}
      emptyMessage="Sorry! We couldn't find any positions that match your search."
      emptySubMessage="Try searching for a different keyword."
    />
  );
}
