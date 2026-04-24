// (c) 2026 Briefy contributors — AGPL-3.0
import chatbotIconLight from '@/assets/chatbot-icon-light.svg';
import chatbotIconDark  from '@/assets/chatbot-icon-dark.svg';

export interface AiIconProps {
  size?: 11 | 12 | 14 | 16 | 20 | 24 | 32 | 48 | 64;
  spinning?: boolean;
  className?: string;
  alt?: string;
  /** "auto" switches with theme (default). "dark" always uses the dark (white) variant — for colored/dark backgrounds. */
  variant?: 'auto' | 'dark';
}

/**
 * Briefy AI icon — renders the chatbot SVG in both light and dark variants.
 * Use variant="dark" on colored/dark backgrounds (e.g. purple buttons) to always
 * show the white variant regardless of the current theme.
 */
export function AiIcon({ size = 16, spinning = false, className = '', alt = '', variant = 'auto' }: AiIconProps) {
  const spin = spinning ? 'animate-spin motion-reduce:animate-none' : '';
  const classes = `shrink-0 ${spin} ${className}`.trim();

  if (variant === 'dark') {
    return (
      <img
        src={chatbotIconDark}
        alt={alt}
        width={size}
        height={size}
        className={classes}
        aria-hidden={alt === '' ? 'true' : undefined}
      />
    );
  }

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
