// API client for HTTPRoute CRD
export interface HTTPRoute {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    resourceVersion?: string;
  };
  spec: {
    parentRefs: { name: string }[];
    rules: HTTPRouteRule[];
  };
}

export interface HTTPRouteRule {
  matches?: {
    headers?: { name: string; value: string }[];
  }[];
  backendRefs?: { name: string; port: number }[];
}

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export async function getHTTPRoute(namespace: string, name: string): Promise<HTTPRoute> {
  const res = await fetch(`${BASE_URL}/httproute/${namespace}/${name}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function putHTTPRoute(namespace: string, name: string, data: HTTPRoute, user?: string): Promise<HTTPRoute> {
  const res = await fetch(`${BASE_URL}/httproute/${namespace}/${name}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(user ? { "X-User": user } : {}),
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function patchHTTPRoute(namespace: string, name: string, patch: Partial<HTTPRoute["spec"]>, user?: string): Promise<HTTPRoute> {
  const res = await fetch(`${BASE_URL}/httproute/${namespace}/${name}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/merge-patch+json",
        ...(user ? { "X-User": user } : {}),
      },
      body: JSON.stringify({ spec: patch }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
} 