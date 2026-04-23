// (c) 2026 Briefy contributors — AGPL-3.0
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const inputClass =
        'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] transition-colors focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280] dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]/20';

    const labelClass = 'mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]';

    return (
        <GuestLayout>
            <Head title="Redefinir senha" />

            <h1 className="mb-1 text-xl font-semibold text-[#111827] dark:text-[#f9fafb]">
                Redefinir senha
            </h1>
            <p className="mb-6 text-sm text-[#6b7280]">
                Crie uma nova senha para sua conta.
            </p>

            <form onSubmit={submit} noValidate>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="email" className={labelClass}>E-mail</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            className={inputClass}
                        />
                        <InputError message={errors.email} className="mt-1.5" />
                    </div>

                    <div>
                        <label htmlFor="password" className={labelClass}>Nova senha</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            autoComplete="new-password"
                            autoFocus
                            onChange={(e) => setData('password', e.target.value)}
                            className={inputClass}
                            placeholder="Mínimo 8 caracteres"
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div>
                        <label htmlFor="password_confirmation" className={labelClass}>
                            Confirmar nova senha
                        </label>
                        <input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className={inputClass}
                            placeholder="Repita a senha"
                        />
                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 w-full rounded-[8px] bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? 'Salvando...' : 'Redefinir senha'}
                </button>
            </form>
        </GuestLayout>
    );
}
