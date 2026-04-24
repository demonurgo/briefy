// (c) 2026 Briefy contributors — AGPL-3.0
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { router, usePage, useForm } from '@inertiajs/react';
import { Bell, ChevronDown, Check, Plus, LogOut } from 'lucide-react';
import { BottomNav } from '@/Components/BottomNav';
import { Sidebar } from '@/Components/Sidebar';
import { ThemeToggle } from '@/Components/ThemeToggle';
import { FlashMessage } from '@/Components/FlashMessage';
import { UserAvatar } from '@/Components/UserAvatar';
import type { PageProps } from '@/types';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface NotificationCreatedEvent {
  user_id: number;         // snake_case — matches PHP event constructor (D-06)
  organization_id: number;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface Props extends PropsWithChildren {
  title?: string;
  actions?: React.ReactNode;
}

export default function AppLayout({ children, title, actions }: Props) {
  const { auth, unread_notifications } = usePage<PageProps>().props;
  const [unreadCount, setUnreadCount] = useState(unread_notifications);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar') !== 'closed'; } catch { return true; }
  });
  const [bellOpen, setBellOpen] = useState(false);
  const [notes, setNotes] = useState<Notification[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const orgSwitcherRef = useRef<HTMLDivElement>(null);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

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

  // Real-time notification badge via Echo (replaces 30s polling — D-10)
  useEffect(() => {
    const orgId = auth.organization?.id;
    if (!orgId || !window.Echo) return;

    const channel = window.Echo.private(`organization.${orgId}`);

    channel.listen('.notification.created', (event: NotificationCreatedEvent) => {
      // D-07: only process notifications addressed to the current user
      if (event.user_id !== auth.user.id) return;

      setUnreadCount(prev => prev + 1);
      playNotificationSound();
    });

    return () => {
      // CRITICAL: stopListening, NOT window.Echo.leave()
      // leave() destroys the shared channel — kills RT-01 Kanban updates in Index.tsx
      channel.stopListening('.notification.created');
    };
  }, [auth.organization?.id]);

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

  const {
    data: orgData,
    setData: setOrgData,
    post: postOrg,
    processing: orgProcessing,
    errors: orgErrors,
    reset: resetOrg,
  } = useForm({ name: '', slug: '' });

  const toSlug = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    postOrg(route('organizations.store'), {
      onSuccess: () => { setCreateOrgOpen(false); resetOrg(); },
    });
  };

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
    setUnreadCount(0);
  };

  const handleNoteClick = async (note: Notification) => {
    if (!note.read_at) {
      const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      await fetch(route('notifications.read', note.id), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setBellOpen(false);
    if (note.data?.demand_id) {
      router.visit(route('demands.index', { demand: note.data.demand_id }));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9fafb] dark:bg-[#0b0f14]" style={{ minHeight: '540px', minWidth: '360px' }}>
      <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
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
            <div ref={orgSwitcherRef} className="relative">
              <button
                onClick={() => setOrgSwitcherOpen(v => !v)}
                className="flex items-center gap-2 max-w-[240px] rounded-[8px] px-2 py-1 text-sm text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
                aria-label="Trocar organização"
                aria-expanded={orgSwitcherOpen}
              >
                <UserAvatar name={auth?.user?.name ?? ''} avatar={auth?.user?.avatar} size="sm" />
                <span className="hidden sm:block truncate max-w-[180px] text-[#111827] dark:text-[#f9fafb]">
                  {auth?.user?.organization?.name ?? auth?.user?.name}
                </span>
                <ChevronDown size={14} className={`hidden sm:block shrink-0 transition-transform ${orgSwitcherOpen ? 'rotate-180' : ''}`} />
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
                        type="button"
                        onClick={() => {
                          setOrgSwitcherOpen(false);
                          setCreateOrgOpen(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#7c3aed] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
                      >
                        <Plus size={14} />
                        Criar nova organização
                      </button>
                    </div>

                    <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOrgSwitcherOpen(false);
                          router.post(route('logout'));
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] dark:text-[#9ca3af] dark:hover:bg-[#1f2937] dark:hover:text-[#f9fafb] transition-colors"
                      >
                        <LogOut size={14} />
                        Sair
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <FlashMessage />

      {createOrgOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCreateOrgOpen(false)}
        >
          <div
            className="max-w-lg w-full rounded-[16px] bg-[#f9fafb] dark:bg-[#0b0f14] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
              Criar nova organização
            </h2>
            <form onSubmit={handleCreateOrg} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#d1d5db]">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgData.name}
                  onChange={e => {
                    const v = e.target.value;
                    setOrgData(prev => ({ ...prev, name: v, slug: toSlug(v) }));
                  }}
                  className="w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#7c3aed] dark:border-[#374151] dark:bg-[#111827] dark:text-[#f9fafb]"
                  placeholder="Minha Agência"
                  required
                  autoFocus
                />
                {orgErrors.name && (
                  <p className="mt-1 text-xs text-red-500">{orgErrors.name}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151] dark:text-[#d1d5db]">
                  Slug
                </label>
                <input
                  type="text"
                  value={orgData.slug}
                  onChange={e => setOrgData('slug', e.target.value)}
                  className="w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-mono text-[#111827] outline-none focus:border-[#7c3aed] dark:border-[#374151] dark:bg-[#111827] dark:text-[#f9fafb]"
                  placeholder="minha-agencia"
                />
                {orgErrors.slug && (
                  <p className="mt-1 text-xs text-red-500">{orgErrors.slug}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateOrgOpen(false); resetOrg(); }}
                  className="rounded-lg px-4 py-2 text-sm text-[#6b7280] hover:text-[#374151] dark:text-[#9ca3af]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={orgProcessing || !orgData.name.trim()}
                  className="rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  {orgProcessing ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
