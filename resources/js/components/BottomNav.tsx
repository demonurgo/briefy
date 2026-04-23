// (c) 2026 Briefy contributors — AGPL-3.0
import { Link, usePage } from '@inertiajs/react';
import { Calendar, ClipboardList, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'nav.clients', icon: Users, href: '/clients' },
  { key: 'nav.demands', icon: ClipboardList, href: '/demands' },
  { key: 'nav.planning', icon: Calendar, href: '/planning' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { url } = usePage();
  const isActive = (href: string) => url.startsWith(href);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#ffffff] dark:bg-[#111827] border-t border-[#e5e7eb] dark:border-[#1f2937] z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ key, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive(href)
                ? 'text-primary-500 dark:text-primary-400'
                : 'text-[#9ca3af] dark:text-[#6b7280]'
            }`}
          >
            <Icon size={20} />
            <span>{t(key)}</span>
          </Link>
        ))}
        <Link
          href="/settings"
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium text-[#9ca3af] dark:text-[#6b7280]"
        >
          <MoreHorizontal size={20} />
          <span>{t('nav.more')}</span>
        </Link>
      </div>
    </nav>
  );
}
