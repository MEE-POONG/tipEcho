import { NextResponse } from "next/server";
import { addDonation, getStore, replayDonation, skipCurrentAlert } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    gifts: store.gifts,
    donations: store.donations,
    settings: store.settings,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "replay" && body.donationId) {
      const replayed = replayDonation(body.donationId);
      if (!replayed) {
        return NextResponse.json({ error: "ไม่พบรายการโดเนทนี้" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, donation: replayed });
    }

    if (body.action === "skip") {
      skipCurrentAlert();
      return NextResponse.json({ ok: true });
    }

    const { donorName, message, giftId, quantity, customGift } = body;
    if (!giftId) {
      return NextResponse.json({ error: "กรุณาเลือกของขวัญที่ต้องการส่ง" }, { status: 400 });
    }

    const donation = addDonation({
      donorName: donorName || "ผู้ไม่ประสงค์ออกนาม",
      message: message || "",
      giftId,
      quantity: Number(quantity) || 1,
      customGift,
    });

    return NextResponse.json({ ok: true, donation }, { status: 201 });
  } catch (err) {
    console.error("POST /api/donations error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการส่งของขวัญ" }, { status: 500 });
  }
}

