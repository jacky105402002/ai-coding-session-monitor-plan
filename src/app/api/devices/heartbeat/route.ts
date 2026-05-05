import { NextResponse } from "next/server";

import { requireDevice } from "@/lib/auth";
import { heartbeat } from "@/lib/store";

export async function POST(request: Request) {
  const authDevice = await requireDevice(request);
  if (!authDevice) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ok = typeof body.deviceId === "string" && (await heartbeat(body.deviceId, authDevice.id));
  if (!ok) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
