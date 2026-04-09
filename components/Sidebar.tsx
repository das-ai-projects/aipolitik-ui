'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { Home, Compass, MessageSquare, Scale, LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';

const navDefs = [
  { labelKey: 'Home', href: '/home', icon: Home },
  { labelKey: 'Explore', href: '/explore', icon: Compass },
  { labelKey: 'Chats', href: '/chats', icon: MessageSquare },
  { labelKey: 'Debates', href: '/debates', icon: Scale },
  { labelKey: 'Profile', href: '/profile', icon: User },
  { labelKey: 'Settings', href: '/settings', icon: Settings },
] as const;

function SidebarNavItem({
  href,
  labelKey,
  Icon,
}: {
  href: string;
  labelKey: string;
  Icon: typeof Home;
}) {
  const pathname = usePathname();
  const label = useTranslatedText(labelKey);
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-4 px-5 py-4 rounded-lg text-2xl font-medium transition-colors',
        isActive ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      )}
    >
      <Icon className="h-9 w-9 shrink-0" />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const logOutLabel = useTranslatedText('Log Out');

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="flex flex-col w-96 shrink-0 bg-slate-900 border-r border-slate-800 h-screen">

      {/* Logo */}
      <div className="px-2 py-5 border-b border-slate-800">
        <Image
          src="https://ddk4x72zkug5e.cloudfront.net/logo_images/aipolitik_prototype_image.png"
          alt="AIPolitik"
          width={330}
          height={96}
          style={{ objectFit: 'contain', height: 'auto' }}
          priority
        />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navDefs.map(({ labelKey, href, icon: Icon }) => (
          <SidebarNavItem key={href} href={href} labelKey={labelKey} Icon={Icon} />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-5 py-4 rounded-lg text-2xl font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-9 w-9 shrink-0" />
          {logOutLabel}
        </button>
      </div>

    </aside>
  );
}
