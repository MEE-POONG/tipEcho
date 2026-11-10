export type SoundType = "chime" | "fanfare" | "magic" | "rocket";
export type TtsEngine = "auto" | "cloud" | "browser";
export type TtsReadMode = "full" | "message_only";

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
  color: string;
  soundType: SoundType;
  badge?: string;
}

export interface Donation {
  id: string;
  donorName: string;
  message: string;
  giftId: string;
  giftName: string;
  emoji: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  color: string;
  soundType: SoundType;
  createdAt: string;
}

export interface CreatorSettings {
  creatorName: string;
  creatorHandle: string;
  creatorBio: string;
  creatorAvatarEmoji: string;
  alertDurationSec: number;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  ttsEngine: TtsEngine;
  ttsReadMode: TtsReadMode;
  ttsTemplate: string;
  ttsMinAmount: number;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  goalTitle: string;
  goalTargetAmount: number;
}

export interface StoreData {
  gifts: GiftItem[];
  donations: Donation[];
  settings: CreatorSettings;
}

export type StreamEvent =
  | { type: "connected"; timestamp: string }
  | { type: "donation:new"; donation: Donation }
  | { type: "donation:replay"; donation: Donation }
  | { type: "alert:skip"; timestamp: string }
  | { type: "settings:updated"; settings: CreatorSettings }
  | { type: "gifts:updated"; gifts: GiftItem[] };
