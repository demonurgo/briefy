// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Check, X, CircleAlert, Loader2 } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import InputError from '@/Components/InputError';

interface Props {
  organization: {
    id: number;
    name: string;
    has_anthropic_key: boolean;
    anthropic_api_key_mask: string | null;
    key_valid: boolean;
    managed_agents_enabled: boolean;
    last_key_check_at: string | null;
  };
}

interface TestResult {
  ok: boolean;
  chat_ok: boolean;
  managed_agents_ok: boolean;
  message: string;
}

export default function SettingsAi({ organization }: Props) {
  const { t } = useTranslation();
  const [testStatus, setTestStatus] = useState<null | 'testing' | 'valid' | 'invalid'>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const form = useForm({ anthropic_api_key: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    form.patch(route('settings.ai.update'), {
      preserveScroll: true,
      onSuccess: () => form.reset(),
    });
  };

  const handleTest = async () => {
    if (!form.data.anthropic_api_key) return;
    setTestStatus('testing');
    try {
      const csrfToken =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch(route('settings.ai.test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ anthropic_api_key: form.data.anthropic_api_key }),
      });

      // Handle throttle (429) gracefully
      if (res.status === 429) {
        setTestStatus('invalid');
        setTestResult({
          ok: false,
          chat_ok: false,
          managed_agents_ok: false,
          message: t('settings.ai.testThrottled'),
        });
        return;
      }

      const data: TestResult = await res.json();
      setTestResult(data);
      setTestStatus(data.ok ? 'valid' : 'invalid');
    } catch {
      setTestStatus('invalid');
      setTestResult({
        ok: false,
        chat_ok: false,
        managed_agents_ok: false,
        message: t('settings.ai.testFailed'),
      });
    }
  };

  return (
    <AppLayout>
      <Head title={t('settings.ai.title')} />
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-1 text-xl font-semibold">{t('settings.ai.title')}</h1>
        <p className="mb-6 text-sm text-[#6b7280]">{t('settings.ai.description')}</p>

        {/* Status badge */}
        <div className="mb-6 flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-3 dark:border-[#1f2937] dark:bg-[#111827]">
          {organization.has_anthropic_key ? (
            <>
              <Check size={16} className="text-green-500" />
              <span className="text-sm">
                {t('settings.ai.status.configured')}:{' '}
                <code className="font-mono">{organization.anthropic_api_key_mask}</code>
              </span>
            </>
          ) : (
            <>
              <CircleAlert size={16} className="text-[#f59e0b]" />
              <span className="text-sm">{t('settings.ai.status.missing')}</span>
            </>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('settings.ai.keyLabel')}
            </label>
            <input
              type="password"
              autoComplete="off"
              value={form.data.anthropic_api_key}
              onChange={(e) => {
                form.setData('anthropic_api_key', e.target.value);
                setTestStatus(null);
                setTestResult(null);
              }}
              placeholder="sk-ant-api03-..."
              className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 font-mono text-sm focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]"
            />
            <InputError message={form.errors.anthropic_api_key} className="mt-1.5" />
            <p className="mt-1 text-xs text-[#9ca3af]">{t('settings.ai.keyHint')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={!form.data.anthropic_api_key || testStatus === 'testing'}
              className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 dark:border-[#1f2937]"
            >
              {testStatus === 'testing' ? (
                <Loader2 size={14} className="mr-1 inline animate-spin" />
              ) : null}
              {t('settings.ai.testKey')}
            </button>

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

          {/* MA availability notice — shown only when chat works but MA does not */}
          {testResult?.chat_ok && !testResult.managed_agents_ok && (
            <div className="rounded-[8px] border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-xs text-[#b45309] dark:text-[#f59e0b]">
              {t('settings.ai.maUnavailableBanner')}
            </div>
          )}

          {/* M3 — last key check timestamp */}
          {organization.last_key_check_at && (
            <p className="text-xs text-[#9ca3af]">
              {t('settings.ai.lastCheck', {
                date: new Date(organization.last_key_check_at).toLocaleString(),
              })}
            </p>
          )}

          <button
            type="submit"
            disabled={form.processing}
            className="rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {form.processing ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
