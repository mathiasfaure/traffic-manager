// API client for APIGateway CRD
export interface APIGateway {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    resourceVersion?: string;
  };
  spec: {
    defaultBackend: string;
    rules: {
      match: { header: string; value: string };
      backend: string;
    }[];
  };
}

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export async function getAPIGateway(namespace: string, name: string): Promise<APIGateway> {
  const res = await fetch(`${BASE_URL}/apigateway/${namespace}/${name}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function putAPIGateway(namespace: string, name: string, data: APIGateway, user?: string): Promise<APIGateway> {
  const res = await fetch(`${BASE_URL}/apigateway/${namespace}/${name}`,
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

export async function patchAPIGateway(namespace: string, name: string, patch: Partial<APIGateway["spec"]>, user?: string): Promise<APIGateway> {
  const res = await fetch(`${BASE_URL}/apigateway/${namespace}/${name}`,
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