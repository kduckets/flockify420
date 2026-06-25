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

// Compute score + voter count from a HGETALL result (values are -1, 1, or 2)
// __offset__ is a hidden field storing uncaptured legacy score contributions
export function scoreFromHgetall(arr: unknown): { score: number; count: number } {
  const map = parseHgetall(arr);
  const offset = Number(map["__offset__"] ?? 0);
  let score = isNaN(offset) ? 0 : offset;
  let count = 0;
  for (const [key, val] of Object.entries(map)) {
    if (key === "__offset__") continue;
    const n = Number(val);
    if (n === -1 || n === 1 || n === 2) { score += n; count++; }
  }
  return { score, count };
}
