import type { Recommendations } from "@/lib/types";

interface Props {
  recommendations: Recommendations;
  onRetry?: () => void;
}

export function RecommendationsCard({ recommendations, onRetry }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">Recommendations</h3>
        <StatusPill status={recommendations.status} />
      </div>

      {recommendations.status === "pending" ||
      recommendations.status === "processing" ? (
        <Skeleton />
      ) : recommendations.status === "failed" ? (
        <div>
          <p className="text-sm text-red-600 mb-3">
            {recommendations.error || "Recommendation generation failed."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <TagList
            label="Suggested crops"
            items={recommendations.suggested_crops}
            tone="emerald"
          />
          <TagList
            label="Farming techniques"
            items={recommendations.farming_techniques}
            tone="teal"
          />
          <TagList
            label="Required services"
            items={recommendations.required_services}
            tone="amber"
          />
          {recommendations.report && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Report</p>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {recommendations.report}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TagList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "emerald" | "teal" | "amber";
}) {
  const palettes = {
    emerald: "bg-emerald-100 text-emerald-800",
    teal: "bg-teal-100 text-teal-800",
    amber: "bg-amber-100 text-amber-800",
  };
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`text-xs px-3 py-1 rounded-full ${palettes[tone]}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded-full w-16" />
        <div className="h-6 bg-gray-200 rounded-full w-20" />
        <div className="h-6 bg-gray-200 rounded-full w-14" />
      </div>
      <div className="h-20 bg-gray-200 rounded" />
    </div>
  );
}

function StatusPill({ status }: { status: Recommendations["status"] }) {
  const palette: Record<Recommendations["status"], string> = {
    pending: "bg-gray-100 text-gray-600",
    processing: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${palette[status]}`}>
      {status}
    </span>
  );
}