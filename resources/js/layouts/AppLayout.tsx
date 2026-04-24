// (c) 2026 Briefy contributors — AGPL-3.0
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, ChevronDown, Check, Plus } from 'lucide-react';
import { BottomNav } from '@/Components/BottomNav';
import { Sidebar } from '@/Components/Sidebar';
import { ThemeToggle } from '@/Components/ThemeToggle';
import { FlashMessage } from '@/Components/FlashMessage';
import { UserAvatar } from '@/Components/UserAvatar';

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
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      avatar: string | null;
      role: string;
      current_organization_id: number;
      organization: { id: number; name: string; slug: string; logo: string | null } | null;
      organizations: Array<{ id: number; name: string; slug: string; logo: string | null; role: string }>;
    };
    organization: { id: number; name: string; slug: string; logo?: string; has_anthropic_key: boolean; anthropic_api_key_mask: string | null } | null;
  };
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
  const prevUnread = useRef(unread_notifications);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const orgSwitcherRef = useRef<HTMLDivElement>(null);

  // Play a soft notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch { /* AudioContext not available */ }
  };

  // Poll for new notifications every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      router.reload({ only: ['unread_notifications'] });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Play sound when unread count increases
  useEffect(() => {
    if (unread_notifications > prevUnread.current) playNotificationSound();
    prevUnread.current = unread_notifications;
  }, [unread_notifications]);

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

  // Close org switcher on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orgSwitcherRef.current && !orgSwitcherRef.current.contains(e.target as Node)) {
        setOrgSwitcherOpen(false);
      }
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
    <div className="flex min-h-screen overflow-x-hidden bg-[#f9fafb] dark:bg-[#0b0f14]" style={{ minHeight: '540px', minWidth: '360px' }}>
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
                className="relative flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] dark:hover:bg-[#1f2937] dark:hover:text-[#f9fafb]"
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

            {/* OrgSwitcher */}
            <div ref={orgSwitcherRef} className="relative hidden sm:block">
              <button
                onClick={() => setOrgSwitcherOpen(v => !v)}
                className="flex items-center gap-2 max-w-[240px] rounded-[8px] px-2 py-1 text-sm text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
                aria-label="Trocar organização"
                aria-expanded={orgSwitcherOpen}
              >
                <UserAvatar name={auth?.user?.name ?? ''} avatar={auth?.user?.avatar} size="sm" />
                <span className="truncate max-w-[180px] text-[#111827] dark:text-[#f9fafb]">
                  {auth?.user?.organization?.name ?? auth?.user?.name}
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${orgSwitcherOpen ? 'rotate-180' : ''}`} />
              </button>

              {orgSwitcherOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] shadow-lg">
                  <div className="py-1">
                    {(auth?.user?.organizations ?? []).map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setOrgSwitcherOpen(false);
                          if (org.id !== auth?.user?.current_organization_id) {
                            router.patch(route('settings.current-org'), { organization_id: org.id });
                          }
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#111827] dark:text-[#f9fafb] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
                      >
                        {/* Org initials circle */}
                        <div className="h-6 w-6 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] dark:bg-[#7c3aed]/20 flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 truncate text-left">{org.name}</span>
                        {org.id === auth?.user?.current_organization_id && (
                          <Check size={14} className="shrink-0 text-[#7c3aed]" />
                        )}
                      </button>
                    ))}

                    <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] mt-1 pt-1">
                      <button
                        disabled
                        title="Em breve"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#7c3aed] opacity-50 cursor-not-allowed"
                      >
                        <Plus size={14} />
                        Criar nova organização
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
