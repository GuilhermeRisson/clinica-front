export const CENTRAL_API_BASE =
  process.env.NEXT_PUBLIC_CENTRAL_API_BASE ?? "http://central.clinica.local/api";

export const TENANT_API_BASE =
  process.env.NEXT_PUBLIC_TENANT_API_BASE ?? "";

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";

    try {
      const body = await response.json();
      detail = body?.message ? ` - ${body.message}` : "";
    } catch {
      // ignore invalid json
    }

    throw new Error(`API error: ${response.status}${detail}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(url, init);
}

export function apiPost<T>(
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  return apiRequest<T>(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });
}

export function apiPatch<T>(
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  return apiRequest<T>(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });
}

export function apiPut<T>(
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  return apiRequest<T>(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });
}

export function apiDelete<T>(url: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    method: "DELETE",
    ...init,
  });
}
