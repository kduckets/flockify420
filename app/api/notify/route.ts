import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MAILCHIMP_API_KEY ?? "";
const LIST_ID = "3500f59233";
const TEMPLATE_ID = 55;
const FROM_EMAIL = "kmditroia@gmail.com";
const FROM_NAME = "Flockify";

function dc(): string {
  return API_KEY.split("-").pop() ?? "us1";
}

async function mailchimp(path: string, body?: unknown) {
  const res = await fetch(`https://${dc()}.api.mailchimp.com/3.0/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  return res.ok ? res.json() : Promise.reject(await res.text());
}

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ ok: false, error: "no api key" });

  const { user, album, artist } = await req.json() as {
    user: string; album: string; artist: string;
  };

  try {
    const campaign = await mailchimp("campaigns", {
      recipients: { list_id: LIST_ID },
      type: "regular",
      settings: {
        subject_line: `${user} posted a new album: ${artist} — ${album}`,
        reply_to: FROM_EMAIL,
        from_name: FROM_NAME,
        template_id: TEMPLATE_ID,
      },
    });

    await mailchimp(`campaigns/${campaign.id}/actions/send`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Mailchimp error:", err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
