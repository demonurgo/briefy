import { useCallback, useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

type Theme = 'light' | 'dark';

interface PageProps {
  auth: { user: { preferences: { theme: string } } };
}

export function useTheme() {
  const { auth } = usePage<PageProps>().props;
  const initial = (auth?.user?.preferences?.theme as Theme) ?? 'light';
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    router.patch(
      route('settings.preferences'),
      { theme: next },
      { preserveState: true, preserveScroll: true }
    );
  }, [theme]);

  return { theme, toggle };
}
