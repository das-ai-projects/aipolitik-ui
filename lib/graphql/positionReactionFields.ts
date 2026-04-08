/**
 * GraphQL selection for `CandidatePosition` reaction fields.
 * Embed inside a `node { ... }` or `getCandidatePositionById { ... }` block.
 */
export const POSITION_REACTION_FIELDS = `
  reaction_stats {
    like_count
    dislike_count
  }
  my_reaction
`;
