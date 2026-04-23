// (c) 2026 Briefy contributors — AGPL-3.0
import { AiIcon } from '@/Components/AiIcon';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    open: boolean;
    costUsd: number;
    title: string;
    body?: string;
    confirmLabel?: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Shared cost-confirmation modal for expensive AI operations (D-34).
 *
 * Usage:
 *   <CostConfirmModal
 *     open={showModal}
 *     costUsd={1.23}
 *     title="Gerar planejamento mensal"
 *     onConfirm={handleConfirm}
 *     onCancel={() => setShowModal(false)}
 *   />
 *
 * Used by:
 *   - Plan 11 (Planejamento/Index — monthly plan generation)
 *   - Plan 12 (Managed Agent client research launch)
 */
export function CostConfirmModal({
    open,
    costUsd,
    title,
    body,
    confirmLabel,
    busy,
    onConfirm,
    onCancel,
}: Props) {
    const { t } = useTranslation();

    if (!open) return null;

    const costFmt = costUsd < 0.01
        ? '<$0.01'
        : '~$' + costUsd.toFixed(costUsd < 1 ? 3 : 2);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={busy ? undefined : onCancel}
        >
            <div
                className="max-w-sm w-full rounded-[16px] bg-white p-6 shadow-lg dark:bg-[#111827] dark:text-[#f9fafb]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AiIcon size={20} />
                        <h2 className="text-base font-semibold">{title}</h2>
                    </div>
                    {!busy && (
                        <button
                            aria-label={t('common.dismiss', 'Fechar')}
                            onClick={onCancel}
                            className="text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Cost line */}
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-2">
                    {t('common.costConfirm.prefix')}{' '}
                    <strong className="text-[#111827] dark:text-[#f9fafb]">{costFmt}</strong>.{' '}
                    {t('common.costConfirm.suffix')}
                </p>

                {/* Optional body */}
                {body && (
                    <p className="text-xs text-[#9ca3af] mb-4">{body}</p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-3 py-1.5 text-sm text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60 transition-colors"
                    >
                        {busy ? t('common.loading') : (confirmLabel ?? t('common.costConfirm.continue', 'Continuar'))}
                    </button>
                </div>
            </div>
        </div>
    );
}
