'use client';

import CandidateListItem from '@/components/CandidateListItem';
import ScrollableList from '@/components/ScrollableList';
import { Candidate } from '@/lib/graphql/types';

interface Props {
  query: string;
  variables: Record<string, unknown>;
  /** Key in the GraphQL response that holds the paginated result (default: "candidates"). */
  dataKey?: string;
}

const getId = (c: Candidate) => c.id;

export default function ScrollableCandidateList({ query, variables, dataKey = 'candidates' }: Props) {
  return (
    <ScrollableList<Candidate>
      query={query}
      variables={variables}
      dataKey={dataKey}
      renderItem={(candidate) => <CandidateListItem candidate={candidate} />}
      getItemId={getId}
      emptyMessage="No leaders found."
      emptySubMessage="Try a different name or party."
    />
  );
}
