const URL   = process.env.UPSTASH_REDIS_REST_URL   ?? "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

// Run multiple Redis commands in a single round-trip
export async function pipeline(
  cmds: (string | number)[][]
): Promise<{ result: unknown }[]> {
  if (!URL || !TOKEN) return cmds.map(() => ({ result: null }));
  const res = await fetch(`${URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  return res.json();
}

// Parse a flat HGETALL array [field, value, field, value, ...] into a plain object
export function parseHgetall(arr: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(arr)) return result;
  for (let i = 0; i < arr.length - 1; i += 2) {
    result[String(arr[i])] = String(arr[i + 1]);
  }
  return result;
}

// Compute average from a HGETALL result (values are 0–100)
export function avgFromHgetall(arr: unknown): number | null {
  const map = parseHgetall(arr);
  const vals = Object.values(map).map(Number).filter((n) => !isNaN(n) && n > 0 && n <= 100);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
