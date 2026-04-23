interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
}

export function ProgressBar({ current, total, labels }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        {Array.from({ length: total }).map((_, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <div key={step} className="flex-1 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                    ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : step}
              </div>
              {labels?.[i] && (
                <span className="text-xs mt-1 text-gray-500 text-center">
                  {labels[i]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="relative h-1 bg-gray-200 rounded">
        <div
          className="absolute top-0 left-0 h-1 bg-emerald-600 rounded transition-all"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}