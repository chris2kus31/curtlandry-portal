import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  actionItemId?: string;
  action?: "asana" | "approve";
  payload?: Record<string, unknown>;
};

function apiOrigin(): string {
  return (
    process.env.LARAVEL_API_ORIGIN ||
    process.env.NEXT_PUBLIC_LARAVEL_API_ORIGIN ||
    "http://127.0.0.1:8001"
  );
}

/**
 * Dev-only proxy: mint Zach JWT on the server, then create/approve Asana task.
 * Avoids browser CORS when the portal is opened on 127.0.0.1 vs localhost.
 */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEV_AUTH !== "true") {
    return NextResponse.json({ message: "Not available" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const actionItemId = String(body.actionItemId || "").trim();
  if (!actionItemId) {
    return NextResponse.json(
      { message: "actionItemId is required" },
      { status: 422 },
    );
  }

  const action = body.action === "approve" ? "approve" : "asana";
  const origin = apiOrigin().replace(/\/$/, "");

  try {
    const loginRes = await fetch(`${origin}/api/portal/auth/local-dev`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const loginJson = (await loginRes.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
      data?: { tokens?: { access_token?: string } };
    } | null;

    const token = loginJson?.data?.tokens?.access_token;
    if (!loginRes.ok || !token) {
      return NextResponse.json(
        {
          message:
            loginJson?.message ||
            `Local API login failed (${loginRes.status}). Is the Audit API running at ${origin}?`,
        },
        { status: loginRes.status || 502 },
      );
    }

    const createRes = await fetch(
      `${origin}/api/portal/meetings/action-items/${encodeURIComponent(actionItemId)}/${action}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body.payload ?? {}),
        cache: "no-store",
      },
    );

    const createJson = await createRes.json().catch(() => null);
    if (!createRes.ok) {
      const message =
        (createJson &&
          typeof createJson === "object" &&
          "message" in createJson &&
          typeof (createJson as { message: unknown }).message === "string" &&
          (createJson as { message: string }).message) ||
        `Asana request failed (${createRes.status})`;
      return NextResponse.json({ message }, { status: createRes.status || 502 });
    }

    return NextResponse.json(createJson);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach local Audit API";
    return NextResponse.json(
      {
        message: `${message}. Check LARAVEL_API_ORIGIN (${origin}) and that php artisan serve is running.`,
      },
      { status: 502 },
    );
  }
}
