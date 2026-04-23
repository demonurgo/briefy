// (c) 2026 Briefy contributors — AGPL-3.0
import { PropsWithChildren } from 'react';
import bgLight from '@/assets/bg-light.png';
import bgDark from '@/assets/bg-dark.png';
import logoLight from '@/assets/logo.svg';
import logoDark from '@/assets/logo-dark.svg';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen bg-[#f9fafb] dark:bg-[#0b0f14]">
            {/* Left — form panel */}
            <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2 md:px-16">
                <div className="w-full max-w-sm">
                    <Link href="/" className="mb-8 flex justify-center">
                        <img
                            src={logoLight}
                            alt="Briefy"
                            className="h-10 block dark:hidden"
                        />
                        <img
                            src={logoDark}
                            alt="Briefy"
                            className="h-10 hidden dark:block"
                        />
                    </Link>

                    <div className="rounded-[12px] bg-white px-8 py-8 shadow-sm dark:bg-[#111827]">
                        {children}
                    </div>
                </div>
            </div>

            {/* Right — decorative background (desktop only) */}
            <div className="hidden md:block md:w-1/2">
                <img
                    src={bgLight}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover dark:hidden"
                />
                <img
                    src={bgDark}
                    alt=""
                    aria-hidden="true"
                    className="hidden h-full w-full object-cover dark:block"
                />
            </div>

            {/* Mobile — faint background behind form */}
            <div
                className="absolute inset-0 z-0 md:hidden"
                style={{
                    backgroundImage: `url(${bgLight})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.08,
                }}
            />
        </div>
    );
}
