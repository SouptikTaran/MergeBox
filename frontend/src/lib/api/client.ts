export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000"
).replace(/\/$/, "");

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
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.message ?? "Unable to complete this request.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
