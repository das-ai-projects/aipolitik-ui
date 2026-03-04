'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import { Home, Compass, MessageSquare, Scale, Users, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home',          href: '/home',          icon: Home },
  { label: 'Explore',       href: '/explore',        icon: Compass },
  { label: 'Chats',         href: '/chats',          icon: MessageSquare },
  { label: 'Debates',       href: '/debates',        icon: Scale },
  { label: 'Party Rosters', href: '/party-rosters',  icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-xl font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-7 w-7 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-xl font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-7 w-7 shrink-0" />
          Log Out
        </button>
      </div>

    </aside>
  );
}
