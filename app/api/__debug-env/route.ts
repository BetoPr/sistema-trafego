import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ENDPOINT TEMPORARIO — recuperar secrets sensitive do Vercel.
 * REMOVER apos uso!!!
 * Protegido por Bearer = SECRET TEMPORARIO.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const TOKEN = "abf923c45d6e7f8a9b0c1d2e3f4a5b6c";
  if (auth !== `Bearer ${TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
    OAUTH_STATE_SECRET: process.env.OAUTH_STATE_SECRET || "",
    META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN || "",
    META_APP_ID: process.env.META_APP_ID || "",
    META_APP_SECRET: process.env.META_APP_SECRET || "",
    META_API_VERSION: process.env.META_API_VERSION || "",
    IMGBB_API_KEY: process.env.IMGBB_API_KEY || "",
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || "",
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    CRON_SECRET: process.env.CRON_SECRET || "",
  });
}
