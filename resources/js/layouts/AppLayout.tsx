// (c) 2026 Briefy contributors — AGPL-3.0
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { BottomNav } from '@/Components/BottomNav';
import { Sidebar } from '@/Components/Sidebar';
import { ThemeToggle } from '@/Components/ThemeToggle';
import { FlashMessage } from '@/Components/FlashMessage';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface PageProps {
  [key: string]: unknown;
  auth: { user: { id: number; name: string; email: string } };
  unread_notifications: number;
}

interface Props extends PropsWithChildren {
  title?: string;
  actions?: React.ReactNode;
}

export default function AppLayout({ children, title, actions }: Props) {
  const { auth, unread_notifications } = usePage<PageProps>().props;
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar') !== 'closed'; } catch { return true; }
  });
  const [bellOpen, setBellOpen] = useState(false);
  const [notes, setNotes] = useState<Notification[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem('sidebar', sidebarOpen ? 'open' : 'closed'); } catch {}
  }, [sidebarOpen]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openBell = async () => {
    setBellOpen(v => !v);
    if (!bellOpen) {
      const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch(route('notifications.index'), { headers: { 'X-CSRF-TOKEN': csrf } });
      const data = await res.json();
      setNotes(data);
    }
  };

  const markAllRead = async () => {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    await fetch(route('notifications.read-all'), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
    setNotes(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    router.reload({ only: ['unread_notifications'] });
  };

  const handleNoteClick = async (note: Notification) => {
    if (!note.read_at) {
      const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      await fetch(route('notifications.read', note.id), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
      router.reload({ only: ['unread_notifications'] });
    }
    setBellOpen(false);
    if (note.data?.demand_id) router.visit(route('planejamento.index'));
  };

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

            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={openBell}
                className="relative flex h-8 w-8 items-center justify-center rounded-[8px] text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] dark:hover:bg-[#1f2937] dark:hover:text-[#f9fafb]"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {unread_notifications > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unread_notifications > 9 ? '9+' : unread_notifications}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-[12px] border border-[#e5e7eb] bg-white shadow-lg dark:border-[#1f2937] dark:bg-[#111827]">
                  <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3 dark:border-[#1f2937]">
                    <span className="text-sm font-semibold">Notificações</span>
                    {notes.some(n => !n.read_at) && (
                      <button onClick={markAllRead} className="text-xs text-[#7c3aed] hover:underline">
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <ul className="max-h-80 overflow-y-auto divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
                    {notes.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-[#9ca3af]">Nenhuma notificação</li>
                    ) : notes.map(note => (
                      <li key={note.id}>
                        <button
                          onClick={() => handleNoteClick(note)}
                          className={`w-full px-4 py-3 text-left hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] ${!note.read_at ? 'bg-[#7c3aed]/5' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            {!note.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7c3aed]" />}
                            <div className={!note.read_at ? '' : 'pl-4'}>
                              <p className="text-sm font-medium text-[#111827] dark:text-[#f9fafb]">{note.title}</p>
                              <p className="text-xs text-[#6b7280]">{note.body}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

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
