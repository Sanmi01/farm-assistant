import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoVariant = "blue" | "emerald" | "purple" | "orange";

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  variant?: InfoVariant;
  className?: string;
}

const variantStyles: Record<
  InfoVariant,
  { bg: string; border: string; icon: string; title: string; desc: string }
> = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
    desc: "text-blue-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    title: "text-emerald-900",
    desc: "text-emerald-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: "text-purple-600",
    title: "text-purple-900",
    desc: "text-purple-700",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: "text-orange-600",
    title: "text-orange-900",
    desc: "text-orange-700",
  },
};

export function InfoCard({
  icon: Icon,
  title,
  description,
  variant = "blue",
  className,
}: InfoCardProps) {
  const c = variantStyles[variant];
  return (
    <div
      className={cn(
        "rounded-2xl border p-6",
        c.bg,
        c.border,
        className,
      )}
    >
      <div className="flex items-start space-x-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", c.icon)} />
        <div>
          <p className={cn("text-sm font-medium", c.title)}>{title}</p>
          <p className={cn("text-sm mt-1", c.desc)}>{description}</p>
        </div>
      </div>
    </div>
  );
}