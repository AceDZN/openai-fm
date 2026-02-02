export const COOKIE_NAME = "lockdown_token";
export const TOKEN_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export function isLockdownEnabled(): boolean {
  return !!process.env.LOCKDOWN_PASSWORD;
}

export function getLockdownSecret(): string {
  const secret = process.env.LOCKDOWN_SECRET;
  if (!secret) throw new Error("LOCKDOWN_SECRET is not set");
  return secret;
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createToken(): Promise<string> {
  const secret = getLockdownSecret();
  const timestamp = Date.now().toString();
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(timestamp));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${timestamp}.${hex}`;
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    const secret = getLockdownSecret();
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return false;

    const timestamp = token.slice(0, dotIndex);
    const providedHex = token.slice(dotIndex + 1);

    // Check timestamp is not expired
    const age = Date.now() - Number(timestamp);
    if (isNaN(age) || age < 0 || age > TOKEN_MAX_AGE_MS) return false;

    // Recompute expected signature
    const key = await getKey(secret);
    const enc = new TextEncoder();
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(timestamp));
    const expectedHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison via XOR (Edge-compatible)
    if (providedHex.length !== expectedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      diff |= expectedHex.charCodeAt(i) ^ providedHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
