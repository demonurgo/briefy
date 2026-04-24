// (c) 2026 Briefy contributors — AGPL-3.0
import './lib/i18n';
import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import i18n from './lib/i18n';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window { Pusher: typeof Pusher; Echo: Echo<'reverb'>; }
}

window.Pusher = Pusher;
window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
});

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
