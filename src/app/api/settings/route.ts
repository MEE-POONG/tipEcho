import { NextResponse } from "next/server";
import { getStore, updateSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: getStore().settings });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const current = getStore().settings;

    const updated = updateSettings({
      creatorName: body.creatorName !== undefined ? body.creatorName : current.creatorName,
      creatorHandle: body.creatorHandle !== undefined ? body.creatorHandle : current.creatorHandle,
      creatorBio: body.creatorBio !== undefined ? body.creatorBio : current.creatorBio,
      creatorAvatarEmoji:
        body.creatorAvatarEmoji !== undefined
          ? body.creatorAvatarEmoji
          : current.creatorAvatarEmoji,
      alertDurationSec:
        body.alertDurationSec !== undefined
          ? Math.max(2, Math.min(30, Number(body.alertDurationSec) || 7))
          : current.alertDurationSec,
      soundEnabled:
        body.soundEnabled !== undefined ? Boolean(body.soundEnabled) : current.soundEnabled,
      ttsEnabled:
        body.ttsEnabled !== undefined ? Boolean(body.ttsEnabled) : current.ttsEnabled,
      ttsEngine: body.ttsEngine !== undefined ? body.ttsEngine : current.ttsEngine,
      ttsReadMode: body.ttsReadMode !== undefined ? body.ttsReadMode : current.ttsReadMode,
      ttsTemplate:
        typeof body.ttsTemplate === "string" && body.ttsTemplate.trim()
          ? body.ttsTemplate.trim()
          : current.ttsTemplate,
      ttsMinAmount:
        body.ttsMinAmount !== undefined
          ? Math.max(0, Number(body.ttsMinAmount) || 0)
          : current.ttsMinAmount,
      ttsRate:
        body.ttsRate !== undefined
          ? Math.max(0.5, Math.min(2.0, Number(body.ttsRate) || 1.05))
          : current.ttsRate,
      ttsPitch:
        body.ttsPitch !== undefined
          ? Math.max(0.5, Math.min(2.0, Number(body.ttsPitch) || 1.0))
          : current.ttsPitch,
      ttsVolume:
        body.ttsVolume !== undefined
          ? Math.max(0.1, Math.min(1.0, Number(body.ttsVolume) || 1.0))
          : current.ttsVolume,
      goalTitle: body.goalTitle !== undefined ? body.goalTitle : current.goalTitle,
      goalTargetAmount:
        body.goalTargetAmount !== undefined
          ? Math.max(100, Number(body.goalTargetAmount) || 5000)
          : current.goalTargetAmount,
    });

    return NextResponse.json({ ok: true, settings: updated });
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าได้" }, { status: 500 });
  }
}
