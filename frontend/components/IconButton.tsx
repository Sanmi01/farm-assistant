import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonVariant = "default" | "ghost" | "outline" | "destructive";
type IconButtonSize = "xs" | "sm" | "md" | "lg";

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
}

const sizeClasses: Record<IconButtonSize, string> = {
  xs: "h-7 w-7 p-1",
  sm: "h-8 w-8 p-1.5",
  md: "h-10 w-10 p-2",
  lg: "h-12 w-12 p-3",
};

const iconSizeClasses: Record<IconButtonSize, string> = {
  xs: "h-4 w-4",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function IconButton({
  icon: Icon,
  onClick,
  variant = "ghost",
  size = "md",
  disabled = false,
  className,
  ariaLabel,
}: IconButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(sizeClasses[size], className)}
    >
      <Icon className={iconSizeClasses[size]} />
    </Button>
  );
}