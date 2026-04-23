// (c) 2026 Briefy contributors — AGPL-3.0
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Recuperar senha" />

            <h1 className="mb-1 text-xl font-semibold text-[#111827] dark:text-[#f9fafb]">
                Recuperar senha
            </h1>
            <p className="mb-6 text-sm text-[#6b7280]">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            {status && (
                <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    {status}
                </div>
            )}

            <form onSubmit={submit} noValidate>
                <div>
                    <label
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]"
                    >
                        E-mail
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] transition-colors focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280] dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]/20"
                        placeholder="seu@email.com"
                    />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 w-full rounded-[8px] bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
            </form>
        </GuestLayout>
    );
}
