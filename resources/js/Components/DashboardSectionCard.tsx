// (c) 2026 Briefy contributors — AGPL-3.0
import { type ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardSectionCard({ title, children, action, className = '' }: Props) {
  return (
    <div
      className={`rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
