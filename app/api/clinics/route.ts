import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Admin app URL for clinic data proxying.
 * The admin app manages the clinic directory in MongoDB;
 * this endpoint proxies to it so all apps see the same data.
 */
const ADMIN_API_URL =
  process.env.SUPER_ADMIN_API_URL ?? "http://localhost:3002";

export async function GET() {
  try {
    const res = await fetch(
      `${ADMIN_API_URL.replace(/\/$/, "")}/api/public/clinics`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      throw new Error(`Admin app returned ${res.status}`);
    }

    const clinics = await res.json();

    return NextResponse.json(clinics, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to load clinics." },
      { status: 500 },
    );
  }
}
