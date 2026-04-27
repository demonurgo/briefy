// (c) 2026 Briefy contributors — AGPL-3.0
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

const inputClass =
    'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] transition-colors focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280] dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]/20';

const labelClass = 'mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]';

export default function Register() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const passwordRules = [
        { label: 'Mínimo 8 caracteres', met: data.password.length >= 8 },
        { label: 'Letra maiúscula e minúscula', met: /[a-z]/.test(data.password) && /[A-Z]/.test(data.password) },
        { label: 'Pelo menos um número', met: /[0-9]/.test(data.password) },
        { label: 'Pelo menos um símbolo (!@#$...)', met: /[^a-zA-Z0-9]/.test(data.password) },
    ];

    const showRules = data.password.length > 0;

    return (
        <GuestLayout>
            <Head title="Criar conta" />

            <h1 className="mb-1 text-xl font-semibold text-[#111827] dark:text-[#f9fafb]">
                Crie sua conta
            </h1>
            <p className="mb-6 text-sm text-[#6b7280]">
                Comece a gerenciar suas demandas com IA
            </p>

            <form onSubmit={submit} noValidate>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className={labelClass}>Nome</label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            value={data.name}
                            autoComplete="name"
                            autoFocus
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass}
                            placeholder="Seu nome completo"
                            required
                        />
                        <InputError message={errors.name} className="mt-1.5" />
                    </div>

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
                            placeholder="seu@email.com"
                            required
                        />
                        <InputError message={errors.email} className="mt-1.5" />
                    </div>

                    <div>
                        <label htmlFor="password" className={labelClass}>Senha</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            className={inputClass}
                            placeholder="Crie uma senha segura"
                            required
                        />
                        <InputError message={errors.password} className="mt-1.5" />

                        {showRules && (
                            <ul className="mt-2 space-y-1">
                                {passwordRules.map((rule) => (
                                    <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                                        <span className={rule.met ? 'text-[#10b981]' : 'text-[#9ca3af]'}>
                                            {rule.met ? (
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                                                </svg>
                                            ) : (
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6.53 5.47a.75.75 0 0 0-1.06 1.06L6.94 8 5.47 9.47a.75.75 0 1 0 1.06 1.06L8 9.06l1.47 1.47a.75.75 0 1 0 1.06-1.06L9.06 8l1.47-1.47a.75.75 0 0 0-1.06-1.06L8 6.94 6.53 5.47Z" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className={rule.met ? 'text-[#10b981]' : 'text-[#9ca3af]'}>
                                            {rule.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password_confirmation" className={labelClass}>
                            Confirmar senha
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
                            required
                        />
                        {data.password_confirmation.length > 0 && data.password !== data.password_confirmation && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400">
                                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                                </svg>
                                As senhas não conferem
                            </p>
                        )}
                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 w-full rounded-[8px] bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? t('auth.creatingAccount') : t('auth.createAccount')}
                </button>

                <p className="mt-5 text-center text-sm text-[#6b7280]">
                    Já tem uma conta?{' '}
                    <Link
                        href={route('login')}
                        className="font-medium text-[#7c3aed] hover:text-[#6d28d9] dark:text-[#a78bfa] dark:hover:text-[#c4b5fd]"
                    >
                        Entrar
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
