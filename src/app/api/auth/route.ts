import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  TOKEN_MAX_AGE_MS,
  isLockdownEnabled,
  validateToken,
  createToken,
} from "@/lib/auth";

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-IP)
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(ip);
      }
    }
    if (rateLimitMap.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent process exit
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { attempts: 1, windowStart: now });
    ensureCleanupTimer();
    return { allowed: true };
  }

  if (entry.attempts >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil(
      (entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000,
    );
    return { allowed: false, retryAfterSec };
  }

  entry.attempts += 1;
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Constant-time password comparison (Node.js runtime)
// ---------------------------------------------------------------------------
function safePasswordCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    // Run a dummy comparison to keep timing more consistent
    let d = 0;
    for (let i = 0; i < bufA.byteLength; i++) {
      d |= bufA[i] ^ bufA[i];
    }
    void d;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// GET /api/auth — check if current session is authenticated
// ---------------------------------------------------------------------------
export async function GET() {
  if (!isLockdownEnabled()) {
    return NextResponse.json({ authenticated: true });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const valid = await validateToken(token);
  return NextResponse.json({ authenticated: valid });
}

// ---------------------------------------------------------------------------
// POST /api/auth — submit password
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (!isLockdownEnabled()) {
    return NextResponse.json({ authenticated: true });
  }

  // Identify caller by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, retryAfterSec } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = body.password;
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const expected = process.env.LOCKDOWN_PASSWORD!;
  if (!safePasswordCompare(password, expected)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Password correct — issue token cookie
  const token = await createToken();
  const isProduction = process.env.NODE_ENV === "production";

  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(TOKEN_MAX_AGE_MS / 1000),
  });

  return res;
}
