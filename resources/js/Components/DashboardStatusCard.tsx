// (c) 2026 Briefy contributors — AGPL-3.0
import { ArrowUp, ArrowDown, Minus, type LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  count: number;
  delta: number | null;
  deltaInverted?: boolean; // true para "Atrasadas": ↑ é ruim (vermelho), ↓ é bom (verde)
  icon: LucideIcon;
  iconColor: string;
  animationDelay?: number; // ms para stagger
}

export function DashboardStatusCard({
  label,
  count,
  delta,
  deltaInverted = false,
  icon: Icon,
  iconColor,
  animationDelay = 0,
}: Props) {
  const isUp   = delta !== null && delta > 0;
  const isDown = delta !== null && delta < 0;

  // Cor do delta — invertida para cards onde "mais" é ruim (Atrasadas)
  const deltaColor = delta === null || delta === 0
    ? 'text-[#9ca3af]'
    : isUp
      ? (deltaInverted ? 'text-[#ef4444]' : 'text-[#10b981]')
      : (deltaInverted ? 'text-[#10b981]' : 'text-[#ef4444]');

  const deltaText = delta === null || delta === 0
    ? '— mesmo que ontem'
    : isUp
      ? `↑ ${Math.abs(delta)} vs ontem`
      : `↓ ${Math.abs(delta)} vs ontem`;

  const DeltaIcon = delta === null || delta === 0
    ? Minus
    : isUp ? ArrowUp : ArrowDown;

  return (
    <div
      className="rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4 flex flex-col gap-2 animate-fadeInUp"
      style={{ animationDelay: `${animationDelay}ms` }}
      role="region"
      aria-label={`${label} count`}
    >
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#6b7280]">{label}</span>
        <Icon size={20} style={{ color: iconColor }} aria-hidden="true" />
      </div>

      {/* Count */}
      <span className="text-2xl font-bold text-[#111827] dark:text-[#f9fafb]">
        {count}
      </span>

      {/* Delta indicator */}
      <div className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
        <DeltaIcon size={12} aria-hidden="true" />
        <span>{deltaText}</span>
      </div>
    </div>
  );
}
