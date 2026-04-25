import * as React from "react";
import {
  Thermometer,
  Droplets,
  Cloud,
  Wind,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { InfoCard } from "@/components/InfoCard";
import { LoadingCard } from "@/components/LoadingCard";
import { Tooltip } from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import type { WeatherAnalysis } from "@/lib/types";

interface WeatherCardProps {
  analysis: WeatherAnalysis;
  onRetry?: () => void;
}

export function WeatherCard({ analysis, onRetry }: WeatherCardProps) {
  const status = analysis.status;
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  const statusForBadge = (() => {
    if (status === "completed") return "success" as const;
    if (status === "failed") return "error" as const;
    if (status === "processing") return "info" as const;
    return "pending" as const;
  })();

  const formatAnalyzedAt = (timestamp: string | null) => {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-gray-900">
            Weather analysis
          </h3>
          {isComplete && analysis.analyzed_at && (
            <p className="text-sm text-gray-500 mt-1">
              16-day forecast from{" "}
              {formatAnalyzedAt(analysis.analyzed_at)}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {isComplete && onRetry && (
            <Tooltip content="Refresh weather analysis with the latest forecast">
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

      {/* Body */}
      {isComplete && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Metric
              icon={Thermometer}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              value={
                analysis.average_temperature !== null
                  ? `${analysis.average_temperature}°C`
                  : "—"
              }
              label="Avg temperature"
            />
            <Metric
              icon={Droplets}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              value={
                analysis.total_precipitation !== null
                  ? `${analysis.total_precipitation} mm`
                  : "—"
              }
              label="Total rainfall"
            />
            <Metric
              icon={Cloud}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              value={
                analysis.average_humidity !== null
                  ? `${analysis.average_humidity}%`
                  : "—"
              }
              label="Avg humidity"
            />
            <Metric
              icon={Wind}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              value={
                analysis.average_wind_speed !== null
                  ? `${analysis.average_wind_speed} km/h`
                  : "—"
              }
              label="Avg max wind"
            />
          </div>

          {analysis.seasonal_pattern && (
            <InfoCard
              icon={Cloud}
              title="Seasonal pattern"
              description={analysis.seasonal_pattern}
              variant="blue"
            />
          )}
        </>
      )}

      {isFailed && (
        <div>
          <InfoCard
            icon={AlertCircle}
            title="Analysis failed"
            description={analysis.error || "Weather analysis failed."}
            variant="orange"
          />
          {onRetry && (
            <div className="mt-4">
              <Button
                onClick={onRetry}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <RefreshCw className="h-4 w-4" />
                Retry weather analysis
              </Button>
            </div>
          )}
        </div>
      )}

      {(status === "pending" || status === "processing") && (
        <LoadingCard
          title={
            status === "pending"
              ? "Weather analysis queued..."
              : "Analyzing weather patterns..."
          }
          message="This usually takes 5-10 seconds."
        />
      )}
    </Card>
  );
}

interface MetricProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}

function Metric({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
}: MetricProps) {
  return (
    <div className="text-center">
      <div
        className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2`}
      >
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}