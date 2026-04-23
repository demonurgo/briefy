// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';

interface Props {
    expired: boolean;
    invitation: { email: string; role: 'owner' | 'admin' | 'collaborator' } | null;
    organization: { name: string } | null;
    has_account: boolean;
}

const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Admin',
    collaborator: 'Colaborador',
};

const roleBadgeClasses: Record<string, string> = {
    owner: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20',
    admin: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20',
    collaborator: 'bg-[#9ca3af]/10 text-[#9ca3af] border-[#9ca3af]/20',
};

export default function InviteAccept({ expired, invitation, organization, has_account }: Props) {
    // Extract token from URL: /invite/{token} or /invite/{token}/accept
    const token = window.location.pathname.split('/invite/')[1]?.split('/accept')[0] ?? '';

    const form = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('invitations.store', token));
    };

    const role = invitation?.role ?? 'collaborator';
    const badgeClass = roleBadgeClasses[role] ?? roleBadgeClasses.collaborator;

    return (
        <div className="min-h-screen bg-[#f9fafb] dark:bg-[#0b0f14] flex items-center justify-center p-4">
            <Head title="Aceitar convite — Briefy" />

            <div className="max-w-md w-full rounded-[16px] bg-white dark:bg-[#111827] p-8 shadow-lg">

                {/* Briefy wordmark */}
                <div className="text-center mb-6">
                    <span className="text-xl font-bold tracking-tight text-[#111827] dark:text-[#f9fafb]">briefy</span>
                </div>

                {expired || !invitation ? (
                    /* ── Expired/invalid state ── */
                    <div className="text-center">
                        <p className="text-base font-semibold text-[#111827] dark:text-[#f9fafb] mb-2">
                            Este convite expirou ou já foi utilizado.
                        </p>
                        <p className="text-sm text-[#6b7280]">
                            Solicite um novo convite ao administrador da organização.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── Header ── */}
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-semibold text-[#111827] dark:text-[#f9fafb] mb-2">
                                Você foi convidado para <strong>{organization?.name}</strong>
                            </h1>
                            <p className="text-sm text-[#6b7280] flex items-center justify-center gap-2">
                                Você foi convidado como{' '}
                                <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                                >
                                    {roleLabels[role]}
                                </span>
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-4">

                            {has_account ? (
                                /* ── Branch B: existing user ── */
                                <div className="rounded-[8px] bg-[#f3f4f6] dark:bg-[#1f2937] px-4 py-3 text-sm text-[#374151] dark:text-[#d1d5db]">
                                    Esta conta já existe no Briefy. Clique abaixo para entrar na organização.
                                </div>
                            ) : (
                                /* ── Branch A: new user ── */
                                <>
                                    <div>
                                        <InputLabel htmlFor="name" value="Seu nome" />
                                        <TextInput
                                            id="name"
                                            type="text"
                                            className="mt-1 block w-full"
                                            value={form.data.name}
                                            onChange={e => form.setData('name', e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <InputError message={form.errors.name} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password" value="Senha" />
                                        <TextInput
                                            id="password"
                                            type="password"
                                            className="mt-1 block w-full"
                                            value={form.data.password}
                                            onChange={e => form.setData('password', e.target.value)}
                                            required
                                            autoComplete="new-password"
                                        />
                                        <InputError message={form.errors.password} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password_confirmation" value="Confirmar senha" />
                                        <TextInput
                                            id="password_confirmation"
                                            type="password"
                                            className="mt-1 block w-full"
                                            value={form.data.password_confirmation}
                                            onChange={e => form.setData('password_confirmation', e.target.value)}
                                            required
                                            autoComplete="new-password"
                                        />
                                        <InputError message={form.errors.password_confirmation} className="mt-1" />
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 rounded-[8px] py-3 text-sm font-semibold text-white transition-colors mt-2"
                            >
                                {form.processing
                                    ? 'Aguarde...'
                                    : has_account
                                        ? 'Entrar na organização'
                                        : 'Criar conta e entrar'
                                }
                            </button>

                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
