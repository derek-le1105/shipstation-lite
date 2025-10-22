import { NextResponse, type NextRequest } from "next/server";

import { requireUserProfile } from "@/lib/auth";
import { listPackages, listServices } from "@/lib/shipstation/client";

export async function GET(request: NextRequest) {
  try {
    await requireUserProfile();
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const carrierCode = request.nextUrl.searchParams.get("carrierCode");

  if (!carrierCode) {
    return NextResponse.json({ message: "carrierCode is required" }, { status: 400 });
  }

  try {
    const [services, packages] = await Promise.all([
      listServices(carrierCode),
      listPackages(carrierCode),
    ]);

    return NextResponse.json({ services, packages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch carrier metadata.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
