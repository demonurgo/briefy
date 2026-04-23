// (c) 2026 Briefy contributors — AGPL-3.0
import chatbotIconLight from '@/assets/chatbot-icon-light.svg';
import chatbotIconDark from '@/assets/chatbot-icon-dark.svg';

interface Props {
    size?: 12 | 16 | 20 | 24 | 32 | 48 | 64;
    spinning?: boolean;
    className?: string;
    alt?: string;
}

export function AiIcon({ size = 16, spinning = false, className = '', alt = '' }: Props) {
    const spin = spinning ? 'animate-spin' : '';
    return (
        <>
            <img
                src={chatbotIconLight}
                alt={alt}
                width={size}
                height={size}
                className={`shrink-0 dark:hidden ${spin} ${className}`.trim()}
            />
            <img
                src={chatbotIconDark}
                alt={alt}
                width={size}
                height={size}
                className={`shrink-0 hidden dark:block ${spin} ${className}`.trim()}
            />
        </>
    );
}
