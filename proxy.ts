import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function proxy(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestStart = req.headers.get("x-request-start") ?? Date.now().toString();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-request-start", requestStart);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  res.headers.set("X-Request-Id", requestId);
  return res;
}
