// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Brain, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { AiMarkdown } from '@/Components/AiMarkdown';

interface Insight {
  id: number;
  category: string;
  insight: string;
  confidence: number;
  status: 'active' | 'suggested' | 'dismissed';
  created_at: string;
}

interface Session {
  id: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  progress_summary: string | null;
  full_report: {
    generated_at: string;
    client_name: string;
    total_raw: number;
    total_saved: number;
    insights: Array<{ category: string; insight: string; confidence: number }>;
  } | null;
}

interface Props {
  client: { id: number; name: string };
  session: Session;
  insights: Insight[];
}

const CATEGORY_LABELS: Record<string, string> = {
  tone:         'Tom de voz',
  patterns:     'Padrões de conteúdo',
  preferences:  'Preferências',
  avoid:        'Evitar',
  terminology:  'Terminologia',
};

const CATEGORY_COLORS: Record<string, string> = {
  tone:        'bg-[#e9d5ff] text-[#7c3aed]',
  patterns:    'bg-[#dbeafe] text-[#1d4ed8]',
  preferences: 'bg-[#d1fae5] text-[#065f46]',
  avoid:       'bg-[#fee2e2] text-[#dc2626]',
  terminology: 'bg-[#fef3c7] text-[#92400e]',
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-[#10b981]' : pct >= 60 ? 'bg-[#7c3aed]' : 'bg-[#f59e0b]';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-[#f3f4f6] dark:bg-[#1f2937]">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-[#9ca3af]">{pct}%</span>
    </div>
  );
}

export default function ResearchShow({ client, session, insights }: Props) {
  const isRunning = ['queued', 'running', 'idle'].includes(session.status);

  // Auto-refresh every 10s while running
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => router.reload({ only: ['session', 'insights'] }), 10000);
    return () => clearInterval(id);
  }, [isRunning]);

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    cat, label,
    items: insights.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  const rawInsights = session.full_report?.insights ?? [];
  const rawGrouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    cat, label,
    items: rawInsights.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <AppLayout>
      <Head title={`Pesquisa — ${client.name}`} />
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.visit(route('clients.edit', client.id))}
            className="rounded-[8px] p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#6b7280] dark:hover:bg-[#1f2937]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#111827] dark:text-[#f9fafb]">
              Deep Research — {client.name}
            </h1>
            <p className="text-xs text-[#9ca3af]">
              {session.started_at
                ? `Iniciado em ${new Date(session.started_at).toLocaleString('pt-BR')}`
                : 'Aguardando início'}
              {session.completed_at && ` · Concluído em ${new Date(session.completed_at).toLocaleString('pt-BR')}`}
            </p>
          </div>
          <div className="ml-auto">
            {isRunning ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#7c3aed]/10 px-3 py-1.5 text-sm font-medium text-[#7c3aed]">
                <Loader2 size={14} className="animate-spin" />
                {session.progress_summary ?? 'Pesquisando...'}
              </span>
            ) : session.status === 'completed' ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#d1fae5] px-3 py-1.5 text-sm font-medium text-[#065f46]">
                <CheckCircle2 size={14} />
                Concluída
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fee2e2] px-3 py-1.5 text-sm font-medium text-[#dc2626]">
                Falhou
              </span>
            )}
          </div>
        </div>

        {/* Running state */}
        {isRunning && (
          <div className="mb-6 rounded-[14px] border border-[#7c3aed]/20 bg-[#7c3aed]/5 p-6 text-center">
            <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[#7c3aed]" />
            <p className="text-sm font-medium text-[#7c3aed]">{session.progress_summary ?? 'O agente está pesquisando o cliente...'}</p>
            <p className="mt-1 text-xs text-[#9ca3af]">Esta página atualiza automaticamente a cada 10 segundos</p>
          </div>
        )}

        {/* Insights salvos na memória */}
        {insights.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Brain size={18} className="text-[#7c3aed]" />
              <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
                Insights salvos na memória do cliente
              </h2>
              <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#6b7280] dark:bg-[#1f2937]">
                {insights.length}
              </span>
            </div>

            <div className="space-y-4">
              {grouped.map(({ cat, label, items }) => (
                <div key={cat} className="rounded-[12px] border border-[#e5e7eb] bg-white dark:border-[#1f2937] dark:bg-[#111827]">
                  <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-4 py-3 dark:border-[#1f2937]">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_COLORS[cat] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      {label}
                    </span>
                    <span className="text-xs text-[#9ca3af]">{items.length} insight{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
                    {items.map(ins => (
                      <li key={ins.id} className="flex items-start justify-between gap-4 px-4 py-3">
                        <p className="flex-1 text-sm text-[#374151] dark:text-[#d1d5db]">{ins.insight}</p>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <ConfidenceBar value={ins.confidence} />
                          {ins.status === 'suggested' && (
                            <span className="rounded-full bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-medium text-[#92400e]">
                              sugerido
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Relatório bruto completo */}
        {session.full_report && rawInsights.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[#9ca3af]" />
              <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
                Relatório completo da pesquisa
              </h2>
              <span className="text-xs text-[#9ca3af]">
                {session.full_report.total_raw} insights brutos · {session.full_report.total_saved} salvos após filtros
              </span>
            </div>

            <div className="rounded-[12px] border border-[#e5e7eb] bg-white dark:border-[#1f2937] dark:bg-[#111827]">
              <div className="border-b border-[#e5e7eb] px-5 py-3 dark:border-[#1f2937]">
                <p className="text-xs text-[#9ca3af]">
                  Gerado em {new Date(session.full_report.generated_at).toLocaleString('pt-BR')}
                  {' · '}Inclui todos os insights, incluindo os filtrados por baixa confiança ou PII
                </p>
              </div>
              <div className="divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
                {rawGrouped.map(({ cat, label, items }) => (
                  <div key={cat} className="px-5 py-4">
                    <p className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_COLORS[cat] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      {label}
                    </p>
                    <ul className="space-y-2">
                      {items.map((ins, i) => {
                        const saved = insights.some(s => s.insight === ins.insight);
                        return (
                          <li key={i} className="flex items-start gap-3">
                            <ConfidenceBar value={ins.confidence} />
                            <p className={`flex-1 text-sm ${saved ? 'text-[#374151] dark:text-[#d1d5db]' : 'text-[#9ca3af]'}`}>
                              {ins.insight}
                              {!saved && <span className="ml-2 text-[11px] opacity-60">(filtrado)</span>}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!isRunning && insights.length === 0 && !session.full_report && (
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-10 text-center dark:border-[#1f2937] dark:bg-[#111827]">
            <p className="text-sm text-[#9ca3af]">
              {session.status === 'failed'
                ? 'A pesquisa falhou. Tente novamente na página do cliente.'
                : 'Nenhum insight foi capturado ainda.'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
