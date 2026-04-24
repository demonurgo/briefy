// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { CheckCircle, Circle, X } from 'lucide-react';

interface Props {
  hasClients: boolean;
  hasDemands: boolean;
  onboardingDismissed?: boolean;
}

export function OnboardingChecklist({ hasClients, hasDemands, onboardingDismissed }: Props) {
  const [dismissed, setDismissed] = useState(false);

  // Não renderizar se: dispensado (estado local ou preference persistida) OU ambos os passos completos
  if (dismissed || onboardingDismissed || (hasClients && hasDemands)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true); // Otimistic — esconde imediatamente
    router.patch(
      route('settings.preferences'),
      { onboarding_dismissed: true },
      { preserveState: true, preserveScroll: true }
    );
  };

  const steps = [
    {
      id: 'add-client',
      label: 'Adicionar um cliente',
      href: '/clients/create',
      complete: hasClients,
    },
    {
      id: 'create-demand',
      label: 'Criar a primeira demanda',
      href: '/demands?create=1',
      complete: hasDemands,
    },
  ];

  return (
    <div className="rounded-xl border border-[#a78bfa]/30 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={20} className="text-[#7c3aed] dark:text-[#a78bfa]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#7c3aed] dark:text-[#a78bfa]">
            Primeiros passos
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded text-[#9ca3af] hover:text-[#374151] dark:hover:text-[#d1d5db] transition-colors"
          aria-label="Dispensar guia de início"
          type="button"
        >
          <X size={14} />
        </button>
      </div>

      {/* Steps */}
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-center gap-3 rounded-lg border border-[#a78bfa]/20 bg-white dark:bg-[#1e1b2e] px-4 py-3 shadow-sm"
        >
          {step.complete ? (
            <CheckCircle size={16} className="text-[#10b981] shrink-0" aria-hidden="true" />
          ) : (
            <Circle size={16} className="text-[#9ca3af] shrink-0" aria-hidden="true" />
          )}

          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-[#111827] dark:text-[#f3f4f6]">
              {step.label}
            </span>
            {!step.complete && (
              <div className="mt-0.5">
                <Link
                  href={step.href}
                  className="text-xs font-medium text-[#7c3aed] hover:underline"
                  aria-label={`${step.label} — abrir`}
                >
                  Começar →
                </Link>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
