import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Tag } from "@/components/Tag";
import { InfoCard } from "@/components/InfoCard";
import { LoadingCard } from "@/components/LoadingCard";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Tooltip } from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import type { Recommendations } from "@/lib/types";

interface RecommendationsCardProps {
  recommendations: Recommendations;
  onRetry?: () => void;
}

export function RecommendationsCard({
  recommendations,
  onRetry,
}: RecommendationsCardProps) {
  const status = recommendations.status;
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  const statusForBadge = (() => {
    if (status === "completed") return "success" as const;
    if (status === "failed") return "error" as const;
    if (status === "processing") return "info" as const;
    return "pending" as const;
  })();

  const formatGeneratedAt = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-gray-900">
            Recommendations
          </h3>
          {isComplete && recommendations.generated_at && (
            <p className="text-sm text-gray-500 mt-1">
              Generated{" "}
              {formatGeneratedAt(recommendations.generated_at)}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {isComplete && onRetry && (
            <Tooltip content="Regenerate recommendations using current data">
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-emerald-700 hover:border-emerald-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </Tooltip>
          )}
          <StatusBadge status={statusForBadge}>{status}</StatusBadge>
        </div>
      </div>

      {isComplete && (
        <div className="space-y-6">
          {recommendations.suggested_crops.length > 0 && (
            <TagGroup
              label="Suggested crops"
              items={recommendations.suggested_crops}
              variant="emerald"
            />
          )}

          {recommendations.farming_techniques.length > 0 && (
            <TagGroup
              label="Farming techniques"
              items={recommendations.farming_techniques}
              variant="blue"
            />
          )}

          {recommendations.required_services.length > 0 && (
            <TagGroup
              label="Required services"
              items={recommendations.required_services}
              variant="purple"
            />
          )}

          {recommendations.report && (
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-xl border border-emerald-200">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-gray-900">
                  AI analysis report
                </p>
              </div>
              <div className="text-gray-800 leading-relaxed">
                <MarkdownRenderer content={recommendations.report} />
              </div>
            </div>
          )}
        </div>
      )}

      {isFailed && (
        <div>
          <InfoCard
            icon={AlertCircle}
            title="Analysis failed"
            description={
              recommendations.error || "Recommendations failed to generate."
            }
            variant="orange"
          />
          {onRetry && (
            <div className="mt-4">
              <Button
                onClick={onRetry}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <RefreshCw className="h-4 w-4" />
                Retry recommendations
              </Button>
            </div>
          )}
        </div>
      )}

      {(status === "pending" || status === "processing") && (
        <LoadingCard
          title={
            status === "pending"
              ? "Recommendations queued..."
              : "Generating recommendations..."
          }
          message="This usually takes 5-15 seconds."
        />
      )}
    </Card>
  );
}

interface TagGroupProps {
  label: string;
  items: string[];
  variant: "emerald" | "blue" | "purple";
}

function TagGroup({ label, items, variant }: TagGroupProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Tag key={item} variant={variant}>
            {item}
          </Tag>
        ))}
      </div>
    </div>
  );
}