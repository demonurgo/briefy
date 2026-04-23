// (c) 2026 Briefy contributors — AGPL-3.0
import { useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  Loader2,
  KeyRound,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { UserAvatar } from '@/Components/UserAvatar';
import { CostConfirmModal } from '@/Components/CostConfirmModal';
import Dropdown from '@/Components/Dropdown';
import InputError from '@/Components/InputError';

// ── Types ──────────────────────────────────────────────────────────────────

interface Member {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: 'owner' | 'admin' | 'collaborator';
  joined_at: string; // "DD/MM/YYYY"
}

interface PendingInvite {
  id: number;
  email: string;
  role: 'admin' | 'collaborator';
  created_at: string; // "DD/MM/YYYY"
}

interface Props {
  members: Member[];
  pending_invites: PendingInvite[];
  organization: { id: number; name: string; slug: string; logo: string | null };
  can_manage_team: boolean;
}

interface TestResult {
  ok: boolean;
  chat_ok: boolean;
  managed_agents_ok: boolean;
  message: string;
}

interface SettingsPageProps {
  [key: string]: unknown;
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      avatar: string | null;
      role: string;
      preferences: { locale?: string; theme?: string };
      organization: {
        id: number;
        name: string;
        slug: string;
        logo: string | null;
        has_anthropic_key: boolean;
        anthropic_api_key_mask: string | null;
        key_valid: boolean;
        managed_agents_enabled: boolean;
        last_key_check_at: string | null;
        client_research_agent_id: string | null;
        client_research_environment_id: string | null;
      };
    };
    organization: { id: number; name: string; slug: string; logo?: string; has_anthropic_key: boolean; anthropic_api_key_mask: string | null } | null;
  };
}

// ── Inline utility: RoleBadge ──────────────────────────────────────────────

function RoleBadge({ role }: { role: 'owner' | 'admin' | 'collaborator' }) {
  const labels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Admin',
    collaborator: 'Colaborador',
  };
  const classes: Record<string, string> = {
    owner: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20',
    admin: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20',
    collaborator: 'bg-[#9ca3af]/10 text-[#9ca3af] border-[#9ca3af]/20',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${classes[role]}`}
    >
      {labels[role]}
    </span>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────

const SECTION_CARD = 'rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-6';
const SECTION_HEADING = 'text-sm font-semibold text-[#111827] dark:text-[#f9fafb] mb-4';

// ── Input class helpers ────────────────────────────────────────────────────

const INPUT = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] transition-colors focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280] dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]/20';
const INPUT_DISABLED = 'w-full rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#9ca3af] dark:border-[#1f2937] dark:bg-[#0b0f14] dark:text-[#6b7280] cursor-not-allowed';
const LABEL = 'mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]';

// ── Main component ─────────────────────────────────────────────────────────

export default function SettingsIndex({ members, pending_invites, organization, can_manage_team }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<SettingsPageProps>().props;
  const user = auth.user;
  const userOrg = user.organization;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm({
    name: user.name,
    locale: user.preferences?.locale ?? 'pt-BR',
    theme: user.preferences?.theme ?? 'light',
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  // ── Organization state ───────────────────────────────────────────────────
  const orgForm = useForm({ name: organization.name });

  // ── Team state ───────────────────────────────────────────────────────────
  const inviteForm = useForm({ email: '', role: 'collaborator' });
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  // ── AI section state ─────────────────────────────────────────────────────
  const [changingKey, setChangingKey] = useState(!userOrg.has_anthropic_key);
  const [testStatus, setTestStatus] = useState<null | 'testing' | 'valid' | 'invalid'>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const aiForm = useForm({
    anthropic_api_key: '',
    client_research_agent_id: userOrg.client_research_agent_id ?? '',
    client_research_environment_id: userOrg.client_research_environment_id ?? '',
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const formData = new FormData();
    formData.append('avatar', file);
    setAvatarLoading(true);
    router.post(route('settings.profile.avatar'), formData, {
      preserveScroll: true,
      onFinish: () => setAvatarLoading(false),
    });
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    profileForm.patch(route('settings.profile.update'), { preserveScroll: true });
  };

  const handleOrgSave = (e: React.FormEvent) => {
    e.preventDefault();
    orgForm.patch(route('settings.organization.update'), { preserveScroll: true });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    router.post(route('team.invite'), { email: inviteForm.data.email, role: inviteForm.data.role }, {
      preserveScroll: true,
      only: ['pending_invites', 'members'],
      onSuccess: () => inviteForm.reset(),
    });
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    aiForm.patch(route('settings.ai.update'), {
      preserveScroll: true,
      onSuccess: () => {
        aiForm.setData('anthropic_api_key', '');
        setChangingKey(false);
        setTestStatus(null);
        setTestResult(null);
        router.reload();
      },
    });
  };

  const handleAiTest = async () => {
    if (!aiForm.data.anthropic_api_key) return;
    setTestStatus('testing');
    try {
      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch(route('settings.ai.test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ anthropic_api_key: aiForm.data.anthropic_api_key }),
      });
      if (res.status === 429) {
        setTestStatus('invalid');
        setTestResult({ ok: false, chat_ok: false, managed_agents_ok: false, message: t('settings.ai.testThrottled') });
        return;
      }
      const data: TestResult = await res.json();
      setTestResult(data);
      setTestStatus(data.ok ? 'valid' : 'invalid');
    } catch {
      setTestStatus('invalid');
      setTestResult({ ok: false, chat_ok: false, managed_agents_ok: false, message: t('settings.ai.testFailed') });
    }
  };

  const cancelKeyChange = () => {
    setChangingKey(false);
    aiForm.setData('anthropic_api_key', '');
    setTestStatus(null);
    setTestResult(null);
  };

  const maEnabled = userOrg.managed_agents_enabled || !!aiForm.data.client_research_agent_id;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Configurações">
      <Head title="Configurações" />
      <div className="mx-auto max-w-4xl">
        <div className="space-y-8">

          {/* ── #profile section ──────────────────────────────────────────── */}
          <section id="profile" className={SECTION_CARD}>
            <h2 className={SECTION_HEADING}>Perfil</h2>

            <div className="flex flex-col sm:flex-row gap-8">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2 sm:w-32 shrink-0">
                <div
                  className="relative cursor-pointer"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarLoading ? (
                    <div className="h-20 w-20 rounded-full flex items-center justify-center bg-[#f3f4f6] dark:bg-[#1f2937]">
                      <Loader2 size={24} className="animate-spin text-[#7c3aed]" />
                    </div>
                  ) : (
                    <UserAvatar
                      name={user.name}
                      avatar={previewUrl ? undefined : (user.avatar ?? undefined)}
                      size="lg"
                    />
                  )}
                  {previewUrl && !avatarLoading && (
                    <img
                      src={previewUrl}
                      alt={user.name}
                      className="h-16 w-16 rounded-full object-cover absolute inset-0"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-[#7c3aed] hover:text-[#6d28d9] font-semibold"
                >
                  Alterar foto
                </button>
                <p className="text-xs text-[#9ca3af] text-center">JPG, PNG ou WebP. Máx. 20MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* Profile form */}
              <form onSubmit={handleProfileSave} className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className={LABEL}>Nome</label>
                    <input
                      id="name"
                      type="text"
                      value={profileForm.data.name}
                      onChange={e => profileForm.setData('name', e.target.value)}
                      className={INPUT}
                    />
                    <InputError message={profileForm.errors.name} className="mt-1" />
                  </div>

                  <div>
                    <label htmlFor="email" className={LABEL}>E-mail</label>
                    <input
                      id="email"
                      type="email"
                      value={user.email}
                      readOnly
                      className={INPUT_DISABLED}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="locale" className={LABEL}>Idioma</label>
                    <select
                      id="locale"
                      value={profileForm.data.locale}
                      onChange={e => profileForm.setData('locale', e.target.value)}
                      className={INPUT}
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="theme" className={LABEL}>Tema</label>
                    <select
                      id="theme"
                      value={profileForm.data.theme}
                      onChange={e => profileForm.setData('theme', e.target.value)}
                      className={INPUT}
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                    </select>
                  </div>
                </div>

                {/* Password change collapsible */}
                <div>
                  {!showPasswordChange ? (
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(true)}
                      className="text-sm text-[#7c3aed] hover:text-[#6d28d9]"
                    >
                      Alterar senha →
                    </button>
                  ) : (
                    <div className="space-y-4 border border-[#e5e7eb] dark:border-[#1f2937] rounded-[8px] p-4">
                      <div>
                        <label htmlFor="current_password" className={LABEL}>Senha atual</label>
                        <input
                          id="current_password"
                          type="password"
                          autoComplete="current-password"
                          value={profileForm.data.current_password}
                          onChange={e => profileForm.setData('current_password', e.target.value)}
                          className={INPUT}
                        />
                        <InputError message={profileForm.errors.current_password} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="password" className={LABEL}>Nova senha</label>
                          <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            value={profileForm.data.password}
                            onChange={e => profileForm.setData('password', e.target.value)}
                            className={INPUT}
                          />
                          <InputError message={profileForm.errors.password} className="mt-1" />
                        </div>
                        <div>
                          <label htmlFor="password_confirmation" className={LABEL}>Confirmar nova senha</label>
                          <input
                            id="password_confirmation"
                            type="password"
                            autoComplete="new-password"
                            value={profileForm.data.password_confirmation}
                            onChange={e => profileForm.setData('password_confirmation', e.target.value)}
                            className={INPUT}
                          />
                          <InputError message={profileForm.errors.password_confirmation} className="mt-1" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordChange(false);
                          profileForm.setData('current_password', '');
                          profileForm.setData('password', '');
                          profileForm.setData('password_confirmation', '');
                        }}
                        className="text-sm text-[#9ca3af] hover:text-[#6b7280]"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={profileForm.processing}
                  className="rounded-[8px] bg-[#7c3aed] px-5 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60"
                >
                  {profileForm.processing ? 'Salvando...' : 'Salvar perfil'}
                </button>
              </form>
            </div>
          </section>

          {/* ── #organization section ─────────────────────────────────────── */}
          <section id="organization" className={SECTION_CARD}>
            <h2 className={SECTION_HEADING}>Organização</h2>
            <form onSubmit={handleOrgSave} className="space-y-4">
              <div className="sm:max-w-sm">
                <label htmlFor="org-name" className={LABEL}>Nome da organização</label>
                <input
                  id="org-name"
                  type="text"
                  value={orgForm.data.name}
                  onChange={e => orgForm.setData('name', e.target.value)}
                  disabled={!can_manage_team}
                  className={can_manage_team ? INPUT : INPUT_DISABLED}
                />
                <InputError message={orgForm.errors.name} className="mt-1" />
                {!can_manage_team && (
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    Apenas admins podem alterar as configurações da organização.
                  </p>
                )}
              </div>
              {can_manage_team && (
                <button
                  type="submit"
                  disabled={orgForm.processing}
                  className="rounded-[8px] bg-[#7c3aed] px-5 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60"
                >
                  {orgForm.processing ? 'Salvando...' : 'Salvar organização'}
                </button>
              )}
            </form>
          </section>

          {/* ── #team section ─────────────────────────────────────────────── */}
          <section id="team" className={SECTION_CARD}>
            <h2 className={SECTION_HEADING}>Equipe</h2>

            <div className="space-y-6">

              {/* A. Invite form (admin/owner only) */}
              {can_manage_team && (
                <div>
                  <h3 className="text-xs font-semibold text-[#374151] dark:text-[#d1d5db] mb-3 uppercase tracking-wide">
                    Convidar membro
                  </h3>
                  <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={inviteForm.data.email}
                        onChange={e => inviteForm.setData('email', e.target.value)}
                        className={INPUT}
                      />
                      <InputError message={inviteForm.errors.email} className="mt-1" />
                    </div>
                    <select
                      value={inviteForm.data.role}
                      onChange={e => inviteForm.setData('role', e.target.value)}
                      className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] px-3.5 py-2.5 text-sm text-[#111827] dark:text-[#f9fafb] transition-colors focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:focus:border-[#a78bfa]"
                    >
                      <option value="collaborator">Colaborador</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviteForm.processing}
                      className="rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60 whitespace-nowrap"
                    >
                      {inviteForm.processing ? 'Enviando...' : 'Enviar convite'}
                    </button>
                  </form>
                </div>
              )}

              {/* B. Pending invites (admin/owner only, only when exists) */}
              {can_manage_team && pending_invites.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#374151] dark:text-[#d1d5db] mb-3 uppercase tracking-wide">
                    Convites pendentes
                  </h3>
                  <div className="space-y-2">
                    {pending_invites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex flex-wrap items-center gap-3 py-2 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0"
                      >
                        <span className="flex-1 text-sm truncate text-[#111827] dark:text-[#f9fafb]">{invite.email}</span>
                        <RoleBadge role={invite.role} />
                        <span className="text-xs text-[#9ca3af]">Enviado em {invite.created_at}</span>
                        <button
                          type="button"
                          onClick={() =>
                            router.post(route('team.invitation.resend', invite.id), {}, {
                              preserveScroll: true,
                            })
                          }
                          className="text-sm text-[#7c3aed] hover:text-[#6d28d9]"
                        >
                          Reenviar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            router.delete(route('team.invitation.cancel', invite.id), {
                              preserveScroll: true,
                              only: ['pending_invites'],
                            })
                          }
                          className="text-sm text-[#ef4444] hover:text-[#dc2626]"
                        >
                          Cancelar convite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Team roster (visible to all) */}
              <div>
                <h3 className="text-xs font-semibold text-[#374151] dark:text-[#d1d5db] mb-3 uppercase tracking-wide">
                  Membros
                </h3>
                {members.length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">
                    Nenhum membro ainda. Convide alguém para começar.
                  </p>
                ) : (
                  <div>
                    {members.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 py-3 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0"
                      >
                        <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-[#111827] dark:text-[#f9fafb]">{member.name}</p>
                          <p className="text-xs text-[#6b7280] truncate">{member.email}</p>
                        </div>
                        <RoleBadge role={member.role} />
                        <p className="text-xs text-[#9ca3af] hidden md:block">Desde {member.joined_at}</p>
                        {can_manage_team && member.role !== 'owner' && (
                          <>
                            {/* Role change dropdown */}
                            <Dropdown>
                              <Dropdown.Trigger>
                                <button
                                  type="button"
                                  className="text-xs text-[#6b7280] hover:text-[#374151] dark:hover:text-[#d1d5db] flex items-center gap-1"
                                >
                                  <ChevronDown size={14} />
                                </button>
                              </Dropdown.Trigger>
                              <Dropdown.Content contentClasses="py-1 bg-white dark:bg-[#111827]">
                                {member.role !== 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.patch(route('team.updateRole', member.id), { role: 'admin' }, {
                                        preserveScroll: true,
                                        only: ['members'],
                                      })
                                    }
                                    className="block w-full text-left px-4 py-2 text-sm text-[#111827] dark:text-[#f9fafb] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]"
                                  >
                                    Promover a Admin
                                  </button>
                                )}
                                {member.role !== 'collaborator' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.patch(route('team.updateRole', member.id), { role: 'collaborator' }, {
                                        preserveScroll: true,
                                        only: ['members'],
                                      })
                                    }
                                    className="block w-full text-left px-4 py-2 text-sm text-[#111827] dark:text-[#f9fafb] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]"
                                  >
                                    Rebaixar para Colaborador
                                  </button>
                                )}
                              </Dropdown.Content>
                            </Dropdown>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(member)}
                              className="text-[#9ca3af] hover:text-[#ef4444] transition-colors"
                              aria-label={`Remover ${member.name} da organização`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── #ai section ───────────────────────────────────────────────── */}
          <section id="ai" className={SECTION_CARD}>
            <h2 className={SECTION_HEADING}>Integrações de IA</h2>

            <form onSubmit={handleAiSubmit} className="space-y-6">

              {/* API Key card */}
              <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 dark:border-[#1f2937] dark:bg-[#111827]">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound size={16} className="text-[#7c3aed]" />
                  <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
                    {t('settings.ai.keyLabel')}
                  </h3>
                  {userOrg.key_valid && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check size={10} /> {t('settings.ai.status.valid')}
                    </span>
                  )}
                </div>

                {userOrg.has_anthropic_key && !changingKey ? (
                  <div className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 dark:border-[#1f2937] dark:bg-[#0b0f14]">
                    <code className="font-mono text-sm text-[#374151] dark:text-[#d1d5db]">
                      {userOrg.anthropic_api_key_mask ?? 'sk-ant-...'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setChangingKey(true)}
                      className="flex items-center gap-1 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9]"
                    >
                      <Pencil size={12} />
                      {t('settings.ai.changeKey')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={aiForm.data.anthropic_api_key}
                        onChange={e => {
                          aiForm.setData('anthropic_api_key', e.target.value);
                          setTestStatus(null);
                          setTestResult(null);
                        }}
                        placeholder="sk-ant-api03-..."
                        className={`${INPUT} font-mono`}
                      />
                      <InputError message={aiForm.errors.anthropic_api_key} className="mt-1.5" />
                      <p className="mt-1 text-xs text-[#9ca3af]">{t('settings.ai.keyHint')}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleAiTest}
                        disabled={!aiForm.data.anthropic_api_key || testStatus === 'testing'}
                        className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 dark:border-[#1f2937]"
                      >
                        {testStatus === 'testing' && <Loader2 size={14} className="mr-1 inline animate-spin" />}
                        {t('settings.ai.testKey')}
                      </button>

                      {userOrg.has_anthropic_key && (
                        <button
                          type="button"
                          onClick={cancelKeyChange}
                          className="text-sm text-[#9ca3af] hover:text-[#6b7280]"
                        >
                          {t('common.cancel')}
                        </button>
                      )}

                      {testStatus === 'valid' && testResult && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <Check size={14} /> {testResult.message}
                        </span>
                      )}
                      {testStatus === 'invalid' && testResult && (
                        <span className="flex items-center gap-1 text-sm text-red-500">
                          <X size={14} /> {testResult.message}
                        </span>
                      )}
                    </div>

                    {testResult?.chat_ok && !testResult.managed_agents_ok && !aiForm.data.client_research_agent_id && (
                      <div className="rounded-[8px] border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-xs text-[#b45309] dark:text-[#f59e0b]">
                        {t('settings.ai.maUnavailableBanner')}
                      </div>
                    )}
                  </div>
                )}

                {userOrg.last_key_check_at && (
                  <p className="mt-3 text-xs text-[#9ca3af]">
                    {t('settings.ai.lastCheck', { date: new Date(userOrg.last_key_check_at).toLocaleString() })}
                  </p>
                )}
              </div>

              {/* Managed Agents card */}
              <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 dark:border-[#1f2937] dark:bg-[#111827]">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
                    {t('settings.ai.managedAgents.title')}
                  </h3>
                  {maEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check size={10} /> {t('settings.ai.managedAgents.enabled')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-[11px] font-medium text-[#b45309] dark:text-[#f59e0b]">
                      {t('settings.ai.managedAgents.disabled')}
                    </span>
                  )}
                </div>
                <p className="mb-4 text-xs text-[#6b7280]">{t('settings.ai.managedAgents.hint')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>{t('settings.ai.managedAgents.agentIdLabel')}</label>
                    <input
                      type="text"
                      value={aiForm.data.client_research_agent_id}
                      onChange={e => aiForm.setData('client_research_agent_id', e.target.value)}
                      placeholder="agt_..."
                      className={`${INPUT} font-mono`}
                    />
                    <p className="mt-1 text-xs text-[#9ca3af]">{t('settings.ai.managedAgents.agentIdHint')}</p>
                  </div>

                  <div>
                    <label className={LABEL}>{t('settings.ai.managedAgents.envIdLabel')}</label>
                    <input
                      type="text"
                      value={aiForm.data.client_research_environment_id}
                      onChange={e => aiForm.setData('client_research_environment_id', e.target.value)}
                      placeholder="env_... (opcional)"
                      className={`${INPUT} font-mono`}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={aiForm.processing}
                className="rounded-[8px] bg-[#7c3aed] px-5 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60"
              >
                {aiForm.processing ? t('common.saving') : t('common.save')}
              </button>
            </form>
          </section>

        </div>{/* end space-y-8 */}
      </div>{/* end max-w-4xl */}

      {/* Remove member confirmation modal */}
      <CostConfirmModal
        open={!!removeTarget}
        title="Remover membro"
        body={removeTarget ? `Tem certeza que deseja remover ${removeTarget.name} da organização? Esta ação não pode ser desfeita.` : undefined}
        confirmLabel="Remover"
        costUsd={0}
        onConfirm={() => {
          if (!removeTarget) return;
          router.delete(route('team.remove', removeTarget.id), {
            preserveScroll: true,
            only: ['members', 'pending_invites'],
            onSuccess: () => setRemoveTarget(null),
          });
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </AppLayout>
  );
}
