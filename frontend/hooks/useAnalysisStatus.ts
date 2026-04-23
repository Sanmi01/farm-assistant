import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AnalysisStatusResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

export function useAnalysisStatus(farmId: string | null) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<AnalysisStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (!farmId) return;
    try {
      const s = await api.getAnalysisStatus(() => getToken(), farmId);
      if (isMountedRef.current) setStatus(s);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Status fetch failed");
      }
    }
  }, [farmId, getToken]);

  const bothDone = (s: AnalysisStatusResponse | null) =>
    !!s &&
    (s.weather_analysis.status === "completed" ||
      s.weather_analysis.status === "failed") &&
    (s.recommendations.status === "completed" ||
      s.recommendations.status === "failed");

  useEffect(() => {
    isMountedRef.current = true;
    startedAtRef.current = Date.now();

    fetchOnce();

    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      if (
        startedAtRef.current &&
        Date.now() - startedAtRef.current > MAX_POLL_DURATION_MS
      ) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      fetchOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOnce]);

  useEffect(() => {
    if (bothDone(status) && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  return { status, error, refetch: fetchOnce };
}