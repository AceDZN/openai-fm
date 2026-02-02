import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isLockdownEnabled, validateToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (!isLockdownEnabled()) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !(await validateToken(token))) {
    return NextResponse.json(
      { error: "Unauthorized — lockdown mode is active" },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/generate/:path*"],
};
