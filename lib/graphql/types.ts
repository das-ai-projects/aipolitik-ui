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

export interface Chat {
  id: string;
  user_id: string;
  candidate_name: string;
  candidate: Candidate;
  last_updated: string;
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  chatId: string;
  dateGenerated: string;
  userMessage: string;
  aiMessage: string;
  ids: string[];
}

export interface DebateAnswerEntry {
  candidateId: string;
  candidate: Candidate;
  answer: string;
  shortAnswer: string;
  ids: string[];
}

export interface DebateAnswer {
  id: string;
  debateId: string;
  offset: number;
  question: string;
  dateGenerated: string;
  answers: DebateAnswerEntry[];
}

export interface Debate {
  id: string;
  name: string;
  user_id: string;
  /** Rounds executed; optional when not selected in list queries. */
  message_count?: number;
  candidate_ids: string[];
  candidate_names: string[];
  candidates: Candidate[];
  last_updated: string;
  latestAnswer?: DebateAnswer | null;
}

export interface ChatEdge {
  node: Chat;
  token: string;
  score: number;
}

export interface ChatMessageEdge {
  node: ChatMessage;
  token: string;
  score: number;
}

export interface ChatResults {
  edges: ChatEdge[];
  pageInfo: PageInfo;
}

export interface DebateEdge {
  node: Debate;
  token: string;
  score: number;
}

export interface DebateResults {
  edges: DebateEdge[];
  pageInfo: PageInfo;
}

export interface ChatMessageResults {
  edges: ChatMessageEdge[];
  pageInfo: PageInfo;
}

export interface PositionReactionStats {
  like_count: number;
  dislike_count: number;
}

export type PositionReactionKind = 'LIKE' | 'DISLIKE';

export interface CandidatePosition {
  id: string;
  candidate: Candidate;
  policy_category: string;
  policy_subcategory: string;
  policy_topic: string;
  policy_position: string;
  date_generated: string;
  reaction_stats?: PositionReactionStats;
  my_reaction?: PositionReactionKind | null;
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
