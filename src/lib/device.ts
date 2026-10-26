// Trusted-device tokens. A signed (HMAC-SHA256) token stored in a long-lived
// cookie proves a device was verified by email. Uses Web Crypto so the SAME
// code runs in the Edge middleware and in Node server actions.

export const DEVICE_COOKIE = "mr_device";

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Creates a token bound to the user id, valid for `days`.
export async function createDeviceToken(uid: string, secret: string, days: number): Promise<string> {
  const payload = b64urlEncode(
    enc.encode(JSON.stringify({ uid, exp: Date.now() + days * 86400000 }))
  );
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

// Verifies signature, expiry, and that the token belongs to this user.
export async function verifyDeviceToken(token: string, uid: string, secret: string): Promise<boolean> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const expect = await hmac(payload, secret);
    if (!timingSafeEqual(sig, expect)) return false;
    const data = JSON.parse(dec.decode(b64urlDecode(payload))) as { uid?: string; exp?: number };
    if (data.uid !== uid) return false;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

// SHA-256 hex, used to store a non-reversible fingerprint of the token.
export async function sha256hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
