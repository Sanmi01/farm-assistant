import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { FarmCard } from "@/components/FarmCard";
import { api } from "@/lib/api";
import type { Farm } from "@/lib/types";

export default function FarmsPage() {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoaded && !isSignedIn) router.replace("/");
  }, [userLoaded, isSignedIn, router]);

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listFarms(() => getToken());
      setFarms(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load farms");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn) loadFarms();
  }, [isSignedIn, loadFarms]);

  useEffect(() => {
    const incomplete = farms.filter(
      (farm) =>
        farm.weather_analysis.status !== "completed" ||
        farm.recommendations.status !== "completed",
    );
    if (incomplete.length === 0) return;

    const refreshOne = async (farmId: string) => {
      try {
        const fresh = await api.getFarm(() => getToken(), farmId);
        setFarms((current) =>
          current.map((f) => (f.id === farmId ? fresh : f)),
        );
      } catch {
      }
    };

    const interval = setInterval(() => {
      incomplete.forEach((f) => refreshOne(f.id));
    }, 5000);

    const timeout = setTimeout(() => clearInterval(interval), 300_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [farms, getToken]);

  const handleDelete = async (farmId: string) => {
    try {
      await api.deleteFarm(() => getToken(), farmId);
      setFarms((current) => current.filter((f) => f.id !== farmId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!userLoaded || !isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

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
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Hello, {user?.firstName || "farmer"}.
            </h1>
            <p className="text-base text-gray-600">
              Your registered farms and their analysis status.
            </p>
          </div>
          <Link href="/farms/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
              <Plus className="h-4 w-4" />
              New farm
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="!p-0 animate-pulse">
                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-t-2xl" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="bg-red-50 border-red-200">
            <p className="font-semibold text-red-700">Couldn't load farms</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Button
              variant="outline"
              onClick={loadFarms}
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              Try again
            </Button>
          </Card>
        )}

        {!loading && !error && farms.length === 0 && (
          <Card>
            <EmptyState
              icon={MapPin}
              title="No farms yet"
              description="Register your first farm to start getting AI-powered weather analysis and recommendations tailored to your specific conditions."
              actionLabel="Register your first farm"
              onAction={() => router.push("/farms/new")}
              variant="emerald"
            />
          </Card>
        )}

        {!loading && !error && farms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farms.map((farm) => (
              <FarmCard
                key={farm.id}
                farm={farm}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}