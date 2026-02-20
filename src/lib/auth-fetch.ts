/**
 * Authenticated fetch wrapper that attaches the Clerk token
 * to every request as a Bearer token.
 *
 * Usage in components:
 *   const { getToken } = useAuth();
 *   const data = await authFetch("/api/orders", getToken);
 */
export async function authFetch(
  url: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
