import { PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { BottomNav } from '../components/BottomNav';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeToggle';

interface PageProps {
  auth: { user: { name: string } };
}

interface Props extends PropsWithChildren {
  title?: string;
  actions?: React.ReactNode;
}

export default function AppLayout({ children, title, actions }: Props) {
  const { auth } = usePage<PageProps>().props;

  return (
    <div className="flex min-h-screen bg-[#f9fafb] dark:bg-[#0b0f14]">
      <Sidebar />
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
    </div>
  );
}
