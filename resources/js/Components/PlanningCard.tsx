// (c) 2026 Briefy contributors — AGPL-3.0
import { Check } from 'lucide-react';

export interface Suggestion {
  id: number;
  date: string;
  title: string;
  description: string;
  channel?: string;
  status: 'pending' | 'accepted' | 'rejected';
  converted_demand_id?: number | null;
}

interface PlanningCardProps {
  suggestion: Suggestion;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onOpen: (s: Suggestion) => void;
}

const CHANNEL_COLORS: Record<string, string> = {
  instagram:  'bg-[#e9d5ff] text-[#7c3aed]',
  linkedin:   'bg-[#dbeafe] text-[#1d4ed8]',
  tiktok:     'bg-[#fce7f3] text-[#be185d]',
  facebook:   'bg-[#dbeafe] text-[#1e40af]',
  youtube:    'bg-[#fee2e2] text-[#dc2626]',
  email:      'bg-[#d1fae5] text-[#065f46]',
  blog:       'bg-[#fef3c7] text-[#92400e]',
};

export function PlanningCard({ suggestion, selected, onToggleSelect, onOpen }: PlanningCardProps) {
  const { id, date, title, description, channel, status } = suggestion;

  // Handle both "YYYY-MM-DD" and full ISO strings safely
  const rawDate = date.includes('T') ? date : date + 'T12:00:00';
  const dateObj = new Date(rawDate);
  const dateLabel = isNaN(dateObj.getTime())
    ? date
    : dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  const channelColor = channel ? (CHANNEL_COLORS[channel] ?? 'bg-[#f3f4f6] text-[#6b7280]') : '';

  const cardClass = [
    'group relative flex flex-col rounded-[14px] border bg-white dark:bg-[#111827] transition-all cursor-pointer min-h-[200px]',
    status === 'accepted'
      ? 'border-[#10b981]/50 shadow-sm shadow-[#10b981]/10'
      : status === 'rejected'
        ? 'border-[#e5e7eb] dark:border-[#1f2937] opacity-50 pointer-events-none'
        : selected
          ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20 shadow-md'
          : 'border-[#e5e7eb] dark:border-[#1f2937] hover:border-[#7c3aed]/50 hover:shadow-md',
  ].join(' ');

  return (
    <div className={cardClass} onClick={() => status !== 'rejected' && onOpen(suggestion)}>
      {/* Top stripe: date + checkbox */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-medium text-[#9ca3af] capitalize">{dateLabel}</span>
        <div className="flex items-center gap-2">
          {status === 'accepted' && <Check size={14} className="text-[#10b981]" />}
          {status === 'pending' && (
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#7c3aed] cursor-pointer"
              checked={selected}
              onClick={e => e.stopPropagation()}
              onChange={() => onToggleSelect(id)}
              aria-label={title}
            />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 px-4 pb-4 flex-1">
        {/* Channel badge */}
        {channel && (
          <span className={`self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${channelColor}`}>
            {channel}
          </span>
        )}

        {/* Title */}
        <p className={`text-sm font-semibold leading-snug text-[#111827] dark:text-[#f9fafb] line-clamp-2 ${status === 'rejected' ? 'line-through' : ''}`}>
          {title}
        </p>

        {/* Description preview */}
        <p className="text-xs leading-relaxed text-[#6b7280] dark:text-[#9ca3af] line-clamp-5">
          {description}
        </p>

        {/* Footer hint */}
        {status === 'pending' && (
          <p className="mt-auto pt-2 text-[11px] text-[#c4b5fd] opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para ver detalhes →
          </p>
        )}
        {status === 'accepted' && (
          <p className="mt-auto pt-2 text-[11px] text-[#10b981]">Convertida em demanda</p>
        )}
      </div>
    </div>
  );
}
