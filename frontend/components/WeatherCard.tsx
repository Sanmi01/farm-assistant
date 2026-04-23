import type { WeatherAnalysis } from "@/lib/types";

interface Props {
  analysis: WeatherAnalysis;
  onRetry?: () => void;
}

export function WeatherCard({ analysis, onRetry }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">Weather Analysis</h3>
        <StatusPill status={analysis.status} />
      </div>

      {analysis.status === "pending" || analysis.status === "processing" ? (
        <Skeleton />
      ) : analysis.status === "failed" ? (
        <div>
          <p className="text-sm text-red-600 mb-3">
            {analysis.error || "Weather analysis failed."}
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
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Avg. temperature"
            value={
              analysis.average_temperature !== null
                ? `${analysis.average_temperature}°C`
                : "—"
            }
          />
          <Metric
            label="Total precipitation"
            value={
              analysis.total_precipitation !== null
                ? `${analysis.total_precipitation} mm`
                : "—"
            }
          />
          <Metric
            label="Avg. humidity"
            value={
              analysis.average_humidity !== null
                ? `${analysis.average_humidity}%`
                : "—"
            }
          />
          <Metric
            label="Avg. max wind"
            value={
              analysis.average_wind_speed !== null
                ? `${analysis.average_wind_speed} km/h`
                : "—"
            }
          />
          <div className="col-span-2 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Seasonal pattern</p>
            <p className="text-sm text-gray-800">
              {analysis.seasonal_pattern || "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

function StatusPill({ status }: { status: WeatherAnalysis["status"] }) {
  const palette: Record<WeatherAnalysis["status"], string> = {
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