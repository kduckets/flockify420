import { initializeApp, getApps, getApp, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";
import { cert } from "firebase-admin/app";

let _app: App | null = null;

function app(): App {
  if (_app) return _app;
  if (getApps().length > 0) { _app = getApp(); return _app; }

  const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? "";
  const serviceAccount = JSON.parse(Buffer.from(keyB64, "base64").toString("utf8"));

  _app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_RTDB_URL ?? "https://flockify420-default-rtdb.firebaseio.com",
  });
  return _app;
}

export function db(): Database {
  return getDatabase(app());
}

export function ref(path: string) {
  return db().ref(path);
}

// Compute score + voter count from a votes snapshot value
// { userId: -1|1|2, __offset__: N }
export function scoreFromVotes(votes: Record<string, number | string> | null): {
  score: number;
  count: number;
  stars: number;
} {
  if (!votes) return { score: 0, count: 0, stars: 0 };
  const offset = Number(votes["__offset__"] ?? 0);
  let score = isNaN(offset) ? 0 : offset;
  let count = 0;
  let stars = 0;
  for (const [key, val] of Object.entries(votes)) {
    if (key === "__offset__") continue;
    const n = Number(val);
    if (n === -1 || n === 1 || n === 2) {
      score += n;
      count++;
      if (n === 2) stars++;
    }
  }
  return { score, count, stars };
}
