import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownContent = ({ content, isStreaming }: MarkdownContentProps) => {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-slate-800 mt-6 mb-4 flex items-center border-b border-slate-200 pb-2">
              <span className="w-1 h-6 bg-slate-700 rounded-full mr-3"></span>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-slate-700 mt-6 mb-3 flex items-center">
              <span className="w-1 h-5 bg-slate-600 rounded-full mr-3"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-slate-700 mt-5 mb-3 flex items-center">
              <span className="w-1 h-4 bg-slate-500 rounded-full mr-3"></span>
              {children}
            </h3>
          ),
          code: (props) => {
            const { inline, className, children, ...rest } = props as any;
            if (inline) {
              return (
                <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-sm font-mono border border-slate-200" {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <div className="my-4">
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto font-mono text-sm border border-slate-700 shadow-sm">
                {children}
              </pre>
            </div>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-300 bg-slate-50 pl-4 py-3 my-4 rounded-r-lg text-slate-700 italic">
              <span className="text-slate-500 text-lg mr-2">💭</span>
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-600 font-medium">{children}</em>
          ),
          a: ({ href, children }) => (
            <a 
              href={href}
              className="text-slate-700 hover:text-slate-900 underline decoration-2 underline-offset-2 decoration-slate-300 hover:decoration-slate-600 transition-all duration-200"
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 my-4">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start">
              <span className="text-slate-400 mr-3 mt-1.5 text-xs">●</span>
              <span className="text-slate-700">{children}</span>
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-200 px-4 py-3 bg-slate-50 font-semibold text-left text-slate-800 text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-100 px-4 py-3 text-slate-700 text-sm">
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-5 bg-slate-600 animate-pulse ml-1 rounded-full"></span>
      )}
    </div>
  );
};
