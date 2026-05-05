import { NextResponse } from "next/server";

import { requireDevice } from "@/lib/auth";
import { updateSessionStatus } from "@/lib/store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const authDevice = await requireDevice(request);
  if (!authDevice) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await updateSessionStatus(sessionId, body, authDevice);
  if (!result) {
    return NextResponse.json({ error: "Session not found or invalid status" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
