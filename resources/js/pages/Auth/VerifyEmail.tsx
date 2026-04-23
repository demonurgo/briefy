// (c) 2026 Briefy contributors — AGPL-3.0
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verificar e-mail" />

            <h1 className="mb-1 text-xl font-semibold text-[#111827] dark:text-[#f9fafb]">
                Verifique seu e-mail
            </h1>
            <p className="mb-6 text-sm text-[#6b7280]">
                Enviamos um link de verificação para o seu e-mail. Clique no link para ativar sua conta.
            </p>

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Um novo link de verificação foi enviado para o seu e-mail.
                </div>
            )}

            <form onSubmit={submit} noValidate>
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full rounded-[8px] bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? 'Enviando...' : 'Reenviar e-mail de verificação'}
                </button>

                <div className="mt-4 text-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-[#6b7280] underline hover:text-[#111827] dark:hover:text-[#f9fafb]"
                    >
                        Sair
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
