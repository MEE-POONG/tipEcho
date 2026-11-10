import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawText = (searchParams.get("text") || "").trim();
  const lang = (searchParams.get("lang") || "th").trim();

  if (!rawText) {
    return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
  }

  // Limit text length per chunk to 200 characters for TTS endpoint compatibility
  const text = rawText.slice(0, 200);

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      lang
    )}&client=tw-ob&q=${encodeURIComponent(text)}`;

    const response = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream TTS returned ${response.status}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("GET /api/tts error:", err);
    return NextResponse.json(
      { error: "Failed to synthesize speech via cloud TTS" },
      { status: 502 }
    );
  }
}

