import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-xs">
        <div className="px-4 py-3 rounded-2xl bg-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">
              AI is typing
            </span>
            <div className="flex items-center space-x-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms", animationDuration: "1s" }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms", animationDuration: "1s" }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms", animationDuration: "1s" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}