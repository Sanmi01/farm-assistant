import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({
  className,
  hover = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6",
        hover &&
          "hover:border-emerald-200 hover:shadow-lg transition-all duration-300",
        props.onClick && "cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}