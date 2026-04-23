// (c) 2026 Briefy contributors — AGPL-3.0
import { PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { BottomNav } from '@/Components/BottomNav';
import { Sidebar } from '@/Components/Sidebar';
import { ThemeToggle } from '@/Components/ThemeToggle';
import { FlashMessage } from '@/Components/FlashMessage';

interface PageProps {
  [key: string]: unknown;
  auth: { user: { id: number; name: string; email: string } };
}

interface Props extends PropsWithChildren {
  title?: string;
  actions?: React.ReactNode;
}

export default function AppLayout({ children, title, actions }: Props) {
  const { auth } = usePage<PageProps>().props;
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar') !== 'closed'; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('sidebar', sidebarOpen ? 'open' : 'closed'); } catch {}
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#f9fafb] dark:bg-[#0b0f14]">
      <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />


<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 bg-[#ffffff] dark:bg-[#111827] border-b border-[#e5e7eb] dark:border-[#1f2937] px-4 md:px-6 h-14 flex items-center gap-4">
          {title && (
            <h1 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb] truncate">{title}</h1>
          )}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {actions}
            <ThemeToggle />
            <span className="hidden sm:block text-sm text-[#6b7280] dark:text-[#9ca3af] max-w-32 truncate">
              {auth?.user?.name}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <BottomNav />
      <FlashMessage />
    </div>
  );
}
