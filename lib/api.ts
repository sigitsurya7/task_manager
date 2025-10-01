export type Json = Record<string, any> | any[] | string | number | boolean | null;

type ApiInit = RequestInit & { json?: Json };

async function parseJSON<T = any>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return (await res.json()) as T;
    } catch {}
  }
  return null;
}

async function request<T = any>(input: RequestInfo | URL, init: ApiInit = {}): Promise<T> {
  const { json, headers, credentials, body, ...rest } = init;
  const finalHeaders: HeadersInit = headers || {};
  let finalBody: BodyInit | undefined = body as any;

  if (json !== undefined) {
    if (!(json instanceof FormData)) {
      (finalHeaders as any)['Content-Type'] = (finalHeaders as any)['Content-Type'] || 'application/json';
      finalBody = JSON.stringify(json);
    } else {
      finalBody = json as any;
    }
  }

  const res = await fetch(input, {
    credentials: credentials ?? 'include',
    cache: 'no-store',
    headers: finalHeaders,
    body: finalBody,
    ...rest,
  });

  if (res.status === 401) {
    try {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } catch {}
  }

  if (!res.ok) {
    const data: any = await parseJSON(res);
    const msg = data?.message || data?.error || res.statusText || 'Request failed';
    throw new Error(msg);
  }

  const data = (await parseJSON<T>(res)) as T;
  return data as T;
}

export const api = {
  request,
  get: <T = any>(url: string, init?: ApiInit) => request<T>(url, { ...init, method: 'GET' }),
  post: <T = any>(url: string, json?: Json, init?: ApiInit) => request<T>(url, { ...init, method: 'POST', json }),
  patch: <T = any>(url: string, json?: Json, init?: ApiInit) => request<T>(url, { ...init, method: 'PATCH', json }),
  del: <T = any>(url: string, json?: Json, init?: ApiInit) => request<T>(url, { ...init, method: 'DELETE', json }),
};

export default api;

