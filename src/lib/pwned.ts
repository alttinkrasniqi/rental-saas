import { createHash } from "crypto";

// Checks a password against Have I Been Pwned using the k-anonymity range API:
// only the first 5 chars of the SHA-1 hash leave the server, never the password.
// Best-effort and fail-open — any network/parse error returns false so a reset
// or signup is never blocked by an outage.
export async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: ctrl.signal,
      headers: { "Add-Padding": "true" },
    });
    clearTimeout(timer);
    if (!res.ok) return false;

    const text = await res.text();
    for (const line of text.split("\n")) {
      if (line.split(":")[0].trim().toUpperCase() === suffix) return true;
    }
    return false;
  } catch {
    return false;
  }
}
