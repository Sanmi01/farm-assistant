import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { WeatherCard } from "@/components/WeatherCard";
import { ChatPanel } from "@/components/ChatPanel";
import { useAnalysisStatus } from "@/hooks/useAnalysisStatus";
import { api } from "@/lib/api";
import type { Farm } from "@/lib/types";

export default function FarmDetailPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const farmId = typeof id === "string" ? id : null;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { status } = useAnalysisStatus(farmId);

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

  const handleRetryWeather = async () => {
    if (!farmId) return;
    try {
      await api.retryWeather(() => getToken(), farmId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    }
  };

  const handleRetryRecommendations = async () => {
    if (!farmId) return;
    try {
      await api.retryRecommendations(() => getToken(), farmId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    }
  };

  if (!isLoaded || !isSignedIn || !farmId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  const weather = status?.weather_analysis ?? farm?.weather_analysis;
  const recs = status?.recommendations ?? farm?.recommendations;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="flex justify-between items-center mb-8">
          <Link href="/farms" className="text-sm text-gray-600 hover:underline">
            ← Back to farms
          </Link>
          <UserButton afterSignOutUrl="/" />
        </nav>

        <div className="max-w-4xl mx-auto">
          {loading && (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500">
              Loading farm...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
              <p className="font-semibold">Couldn't load farm</p>
              <p className="text-sm mt-1">{error}</p>
              <Link href="/farms" className="mt-3 text-sm underline inline-block">
                Back to farms
              </Link>
            </div>
          )}

          {farm && (
            <>
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                  {farm.name}
                </h1>
                <p className="text-gray-500 mt-1">
                  {farm.location.geo_address ||
                    farm.location.address ||
                    `${farm.location.latitude}, ${farm.location.longitude}`}
                </p>
                <div className="flex gap-6 mt-4 text-sm text-gray-600">
                  <span>
                    <strong className="text-gray-800">
                      {farm.land_size.value}
                    </strong>{" "}
                    {farm.land_size.unit}
                  </span>
                  <span>
                    Budget:{" "}
                    <strong className="text-gray-800">
                      {farm.budget.amount.toLocaleString()}
                    </strong>{" "}
                    {farm.budget.currency}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

              <ChatPanel
                farmId={farm.id}
                disabled={
                    weather?.status !== "completed" ||
                    recs?.status !== "completed"
                }
                disabledReason="Chat becomes available once weather analysis and recommendations have finished."
                />
            </>
          )}
        </div>
      </div>
    </main>
  );
}