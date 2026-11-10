import { NextResponse } from "next/server";
import { DEFAULT_GIFTS, getStore, updateGifts } from "@/lib/store";
import { GiftItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ gifts: getStore().gifts });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.resetDefault) {
      const reset = updateGifts(DEFAULT_GIFTS);
      return NextResponse.json({ ok: true, gifts: reset });
    }

    if (!Array.isArray(body.gifts)) {
      return NextResponse.json({ error: "ข้อมูลรายการของขวัญไม่ถูกต้อง" }, { status: 400 });
    }

    const sanitized: GiftItem[] = body.gifts.map((g: Partial<GiftItem>, index: number) => ({
      id: g.id || `gift-${Date.now()}-${index}`,
      name: (g.name || "ของขวัญ").trim(),
      emoji: (g.emoji || "🎁").trim(),
      price: Math.max(1, Number(g.price) || 10),
      description: (g.description || "").trim(),
      color: g.color || "#ec4899",
      soundType: g.soundType || "magic",
      badge: g.badge ? g.badge.trim() : undefined,
    }));

    const updated = updateGifts(sanitized);
    return NextResponse.json({ ok: true, gifts: updated });
  } catch (err) {
    console.error("PUT /api/gifts error:", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกรายการของขวัญได้" }, { status: 500 });
  }
}

