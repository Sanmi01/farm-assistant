import { cn } from "@/lib/utils";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showStepNumbers?: boolean;
  labels?: string[];
  className?: string;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  showStepNumbers = true,
  labels,
  className,
}: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("w-full", className)}>
      {showStepNumbers && (
        <div className="flex items-center justify-between mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const step = i + 1;
            const isDone = step < currentStep;
            const isActive = step === currentStep;
            return (
              <div
                key={step}
                className="flex flex-col items-center flex-1 first:items-start last:items-end"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                    isDone && "bg-emerald-600 text-white",
                    isActive &&
                      "bg-emerald-100 text-emerald-700 border-2 border-emerald-600",
                    !isDone &&
                      !isActive &&
                      "bg-gray-200 text-gray-500",
                  )}
                >
                  {isDone ? "✓" : step}
                </div>
                {labels?.[i] && (
                  <span
                    className={cn(
                      "text-xs mt-2 text-center",
                      isActive
                        ? "text-emerald-700 font-medium"
                        : "text-gray-500",
                    )}
                  >
                    {labels[i]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}