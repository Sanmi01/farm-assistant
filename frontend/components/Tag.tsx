import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type TagVariant = "emerald" | "blue" | "purple" | "orange" | "gray";

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<TagVariant, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  gray: "bg-gray-100 text-gray-700",
};

export function Tag({
  children,
  variant = "gray",
  onRemove,
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        onRemove && "pr-1",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded-full p-0.5 transition-colors hover:bg-black/10"
          aria-label="Remove tag"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}