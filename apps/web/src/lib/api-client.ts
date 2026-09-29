import { supabase } from '@/lib/supabase/client';

// Backend base URL — set in apps/web/.env.local
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Helper to fetch the Supabase session JWT access token.
 */
export async function getSupabaseToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return null;
    }

    // Proactively refresh if the access token has expired or is expiring in the next 30s
    if (session.expires_at && session.expires_at * 1000 <= Date.now() + 30000) {
      console.info('[APIClient] Supabase access token expired or expiring soon. Refreshing session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.warn('[APIClient] Session refresh failed, clearing stale session:', refreshError?.message);
        await supabase.auth.signOut().catch(() => {});
        return null;
      }
      return refreshData.session.access_token;
    }

    return session.access_token;
  } catch (err) {
    console.warn('[APIClient] Failed to retrieve session from Supabase:', err);
    return null;
  }
}

export function resetAuthPromise() {
  console.info('[APIClient] Resetting auth promise (no-op for Supabase).');
}

// ─── Token helper ────────────────────────────────────────────────────────────

/**
 * Returns the Supabase Bearer token for the currently authenticated user.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseToken();
  if (token) {
    console.debug('[APIClient] Attaching Supabase bearer token. tokenLength =', token.length);
    return { Authorization: `Bearer ${token}` };
  }

  console.warn('[APIClient] No authenticated Supabase user — request will be unauthenticated.');
  return {};
}

// ─── Response helper ─────────────────────────────────────────────────────────

/**
 * Safely reads a Response as JSON.
 * Checks Content-Type first to avoid crashing on HTML error pages (401, 302, etc.).
 */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `[APIClient] Expected JSON but received "${contentType}" (HTTP ${res.status}). Body preview: ${text.slice(0, 200)}`
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Reads error details from a failed response.
 * Never throws — returns an empty string on failure.
 */
export async function readApiError(res: Response): Promise<string> {
  try {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      const message = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message;
      const details = Array.isArray(data?.details)
        ? data.details.join(', ')
        : data?.details;
      return [message, details].filter(Boolean).join(' ');
    }
    return await res.text();
  } catch {
    return '';
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export interface ApiRequestInit extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Skip auto-auth. Default: false (auth is always added). */
  skipAuth?: boolean;
}

/**
 * Drop-in replacement for `fetch` that:
 *   • Prepends API_URL to relative paths
 *   • Injects the Supabase Bearer token
 *   • Logs the request and response for debugging
 */
export async function apiFetch(
  path: string,
  init: ApiRequestInit = {}
): Promise<Response> {
  const { skipAuth = false, headers: extraHeaders = {}, ...rest } = init;

  const authHeaders = skipAuth ? {} : await getAuthHeaders();

  const url = path.startsWith('http')
    ? path
    : `${API_URL}${path}`;

  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...extraHeaders,
  };

  console.info('[APIClient] →', rest.method ?? 'GET', url, {
    hasAuth: Boolean(mergedHeaders['Authorization']),
    contentType: mergedHeaders['Content-Type'],
  });

  // Use AbortController for a default 8-second request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[APIClient] Request to ${url} timed out after 15s. Aborting.`);
    controller.abort();
  }, 15000);

  // If a custom signal is provided, listen to aborts on it
  if (rest.signal) {
    if (rest.signal.aborted) {
      controller.abort();
    } else {
      rest.signal.addEventListener('abort', () => controller.abort());
    }
  }

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      ...rest,
      headers: mergedHeaders,
      signal: controller.signal,
    });

    console.info('[APIClient] ←', res.status, url, {
      ok: res.ok,
      contentType: res.headers.get('content-type'),
    });

    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`[APIClient] Request to ${path} timed out after 15s.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convenience: authenticated GET that returns parsed JSON.
 * Throws on non-2xx or non-JSON responses.
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const msg = await readApiError(res);
    throw new Error(msg || `HTTP ${res.status} ${path}`);
  }
  return safeJson<T>(res);
}

/**
 * Convenience: authenticated POST / PUT / PATCH / DELETE that returns parsed JSON.
 */
export async function apiMutate<T = unknown>(
  path: string,
  method: string,
  body?: unknown
): Promise<T> {
  const res = await apiFetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await readApiError(res);
    throw new Error(msg || `HTTP ${res.status} ${method} ${path}`);
  }
  return safeJson<T>(res);
}
