// Shared password policy — pure functions, safe to import on client & server.

// A small set of very common / weak passwords to reject outright.
const COMMON = new Set<string>([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789",
  "1234567890", "123456", "111111", "000000", "123123", "121212", "abc123",
  "qwerty", "qwerty123", "qwertyuiop", "11111111", "12341234", "iloveyou",
  "admin", "admin123", "welcome", "welcome1", "letmein", "dragon", "monkey",
  "sunshine", "princess", "football", "baseball", "superman", "trustno1",
  "menaxhorentin", "rentacar", "rent-a-car", "renta", "makina", "kosova",
  "shqiperia", "prishtina", "tirana",
]);

export type Strength = { score: 0 | 1 | 2 | 3; label: string };

// Live UI meter: 0–1 = Dobët, 2 = Mesatar, 3 = Fortë.
export function passwordStrength(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (pw.length >= 12 || /[^a-zA-Z0-9]/.test(pw)) score++;
  const s = Math.min(score, 3) as 0 | 1 | 2 | 3;
  const label = s <= 1 ? "Dobët" : s === 2 ? "Mesatar" : "Fortë";
  return { score: s, label };
}

// Hard requirements (authoritative on the server). Returns an Albanian error
// message, or null when the password is acceptable.
export function validatePasswordRules(
  pw: string,
  opts: { email?: string; name?: string } = {}
): string | null {
  if (pw.length < 8) return "Fjalëkalimi duhet të ketë të paktën 8 karaktere.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "Fjalëkalimi duhet të përmbajë të paktën një shkronjë dhe një numër.";
  }

  const low = pw.toLowerCase();
  if (COMMON.has(low)) return "Ky fjalëkalim është shumë i zakonshëm. Zgjidh një më të fortë.";

  const local = (opts.email || "").toLowerCase().split("@")[0];
  if (local && local.length >= 4 && low.includes(local)) {
    return "Mos e përdor email-in brenda fjalëkalimit.";
  }

  const name = (opts.name || "").toLowerCase().trim();
  if (name && name.length >= 4 && low.includes(name)) {
    return "Mos e përdor emrin e biznesit brenda fjalëkalimit.";
  }

  return null;
}
