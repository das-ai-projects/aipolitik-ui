export interface Follow {
  id: string;
  candidate: Candidate;
  userId: string;
  isFollowing: boolean;
}

export interface Candidate {
  id: string;
  party: string;
  bio: string;
  name: string;
  image_path: string;
  medium_image_path: string;
  small_image_path: string;
  follow: Follow;
}

export interface CandidatePosition {
  id: string;
  candidate: Candidate;
  policy_category: string;
  policy_subcategory: string;
  policy_topic: string;
  policy_position: string;
  date_generated: string;
}

export interface CandidateEdge {
  node: Candidate;
  token: string;
  score: number;
}

export interface CandidatePositionEdge {
  node: CandidatePosition;
  token: string;
  score: number;
}

export interface PageInfo {
  count: number;
  searchBefore: string;
  searchAfter: string;
}

export interface CandidateResults {
  edges: CandidateEdge[];
  pageInfo: PageInfo;
}

export interface CandidatePositionResults {
  edges: CandidatePositionEdge[];
  pageInfo: PageInfo;
}
