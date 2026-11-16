import type { NextRequest } from "next/server";
import { handleBffProxyRequest } from "@/lib/security/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function handler(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return handleBffProxyRequest(
    {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
    },
    path,
  );
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
