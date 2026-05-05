import { NextResponse } from "next/server";

import { registerDevice } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await registerDevice(body);
  return NextResponse.json(result, { status: 201 });
}
