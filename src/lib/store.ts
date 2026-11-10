import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { CreatorSettings, Donation, GiftItem, StoreData, StreamEvent } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

export const DEFAULT_GIFTS: GiftItem[] = [
  {
    id: "gift-heart",
    name: "หัวใจกำลังใจ",
    emoji: "💖",
    price: 10,
    description: "ส่งความรักและกำลังใจเล็กๆ ให้สตรีมเมอร์",
    color: "#ec4899",
    soundType: "chime",
    badge: "ยอดฮิต",
  },
  {
    id: "gift-coffee",
    name: "กาแฟแก้ง่วง",
    emoji: "☕",
    price: 29,
    description: "เติมคาเฟอีนให้ไลฟ์ต่อได้ยาวๆ ตลอดคืน",
    color: "#f59e0b",
    soundType: "chime",
  },
  {
    id: "gift-boba",
    name: "ชานมไข่มุกหวานร้อย",
    emoji: "🧋",
    price: 49,
    description: "เติมความหวานสดชื่นระหว่างสตรีม",
    color: "#a855f7",
    soundType: "magic",
    badge: "ขายดี",
  },
  {
    id: "gift-pizza",
    name: "พิซซ่าชีสเยิ้ม",
    emoji: "🍕",
    price: 99,
    description: "มื้ออิ่มอร่อยเติมพลังให้ครีเอเตอร์",
    color: "#ef4444",
    soundType: "magic",
  },
  {
    id: "gift-rocket",
    name: "จรวดซุปเปอร์โนวา",
    emoji: "🚀",
    price: 299,
    description: "พุ่งทะยานสู่จักรวาลพร้อมเอฟเฟกต์สุดอลังการ",
    color: "#3b82f6",
    soundType: "rocket",
    badge: "สุดปัง",
  },
  {
    id: "gift-crown",
    name: "มงกุฎสุลต่าน",
    emoji: "👑",
    price: 999,
    description: "ของขวัญระดับตำนานจากผู้สนับสนุนตัวจริง!",
    color: "#eab308",
    soundType: "fanfare",
    badge: "VIP",
  },
];

export const DEFAULT_SETTINGS: CreatorSettings = {
  creatorName: "MochiChan Live",
  creatorHandle: "@mochichan",
  creatorBio: "ขอบคุณทุกของขวัญและกำลังใจนะคะ! ไม่ต้องสมัครสมาชิกก็ส่งของขวัญขึ้นจอไลฟ์สดได้ทันทีเลย ✨",
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
};

export const INITIAL_DONATIONS: Donation[] = [
  {
    id: "don-sample-1",
    donorName: "น้องแมวส้ม",
    message: "สู้ๆ ครับ ติดตามไลฟ์ตลอดเลย ชานมแก้ง่วงครับผม!",
    giftId: "gift-boba",
    giftName: "ชานมไข่มุกหวานร้อย",
    emoji: "🧋",
    unitPrice: 49,
    quantity: 2,
    amount: 98,
    color: "#a855f7",
    soundType: "magic",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "don-sample-2",
    donorName: "กัปตันอวกาศ",
    message: "ส่งจรวดให้พุ่งไปดวงจันทร์เลยยย 🚀🔥",
    giftId: "gift-rocket",
    giftName: "จรวดซุปเปอร์โนวา",
    emoji: "🚀",
    unitPrice: 299,
    quantity: 1,
    amount: 299,
    color: "#3b82f6",
    soundType: "rocket",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __tipEchoEmitter: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var __tipEchoStore: StoreData | undefined;
}

function getEmitter(): EventEmitter {
  if (!globalThis.__tipEchoEmitter) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(100);
    globalThis.__tipEchoEmitter = emitter;
  }
  return globalThis.__tipEchoEmitter;
}

function loadStoreFromDisk(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      const mergedSettings: CreatorSettings = {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        // Auto-enable TTS if upgrading from a store without ttsEngine
        ttsEnabled:
          parsed.settings && "ttsEngine" in parsed.settings
            ? Boolean(parsed.settings.ttsEnabled)
            : true,
      };
      return {
        gifts: Array.isArray(parsed.gifts) && parsed.gifts.length > 0 ? parsed.gifts : DEFAULT_GIFTS,
        donations: Array.isArray(parsed.donations) ? parsed.donations : INITIAL_DONATIONS,
        settings: mergedSettings,
      };
    }
  } catch (err) {
    console.error("Failed to read store.json, using default store:", err);
  }

  const initial: StoreData = {
    gifts: DEFAULT_GIFTS,
    donations: INITIAL_DONATIONS,
    settings: DEFAULT_SETTINGS,
  };
  saveStoreToDisk(initial);
  return initial;
}

function saveStoreToDisk(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write store.json:", err);
  }
}

export function getStore(): StoreData {
  if (!globalThis.__tipEchoStore) {
    globalThis.__tipEchoStore = loadStoreFromDisk();
  }
  return globalThis.__tipEchoStore;
}

export function emitStreamEvent(event: StreamEvent): void {
  getEmitter().emit("stream-event", event);
}

export function subscribeStream(listener: (event: StreamEvent) => void): () => void {
  const emitter = getEmitter();
  emitter.on("stream-event", listener);
  return () => {
    emitter.off("stream-event", listener);
  };
}

export function addDonation(input: {
  donorName: string;
  message: string;
  giftId: string;
  quantity: number;
  customGift?: Partial<GiftItem>;
}): Donation {
  const store = getStore();
  const foundGift = store.gifts.find((g) => g.id === input.giftId);

  const gift: GiftItem = foundGift || {
    id: input.giftId || "gift-custom",
    name: input.customGift?.name || "ของขวัญพิเศษ",
    emoji: input.customGift?.emoji || "🎁",
    price: input.customGift?.price || 50,
    description: "",
    color: input.customGift?.color || "#8b5cf6",
    soundType: input.customGift?.soundType || "magic",
  };

  const qty = Math.max(1, Math.min(999, Math.floor(Number(input.quantity) || 1)));
  const cleanName = (input.donorName || "").trim() || "ผู้ไม่ประสงค์ออกนาม";
  const cleanMessage = (input.message || "").trim();

  const donation: Donation = {
    id: `don-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    donorName: cleanName.slice(0, 50),
    message: cleanMessage.slice(0, 250),
    giftId: gift.id,
    giftName: gift.name,
    emoji: gift.emoji,
    unitPrice: gift.price,
    quantity: qty,
    amount: gift.price * qty,
    color: gift.color,
    soundType: gift.soundType,
    createdAt: new Date().toISOString(),
  };

  store.donations = [donation, ...store.donations].slice(0, 200);
  saveStoreToDisk(store);

  emitStreamEvent({ type: "donation:new", donation });
  return donation;
}

export function replayDonation(donationId: string): Donation | null {
  const store = getStore();
  const target = store.donations.find((d) => d.id === donationId);
  if (!target) return null;
  emitStreamEvent({ type: "donation:replay", donation: target });
  return target;
}

export function skipCurrentAlert(): void {
  emitStreamEvent({ type: "alert:skip", timestamp: new Date().toISOString() });
}

export function updateGifts(gifts: GiftItem[]): GiftItem[] {
  const store = getStore();
  store.gifts = gifts;
  saveStoreToDisk(store);
  emitStreamEvent({ type: "gifts:updated", gifts });
  return store.gifts;
}

export function updateSettings(partial: Partial<CreatorSettings>): CreatorSettings {
  const store = getStore();
  store.settings = {
    ...store.settings,
    ...partial,
  };
  saveStoreToDisk(store);
  emitStreamEvent({ type: "settings:updated", settings: store.settings });
  return store.settings;
}

