import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown; // JSON-serializable, or FormData
}

/**
 * Generic authenticated API request. JSON-encodes `body` unless it's
 * already a FormData instance (used for file uploads).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...authHeader,
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function apiRequestBlob(path: string): Promise<Blob> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: authHeader,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return res.blob();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  getBlob: (path: string) => apiRequestBlob(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
