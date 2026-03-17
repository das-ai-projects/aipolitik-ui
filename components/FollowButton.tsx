'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useState } from 'react';

const SET_FOLLOW = gql`
  mutation SetCandidateFollow($candidateId: String!, $follow: Boolean!) {
    setCandidateFollow(candidateId: $candidateId, follow: $follow) {
      id
      userId
      isFollowing
    }
  }
`;

interface Props {
  candidateId: string;
  isFollowing: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * Reusable follow/unfollow button for a candidate.
 *
 * - Green "Following" when already following.
 *   Hovering turns it red and shows "Unfollow".
 * - Outlined "Follow" when not following.
 * - Calls setCandidateFollow mutation on click and reports
 *   the new state back via onToggle.
 */
export default function FollowButton({ candidateId, isFollowing, onToggle }: Props) {
  const [hovering, setHovering] = useState(false);

  const [setFollow, { loading }] = useMutation(SET_FOLLOW, {
    onCompleted(data) {
      onToggle((data as any).setCandidateFollow.isFollowing);
    },
  });

  function handleClick() {
    setFollow({ variables: { candidateId, follow: !isFollowing } });
  }

  let label: string;
  let className: string;

  if (isFollowing) {
    if (hovering) {
      label = 'Unfollow';
      className = 'bg-red-500 hover:bg-red-600 text-white border border-red-500';
    } else {
      label = 'Following';
      className = 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500';
    }
  } else {
    label = 'Follow';
    className = 'bg-transparent text-emerald-600 border border-emerald-500 hover:bg-emerald-50';
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={loading}
      className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? '…' : label}
    </button>
  );
}
