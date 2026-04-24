// (c) 2026 Briefy contributors — AGPL-3.0

/**
 * useAiStream — unified SSE hook covering both stream patterns:
 *
 *   POST branch (default): fetch+ReadableStream for Anthropic-style delta-frame streams (brief, chat).
 *     Uses: onDelta, onDone, onError
 *
 *   GET branch: EventSource for custom-event streams (e.g., ClientResearchTimelineModal).
 *     Uses: onEvent, onDone, onError
 *     EventSource provides native reconnect on transient connection drops; fetch does not.
 *
 * POLISH-01 (D-11 / D-14): GET branch added in v1.2. No direct EventSource usage remains in components.
 */
import { useCallback, useRef, useState } from 'react';

export interface UseAiStreamOptions {
  url: string;
  method?: 'POST' | 'GET';
  body?: Record<string, unknown> | FormData;
  onDelta?: (chunk: string) => void;   // called for each delta chunk (POST mode)
  onDone?: (payload: unknown) => void;
  onError?: (message: string) => void;
  headers?: Record<string, string>;
  onEvent?: (type: string, data: unknown) => void;  // called for each custom event in GET mode
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

    // GET branch: EventSource for native reconnect (D-14 / POLISH-01)
    // MUST use EventSource, not fetch — EventSource provides native reconnect; fetch does not.
    if ((opts.method ?? 'POST') === 'GET') {
      const es = new EventSource(opts.url, { withCredentials: true });
      // Store close fn so cancel() works identically to POST branch
      abortRef.current = { abort: () => es.close() } as unknown as AbortController;

      return new Promise<void>((resolve) => {
        // Factory for custom event listeners
        const listenFor = (type: string) => {
          es.addEventListener(type, (e: MessageEvent) => {
            if (type === 'done') {
              try {
                opts.onDone?.(e.data ? JSON.parse(e.data) : {});
              } catch {
                opts.onDone?.({});
              }
              setState('done');
              es.close();
              abortRef.current = null;
              resolve();
            } else if (type === 'error') {
              const msg = 'SSE stream error';
              setError(msg);
              opts.onError?.(msg);
              setState('error');
              es.close();
              abortRef.current = null;
              resolve();
            } else {
              try {
                opts.onEvent?.(type, JSON.parse(e.data));
              } catch {
                opts.onEvent?.(type, e.data);
              }
            }
          });
        };

        // Register listeners for known custom event types
        // ClientResearchTimelineModal uses: 'status', 'done'
        // Add more here if other GET SSE endpoints are added in future phases
        listenFor('status');
        listenFor('done');
        listenFor('error');

        es.onerror = () => {
          // EventSource reconnects automatically on transient errors.
          // Only treat as fatal if the connection is CLOSED (readyState === 2)
          // and we didn't close it ourselves (abortRef still points to es.close).
          if (es.readyState === EventSource.CLOSED && abortRef.current !== null) {
            const msg = 'SSE connection closed unexpectedly';
            setError(msg);
            opts.onError?.(msg);
            setState('error');
            abortRef.current = null;
            resolve();
          }
        };

        setState('streaming');
      });
    }
    // else: fall through to existing fetch+ReadableStream POST path (unchanged below)

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
