// (c) 2026 Briefy contributors — AGPL-3.0
// ARCH NOTE (Plan 12 / v1.1): uses native EventSource instead of useAiStream because:
//   1. This is a GET SSE stream (no POST body).
//   2. It emits custom events (`event: status` / `event: done`), not delta frames.
//   3. EventSource handles reconnect for free.
// useAiStream (shared hook from Plan 08) covers POST streams only.
// Backlog for v1.2: extend useAiStream to expose a custom-event listener and consolidate.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';

interface Props {
  clientId: number;
  sessionId: number;
  clientName: string;
  onClose: () => void;
}

interface StatusFrame {
  status: string;
  progress_summary: string | null;
}

/**
 * Modal that shows live research session progress.
 *
 * Opens an EventSource to /clients/{clientId}/research/{sessionId}/events
 * which emits `event: status` frames every ~5s from our server's DB-polling proxy.
 * Raw MA events and auth credentials are NEVER forwarded to the browser (T-03-110).
 *
 * Uses native EventSource (not useAiStream) — see ARCH NOTE above.
 * The /events route is a GET SSE endpoint; EventSource is the correct primitive.
 * useAiStream handles POST delta-frame streams only (as of v1.1).
 */
export function ClientResearchTimelineModal({
  clientId,
  sessionId,
  clientName,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<StatusFrame[]>([]);

  useEffect(() => {
    const es = new EventSource(
      `/clients/${clientId}/research/${sessionId}/events`,
      { withCredentials: true }
    );

    const onStatus = (e: MessageEvent) => {
      try {
        const data: StatusFrame = JSON.parse(e.data);
        setEvents(prev => [...prev, data]);
      } catch {
        // Ignore malformed frames.
      }
    };

    es.addEventListener('status', onStatus);
    es.addEventListener('done', () => es.close());
    es.onerror = () => es.close();

    return () => {
      es.close();
    };
  }, [clientId, sessionId]);

  const latest = events[events.length - 1];
  const isActive = !latest || latest.status === 'running' || latest.status === 'queued';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-[16px] bg-white p-6 shadow-lg dark:bg-[#111827] dark:text-[#f9fafb]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AiIcon size={20} spinning={isActive} />
            <h2 className="text-base font-semibold">
              Pesquisa: {clientName}
            </h2>
          </div>
          <button
            aria-label={t('common.dismiss')}
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status chip */}
        <div className="mb-3">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              latest?.status === 'completed'
                ? 'bg-[#10b981]/10 text-[#10b981]'
                : latest?.status === 'failed'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-[#7c3aed]/10 text-[#7c3aed]'
            }`}
          >
            {latest?.status ?? 'connecting…'}
          </span>
        </div>

        {/* Event timeline */}
        <div className="max-h-[300px] overflow-y-auto space-y-2 text-sm">
          {events.length === 0 ? (
            <p className="text-[#9ca3af]">Aguardando eventos…</p>
          ) : (
            events.map((frame, i) => (
              <div
                key={i}
                className="rounded-[8px] border border-[#e5e7eb] px-3 py-2 dark:border-[#1f2937]"
              >
                <p className="font-mono text-xs text-[#6b7280] dark:text-[#9ca3af]">
                  {frame.status}
                </p>
                <p className="text-sm text-[#111827] dark:text-[#f9fafb]">
                  {frame.progress_summary ?? '—'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
