"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Gift,
  Heart,
  Send,
  Tv,
  LayoutDashboard,
  CheckCircle2,
  QrCode,
  Zap,
  User,
  MessageSquareHeart,
  Plus,
  Minus,
  ShieldCheck,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CreatorSettings, Donation, GiftItem, StreamEvent } from "@/lib/types";
import AlertCard from "@/components/AlertCard";
import {
  formatDonationSpeechText,
  playAlertSound,
  speakDonationMessage,
  stopSpeaking,
} from "@/lib/sound";

const PRESET_QUANTITIES = [1, 3, 5, 10, 20];

export default function DonorPage() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [settings, setSettings] = useState<CreatorSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Donor form state
  const [selectedGiftId, setSelectedGiftId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [donorName, setDonorName] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  // Mock payment & status state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"instant" | "qr">("instant");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSentDonation, setLastSentDonation] = useState<Donation | null>(null);
  const [isPreviewSpeaking, setIsPreviewSpeaking] = useState(false);

  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch("/api/donations");
        const data = await res.json();
        if (data.gifts) {
          setGifts(data.gifts);
          if (data.gifts.length > 0) {
            setSelectedGiftId(data.gifts[0].id);
          }
        }
        if (data.donations) setDonations(data.donations);
        if (data.settings) setSettings(data.settings);
      } catch (err) {
        console.error("Failed to fetch initial store:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();

    // Real-time SSE subscription
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      try {
        const event: StreamEvent = JSON.parse(e.data);
        if (event.type === "donation:new") {
          setDonations((prev) => [event.donation, ...prev.filter((d) => d.id !== event.donation.id)].slice(0, 50));
        } else if (event.type === "gifts:updated") {
          setGifts(event.gifts);
        } else if (event.type === "settings:updated") {
          setSettings(event.settings);
        }
      } catch {
        // Ignore parse error
      }
    };
    return () => es.close();
  }, []);

  const selectedGift = useMemo(() => {
    return gifts.find((g) => g.id === selectedGiftId) || gifts[0] || null;
  }, [gifts, selectedGiftId]);

  const totalAmount = useMemo(() => {
    if (!selectedGift) return 0;
    return selectedGift.price * quantity;
  }, [selectedGift, quantity]);

  const totalDonatedAmount = useMemo(() => {
    return donations.reduce((acc, d) => acc + d.amount, 0);
  }, [donations]);

  const previewDonation: Donation = useMemo(() => {
    return {
      id: "preview",
      donorName: donorName.trim() || "ผู้ไม่ประสงค์ออกนาม",
      message: message.trim() || "ส่งกำลังใจให้สตรีมเมอร์นะครับ! สู้ๆ ✨",
      giftId: selectedGift?.id || "gift-heart",
      giftName: selectedGift?.name || "หัวใจกำลังใจ",
      emoji: selectedGift?.emoji || "💖",
      unitPrice: selectedGift?.price || 10,
      quantity: quantity,
      amount: totalAmount,
      color: selectedGift?.color || "#ec4899",
      soundType: selectedGift?.soundType || "magic",
      createdAt: new Date().toISOString(),
    };
  }, [donorName, message, selectedGift, quantity, totalAmount]);

  const handlePreviewVoice = async () => {
    if (isPreviewSpeaking) {
      stopSpeaking();
      setIsPreviewSpeaking(false);
      return;
    }
    await speakDonationMessage(
      previewDonation,
      { ...(settings || {}), ttsMinAmount: 0 },
      {
        onStart: () => setIsPreviewSpeaking(true),
        onEnd: () => setIsPreviewSpeaking(false),
      }
    );
  };

  const handleConfirmDonation = async () => {
    if (!selectedGift || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorName: donorName.trim() || "ผู้ไม่ประสงค์ออกนาม",
          message: message.trim(),
          giftId: selectedGift.id,
          quantity,
        }),
      });
      const data = await res.json();
      if (res.ok && data.donation) {
        setLastSentDonation(data.donation);
        setShowPaymentModal(false);
        setMessage("");
        playAlertSound(selectedGift.soundType);
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 },
        });
      }
    } catch (err) {
      console.error("Failed to send donation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">กำลังโหลดหน้าส่งของขวัญ TipEcho...</p>
        </div>
      </div>
    );
  }

  const goalTarget = settings?.goalTargetAmount || 5000;
  const goalPercent = Math.min(100, Math.round((totalDonatedAmount / goalTarget) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-pink-600/15 blur-[130px]" />
        <div className="absolute top-1/3 right-10 h-96 w-96 rounded-full bg-indigo-600/15 blur-[130px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-600 text-xl shadow-lg shadow-pink-500/20">
              🎁
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-pink-200 to-indigo-200 bg-clip-text text-transparent">
                TipEcho
              </span>
              <span className="ml-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                ไม่ต้องสมัครสมาชิก
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/overlay?preview=1"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-500/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition"
            >
              <Tv className="h-4 w-4" />
              <span>เปิดหน้าแจ้งเตือน (OBS Overlay)</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>หลังบ้านครีเอเตอร์</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-8">
        {/* Creator Profile Banner */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-4xl shadow-lg shadow-pink-500/25">
                {settings?.creatorAvatarEmoji || "🎮"}
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-slate-900 text-[10px] font-bold">
                  LIVE
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {settings?.creatorName || "MochiChan Live"}
                  </h1>
                  <span className="text-sm font-medium text-pink-400">
                    {settings?.creatorHandle || "@mochichan"}
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
                  {settings?.creatorBio}
                </p>
              </div>
            </div>

            {/* Donation Goal Box */}
            <div className="w-full md:w-80 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span className="truncate">{settings?.goalTitle || "เป้าหมายการโดเนท"}</span>
                <span className="text-pink-400 font-bold">{goalPercent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>สะสมแล้ว ฿{totalDonatedAmount.toLocaleString()}</span>
                <span>เป้าหมาย ฿{goalTarget.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Success Toast Banner if just donated */}
        {lastSentDonation && (
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200 shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold text-white">
                  ส่งของขวัญสำเร็จแล้ว! {lastSentDonation.emoji} {lastSentDonation.giftName} ×
                  {lastSentDonation.quantity} (฿{lastSentDonation.amount.toLocaleString()})
                </p>
                <p className="text-xs text-emerald-300">
                  การแจ้งเตือนถูกส่งไปยังคิวหน้าจอไลฟ์สด (OBS Overlay) ของครีเอเตอร์เรียบร้อยแล้ว
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastSentDonation(null)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              รับทราบ
            </button>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Gift Selection & Donor Info (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Select Gift */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                    1
                  </span>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-pink-400" />
                    เลือกของขวัญที่ต้องการส่ง
                  </h2>
                </div>
                <span className="text-xs text-slate-400">คลิกเลือกสินค้าด้านล่าง</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {gifts.map((gift) => {
                  const isSelected = selectedGift?.id === gift.id;
                  return (
                    <button
                      key={gift.id}
                      type="button"
                      onClick={() => setSelectedGiftId(gift.id)}
                      className={`group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200 ${
                        isSelected
                          ? "border-pink-500 bg-pink-500/15 shadow-[0_0_25px_rgba(236,72,153,0.25)] scale-[1.02]"
                          : "border-white/10 bg-slate-950/60 hover:border-white/25 hover:bg-slate-900"
                      }`}
                    >
                      {gift.badge && (
                        <span
                          className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow"
                          style={{ background: gift.color }}
                        >
                          {gift.badge}
                        </span>
                      )}

                      <div
                        className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl text-4xl transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${gift.color}22` }}
                      >
                        {gift.emoji}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1">
                        {gift.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                        {gift.description}
                      </p>

                      <div
                        className="mt-3 inline-flex items-center rounded-xl px-3 py-1 text-sm font-extrabold text-white"
                        style={{
                          background: isSelected ? gift.color : "rgba(255,255,255,0.08)",
                        }}
                      >
                        ฿{gift.price.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity Selector */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <label className="text-sm font-bold text-white block">
                      จำนวนของขวัญที่ต้องการส่ง
                    </label>
                    <p className="text-xs text-slate-400">
                      เลือกจำนวนชิ้นเพื่อเพิ่มระดับความอลังการของการแจ้งเตือน
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/15 transition"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))
                      }
                      className="h-10 w-20 rounded-xl border border-white/15 bg-slate-900 text-center text-base font-extrabold text-white focus:border-pink-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/15 transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Quantity Pills */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 mr-1">เลือกด่วน:</span>
                  {PRESET_QUANTITIES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        quantity === preset
                          ? "bg-pink-500 text-white shadow-sm"
                          : "bg-white/5 text-slate-300 hover:bg-white/15"
                      }`}
                    >
                      ×{preset} ชิ้น (฿{((selectedGift?.price || 0) * preset).toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Donor Name & Message */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                    2
                  </span>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquareHeart className="h-5 w-5 text-pink-400" />
                    กรอกชื่อและข้อความแจ้งเตือน
                  </h2>
                </div>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> ไม่ต้องล็อกอิน
                </span>
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-pink-400" />
                    ชื่อผู้โดเนท (แสดงบนหน้าจอไลฟ์)
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    เว้นว่างได้หากไม่ประสงค์ออกนาม
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder="เช่น น้องแมวส้ม, แฟนคลับเบอร์หนึ่ง (หรือเว้นว่าง)"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span>
                      ข้อความถึงครีเอเตอร์{" "}
                      {settings?.ttsEnabled ? (
                        <span className="text-emerald-400 font-bold">
                          (เปิดเสียงอ่านออกอากาศ TTS 🔊)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          (แสดงข้อความบนหน้าจอไลฟ์)
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {message.length}/200 ตัวอักษร
                  </span>
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  placeholder={
                    settings?.ttsEnabled
                      ? "พิมพ์ข้อความให้กำลังใจ หรือสิ่งที่อยากบอกสตรีมเมอร์... (ระบบจะอ่านออกเสียงให้ตอนขึ้นจอ)"
                      : "พิมพ์ข้อความให้กำลังใจ หรือสิ่งที่อยากบอกสตรีมเมอร์..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                />

                {/* TTS Voice Preview Box (Shown when streamer enables TTS) */}
                {settings?.ttsEnabled ? (
                  <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                        <Volume2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                        <span>
                          ประโยคที่จะอ่านออกเสียงบนไลฟ์สด
                          {settings?.ttsMinAmount && settings.ttsMinAmount > 0
                            ? ` (เมื่อโดเนทตั้งแต่ ฿${settings.ttsMinAmount} ขึ้นไป)`
                            : ""}
                          :
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-300 truncate">
                        &ldquo;{formatDonationSpeechText(previewDonation, settings || undefined)}&rdquo;
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePreviewVoice}
                      className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        isPreviewSpeaking
                          ? "bg-rose-500 text-white"
                          : "bg-indigo-500 text-white hover:bg-indigo-400"
                      }`}
                    >
                      {isPreviewSpeaking ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5" />
                          หยุดฟังเสียง
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          ทดลองฟังเสียงอ่าน
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                    <VolumeX className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>
                      ขณะนี้สตรีมเมอร์ปิดเสียงอ่านข้อความอัตโนมัติ (TTS) อยู่ ข้อความจะแสดงเป็นตัวอักษรบนหน้าจอไลฟ์สด
                    </span>
                  </div>
                )}
              </div>

              {/* Submit / Send Gift Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!selectedGift}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 px-6 py-4 text-base sm:text-lg font-extrabold text-white shadow-xl shadow-pink-500/25 hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
                >
                  <Send className="h-5 w-5" />
                  <span>
                    ส่ง {selectedGift?.emoji} {selectedGift?.name} (×{quantity}) — ยอดโดเนท ฿
                    {totalAmount.toLocaleString()}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Alert Preview & Recent Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Preview Card */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">
                    ตัวอย่างการแจ้งเตือนบนหน้าจอ
                  </h2>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                  Live Preview
                </span>
              </div>

              <div className="flex items-center justify-center py-2">
                <AlertCard
                  donation={previewDonation}
                  durationSec={60}
                  compact
                  isSpeaking={isPreviewSpeaking}
                />
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                แสดงผลครบทั้ง <strong className="text-slate-200">อิโมจิของขวัญ</strong> •{" "}
                <strong className="text-slate-200">ชื่อผู้โดเนท</strong> •{" "}
                <strong className="text-slate-200">ข้อความ</strong> •{" "}
                <strong className="text-slate-200">จำนวนการโดเนท</strong>
              </p>
            </div>

            {/* Recent Gift Feed */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-pink-400" />
                  ผู้ส่งของขวัญล่าสุด ({donations.length})
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  เรียลไทม์
                </span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {donations.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">
                    ยังไม่มีรายการส่งของขวัญ มาเป็นคนแรกกันเลย!
                  </p>
                ) : (
                  donations.slice(0, 8).map((don) => (
                    <div
                      key={don.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                        style={{ backgroundColor: `${don.color}25` }}
                      >
                        {don.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-white truncate">
                            {don.donorName}
                          </p>
                          <span
                            className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-extrabold text-white"
                            style={{ backgroundColor: don.color }}
                          >
                            ฿{don.amount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          ส่ง <span className="font-semibold text-white">{don.giftName}</span> ×
                          {don.quantity} ชิ้น
                        </p>
                        {don.message && (
                          <p className="mt-1.5 text-xs text-slate-400 bg-white/5 rounded-lg px-2.5 py-1.5 line-clamp-2">
                            &ldquo;{don.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mock Payment Modal */}
      {showPaymentModal && selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6 text-white shadow-2xl animate-alert-pop">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-extrabold">ยืนยันการส่งของขวัญ (Mock Payment)</h3>
                <p className="text-xs text-slate-400">
                  ระบบจำลองการชำระเงิน สามารถกดส่งแจ้งเตือนขึ้นจอได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/20"
              >
                ปิด
              </button>
            </div>

            {/* Summary Box */}
            <div className="my-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
                style={{ backgroundColor: `${selectedGift.color}25` }}
              >
                {selectedGift.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">
                  ผู้ส่ง: <strong className="text-white">{donorName.trim() || "ผู้ไม่ประสงค์ออกนาม"}</strong>
                </p>
                <p className="text-base font-bold text-white truncate">
                  {selectedGift.name} × {quantity} ชิ้น
                </p>
                <p className="text-xl font-black text-pink-400 mt-0.5">
                  ยอดชำระ ฿{totalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Mode Switch */}
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setPaymentMode("instant")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  paymentMode === "instant"
                    ? "bg-pink-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                ส่งทันที (1-Click Mock)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("qr")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  paymentMode === "qr"
                    ? "bg-pink-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                จำลอง QR พร้อมเพย์
              </button>
            </div>

            {paymentMode === "qr" && (
              <div className="mb-4 flex flex-col items-center rounded-2xl border border-white/10 bg-white p-4 text-slate-900">
                <div className="mb-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  THAI QR PROMPTPAY (MOCK)
                </div>
                <div className="flex h-36 w-36 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                  <QrCode className="h-24 w-24 text-slate-800" />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  ยอดโอน ฿{totalAmount.toLocaleString()}.00 บาท
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmDonation}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-base font-extrabold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition cursor-pointer"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>
                {isSubmitting
                  ? "กำลังส่งแจ้งเตือน..."
                  : `ยืนยันการชำระเงิน ฿${totalAmount.toLocaleString()} และส่งแจ้งเตือน`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

