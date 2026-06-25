import { NextResponse } from "next/server";
import { pipeline, parseHgetall } from "@/lib/redis";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One-shot endpoint: DELETE all anonymous (UUID) ratings across all album hashes.
// Call once after deploy: POST /api/admin/purge-anon-ratings
export async function POST() {
  const ids = Array.from({ length: 60 }, (_, i) => `md-${i}`);

  const getResults = await pipeline(ids.map((id) => ["HGETALL", `r:${id}`]));

  const delCmds: (string | number)[][] = [];
  let deletedCount = 0;

  ids.forEach((id, i) => {
    const hash = parseHgetall(getResults[i]?.result);
    const uuidFields = Object.keys(hash).filter((k) => UUID_RE.test(k));
    if (uuidFields.length > 0) {
      delCmds.push(["HDEL", `r:${id}`, ...uuidFields]);
      deletedCount += uuidFields.length;
    }
  });

  if (delCmds.length > 0) {
    await pipeline(delCmds);
  }

  return NextResponse.json({ deleted: deletedCount });
}
