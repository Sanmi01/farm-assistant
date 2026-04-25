import { Card } from "@/components/Card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

interface LoadingCardProps {
  title?: string;
  message?: string;
  className?: string;
}

export function LoadingCard({
  title = "Loading...",
  message,
  className,
}: LoadingCardProps) {
  return (
    <Card className={cn("text-center", className)}>
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-base text-gray-600 mb-2">{title}</p>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </Card>
  );
}