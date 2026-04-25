import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              className="text-xl font-bold text-gray-900 mb-2 mt-4"
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="text-lg font-bold text-gray-900 mb-2 mt-3"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="text-base font-semibold text-gray-900 mb-1 mt-2"
              {...props}
            />
          ),
          h4: (props) => (
            <h4
              className="text-sm font-semibold text-gray-900 mb-1 mt-2"
              {...props}
            />
          ),
          p: (props) => <p className="mb-2 leading-relaxed" {...props} />,
          ul: (props) => (
            <ul
              className="list-disc list-inside mb-2 space-y-1"
              {...props}
            />
          ),
          ol: (props) => (
            <ol
              className="list-decimal list-inside mb-2 space-y-1"
              {...props}
            />
          ),
          li: (props) => <li className="ml-2" {...props} />,
          strong: (props) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          em: (props) => <em className="italic" {...props} />,
          code: ({ className: codeClassName, children, ...rest }) => {
            const isInline = !codeClassName;
            return isInline ? (
              <code
                className="bg-gray-100 text-emerald-700 px-1 py-0.5 rounded text-xs font-mono"
                {...rest}
              >
                {children}
              </code>
            ) : (
              <code
                className="block bg-gray-100 text-gray-800 p-2 rounded text-xs font-mono overflow-x-auto mb-2"
                {...rest}
              >
                {children}
              </code>
            );
          },
          a: (props) => (
            <a
              className="text-emerald-600 hover:text-emerald-700 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-emerald-500 pl-3 italic text-gray-700 my-2"
              {...props}
            />
          ),
          hr: (props) => <hr className="my-3 border-gray-300" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}