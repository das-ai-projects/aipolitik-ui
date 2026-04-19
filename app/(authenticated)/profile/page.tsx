'use client';

import ProfileTabs from '@/components/ProfileTabs';
import RightSideBar from '@/components/RightSideBar';

export default function ProfilePage() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ProfileTabs />
      </div>
      <RightSideBar />
    </div>
  );
}
