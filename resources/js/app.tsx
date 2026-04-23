// (c) 2026 Briefy contributors — AGPL-3.0
import './lib/i18n';
import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import i18n from './lib/i18n';

createInertiaApp({
  title: (title) => `${title} - Briefy`,
  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
  setup({ el, App, props }) {
    const pageProps = props.initialPage.props as Record<string, unknown>;
    const locale = (pageProps.locale as string) ?? 'pt-BR';
    i18n.changeLanguage(locale);

    const prefs = (pageProps.auth as Record<string, unknown>)?.user as Record<string, unknown> | undefined;
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const theme = savedTheme ?? (prefs?.preferences as Record<string, string>)?.theme ?? 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');

    createRoot(el).render(<App {...props} />);
  },
  progress: { color: '#7c3aed' },
});
