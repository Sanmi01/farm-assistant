import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  Eye,
  MapPin,
  MessageSquare,
  Sprout,
} from "lucide-react";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { WeatherCard } from "@/components/WeatherCard";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { ChatPanel } from "@/components/ChatPanel";
import { useAnalysisStatus } from "@/hooks/useAnalysisStatus";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AnalysisStatusResponse,
  Farm,
  WeatherAnalysis,
  Recommendations,
} from "@/lib/types";

type TabKey = "overview" | "chat";

export default function FarmDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const farmId = typeof id === "string" ? id : null;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [weatherOverride, setWeatherOverride] =
    useState<WeatherAnalysis | null>(null);
  const [recsOverride, setRecsOverride] =
    useState<Recommendations | null>(null);

  const { status, refetch } = useAnalysisStatus(farmId);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  const loadFarm = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    setError(null);
    try {
      const f = await api.getFarm(() => getToken(), farmId);
      setFarm(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load farm");
    } finally {
      setLoading(false);
    }
  }, [farmId, getToken]);

  useEffect(() => {
    if (isSignedIn && farmId) loadFarm();
  }, [isSignedIn, farmId, loadFarm]);
  useEffect(() => {
    if (!status) return;
    if (
      weatherOverride &&
      status.weather_analysis.status !== "completed"
    ) {
      setWeatherOverride(null);
    }
  }, [status, weatherOverride]);

  useEffect(() => {
    if (!status) return;
    if (
      recsOverride &&
      status.recommendations.status !== "completed"
    ) {
      setRecsOverride(null);
    }
  }, [status, recsOverride]);

  const handleRetryWeather = async () => {
    if (!farmId) return;
    setWeatherOverride({
      status: "processing",
      average_temperature: null,
      total_precipitation: null,
      average_humidity: null,
      average_wind_speed: null,
      seasonal_pattern: null,
      analyzed_at: null,
      error: null,
    });
    try {
      await api.retryWeather(() => getToken(), farmId);
      void refetch();
    } catch (err) {
      setWeatherOverride(null);
      alert(err instanceof Error ? err.message : "Retry failed");
    }
  };

  const handleRetryRecommendations = async () => {
    if (!farmId) return;
    setRecsOverride({
      status: "processing",
      suggested_crops: [],
      farming_techniques: [],
      required_services: [],
      report: null,
      generated_at: null,
      error: null,
    });
    try {
      await api.retryRecommendations(() => getToken(), farmId);
      void refetch();
    } catch (err) {
      setRecsOverride(null);
      alert(err instanceof Error ? err.message : "Retry failed");
    }
  };

  if (!isLoaded || !isSignedIn || !farmId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  const weather =
    weatherOverride ??
    status?.weather_analysis ??
    farm?.weather_analysis;
  const recs =
    recsOverride ??
    status?.recommendations ??
    farm?.recommendations;

  const isWeatherComplete = weather?.status === "completed";
  const isRecsComplete = recs?.status === "completed";
  const isBothComplete = isWeatherComplete && isRecsComplete;

  const displayLocation = farm?.location.geo_address
    ? farm.location.geo_address
    : farm?.location.address
      ? farm.location.address
      : farm
        ? `${farm.location.latitude.toFixed(4)}, ${farm.location.longitude.toFixed(4)}`
        : "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <Sprout className="h-7 w-7 text-emerald-600" />
              <span className="text-xl font-semibold text-gray-900">
                Farm Assistant
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/farms"
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-emerald-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to farms</span>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <Card className="text-gray-500">Loading farm...</Card>
        )}

        {error && (
          <Card className="bg-red-50 border-red-200">
            <p className="font-semibold text-red-700">
              Couldn&apos;t load farm
            </p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Link
              href="/farms"
              className="mt-3 inline-block text-sm underline text-red-700"
            >
              Back to farms
            </Link>
          </Card>
        )}

        {farm && (
          <>
            <Card className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {farm.name}
                </h1>
                {isBothComplete ? (
                  <StatusBadge status="success">
                    ✓ Analysis complete
                  </StatusBadge>
                ) : (
                  <StatusBadge status="info">⏳ Processing</StatusBadge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetaRow
                  icon={MapPin}
                  iconColor="text-emerald-600"
                  label="Location"
                  value={displayLocation}
                  secondary={
                    farm.location.geo_address && farm.location.address
                      ? `Your note: ${farm.location.address}`
                      : undefined
                  }
                />
                <MetaRow
                  icon={DollarSign}
                  iconColor="text-blue-600"
                  label="Budget"
                  value={`${farm.budget.amount.toLocaleString()} ${farm.budget.currency}`}
                />
                <MetaRow
                  icon={Eye}
                  iconColor="text-purple-600"
                  label="Land size"
                  value={`${farm.land_size.value} ${farm.land_size.unit}`}
                />
              </div>
            </Card>

            <Card className="mb-6 !p-0 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <TabButton
                  isActive={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                  icon={BarChart3}
                  label="Farm overview"
                />
                <TabButton
                  isActive={activeTab === "chat"}
                  onClick={() => setActiveTab("chat")}
                  icon={MessageSquare}
                  label="AI assistant"
                  disabled={!isBothComplete}
                />
              </div>
            </Card>

            {activeTab === "overview" ? (
              <div className="space-y-6">
                {weather && (
                  <WeatherCard
                    analysis={weather}
                    onRetry={handleRetryWeather}
                  />
                )}
                {recs && (
                  <RecommendationsCard
                    recommendations={recs}
                    onRetry={handleRetryRecommendations}
                  />
                )}
              </div>
            ) : (
              <ChatPanel
                farmId={farm.id}
                disabled={!isBothComplete}
                disabledReason="Chat becomes available once weather analysis and recommendations have finished."
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

interface MetaRowProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: string;
  secondary?: string;
}

function MetaRow({
  icon: Icon,
  iconColor,
  label,
  value,
  secondary,
}: MetaRowProps) {
  return (
    <div className="flex items-start text-gray-600">
      <Icon className={`h-5 w-5 mr-3 mt-1 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm break-words">{value}</p>
        {secondary && (
          <p className="text-xs text-gray-500 mt-1">{secondary}</p>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}

function TabButton({
  isActive,
  onClick,
  icon: Icon,
  label,
  disabled = false,
}: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center space-x-2 px-6 py-4 text-base font-medium transition-all duration-200 border-b-2",
        isActive
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-gray-500 hover:text-gray-700",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

export type { Farm } from "@/lib/types";