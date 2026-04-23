// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Check, X, CircleAlert, Loader2, KeyRound, Pencil } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
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
    client_research_agent_id: string | null;
    client_research_environment_id: string | null;
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

  // Key section — only reveal input when user explicitly clicks "Trocar chave"
  const [changingKey, setChangingKey] = useState(!organization.has_anthropic_key);
  const [testStatus, setTestStatus] = useState<null | 'testing' | 'valid' | 'invalid'>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const form = useForm({
    anthropic_api_key: '',
    client_research_agent_id: organization.client_research_agent_id ?? '',
    client_research_environment_id: organization.client_research_environment_id ?? '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    form.patch(route('settings.ai.update'), {
      preserveScroll: true,
      onSuccess: () => {
        form.setData('anthropic_api_key', '');
        setChangingKey(false);
        setTestStatus(null);
        setTestResult(null);
        router.reload();
      },
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
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ anthropic_api_key: form.data.anthropic_api_key }),
      });
      if (res.status === 429) {
        setTestStatus('invalid');
        setTestResult({ ok: false, chat_ok: false, managed_agents_ok: false, message: t('settings.ai.testThrottled') });
        return;
      }
      const data: TestResult = await res.json();
      setTestResult(data);
      setTestStatus(data.ok ? 'valid' : 'invalid');
    } catch {
      setTestStatus('invalid');
      setTestResult({ ok: false, chat_ok: false, managed_agents_ok: false, message: t('settings.ai.testFailed') });
    }
  };

  const cancelKeyChange = () => {
    setChangingKey(false);
    form.setData('anthropic_api_key', '');
    setTestStatus(null);
    setTestResult(null);
  };

  const maEnabled = organization.managed_agents_enabled || !!form.data.client_research_agent_id;

  return (
    <AppLayout>
      <Head title={t('settings.ai.title')} />
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-1 text-xl font-semibold">{t('settings.ai.title')}</h1>
        <p className="mb-6 text-sm text-[#6b7280]">{t('settings.ai.description')}</p>

        <form onSubmit={submit} className="space-y-6">

          {/* ── API Key section ── */}
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 dark:border-[#1f2937] dark:bg-[#111827]">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={16} className="text-[#7c3aed]" />
              <h2 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
                {t('settings.ai.keyLabel')}
              </h2>
              {organization.key_valid && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check size={10} /> {t('settings.ai.status.valid')}
                </span>
              )}
            </div>

            {/* Key display — masked when key exists and not changing */}
            {organization.has_anthropic_key && !changingKey ? (
              <div className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 dark:border-[#1f2937] dark:bg-[#0b0f14]">
                <code className="font-mono text-sm text-[#374151] dark:text-[#d1d5db]">
                  {organization.anthropic_api_key_mask ?? 'sk-ant-...'}
                </code>
                <button
                  type="button"
                  onClick={() => setChangingKey(true)}
                  className="flex items-center gap-1 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9]"
                >
                  <Pencil size={12} />
                  {t('settings.ai.changeKey')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <input
                    type="password"
                    autoComplete="new-password"
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
                    {testStatus === 'testing' && <Loader2 size={14} className="mr-1 inline animate-spin" />}
                    {t('settings.ai.testKey')}
                  </button>

                  {organization.has_anthropic_key && (
                    <button
                      type="button"
                      onClick={cancelKeyChange}
                      className="text-sm text-[#9ca3af] hover:text-[#6b7280]"
                    >
                      {t('common.cancel')}
                    </button>
                  )}

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

                {testResult?.chat_ok && !testResult.managed_agents_ok && !form.data.client_research_agent_id && (
                  <div className="rounded-[8px] border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-xs text-[#b45309] dark:text-[#f59e0b]">
                    {t('settings.ai.maUnavailableBanner')}
                  </div>
                )}
              </div>
            )}

            {organization.last_key_check_at && (
              <p className="mt-3 text-xs text-[#9ca3af]">
                {t('settings.ai.lastCheck', { date: new Date(organization.last_key_check_at).toLocaleString() })}
              </p>
            )}
          </div>

          {/* ── Managed Agents section ── */}
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 dark:border-[#1f2937] dark:bg-[#111827]">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
                {t('settings.ai.managedAgents.title')}
              </h2>
              {maEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check size={10} /> {t('settings.ai.managedAgents.enabled')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-[11px] font-medium text-[#b45309] dark:text-[#f59e0b]">
                  {t('settings.ai.managedAgents.disabled')}
                </span>
              )}
            </div>
            <p className="mb-4 text-xs text-[#6b7280]">{t('settings.ai.managedAgents.hint')}</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#374151] dark:text-[#d1d5db]">
                  {t('settings.ai.managedAgents.agentIdLabel')}
                </label>
                <input
                  type="text"
                  value={form.data.client_research_agent_id}
                  onChange={e => form.setData('client_research_agent_id', e.target.value)}
                  placeholder="agt_..."
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-sm focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]"
                />
                <p className="mt-1 text-xs text-[#9ca3af]">{t('settings.ai.managedAgents.agentIdHint')}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#374151] dark:text-[#d1d5db]">
                  {t('settings.ai.managedAgents.envIdLabel')}
                </label>
                <input
                  type="text"
                  value={form.data.client_research_environment_id}
                  onChange={e => form.setData('client_research_environment_id', e.target.value)}
                  placeholder="env_... (opcional)"
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-sm focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={form.processing}
            className="rounded-[8px] bg-[#7c3aed] px-5 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {form.processing ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
