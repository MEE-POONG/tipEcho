"use client";

import React from "react";
import { Donation } from "@/lib/types";
import { Sparkles, Volume2 } from "lucide-react";

interface AlertCardProps {
  donation: Donation;
  durationSec?: number;
  compact?: boolean;
  isSpeaking?: boolean;
}

export default function AlertCard({
  donation,
  durationSec = 7,
  compact = false,
  isSpeaking = false,
}: AlertCardProps) {
  const accentColor = donation.color || "#ec4899";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/25 bg-slate-950/90 text-white shadow-[0_20px_70px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-500 animate-alert-pop ${
        compact ? "p-5 max-w-md w-full" : "p-7 max-w-xl w-full"
      }`}
      style={{
        boxShadow: `0 20px 60px -10px ${accentColor}66, 0 0 0 1px ${accentColor}55`,
      }}
    >
      {/* Ambient Radial Glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-40"
        style={{ background: accentColor }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full blur-3xl opacity-30"
        style={{ background: accentColor }}
      />

      {/* Floating Background Emojis */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
        <span className="absolute top-3 left-8 text-2xl animate-float-slow">
          {donation.emoji}
        </span>
        <span className="absolute bottom-4 right-10 text-3xl animate-float-fast">
          {donation.emoji}
        </span>
        <span className="absolute top-1/2 right-6 text-xl animate-pulse">
          ✨
        </span>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Top Tag + Active TTS Soundwave Indicator */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, #6366f1)`,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>NEW GIFT DONATION!</span>
          </div>

          {isSpeaking && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 shadow-sm animate-pulse">
              <Volume2 className="h-3.5 w-3.5 text-emerald-300" />
              <span>กำลังอ่านข้อความ...</span>
            </div>
          )}
        </div>

        {/* Big Animated Emoji & Quantity Pill */}
        <div className="relative my-2 flex items-center justify-center">
          <div
            className={`flex items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-inner animate-emoji-bounce ${
              compact ? "h-20 w-20 text-5xl" : "h-28 w-28 text-6xl"
            }`}
            style={{
              boxShadow: `0 0 35px ${accentColor}77`,
            }}
          >
            <span className="select-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]">
              {donation.emoji}
            </span>
          </div>

          {/* Quantity Badge */}
          <div
            className="absolute -bottom-2 -right-3 flex items-center justify-center rounded-full border-2 border-slate-950 px-3 py-0.5 text-sm font-black text-white shadow-lg"
            style={{ background: accentColor }}
          >
            ×{donation.quantity}
          </div>
        </div>

        {/* Donor Name + Gift Action */}
        <div className="mt-3 space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-lg sm:text-xl font-bold leading-snug">
            <span
              className="font-extrabold tracking-tight"
              style={{ color: accentColor }}
            >
              {donation.donorName}
            </span>
            <span className="text-slate-300 font-medium text-base">ส่ง</span>
            <span className="text-white font-bold underline decoration-white/30 underline-offset-4">
              {donation.giftName}
            </span>
            <span className="text-slate-300 text-base font-semibold">
              ({donation.quantity} ชิ้น)
            </span>
          </div>

          {/* Total Donation Amount Pill */}
          <div className="pt-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 px-4 py-1 text-xl sm:text-2xl font-black tracking-tight text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}88)`,
              }}
            >
              <span>ยอดโดเนท</span>
              <span>฿{donation.amount.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Donor Message */}
        {donation.message && (
          <div
            className={`mt-4 w-full rounded-2xl border px-4 py-3 text-center backdrop-blur-md transition-all ${
              isSpeaking
                ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                : "border-white/15 bg-white/10"
            }`}
          >
            <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-100 break-words">
              &ldquo;{donation.message}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Bottom Timer Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 overflow-hidden">
        <div
          className="h-full origin-left animate-progress-shrink"
          style={{
            background: accentColor,
            animationDuration: `${durationSec}s`,
          }}
        />
      </div>
    </div>
  );
}
