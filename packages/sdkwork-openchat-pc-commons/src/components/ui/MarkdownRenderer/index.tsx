

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}


export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({
  content,
  className = '',
}) => {
  const components = useMemo(() => ({
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';

      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="my-3 rounded-xl overflow-hidden border border-white/10 shadow-sm">
          {}
          <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-white/5">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-xs text-text-muted uppercase font-medium tracking-wider">{language}</span>
          </div>
          {}
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '16px',
              background: '#0d1117', // Keep code background dark for contrast
              fontSize: '13px',
              lineHeight: '1.6',
            }}
            showLineNumbers
            lineNumberStyle={{
              color: '#6B7280',
              paddingRight: '16px',
              minWidth: '40px',
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    },

    p({ children }: any) {
      return <p className="mb-3 leading-relaxed text-text-secondary last:mb-0">{children}</p>;
    },

    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mb-4 text-text-primary mt-6 border-b border-border pb-2">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mb-3 text-text-primary mt-5">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-semibold mb-2 text-text-primary mt-4">{children}</h3>;
    },
    h4({ children }: any) {
      return <h4 className="text-base font-semibold mb-2 text-text-primary mt-3">{children}</h4>;
    },

    ul({ children }: any) {
      return <ul className="mb-3 pl-5 space-y-1 list-disc text-text-secondary marker:text-text-muted">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="mb-3 pl-5 space-y-1 list-decimal text-text-secondary marker:text-text-muted">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="leading-relaxed">{children}</li>;
    },

    blockquote({ children }: any) {
      return (
        <blockquote className="mb-3 pl-4 border-l-4 border-primary bg-primary/5 py-2 px-3 rounded-r-lg text-text-tertiary italic">
          {children}
        </blockquote>
      );
    },

    a({ children, href }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-hover hover:underline transition-colors decoration-primary/30 underline-offset-2"
        >
          {children}
        </a>
      );
    },

    strong({ children }: any) {
      return <strong className="font-bold text-text-primary">{children}</strong>;
    },
    em({ children }: any) {
      return <em className="italic text-text-secondary">{children}</em>;
    },

      return <del className="line-through text-text-muted">{children}</del>;
    },

    table({ children }: any) {
      return (
        <div className="overflow-x-auto mb-3 rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-bg-tertiary">{children}</thead>;
    },
    tbody({ children }: any) {
      return <tbody className="divide-y divide-border">{children}</tbody>;
    },
    tr({ children }: any) {
      return <tr className="border-b border-border last:border-0 hover:bg-bg-hover/50 transition-colors">{children}</tr>;
    },
    th({ children }: any) {
      return <th className="px-4 py-2 text-left font-semibold text-text-primary">{children}</th>;
    },
    td({ children }: any) {
      return <td className="px-4 py-2 text-text-secondary">{children}</td>;
    },

      return <hr className="my-6 border-border" />;
    },

    img({ src, alt }: any) {
      return (
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-lg border border-border my-3 shadow-sm hover:shadow-md transition-shadow"
          loading="lazy"
        />
      );
    },
  }), []);

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;

