// (c) 2026 Briefy contributors — AGPL-3.0
import chatbotIconLight from '@/assets/chatbot-icon-light.svg';
import chatbotIconDark  from '@/assets/chatbot-icon-dark.svg';

export interface AiIconProps {
  size?: 12 | 16 | 20 | 24 | 32 | 48 | 64;
  spinning?: boolean;
  className?: string;
  alt?: string;
}

/**
 * Briefy AI icon — renders the chatbot SVG in both light and dark variants
 * (one is hidden based on `dark:` class). Per D-15 this component is the
 * ONLY approved way to surface the AI identity in Phase 3 UI.
 *
 * Usage:
 *   <AiIcon size={16} />           — static
 *   <AiIcon size={12} spinning />  — rotating (loading state)
 *   <AiIcon size={20} alt={t('ai.assistantIcon')} />  — standalone (no text label)
 */
export function AiIcon({ size = 16, spinning = false, className = '', alt = '' }: AiIconProps) {
  const spin = spinning ? 'animate-spin motion-reduce:animate-none' : '';
  const classes = `shrink-0 ${spin} ${className}`.trim();
  return (
    <>
      <img
        src={chatbotIconLight}
        alt={alt}
        width={size}
        height={size}
        className={`${classes} dark:hidden`}
        aria-hidden={alt === '' ? 'true' : undefined}
      />
      <img
        src={chatbotIconDark}
        alt={alt}
        width={size}
        height={size}
        className={`${classes} hidden dark:block`}
        aria-hidden={alt === '' ? 'true' : undefined}
      />
    </>
  );
}
