// Relative /api paths go through the Vite dev proxy, so port 8000 never needs to be public.
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

async function getErrorMessage(response: Response) {
  try {
    const body: unknown = await response.json();
    if (body !== null && typeof body === 'object') {
      if ('error' in body && typeof body.error === 'string' && body.error.trim()) return body.error;
      if ('message' in body && typeof body.message === 'string' && body.message.trim()) return body.message;
    }
  } catch {
    return `Request failed with ${response.status}`;
  }
  return `Request failed with ${response.status}`;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json() as Promise<T>;
}
