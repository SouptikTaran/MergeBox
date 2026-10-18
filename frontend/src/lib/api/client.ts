function readApiOrigin(): string {
  const value = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  if (!value) {
    throw new Error(
      "Set NEXT_PUBLIC_API_ORIGIN in frontend/.env.local or the deployment environment before building.",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_API_ORIGIN must be a valid HTTP or HTTPS origin.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_ORIGIN must be an HTTP or HTTPS origin without credentials, a path, query, or fragment.",
    );
  }
  return url.origin;
}

export const API_ORIGIN = readApiOrigin();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("session-expired"));
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.message ?? "Unable to complete this request.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
