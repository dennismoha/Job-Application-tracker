export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      body?.message ?? `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlob(
  path: string,
  options: RequestInit = {},
): Promise<{ blob: Blob; fileName?: string }> {
  const response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include' });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      body?.message ?? `Request failed with status ${response.status}.`,
      response.status,
    );
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return { blob: await response.blob(), ...(fileName ? { fileName } : {}) };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
