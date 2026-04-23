// (c) 2026 Briefy contributors — AGPL-3.0

/**
 * Parse a date-only string (YYYY-MM-DD) as local time.
 * Avoids the UTC-midnight bug where new Date("2026-05-03") = May 2 in UTC-3.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  // If already has time component (ISO with T), parse as-is
  if (dateStr.includes('T')) return new Date(dateStr);
  // Date-only: force local noon to avoid DST/timezone edge cases
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Format a date-only string to Brazilian locale (dd/mm/yyyy or similar).
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!dateStr) return '—';
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR', options);
}

/**
 * Format an ISO datetime string (with timezone) to Brazilian locale.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR');
}
