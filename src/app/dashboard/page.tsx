"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Gift,
  Settings,
  History,
  Copy,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Play,
  SkipForward,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  TrendingUp,
  Package,
  Users,
  Save,
  Mic,
  MicOff,
} from "lucide-react";
import {
  CreatorSettings,
  Donation,
  GiftItem,
  SoundType,
  StreamEvent,
  TtsEngine,
  TtsReadMode,
} from "@/lib/types";
import {
  formatDonationSpeechText,
  playAlertSound,
  speakDonationMessage,
  stopSpeaking,
} from "@/lib/sound";

const PRESET_EMOJIS = ["💖", "☕", "🧋", "🍕", "🚀", "👑", "🎉", "💎", "🔥", "🐱", "🍰", "🎸", "🌟", "🏆"];
const PRESET_COLORS = ["#ec4899", "#f59e0b", "#a855f7", "#ef4444", "#3b82f6", "#eab308", "#10b981", "#06b6d4"];
const TEMPLATE_TOKENS = [
  { token: "{donor}", label: "ชื่อผู้โดเนท" },
  { token: "{gift}", label: "ชื่อของขวัญ" },
  { token: "{qty}", label: "จำนวนชิ้น" },
  { token: "{amount}", label: "ยอดเงิน (บาท)" },
  { token: "{message}", label: "ข้อความโดเนท" },
];

export default function CreatorDashboardPage() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
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
    goalTitle: "อัปเกรดไมโครโฟนใหม่สำหรับไลฟ์สด 🎙️",
    goalTargetAmount: 5000,
  });

  const [activeTab, setActiveTab] = useState<"history" | "gifts" | "settings">("history");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // New gift form state
  const [newGift, setNewGift] = useState<{
    name: string;
    emoji: string;
    price: number;
    description: string;
    color: string;
    soundType: SoundType;
    badge: string;
  }>({
    name: "",
    emoji: "🎁",
    price: 50,
    description: "",
    color: "#ec4899",
    soundType: "magic",
    badge: "",
  });

  useEffect(() => {
    fetch("/api/donations")
      .then((r) => r.json())
      .then((data) => {
        if (data.gifts) setGifts(data.gifts);
        if (data.donations) setDonations(data.donations);
        if (data.settings) setSettings(data.settings);
      })
      .catch(console.error);

    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      try {
        const event: StreamEvent = JSON.parse(e.data);
        if (event.type === "donation:new") {
          setDonations((prev) => [event.donation, ...prev.filter((d) => d.id !== event.donation.id)]);
        } else if (event.type === "gifts:updated") {
          setGifts(event.gifts);
        } else if (event.type === "settings:updated") {
          setSettings(event.settings);
        }
      } catch {
        // Ignore
      }
    };
    return () => es.close();
  }, []);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const copyLink = (path: string, key: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
    const totalGiftsCount = donations.reduce((sum, d) => sum + d.quantity, 0);
    const uniqueDonors = new Set(donations.map((d) => d.donorName)).size;
    return {
      totalAmount,
      totalDonations: donations.length,
      totalGiftsCount,
      uniqueDonors,
    };
  }, [donations]);

  const sampleTtsDonation = useMemo(
    () => ({
      donorName: "น้องแมวส้ม",
      giftName: "ชานมไข่มุกหวานร้อย",
      quantity: 2,
      amount: 98,
      message: "สู้ๆ นะครับสตรีมเมอร์ ชานมแก้ง่วงครับผม",
    }),
    []
  );

  const handleSpeakDonationItem = async (
    id: string,
    don: Pick<Donation, "donorName" | "giftName" | "quantity" | "amount" | "message">
  ) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    await speakDonationMessage(
      don,
      { ...settings, ttsMinAmount: 0 },
      {
        onStart: () => setSpeakingId(id),
        onEnd: () => setSpeakingId(null),
      }
    );
  };

  const handleTestAlert = async () => {
    const sampleGift = gifts[Math.floor(Math.random() * gifts.length)] || {
      id: "gift-heart",
    };
    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorName: "ระบบทดสอบ (Test Alert)",
        message: "สวัสดีครับ ทดสอบระบบอ่านข้อความโดเนทอัตโนมัติบนหน้าจอไลฟ์สด!",
        giftId: sampleGift.id,
        quantity: 2,
      }),
    });
    if (res.ok) {
      showToast("ส่งแจ้งเตือนทดสอบพร้อมเสียงอ่านเข้าคิว OBS Overlay เรียบร้อยแล้ว!");
    }
  };

  const handleReplay = async (donationId: string) => {
    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replay", donationId }),
    });
    if (res.ok) {
      showToast("ส่งรายการนี้ขึ้นแสดงซ้ำและอ่านข้อความบนหน้าจอ OBS Overlay แล้ว!");
    }
  };

  const handleSkipAlert = async () => {
    stopSpeaking();
    await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip" }),
    });
    showToast("สั่งข้ามการแจ้งเตือนและหยุดเสียงอ่านปัจจุบันแล้ว");
  };

  const handleSaveGifts = async (updatedList: GiftItem[]) => {
    const res = await fetch("/api/gifts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gifts: updatedList }),
    });
    const data = await res.json();
    if (res.ok && data.gifts) {
      setGifts(data.gifts);
      showToast("บันทึกรายการสินค้า/ของขวัญเรียบร้อยแล้ว!");
    }
  };

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGift.name.trim()) return;
    const item: GiftItem = {
      id: `gift-${Date.now()}`,
      name: newGift.name.trim(),
      emoji: newGift.emoji || "🎁",
      price: Math.max(1, Number(newGift.price) || 10),
      description: newGift.description.trim() || "ของขวัญพิเศษสำหรับสตรีมเมอร์",
      color: newGift.color,
      soundType: newGift.soundType,
      badge: newGift.badge.trim() || undefined,
    };
    const updated = [...gifts, item];
    await handleSaveGifts(updated);
    setNewGift({
      name: "",
      emoji: "🎁",
      price: 50,
      description: "",
      color: "#ec4899",
      soundType: "magic",
      badge: "",
    });
  };

  const handleDeleteGift = async (id: string) => {
    if (gifts.length <= 1) {
      showToast("ต้องมีของขวัญอย่างน้อย 1 รายการในระบบ");
      return;
    }
    const updated = gifts.filter((g) => g.id !== id);
    await handleSaveGifts(updated);
  };

  const handleResetDefaultGifts = async () => {
    const res = await fetch("/api/gifts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetDefault: true }),
    });
    const data = await res.json();
    if (res.ok && data.gifts) {
      setGifts(data.gifts);
      showToast("รีเซ็ตรายการของขวัญเป็นค่าเริ่มต้นเรียบร้อยแล้ว");
    }
  };

  const handleQuickToggleTts = async (nextEnabled?: boolean) => {
    const targetState = nextEnabled !== undefined ? nextEnabled : !settings.ttsEnabled;
    if (!targetState) {
      stopSpeaking();
      setSpeakingId(null);
    }
    setSettings((prev) => ({ ...prev, ttsEnabled: targetState }));
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttsEnabled: targetState }),
    });
    const data = await res.json();
    if (res.ok && data.settings) {
      setSettings(data.settings);
      showToast(
        targetState
          ? "🔊 เปิดใช้งานระบบอ่านข้อความโดเนท (TTS) เรียบร้อยแล้ว!"
          : "🔇 ปิดระบบอ่านข้อความโดเนท (TTS) เรียบร้อยแล้ว (แสดงเฉพาะข้อความบนจอ)"
      );
    }
  };

  const handleQuickToggleSound = async (nextEnabled?: boolean) => {
    const targetState = nextEnabled !== undefined ? nextEnabled : !settings.soundEnabled;
    setSettings((prev) => ({ ...prev, soundEnabled: targetState }));
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundEnabled: targetState }),
    });
    const data = await res.json();
    if (res.ok && data.settings) {
      setSettings(data.settings);
      showToast(
        targetState
          ? "🔔 เปิดเสียงเอฟเฟกต์แจ้งเตือนของขวัญแล้ว"
          : "🔕 ปิดเสียงเอฟเฟกต์แจ้งเตือนของขวัญแล้ว"
      );
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (res.ok && data.settings) {
      setSettings(data.settings);
      showToast("บันทึกการตั้งค่าครีเอเตอร์และระบบเสียงอ่านข้อความเรียบร้อยแล้ว!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-indigo-600 text-xl shadow-lg">
                🎛️
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-white">
                  TipEcho Creator Studio
                </h1>
                <p className="text-xs text-slate-400">
                  จัดการของขวัญ ระบบอ่านข้อความโดเนท (TTS) และคิวแจ้งเตือน OBS
                </p>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1-Click TTS Toggle Button for Streamer */}
            <button
              type="button"
              onClick={() => handleQuickToggleTts()}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                settings.ttsEnabled
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
              }`}
              title="คลิกเพื่อเปิด/ปิดระบบอ่านข้อความโดเนททันที"
            >
              {settings.ttsEnabled ? (
                <Mic className="h-4 w-4 text-emerald-400" />
              ) : (
                <MicOff className="h-4 w-4 text-rose-400" />
              )}
              <span>
                อ่านข้อความโดเนท (TTS): {settings.ttsEnabled ? "เปิดอยู่" : "ปิดอยู่"}
              </span>
              <span
                className={`ml-1 inline-flex h-4 w-7 items-center rounded-full p-0.5 transition-colors ${
                  settings.ttsEnabled ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full bg-white transition-transform ${
                    settings.ttsEnabled ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestAlert}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              ยิงแจ้งเตือนทดสอบ
            </button>
            <button
              type="button"
              onClick={handleSkipAlert}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition cursor-pointer"
            >
              <SkipForward className="h-3.5 w-3.5" />
              ข้ามแจ้งเตือนปัจจุบัน
            </button>
            <Link
              href="/overlay?preview=1"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              หน้าจอ OBS Overlay
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              หน้าส่งของขวัญ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-8 space-y-8">
        {statusBanner && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-200 shadow-lg flex items-center justify-between">
            <span>✅ {statusBanner}</span>
            <button
              onClick={() => setStatusBanner(null)}
              className="text-xs underline text-emerald-300"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Quick Links for OBS & Donor Page */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-pink-500/25 bg-slate-900/80 p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                ลิงก์สำหรับผู้โดเนท (ไม่ต้องสมัครสมาชิก)
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                ส่งให้ผู้ชมในแชทไลฟ์สดเพื่อเลือกของขวัญและส่งข้อความพร้อมเสียงอ่านขึ้นจอ
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyLink("/", "donor")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-pink-400 transition cursor-pointer"
            >
              {copiedKey === "donor" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedKey === "donor" ? "คัดลอกแล้ว!" : "คัดลอกลิงก์โดเนท"}
            </button>
          </div>

          <div className="rounded-2xl border border-indigo-500/25 bg-slate-900/80 p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                ลิงก์สำหรับใส่ใน OBS Studio (Browser Source)
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                นำไปวางใน OBS Browser Source (แสดงแจ้งเตือน + อ่านออกเสียงข้อความอัตโนมัติ)
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyLink("/overlay", "obs")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-400 transition cursor-pointer"
            >
              {copiedKey === "obs" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedKey === "obs" ? "คัดลอกแล้ว!" : "คัดลอกลิงก์ OBS"}
            </button>
          </div>
        </section>

        {/* Streamer TTS & Sound Master Switch Bar */}
        <section className="rounded-3xl border border-white/15 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition ${
                  settings.ttsEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                    : "bg-slate-800 text-slate-400 border border-white/10"
                }`}
              >
                {settings.ttsEnabled ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    ระบบอ่านข้อความโดเนทออกเสียง (Text-to-Speech)
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                      settings.ttsEnabled
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {settings.ttsEnabled ? "กำลังเปิดใช้งาน" : "ปิดใช้งานอยู่"}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-300">
                  {settings.ttsEnabled
                    ? "เมื่อมีผู้ส่งของขวัญ ระบบจะอ่านชื่อผู้โดเนท ของขวัญ และข้อความออกเสียงบนหน้าจอ OBS อัตโนมัติ"
                    : "ขณะนี้ปิดการอ่านออกเสียงอยู่ การแจ้งเตือนบนหน้าจอ OBS จะแสดงเฉพาะภาพอิโมจิและข้อความเท่านั้น"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickToggleTts()}
                className={`inline-flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-lg transition cursor-pointer ${
                  settings.ttsEnabled
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                }`}
              >
                {settings.ttsEnabled ? (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>เปิดอ่านข้อความอยู่ (คลิกเพื่อปิด)</span>
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 text-rose-400" />
                    <span>คลิกเพื่อเปิดระบบอ่านข้อความ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-3 text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 transition cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                ตั้งค่าเสียงอ่านเพิ่มเติม
              </button>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>ยอดโดเนทรวมทั้งหมด</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
              ฿{stats.totalAmount.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>จำนวนครั้งที่โดเนท</span>
              <Sparkles className="h-4 w-4 text-pink-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
              {stats.totalDonations.toLocaleString()} ครั้ง
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>ของขวัญที่ได้รับรวม</span>
              <Package className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
              {stats.totalGiftsCount.toLocaleString()} ชิ้น
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>จำนวนผู้ส่งของขวัญ</span>
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
              {stats.uniqueDonors.toLocaleString()} คน
            </p>
          </div>
        </section>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              activeTab === "history"
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            ประวัติการโดเนท & เสียงอ่าน ({donations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gifts")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              activeTab === "gifts"
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Gift className="h-4 w-4" />
            จัดการสินค้า / ของขวัญ ({gifts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              activeTab === "settings"
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            ตั้งค่าระบบอ่านข้อความโดเนท (TTS) & โปรไฟล์
          </button>
        </div>

        {/* TAB 1: Donation History & Replay */}
        {activeTab === "history" && (
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  รายการของขวัญที่ได้รับแบบเรียลไทม์
                </h2>
                <p className="text-xs text-slate-400">
                  กดปุ่ม &ldquo;ฟังเสียงอ่าน&rdquo; เพื่อฟังเสียง TTS หรือกดปุ่ม &ldquo;ส่งขึ้นจอซ้ำ (Replay)&rdquo; เพื่อแสดงแจ้งเตือนบนหน้าจอ OBS อีกครั้ง
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
                ตั้งค่าเสียงอ่าน TTS ({settings.ttsEnabled ? "เปิดอยู่" : "ปิดอยู่"})
              </button>
            </div>

            <div className="space-y-3">
              {donations.map((don) => {
                const isThisSpeaking = speakingId === don.id;
                return (
                  <div
                    key={don.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 hover:border-white/20 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                        style={{ backgroundColor: `${don.color}25` }}
                      >
                        {don.emoji}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-base text-white">
                            {don.donorName}
                          </span>
                          <span className="text-xs text-slate-400">ส่ง</span>
                          <span
                            className="rounded-lg px-2.5 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: don.color }}
                          >
                            {don.emoji} {don.giftName} ×{don.quantity} ชิ้น
                          </span>
                          <span className="text-sm font-black text-emerald-400">
                            ฿{don.amount.toLocaleString()}
                          </span>
                        </div>
                        {don.message && (
                          <p className="mt-1.5 text-sm text-slate-200">
                            &ldquo;{don.message}&rdquo;
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">
                          เวลา: {new Date(don.createdAt).toLocaleString("th-TH")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSpeakDonationItem(don.id, don)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                          isThisSpeaking
                            ? "border-rose-500/40 bg-rose-500/20 text-rose-300"
                            : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                        }`}
                      >
                        {isThisSpeaking ? (
                          <>
                            <VolumeX className="h-3.5 w-3.5" />
                            หยุดเสียงอ่าน
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            ฟังเสียงอ่าน
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReplay(don.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-500/10 px-3.5 py-2 text-xs font-bold text-pink-300 hover:bg-pink-500/20 transition cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        ส่งขึ้นจอซ้ำ (Replay)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: Gift Catalog Manager */}
        {activeTab === "gifts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add New Gift Form (5 cols) */}
            <form
              onSubmit={handleAddGift}
              className="lg:col-span-5 rounded-3xl border border-white/10 bg-slate-900/70 p-6 space-y-4 h-fit"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-pink-400" />
                เพิ่มของขวัญ / สินค้าใหม่
              </h2>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  เลือกอิโมจิของขวัญ
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewGift({ ...newGift, emoji: em })}
                      className={`h-9 w-9 rounded-xl text-lg flex items-center justify-center border transition ${
                        newGift.emoji === em
                          ? "border-pink-500 bg-pink-500/20 scale-110"
                          : "border-white/10 bg-slate-950 hover:bg-white/10"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newGift.emoji}
                  onChange={(e) => setNewGift({ ...newGift, emoji: e.target.value })}
                  placeholder="หรือพิมพ์อิโมจิที่ต้องการ"
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ชื่อของขวัญ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ชานมไข่มุก"
                    value={newGift.name}
                    onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ราคาต่อชิ้น (บาท) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newGift.price}
                    onChange={(e) => setNewGift({ ...newGift, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  คำอธิบายสั้นๆ
                </label>
                <input
                  type="text"
                  placeholder="เช่น เติมพลังความสดชื่นให้สตรีมเมอร์"
                  value={newGift.description}
                  onChange={(e) => setNewGift({ ...newGift, description: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    เสียงเอฟเฟกต์แจ้งเตือน
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={newGift.soundType}
                      onChange={(e) =>
                        setNewGift({ ...newGift, soundType: e.target.value as SoundType })
                      }
                      className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="chime">Chime (สดใส)</option>
                      <option value="magic">Magic (วิ้งวับ)</option>
                      <option value="rocket">Rocket (จรวดพุ่ง)</option>
                      <option value="fanfare">Fanfare (อลังการ)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => playAlertSound(newGift.soundType)}
                      title="ทดลองฟังเสียง"
                      className="shrink-0 rounded-xl bg-white/10 px-3 text-white hover:bg-white/20"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ป้ายกำกับ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ขายดี, VIP"
                    value={newGift.badge}
                    onChange={(e) => setNewGift({ ...newGift, badge: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  สีธีมการ์ดแจ้งเตือน
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewGift({ ...newGift, color: col })}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        newGift.color === col ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 text-sm font-extrabold text-white hover:bg-pink-400 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                เพิ่มของขวัญเข้าระบบ
              </button>
            </form>

            {/* Existing Gifts List (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  รายการของขวัญที่เปิดให้โดเนท ({gifts.length})
                </h2>
                <button
                  type="button"
                  onClick={handleResetDefaultGifts}
                  className="text-xs font-semibold text-slate-400 hover:text-white underline cursor-pointer"
                >
                  รีเซ็ตเป็นของขวัญเริ่มต้น
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {gifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/75 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                        style={{ backgroundColor: `${gift.color}25` }}
                      >
                        {gift.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-white truncate">
                            {gift.name}
                          </h3>
                          {gift.badge && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: gift.color }}
                            >
                              {gift.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {gift.description}
                        </p>
                        <p className="text-sm font-black text-pink-400 mt-0.5">
                          ฿{gift.price.toLocaleString()} / ชิ้น
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => playAlertSound(gift.soundType)}
                        title="ฟังเสียงเอฟเฟกต์"
                        className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-white/15"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGift(gift.id)}
                        title="ลบของขวัญ"
                        className="rounded-xl bg-rose-500/15 p-2 text-rose-400 hover:bg-rose-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Creator & Alert + TTS Settings */}
        {activeTab === "settings" && (
          <form
            onSubmit={handleSaveSettings}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: TTS Configuration (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-indigo-500/30 bg-slate-900/80 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      ระบบอ่านข้อความโดเนทอัตโนมัติ (TTS)
                    </h2>
                    <p className="text-xs text-slate-400">
                      อ่านออกเสียงชื่อผู้โดเนท ของขวัญ และข้อความเป็นภาษาไทยเมื่อแจ้งเตือนเด้งขึ้นจอ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeakDonationItem("sample-preview", sampleTtsDonation)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer ${
                    speakingId === "sample-preview"
                      ? "bg-rose-500 hover:bg-rose-400"
                      : "bg-indigo-500 hover:bg-indigo-400"
                  }`}
                >
                  {speakingId === "sample-preview" ? (
                    <>
                      <VolumeX className="h-4 w-4" />
                      หยุดเสียงทดสอบ
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      ทดลองฟังเสียงอ่านตัวอย่าง
                    </>
                  )}
                </button>
              </div>

              {/* Enable Sound & Enable TTS Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition ${
                    settings.ttsEnabled
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/15 bg-slate-950"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.ttsEnabled}
                    onChange={(e) => handleQuickToggleTts(e.target.checked)}
                    className="h-5 w-5 accent-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">
                      เปิดเสียงอ่านข้อความโดเนท (TTS)
                    </span>
                    <span className="text-xs text-slate-400">
                      {settings.ttsEnabled
                        ? "กำลังเปิดใช้งาน — อ่านออกเสียงอัตโนมัติ"
                        : "ปิดอยู่ — ไม่มีการอ่านออกเสียงข้อความ"}
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition ${
                    settings.soundEnabled
                      ? "border-pink-500/40 bg-pink-500/10"
                      : "border-white/15 bg-slate-950"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleQuickToggleSound(e.target.checked)}
                    className="h-5 w-5 accent-pink-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">
                      เปิดเสียงเอฟเฟกต์ของขวัญ
                    </span>
                    <span className="text-xs text-slate-400">
                      เล่นเสียง Chime / Magic / Rocket ก่อนอ่าน
                    </span>
                  </div>
                </label>
              </div>

              {/* Engine & Read Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    ระบบสังเคราะห์เสียงภาษาไทย (TTS Engine)
                  </label>
                  <select
                    value={settings.ttsEngine || "auto"}
                    onChange={(e) =>
                      setSettings({ ...settings, ttsEngine: e.target.value as TtsEngine })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="auto">
                      Auto (แนะนำ — เสียงไทย Cloud ชัดเจน + สำรองในเครื่อง)
                    </option>
                    <option value="cloud">
                      Cloud Thai Voice (ชัดทุกเครื่อง แม้ OBS ไม่มีแพ็กเกจเสียงไทย)
                    </option>
                    <option value="browser">
                      Browser Web Speech API (ใช้เสียงที่ติดตั้งใน Windows/macOS)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    รูปแบบเนื้อหาที่ต้องการให้อ่าน
                  </label>
                  <select
                    value={settings.ttsReadMode || "full"}
                    onChange={(e) =>
                      setSettings({ ...settings, ttsReadMode: e.target.value as TtsReadMode })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="full">
                      อ่านครบ (ชื่อผู้โดเนท + ของขวัญ + ยอดเงิน + ข้อความ)
                    </option>
                    <option value="message_only">
                      อ่านเฉพาะข้อความที่ผู้โดเนทพิมพ์เท่านั้น
                    </option>
                  </select>
                </div>
              </div>

              {/* Custom Speech Template */}
              {settings.ttsReadMode !== "message_only" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    แพทเทิร์นประโยคที่อ่านออกเสียง (คลิกตัวแปรด้านล่างเพื่อแทรก)
                  </label>
                  <input
                    type="text"
                    value={settings.ttsTemplate || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ttsTemplate: e.target.value })
                    }
                    placeholder="{donor} ส่ง {gift} {qty} ชิ้น ยอดโดเนท {amount} บาท บอกว่า {message}"
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TEMPLATE_TOKENS.map((item) => (
                      <button
                        key={item.token}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            ttsTemplate: `${settings.ttsTemplate || ""} ${item.token}`.trim(),
                          })
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-white/15 transition cursor-pointer"
                      >
                        + {item.token} ({item.label})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Spoken Sentence Preview */}
              <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  ตัวอย่างประโยคที่จะถูกอ่านออกเสียง:
                </span>
                <p className="mt-1 text-sm font-semibold text-white">
                  &ldquo;{formatDonationSpeechText(sampleTtsDonation, settings)}&rdquo;
                </p>
              </div>

              {/* Min Amount, Rate, Pitch, Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ยอดโดเนทขั้นต่ำที่จะให้อ่านข้อความ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.ttsMinAmount ?? 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ttsMinAmount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                  <span className="text-[11px] text-slate-400">
                    ตั้งเป็น 0 บาท เพื่อให้อ่านออกเสียงทุกยอดโดเนท
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ความดังเสียงอ่าน ({Math.round((settings.ttsVolume ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={settings.ttsVolume ?? 1.0}
                    onChange={(e) =>
                      setSettings({ ...settings, ttsVolume: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ความเร็วในการอ่าน ({settings.ttsRate ?? 1.05}x)
                  </label>
                  <input
                    type="range"
                    min={0.7}
                    max={1.6}
                    step={0.05}
                    value={settings.ttsRate ?? 1.05}
                    onChange={(e) =>
                      setSettings({ ...settings, ttsRate: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    โทนเสียงสูง-ต่ำ ({settings.ttsPitch ?? 1.0})
                  </label>
                  <input
                    type="range"
                    min={0.6}
                    max={1.5}
                    step={0.05}
                    value={settings.ttsPitch ?? 1.0}
                    onChange={(e) =>
                      setSettings({ ...settings, ttsPitch: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Creator Profile & Alert Duration (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8 space-y-5 h-fit">
              <h2 className="text-lg font-bold text-white">
                ข้อมูลโปรไฟล์ครีเอเตอร์และหน้าจอแจ้งเตือน
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    อิโมจิช่อง
                  </label>
                  <input
                    type="text"
                    value={settings.creatorAvatarEmoji}
                    onChange={(e) =>
                      setSettings({ ...settings, creatorAvatarEmoji: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white text-center"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ชื่อครีเอเตอร์ / ช่องสตรีม
                  </label>
                  <input
                    type="text"
                    value={settings.creatorName}
                    onChange={(e) => setSettings({ ...settings, creatorName: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Handle (@ชื่อช่อง)
                </label>
                <input
                  type="text"
                  value={settings.creatorHandle}
                  onChange={(e) => setSettings({ ...settings, creatorHandle: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  ข้อความต้อนรับบนหน้าโดเนท
                </label>
                <textarea
                  rows={2}
                  value={settings.creatorBio}
                  onChange={(e) => setSettings({ ...settings, creatorBio: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    หัวข้อเป้าหมาย (Goal)
                  </label>
                  <input
                    type="text"
                    value={settings.goalTitle}
                    onChange={(e) => setSettings({ ...settings, goalTitle: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ยอดเป้าหมาย (บาท)
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={settings.goalTargetAmount}
                    onChange={(e) =>
                      setSettings({ ...settings, goalTargetAmount: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  เวลาแสดงแจ้งเตือนขั้นต่ำบนจอ OBS ({settings.alertDurationSec} วินาที)
                </label>
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={settings.alertDurationSec}
                  onChange={(e) =>
                    setSettings({ ...settings, alertDurationSec: Number(e.target.value) })
                  }
                  className="w-full accent-pink-500"
                />
                <span className="text-[11px] text-slate-400">
                  * ระบบจะรอจนกว่าเสียงอ่านข้อความจะพูดจบก่อนเปลี่ยนไปคิวถัดไปเสมอ
                </span>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                บันทึกการตั้งค่าทั้งหมด
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
