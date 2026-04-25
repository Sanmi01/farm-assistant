import * as React from "react";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "pending";

interface StatusBadgeProps {
  status: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-orange-100 text-orange-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
  className={cn(
    "inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium",
    statusStyles[status],
    className,
  )}
>
  {typeof children === "string"
    ? children.charAt(0).toUpperCase() + children.slice(1)
    : children}
</span>
  );
}