import type {
  AnalysisStatusResponse,
  ChatHistoryResponse,
  CreateFarmRequest,
  Farm,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type TokenGetter = () => Promise<string | null>;

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  getToken: TokenGetter,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError(401, "NO_TOKEN", "Not signed in");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const code = payload?.error?.code || "UNKNOWN";
    const message = payload?.error?.message || response.statusText;
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
}

export const api = {
  listFarms: (getToken: TokenGetter) =>
    request<Farm[]>(getToken, "GET", "/farms"),

  getFarm: (getToken: TokenGetter, farmId: string) =>
    request<Farm>(getToken, "GET", `/farms/${farmId}`),

  createFarm: (getToken: TokenGetter, body: CreateFarmRequest) =>
    request<Farm>(getToken, "POST", "/farms", body),

  deleteFarm: (getToken: TokenGetter, farmId: string) =>
    request<void>(getToken, "DELETE", `/farms/${farmId}`),

  getAnalysisStatus: (getToken: TokenGetter, farmId: string) =>
    request<AnalysisStatusResponse>(
      getToken,
      "GET",
      `/farms/${farmId}/analysis-status`,
    ),

  retryWeather: (getToken: TokenGetter, farmId: string) =>
    request<Farm>(getToken, "POST", `/farms/${farmId}/retry-weather`),

  retryRecommendations: (getToken: TokenGetter, farmId: string) =>
    request<Farm>(getToken, "POST", `/farms/${farmId}/retry-recommendations`),

  getChatHistory: (getToken: TokenGetter, farmId: string) =>
    request<ChatHistoryResponse>(
      getToken,
      "GET",
      `/farms/${farmId}/chat`,
    ),
};


const API_BASE = API_BASE_URL;

export interface StreamChatOptions {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
}

export async function streamChat(
  getToken: TokenGetter,
  farmId: string,
  message: string,
  opts: StreamChatOptions,
): Promise<void> {
  const token = await getToken();
  if (!token) {
    opts.onError("Not signed in");
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/farms/${farmId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    opts.onError(err instanceof Error ? err.message : "Network error");
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    opts.onError(payload?.error?.message || response.statusText);
    return;
  }

  if (!response.body) {
    opts.onError("No response body to read");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by blank lines.
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const dataLine = frame
          .split("\n")
          .find((l) => l.startsWith("data: "));
        if (!dataLine) continue;

        const raw = dataLine.slice(6);

        if (raw === "[DONE]") {
          opts.onDone();
          return;
        }
        if (raw.startsWith("[ERROR] ")) {
          opts.onError(raw.slice(8));
          return;
        }

        // Unescape newlines that the backend escaped inside tokens.
        const token = raw.replace(/\\n/g, "\n");
        opts.onToken(token);
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    opts.onError(err instanceof Error ? err.message : "Stream read failed");
  } finally {
    opts.onDone();
  }
}

export { ApiError };