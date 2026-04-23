// (c) 2026 Briefy contributors — AGPL-3.0

/**
 * useAiStream — fetch+ReadableStream hook for Anthropic-style POST SSE streams.
 *
 * Scope:
 *   ✅ POST requests that respond with `event: delta` / `event: done` frames (brief, chat).
 *   ❌ GET SSE streams with custom event types (e.g., ClientResearchTimelineModal, which uses EventSource).
 *
 * v1.2 backlog: extend this hook with a custom-event listener + GET support so that
 *   the Managed Agents timeline modal can drop its direct EventSource usage.
 *   Until then, the two SSE consumer paths coexist by design.
 */
import { useCallback, useRef, useState } from 'react';

export interface UseAiStreamOptions {
  url: string;
  method?: 'POST' | 'GET';
  body?: Record<string, unknown> | FormData;
  onDelta?: (chunk: string) => void;   // called for each delta chunk
  onDone?: (payload: unknown) => void;
  onError?: (message: string) => void;
  headers?: Record<string, string>;
}

export type AiStreamState = 'idle' | 'streaming' | 'done' | 'error';

export interface UseAiStreamResult {
  state: AiStreamState;
  buffer: string;             // full accumulated text
  error: string | null;
  start(override?: Partial<UseAiStreamOptions>): Promise<void>;
  cancel(): void;
  reset(): void;
}

function getCsrfToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

/**
 * SSE consumer hook. Uses fetch+ReadableStream so POST bodies with CSRF work.
 * Parses frames of the form:
 *   event: delta
 *   data: {"text":"chunk"}
 *   (blank line)
 */
export function useAiStream(defaults: UseAiStreamOptions): UseAiStreamResult {
  const [state, setState] = useState<AiStreamState>('idle');
  const [buffer, setBuffer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setBuffer('');
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(async (override?: Partial<UseAiStreamOptions>) => {
    const opts = { ...defaults, ...(override ?? {}) };
    cancel();
    reset();
    setState('streaming');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': getCsrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
        ...(opts.headers ?? {}),
      };
      let body: BodyInit | undefined;
      if (opts.body && !(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.body);
      } else if (opts.body instanceof FormData) {
        body = opts.body;
      }

      const res = await fetch(opts.url, {
        method: opts.method ?? 'POST',
        headers,
        body,
        signal: controller.signal,
        credentials: 'same-origin',
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });

        // Process frames separated by blank line.
        let idx;
        while ((idx = pending.indexOf('\n\n')) !== -1) {
          const frame = pending.slice(0, idx);
          pending = pending.slice(idx + 2);
          const { event, data } = parseFrame(frame);

          if (event === 'delta' && data) {
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.text ?? '';
              acc += chunk;
              setBuffer(acc);
              opts.onDelta?.(chunk);
            } catch { /* ignore malformed frame */ }
          } else if (event === 'done') {
            try {
              const payload = data ? JSON.parse(data) : {};
              opts.onDone?.(payload);
              setState('done');
              return;
            } catch {
              opts.onDone?.({});
              setState('done');
              return;
            }
          } else if (event === 'error') {
            try {
              const payload = data ? JSON.parse(data) : {};
              const msg = (payload as { message?: string }).message ?? 'Stream error';
              setError(msg);
              opts.onError?.(msg);
              setState('error');
              return;
            } catch {
              setError('Stream error');
              setState('error');
              return;
            }
          }
        }
      }

      // Stream closed without explicit done/error.
      setState('done');
    } catch (e) {
      if ((e as Error).name === 'AbortError') { return; }
      const msg = (e as Error).message ?? 'Unknown error';
      setError(msg);
      opts.onError?.(msg);
      setState('error');
    } finally {
      abortRef.current = null;
    }
  }, [defaults, cancel, reset]);

  return { state, buffer, error, start, cancel, reset };
}

function parseFrame(frame: string): { event: string; data: string } {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  return { event, data: dataLines.join('\n') };
}
