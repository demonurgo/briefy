// (c) 2026 Briefy contributors — AGPL-3.0
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export interface AiMarkdownProps {
  source: string;
  className?: string;
}

/**
 * Renders markdown with Briefy typography tokens (per UI-SPEC §Typography).
 * Used in Brief tab and Chat IA assistant bubbles.
 *
 * Text color is inherited from the container — this component does not
 * set color, so it works in both bubble (surface-hover bg) and panel
 * (white/surface bg) contexts.
 */
export function AiMarkdown({ source, className = '' }: AiMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-semibold mb-2 mt-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1 text-sm">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          p:  ({ children }) => <p className="text-sm leading-[1.5] mb-3 last:mb-0">{children}</p>,
          code: ({ children }) => <code className="rounded bg-[#f3f4f6] dark:bg-[#1f2937] px-1 py-0.5 text-xs font-mono">{children}</code>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
               className="text-[#7c3aed] dark:text-[#a78bfa] underline hover:opacity-80">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#e5e7eb] dark:border-[#374151] pl-3 text-sm text-[#6b7280] dark:text-[#9ca3af] my-2">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-[#e5e7eb] dark:border-[#374151] my-3" />,
          pre: ({ children }) => <pre className="overflow-x-auto rounded bg-[#f3f4f6] dark:bg-[#1f2937] p-3 text-xs my-2">{children}</pre>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
