"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Volume2,
  VolumeX,
  Play,
  SkipForward,
  Eye,
  Layers,
  Mic,
  MicOff,
} from "lucide-react";
import { CreatorSettings, Donation, StreamEvent } from "@/lib/types";
import AlertCard from "@/components/AlertCard";
import { playAlertSound, speakDonationMessage, stopSpeaking } from "@/lib/sound";

function OverlayContent() {
  const searchParams = useSearchParams();
  const initialPreview = searchParams.get("preview") === "1";

  const [isPreviewBg, setIsPreviewBg] = useState(initialPreview);
  const [settings, setSettings] = useState<CreatorSettings>({
    creatorName: "MochiChan Live",
    creatorHandle: "@mochichan",
    creatorBio: "",
    creatorAvatarEmoji: "🎮",
    alertDurationSec: 7,
    soundEnabled: true,
    ttsEnabled: true,
    ttsEngine: "auto",
    ttsReadMode: "full",
    ttsTemplate: "{donor} ส่ง {gift} {qty} ชิ้น ยอดโดเนท {amount} บาท บอกว่า {message}",
    ttsMinAmount: 0,
    ttsRate: 1.05,
    ttsPitch: 1.0,
    ttsVolume: 1.0,
    goalTitle: "",
    goalTargetAmount: 5000,
  });

  const [queue, setQueue] = useState<Donation[]>([]);
  const [activeAlert, setActiveAlert] = useState<Donation | null>(null);
  const [connected, setConnected] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsDelayRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Fetch initial settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => {});
  }, []);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (ttsDelayRef.current) {
      clearTimeout(ttsDelayRef.current);
      ttsDelayRef.current = null;
    }
  };

  const skipCurrent = useCallback(() => {
    clearTimers();
    stopSpeaking();
    setIsSpeaking(false);
    setActiveAlert(null);
    isProcessingRef.current = false;
  }, []);

  // Subscribe to SSE stream
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const event: StreamEvent = JSON.parse(e.data);
        if (event.type === "connected") {
          setConnected(true);
        } else if (event.type === "donation:new" || event.type === "donation:replay") {
          setQueue((prev) => [...prev, event.donation]);
        } else if (event.type === "alert:skip") {
          skipCurrent();
        } else if (event.type === "settings:updated") {
          setSettings(event.settings);
        }
      } catch {
        // Ignore parse error
      }
    };

    return () => {
      es.close();
    };
  }, [skipCurrent]);

  // Queue Processor: Display one alert at a time and coordinate TTS + Timer
  useEffect(() => {
    if (activeAlert || isProcessingRef.current || queue.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const nextDonation = queue[0];
    setQueue((prev) => prev.slice(1));
    setActiveAlert(nextDonation);

    let minTimerDone = false;
    let ttsDone = !(settings.ttsEnabled && !localMuted);

    const finishIfBothDone = () => {
      if (minTimerDone && ttsDone) {
        setIsSpeaking(false);
        setActiveAlert(null);
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 550);
      }
    };

    // 1. Play Alert Sound Effect
    if (settings.soundEnabled && !localMuted) {
      playAlertSound(nextDonation.soundType);
    }

    // 2. Speak Donation Message after brief delay so chime doesn't overlap speech
    if (settings.ttsEnabled && !localMuted) {
      const delayMs = settings.soundEnabled ? 650 : 100;
      ttsDelayRef.current = setTimeout(() => {
        speakDonationMessage(nextDonation, settings, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            ttsDone = true;
            finishIfBothDone();
          },
        }).catch(() => {
          setIsSpeaking(false);
          ttsDone = true;
          finishIfBothDone();
        });
      }, delayMs);
    }

    // 3. Trigger confetti on screen
    confetti({
      particleCount: nextDonation.amount >= 100 ? 100 : 45,
      spread: 80,
      origin: { y: 0.55 },
    });

    // 4. Minimum Display Duration Timer
    const durationMs = (settings.alertDurationSec || 7) * 1000;
    timerRef.current = setTimeout(() => {
      minTimerDone = true;
      finishIfBothDone();
    }, durationMs);
  }, [queue, activeAlert, settings, localMuted]);

  const toggleTtsEnabled = async () => {
    const nextState = !settings.ttsEnabled;
    if (!nextState) {
      stopSpeaking();
      setIsSpeaking(false);
    }
    setSettings((prev) => ({ ...prev, ttsEnabled: nextState }));
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttsEnabled: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch {
      // Ignore error
    }
  };

  const triggerDemoAlert = async () => {
    try {
      await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorName: "ผู้ชมสายเปย์",
          message: "สวัสดีครับสตรีมเมอร์ ขอให้ไลฟ์วันนี้คนดูเยอะๆ สู้ๆ ครับผม!",
          giftId: "gift-rocket",
          quantity: 2,
        }),
      });
    } catch {
      // Ignore error
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-300 ${
        isPreviewBg
          ? "bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#020617_100%)]"
          : "bg-transparent"
      }`}
    >
      {/* Checkerboard hint in preview mode */}
      {isPreviewBg && (
        <div className="pointer-events-none absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px]" />
      )}

      {/* Top Control Bar (Shown in preview mode or on hover) */}
      <div
        className={`fixed top-4 left-4 right-4 z-50 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-2.5 text-xs text-white backdrop-blur-md transition-opacity duration-300 ${
          isPreviewBg ? "opacity-100" : "opacity-0 hover:opacity-100"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-pink-400">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            TipEcho OBS Overlay
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-slate-200">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            คิวรอแสดงผล: <strong className="text-white">{queue.length}</strong> รายการ
          </span>
          <button
            type="button"
            onClick={toggleTtsEnabled}
            title="คลิกเพื่อเปิด/ปิดระบบอ่านข้อความโดเนท (TTS)"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
              settings.ttsEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
            }`}
          >
            {settings.ttsEnabled ? (
              <Mic className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <MicOff className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span>TTS อ่านข้อความ: {settings.ttsEnabled ? "เปิดอยู่" : "ปิดอยู่"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={triggerDemoAlert}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pink-500 px-3 py-1.5 font-bold text-white hover:bg-pink-400 transition cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            ยิงแจ้งเตือน + ทดสอบเสียงอ่าน
          </button>

          {activeAlert && (
            <button
              type="button"
              onClick={skipCurrent}
              className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              <SkipForward className="h-3.5 w-3.5" />
              ข้ามรายการนี้
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const nextMuted = !localMuted;
              setLocalMuted(nextMuted);
              if (nextMuted) stopSpeaking();
            }}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-semibold transition cursor-pointer ${
              localMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {localMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {localMuted ? "ปิดเสียงอยู่" : "เปิดเสียง"}
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewBg((p) => !p)}
            className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/20 transition cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            {isPreviewBg ? "ซ่อนพื้นหลัง (โหมด OBS โปร่งใส)" : "แสดงพื้นหลังจำลอง"}
          </button>
        </div>
      </div>

      {/* Center Stage: Active Donation Alert */}
      <div className="relative z-10 flex w-full items-center justify-center p-6">
        {activeAlert ? (
          <AlertCard
            key={activeAlert.id}
            donation={activeAlert}
            durationSec={settings.alertDurationSec || 7}
            isSpeaking={isSpeaking}
          />
        ) : (
          isPreviewBg && (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/20 bg-slate-900/50 p-10 text-center text-slate-400 max-w-md backdrop-blur-sm">
              <div className="mb-3 text-4xl">📺</div>
              <p className="text-base font-bold text-slate-200">
                กำลังรอรับการแจ้งเตือนของขวัญ...
              </p>
              <p className="mt-1 text-xs text-slate-400">
                เมื่อมีผู้โดเนทส่งของขวัญ อิโมจิ ชื่อผู้โดเนท ข้อความ และยอดโดเนทจะเด้งขึ้นมาพร้อมเสียงอ่านข้อความอัตโนมัติ (TTS)
              </p>
              <button
                type="button"
                onClick={triggerDemoAlert}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-pink-500/20 border border-pink-500/40 px-4 py-2 text-xs font-bold text-pink-300 hover:bg-pink-500/30 transition cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                กดทดสอบแจ้งเตือนและเสียงอ่านทันที
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function OverlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <OverlayContent />
    </Suspense>
  );
}
