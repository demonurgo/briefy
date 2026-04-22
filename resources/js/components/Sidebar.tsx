import { Link, usePage } from '@inertiajs/react';
import { Calendar, ClipboardList, LayoutDashboard, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoLight from '../assets/logo.svg';
import logoDark from '../assets/logo-dark.svg';
import logoIconLight from '../assets/logo-icon.svg';
import logoIconDark from '../assets/logo-icon-dark.svg';

const navItems = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'nav.clients', icon: Users, href: '/clients' },
  { key: 'nav.demands', icon: ClipboardList, href: '/demands' },
  { key: 'nav.planning', icon: Calendar, href: '/planning' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { url } = usePage();
  const isActive = (href: string) => url.startsWith(href);

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#ffffff] dark:bg-[#111827] border-r border-[#e5e7eb] dark:border-[#1f2937] p-4 shrink-0">
      <div className="px-2 mb-8 flex items-center gap-2">
        <img src={logoIconLight} alt="" className="h-7 dark:hidden" />
        <img src={logoIconDark} alt="" className="h-7 hidden dark:block" />
        <img src={logoLight} alt="Briefy" className="h-6 dark:hidden" />
        <img src={logoDark} alt="Briefy" className="h-6 hidden dark:block" />
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ key, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]'
            }`}
          >
            <Icon size={18} />
            {t(key)}
          </Link>
        ))}
      </nav>
      <Link
        href="/settings"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive('/settings')
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]'
        }`}
      >
        <Settings size={18} />
        {t('nav.settings')}
      </Link>
    </aside>
  );
}
