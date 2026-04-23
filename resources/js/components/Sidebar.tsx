// (c) 2026 Briefy contributors — AGPL-3.0
import { useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, Settings, Users } from 'lucide-react';
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

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const { t } = useTranslation();
  const { url } = usePage();
  const [showHandle, setShowHandle] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isActive = (href: string) => url.startsWith(href);

  const handleMouseEnter = () => {
    clearTimeout(leaveTimer.current);
    setShowHandle(true);
  };

  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setShowHandle(false), 150);
  };

  const linkClass = (href: string) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
        : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]'
    } ${collapsed ? 'w-full justify-center p-2.5' : 'gap-3 px-3 py-2'}`;

  return (
    <aside
      className={`relative hidden md:flex flex-col min-h-screen bg-[#ffffff] dark:bg-[#111827] border-r border-[#e5e7eb] dark:border-[#1f2937] shrink-0 transition-[width] duration-300 ease-in-out overflow-visible ${
        collapsed ? 'w-14' : 'w-64'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toggle handle — aparece no hover, metade dentro/fora da borda */}
      <button
        onClick={onToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className={`absolute right-0 top-1/2 z-50 -translate-y-1/2 translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#ffffff] text-[#9ca3af] shadow-md transition-all duration-200 hover:border-[#7c3aed] hover:text-[#7c3aed] dark:border-[#1f2937] dark:bg-[#111827] ${
          showHandle ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className={`flex flex-1 flex-col ${collapsed ? 'items-center px-2 py-4' : 'p-4'}`}>
        {/* Logo */}
        <div className={`mb-8 ${collapsed ? 'flex w-full justify-center' : 'px-2'}`}>
          {collapsed ? (
            <>
              <img src={logoIconLight} alt="Briefy" className="h-7 shrink-0 dark:hidden" />
              <img src={logoIconDark} alt="Briefy" className="h-7 shrink-0 hidden dark:block" />
            </>
          ) : (
            <>
              <img src={logoLight} alt="Briefy" className="h-7 dark:hidden" />
              <img src={logoDark} alt="Briefy" className="h-7 hidden dark:block" />
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? 'flex flex-col items-center gap-1 w-full' : 'space-y-1'}`}>
          {navItems.map(({ key, icon: Icon, href }) => (
            <Link key={href} href={href} title={collapsed ? t(key) : undefined} className={linkClass(href)}>
              <Icon size={18} className="shrink-0" />
              {!collapsed && t(key)}
            </Link>
          ))}
        </nav>

        {/* Settings */}
        <Link href="/settings" title={collapsed ? t('nav.settings') : undefined} className={linkClass('/settings')}>
          <Settings size={18} className="shrink-0" />
          {!collapsed && t('nav.settings')}
        </Link>
      </div>
    </aside>
  );
}
