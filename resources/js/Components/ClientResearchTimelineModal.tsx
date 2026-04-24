// (c) 2026 Briefy contributors — AGPL-3.0
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';
import { useAiStream } from '@/hooks/useAiStream';

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
 * Opens an SSE stream to /clients/{clientId}/research/{sessionId}/events
 * which emits `event: status` frames every ~5s from our server's DB-polling proxy.
 * Raw MA events and auth credentials are NEVER forwarded to the browser (T-03-110).
 *
 * Uses useAiStream GET branch (POLISH-01 / D-11 / D-12) — EventSource with native reconnect.
 * The /events route is a GET SSE endpoint; EventSource is the correct primitive.
 */
export function ClientResearchTimelineModal({
  clientId,
  sessionId,
  clientName,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<StatusFrame[]>([]);

  const stream = useAiStream({
    url: `/clients/${clientId}/research/${sessionId}/events`,
    method: 'GET',
    onEvent: (type, data) => {
      if (type === 'status') {
        setEvents(prev => [...prev, data as StatusFrame]);
      }
    },
    onDone: () => {
      // Stream complete — isActive derived value handles display via latest event status
    },
    onError: () => {
      // Connection closed with error — preserve existing events, stop adding new ones
    },
  });

  useEffect(() => {
    stream.start();
    return () => stream.cancel();
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
