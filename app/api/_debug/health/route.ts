// app/api/_debug/health/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const mustEnv = {
      WASENDER_API_KEY: !!process.env.WASENDER_API_KEY,
      UPLOADTHING_TOKEN: !!process.env.UPLOADTHING_TOKEN,
      APP_BASE_URL: process.env.APP_BASE_URL,
      DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "244",
    };
    return NextResponse.json({ ok: true, env: mustEnv, now: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "fail" }, { status: 500 });
  }
}
