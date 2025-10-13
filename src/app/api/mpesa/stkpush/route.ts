// /app/api/mpesa/stkpush/route.ts
import { NextRequest, NextResponse } from "next/server";

const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "";

function timestampYYYYMMDDHHMMSS() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

async function fetchJson(url: string, opts: RequestInit = {}) {
  // wrapper to capture network errors and body text
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, headers: Object.fromEntries(res.headers), body };
  } catch (err: any) {
    return { ok: false, networkError: true, message: err.message || String(err) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const phone = (json.phone || json.partyA || json.partyAString) as string;
    const amount = json.amount ?? json.Amount ?? 1;

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required in request body (e.g. { \"phone\": \"2547XXXXXXXX\", \"amount\": 1 })" },
        { status: 400 }
      );
    }

    // check env
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      return NextResponse.json({ error: "Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in .env.local" }, { status: 500 });
    }
    if (!PASSKEY) {
      return NextResponse.json({ error: "Missing MPESA_PASSKEY in .env.local" }, { status: 500 });
    }
    if (!CALLBACK_URL) {
      return NextResponse.json({ error: "Missing MPESA_CALLBACK_URL in .env.local (must be public HTTPS URL)" }, { status: 500 });
    }

    // 1) Access token
    const tokenUrl = `${SANDBOX_BASE}/oauth/v1/generate?grant_type=client_credentials`;
    const basic = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const tokenResp = await fetchJson(tokenUrl, { headers: { Authorization: `Basic ${basic}` } });

    if (!tokenResp.ok) {
      return NextResponse.json(
        { error: "Failed to get access token", tokenResp },
        { status: tokenResp.status || 500 }
      );
    }
    const accessToken = tokenResp.body?.access_token as string | undefined;
    if (!accessToken) {
      return NextResponse.json({ error: "No access_token in token response", tokenResp }, { status: 500 });
    }

    // 2) Build STK push payload
    const timestamp = timestampYYYYMMDDHHMMSS();
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.max(1, Math.floor(Number(amount) || 1)),
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: json.accountReference || "NextShop",
      TransactionDesc: json.description || "Payment",
    };

    // 3) Send STK push
    const stkUrl = `${SANDBOX_BASE}/mpesa/stkpush/v1/processrequest`;
    const stkResp = await fetchJson(stkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // return full info (success or failure)
    if (!stkResp.ok) {
      return NextResponse.json({ error: "STK Push returned error", stkResp }, { status: stkResp.status || 500 });
    }

    return NextResponse.json({ message: "STK Push initiated", tokenResp, stkResp });
  } catch (err: any) {
    return NextResponse.json({ error: "Unhandled route error", message: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "POST only: /api/mpesa/stkpush" });
}
