/**
 * One-shot migration: Upstash Redis → Firebase RTDB
 *
 * Run when Redis request limit resets (monthly):
 *   node --env-file=.env.local scripts/migrate-redis-to-firebase.mjs
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL   ?? "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const RTDB_URL    = process.env.FIREBASE_RTDB_URL        ?? "https://flockify420-default-rtdb.firebaseio.com";
const KEY_B64     = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? "";

const serviceAccount = JSON.parse(Buffer.from(KEY_B64, "base64").toString("utf8"));
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: RTDB_URL,
});
const db = getDatabase(firebaseApp);

async function redisPipeline(cmds) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function redisScan(pattern = "*", count = 500) {
  const keys = [];
  let cursor = 0;
  do {
    const [res] = await redisPipeline([["SCAN", cursor, "MATCH", pattern, "COUNT", count]]);
    const [nextCursor, batch] = res.result;
    cursor = parseInt(nextCursor);
    keys.push(...batch);
  } while (cursor !== 0);
  return keys;
}

function parseHgetall(arr) {
  const result = {};
  if (!Array.isArray(arr)) return result;
  for (let i = 0; i < arr.length - 1; i += 2) result[String(arr[i])] = String(arr[i + 1]);
  return result;
}

async function migrateVotes(keys) {
  if (keys.length === 0) { console.log("  No vote keys"); return; }
  const results = await redisPipeline(keys.map((k) => ["HGETALL", k]));
  const updates = {};
  for (let i = 0; i < keys.length; i++) {
    const albumId = keys[i].slice(2);
    const hash = parseHgetall(results[i].result);
    for (const [uid, val] of Object.entries(hash)) {
      updates[`votes/${albumId}/${uid}`] = Number(val);
    }
  }
  await db.ref("/").update(updates);
  console.log(`  Wrote ${Object.keys(updates).length} vote fields`);
}

async function migrateComments(keys) {
  if (keys.length === 0) { console.log("  No comment keys"); return; }
  const results = await redisPipeline(keys.map((k) => ["HGETALL", k]));
  const updates = {};
  for (let i = 0; i < keys.length; i++) {
    const albumId = keys[i].slice(2);
    const hash = parseHgetall(results[i].result);
    for (const [commentId, jsonStr] of Object.entries(hash)) {
      try {
        const comment = JSON.parse(jsonStr);
        updates[`comments/${albumId}/${commentId}`] = comment;
        const existing = updates[`lastComment/${albumId}`];
        if (!existing || comment.timestamp > existing) {
          updates[`lastComment/${albumId}`] = comment.timestamp;
        }
      } catch { console.warn(`  Skip bad comment ${commentId}`); }
    }
  }
  await db.ref("/").update(updates);
  console.log(`  Wrote ${Object.keys(updates).length} comment + lastComment fields`);
}

async function migrateLastComment() {
  const [res] = await redisPipeline([["HGETALL", "c:last-comment"]]);
  const hash = parseHgetall(res.result);
  const updates = {};
  for (const [albumId, ts] of Object.entries(hash)) {
    const n = Number(ts);
    if (!isNaN(n)) updates[`lastComment/${albumId}`] = n;
  }
  await db.ref("/").update(updates);
  console.log(`  Wrote ${Object.keys(updates).length} lastComment entries`);
}

async function migrateCollections(keys) {
  if (keys.length === 0) { console.log("  No collection keys"); return; }
  const results = await redisPipeline(keys.map((k) => ["SMEMBERS", k]));
  const updates = {};
  for (let i = 0; i < keys.length; i++) {
    const userId = keys[i].slice(4);
    const members = results[i].result;
    if (Array.isArray(members)) {
      for (const albumId of members) updates[`collections/${userId}/${albumId}`] = true;
    }
  }
  await db.ref("/").update(updates);
  console.log(`  Wrote ${Object.keys(updates).length} collection entries`);
}

async function migratePosts() {
  const [zrangeRes] = await redisPipeline([["ZREVRANGE", "dyn_posts", "0", "-1", "WITHSCORES"]]);
  const flat = zrangeRes.result;
  if (!flat || flat.length === 0) { console.log("  No posts"); return; }
  const ids = [], scores = [];
  for (let i = 0; i < flat.length - 1; i += 2) { ids.push(flat[i]); scores.push(Number(flat[i + 1])); }
  const results = await redisPipeline(ids.map((id) => ["HGETALL", `post:${id}`]));
  const updates = {};
  for (let i = 0; i < ids.length; i++) {
    const d = parseHgetall(results[i].result);
    if (!d.album) continue;
    const parseArr = (s) => { try { return JSON.parse(s ?? "[]"); } catch { return []; } };
    const ts = scores[i];
    updates[`posts/${ids[i]}`] = {
      album: d.album, artist: d.artist, artworkUrl: d.artworkUrl, spotifyUri: d.spotifyUri,
      releaseDate: d.releaseDate, summary: d.summary,
      labels: parseArr(d.labels), genre: parseArr(d.genre), tags: parseArr(d.tags),
      creatorName: d.creatorName, userId: d.userId,
      createdTs: d.createdTs ?? new Date(ts).toISOString(),
      postOrder: -ts,
    };
  }
  await db.ref("/").update(updates);
  console.log(`  Wrote ${Object.keys(updates).length} posts`);
}

async function main() {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Missing Redis env vars");
  if (!KEY_B64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");

  console.log("Scanning Redis keys...");
  const allKeys = await redisScan("*", 500);
  console.log(`Found ${allKeys.length} keys`);

  console.log("\n→ Votes");      await migrateVotes(allKeys.filter((k) => k.startsWith("v:")));
  console.log("\n→ Comments");   await migrateComments(allKeys.filter((k) => k.startsWith("c:") && k !== "c:last-comment"));
  console.log("\n→ LastComment");await migrateLastComment();
  console.log("\n→ Collections");await migrateCollections(allKeys.filter((k) => k.startsWith("col:")));
  if (allKeys.includes("dyn_posts")) { console.log("\n→ Posts"); await migratePosts(); }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
