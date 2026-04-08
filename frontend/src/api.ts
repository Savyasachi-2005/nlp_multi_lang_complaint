export type ComplaintRequest = {
  complaint_text: string;
  target_language: "hi" | "kn" | "ta" | "te" | "mr";
};

export type ComplaintResponse = {
  detected_language: string;
  complaint_type: string;
  location: string;
  final_output: string;
};

export type ApiErrorType =
  | "network"
  | "server"
  | "auth"
  | "validation"
  | "timeout"
  | "unknown";

export class ApiError extends Error {
  type: ApiErrorType;
  status?: number;

  constructor(message: string, type: ApiErrorType, status?: number) {
    super(message);
    this.name = "ApiError";
    this.type = type;
    this.status = status;
  }
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export async function processComplaint(
  data: ComplaintRequest
): Promise<ComplaintResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`${API_BASE_URL}/process-complaint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      const message = err.detail || "Failed to process complaint";

      if (res.status === 401 || res.status === 403) {
        throw new ApiError("API authentication failed. Check your server API key configuration.", "auth", res.status);
      }

      if (res.status >= 400 && res.status < 500) {
        throw new ApiError(message, "validation", res.status);
      }

      if (res.status >= 500) {
        throw new ApiError("Server error while processing complaint. Please retry.", "server", res.status);
      }

      throw new ApiError(message, "unknown", res.status);
    }

    return res.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please retry.", "timeout");
    }

    throw new ApiError("Unable to reach backend. Confirm backend is running at VITE_API_BASE_URL.", "network");
  } finally {
    window.clearTimeout(timeoutId);
  }
}
