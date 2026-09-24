/**
 * Resolves the public origin of the incoming request. Handles Vercel's proxy
 * headers so OAuth redirects go back to the real domain, not an internal one.
 */
export function getOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.NODE_ENV === "development" || !forwardedHost) {
    return new URL(request.url).origin;
  }

  return `${forwardedProto}://${forwardedHost}`;
}

/** Only allow internal, absolute-from-root paths to avoid open redirects. */
export function safeRedirectPath(value: string | null, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
