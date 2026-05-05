import { NextResponse } from "next/server";

import { requireDevice } from "@/lib/auth";
import { createSession } from "@/lib/store";

export async function POST(request: Request) {
  const authDevice = await requireDevice(request);
  if (!authDevice) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await createSession(body, authDevice);
  return NextResponse.json(result, { status: 201 });
}
