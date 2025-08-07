import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // CSS cho syntax highlighting

// Component để render markdown
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
          // Custom components cho styling
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4 flex items-center">
              <span className="w-4 h-4 bg-indigo-700 rounded-full mr-3"></span>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3 flex items-center">
              <span className="w-3 h-3 bg-indigo-600 rounded-full mr-2"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold text-gray-800 mt-6 mb-3 flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
              {children}
            </h3>
          ),
          code: (props) => {
            // Use the correct type for props to access 'inline'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { inline, className, children, ...rest } = props as any;
            if (inline) {
              return (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm text-red-600 font-mono" {...rest}>
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
            <div className="my-3">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto font-mono text-sm border-l-4 border-indigo-500">
                {children}
              </pre>
            </div>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 pl-4 py-2 italic text-gray-700 my-3 rounded-r-lg">
              💡 {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 bg-yellow-100 px-1 rounded">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-indigo-600">{children}</em>
          ),
          a: ({ href, children }) => (
            <a 
              href={href}
              className="text-indigo-600 hover:text-indigo-800 underline decoration-2 underline-offset-2 hover:bg-indigo-50 px-1 rounded transition-all"
              target="_blank" 
              rel="noopener noreferrer"
            >
              🔗 {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start">
              <span className="text-indigo-500 mr-2 mt-1">•</span>
              <span>{children}</span>
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-4 py-2">
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-indigo-500 animate-pulse ml-1">|</span>
      )}
    </div>
  );
};

// Thay thế phần render trong component chính:
// Từ:
// <div
//   className="prose prose-sm max-w-none"
//   dangerouslySetInnerHTML={{
//     __html: parseMarkdown(message.content) + (message.isStreaming ? '<span class="inline-block w-2 h-5 bg-indigo-500 animate-pulse ml-1">|</span>' : '')
//   }}
// />

// Thành:
// <MarkdownContent 
//   content={message.content} 
//   isStreaming={message.isStreaming} 
// />