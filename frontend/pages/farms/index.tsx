import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Farm, AnalysisStatus } from "@/lib/types";

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

  const handleDelete = async (farmId: string) => {
    if (!confirm("Delete this farm and its chat history?")) return;
    try {
      await api.deleteFarm(() => getToken(), farmId);
      setFarms((current) => current.filter((f) => f.id !== farmId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!userLoaded || !isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="flex justify-between items-center mb-12">
          <Link href="/" className="text-2xl font-bold text-gray-800">
            Farm Assistant
          </Link>
          <UserButton afterSignOutUrl="/" />
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">
                Hello, {user.firstName || "farmer"}.
              </h2>
              <p className="text-gray-600 mt-1">Your registered farms.</p>
            </div>
            <Link
              href="/farms/new"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              + New Farm
            </Link>
          </div>

          {loading && (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500">
              Loading farms...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
              <p className="font-semibold">Couldn't load farms</p>
              <p className="text-sm mt-1">{error}</p>
              <button onClick={loadFarms} className="mt-3 text-sm underline">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && farms.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <p className="text-gray-600 mb-4">
                No farms yet. Register your first one.
              </p>
              <Link
                href="/farms/new"
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg"
              >
                + New Farm
              </Link>
            </div>
          )}

          {!loading && !error && farms.length > 0 && (
            <ul className="space-y-4">
              {farms.map((farm) => (
                <FarmRow
                  key={farm.id}
                  farm={farm}
                  onDelete={() => handleDelete(farm.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function FarmRow({ farm, onDelete }: { farm: Farm; onDelete: () => void }) {
  return (
    <li className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-start">
        <Link href={`/farms/${farm.id}`} className="flex-1 cursor-pointer hover:opacity-80">
          <p className="font-semibold text-lg text-gray-800">{farm.name}</p>
          <p className="text-sm text-gray-500 mt-1">
            {farm.land_size.value} {farm.land_size.unit} ·{" "}
            {farm.budget.amount.toLocaleString()} {farm.budget.currency}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {farm.location.latitude}, {farm.location.longitude}
          </p>
          <div className="flex gap-3 mt-3">
            <StatusBadge label="Weather" status={farm.weather_analysis.status} />
            <StatusBadge
              label="Recommendations"
              status={farm.recommendations.status}
            />
          </div>
        </Link>
        <button
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-800 ml-4"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: AnalysisStatus;
}) {
  const palette: Record<AnalysisStatus, string> = {
    pending: "bg-gray-100 text-gray-600",
    processing: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full ${palette[status]}`}
    >
      {label}: {status}
    </span>
  );
}