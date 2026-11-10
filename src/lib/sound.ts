import { CreatorSettings, Donation, SoundType, TtsEngine } from "./types";

let sharedAudioCtx: AudioContext | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let stopRequested = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playAlertSound(type: SoundType = "magic"): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (
    freq: number,
    startOffset: number,
    duration: number,
    oscType: OscillatorType = "triangle",
    gainPeak = 0.22
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, now + startOffset);

    gain.gain.setValueAtTime(0.0001, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + duration + 0.02);
  };

  if (type === "chime") {
    playTone(1046.5, 0, 0.25, "sine", 0.2);
    playTone(1567.98, 0.14, 0.55, "sine", 0.24);
  } else if (type === "magic") {
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      playTone(freq, idx * 0.08, 0.4, "triangle", 0.18);
    });
  } else if (type === "rocket") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.45);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.52);

    playTone(1046.5, 0.35, 0.3, "sine", 0.2);
    playTone(1318.5, 0.43, 0.4, "sine", 0.22);
    playTone(1567.98, 0.51, 0.55, "sine", 0.24);
  } else if (type === "fanfare") {
    playTone(392.0, 0, 0.15, "triangle", 0.22);
    playTone(523.25, 0.12, 0.15, "triangle", 0.22);
    playTone(659.25, 0.24, 0.15, "triangle", 0.22);
    playTone(783.99, 0.36, 0.26, "triangle", 0.25);
    playTone(659.25, 0.62, 0.14, "triangle", 0.2);
    playTone(1046.5, 0.76, 0.7, "triangle", 0.28);
  }
}

/**
 * Strip emoji characters so TTS reads natural text instead of verbose emoji names
 */
export function stripEmojisForSpeech(input: string): string {
  return input
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the Thai speech text for a donation according to CreatorSettings
 */
export function formatDonationSpeechText(
  donation: Pick<Donation, "donorName" | "giftName" | "quantity" | "amount" | "message">,
  settings?: Partial<CreatorSettings>
): string {
  const donor = stripEmojisForSpeech(donation.donorName) || "ผู้ไม่ประสงค์ออกนาม";
  const gift = stripEmojisForSpeech(donation.giftName) || "ของขวัญ";
  const msg = stripEmojisForSpeech(donation.message || "");
  const readMode = settings?.ttsReadMode || "full";

  if (readMode === "message_only") {
    return msg || `${donor} ส่ง ${gift} ${donation.quantity} ชิ้น`;
  }

  const rawTemplate =
    settings?.ttsTemplate?.trim() ||
    "{donor} ส่ง {gift} {qty} ชิ้น ยอดโดเนท {amount} บาท บอกว่า {message}";

  if (!msg) {
    // If donor didn't leave a text message, strip trailing message clause
    const baseWithoutMsg = rawTemplate
      .replace(/(ข้อความว่า|บอกว่า|ฝากข้อความว่า)?\s*\{message\}/gi, "")
      .trim();
    return baseWithoutMsg
      .replace(/\{donor\}/g, donor)
      .replace(/\{gift\}/g, gift)
      .replace(/\{qty\}/g, String(donation.quantity))
      .replace(/\{amount\}/g, String(donation.amount))
      .replace(/\s+/g, " ")
      .trim();
  }

  return rawTemplate
    .replace(/\{donor\}/g, donor)
    .replace(/\{gift\}/g, gift)
    .replace(/\{qty\}/g, String(donation.quantity))
    .replace(/\{amount\}/g, String(donation.amount))
    .replace(/\{message\}/g, msg)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stop any ongoing TTS playback (both HTMLAudioElement and Web Speech API)
 */
export function stopSpeaking(): void {
  stopRequested = true;
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.src = "";
    } catch {
      // Ignore
    }
    activeAudioElement = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

/**
 * Split long text into chunks <= 170 chars at spaces/punctuation
 */
function splitIntoSpeechChunks(text: string, maxLen = 170): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const words = cleaned.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length <= maxLen) {
      current = (current + " " + word).trim();
    } else {
      if (current) chunks.push(current);
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          chunks.push(word.slice(i, i + maxLen));
        }
        current = "";
      } else {
        current = word;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function speakViaCloudTts(
  text: string,
  rate = 1.05,
  volume = 1.0
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const chunks = splitIntoSpeechChunks(text, 170);
  if (chunks.length === 0) return true;

  for (const chunk of chunks) {
    if (stopRequested) return true;
    const success = await new Promise<boolean>((resolve) => {
      const audio = new Audio(`/api/tts?lang=th&text=${encodeURIComponent(chunk)}`);
      activeAudioElement = audio;
      audio.volume = Math.max(0.1, Math.min(1.0, volume));
      audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));

      const cleanup = () => {
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
      };

      audio.onended = () => {
        cleanup();
        resolve(true);
      };

      audio.onerror = () => {
        cleanup();
        resolve(false);
      };

      audio.play().catch(() => {
        cleanup();
        resolve(false);
      });
    });

    if (!success) {
      return false;
    }
  }
  return true;
}

function speakViaBrowserTts(
  text: string,
  rate = 1.05,
  pitch = 1.0,
  volume = 1.0
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "th-TH";
      utter.rate = Math.max(0.5, Math.min(2.0, rate));
      utter.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utter.volume = Math.max(0.1, Math.min(1.0, volume));

      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("th") || v.name.toLowerCase().includes("thai")
      );
      if (thaiVoice) {
        utter.voice = thaiVoice;
      }

      const timeout = setTimeout(() => {
        resolve();
      }, 12000);

      utter.onend = () => {
        clearTimeout(timeout);
        resolve();
      };
      utter.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };

      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}

export async function speakText(
  text: string,
  options?: {
    engine?: TtsEngine;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: (spokenText: string) => void;
    onEnd?: () => void;
  }
): Promise<void> {
  const cleanText = stripEmojisForSpeech(text);
  if (!cleanText) return;

  stopSpeaking();
  stopRequested = false;

  const engine = options?.engine || "auto";
  const rate = options?.rate ?? 1.05;
  const pitch = options?.pitch ?? 1.0;
  const volume = options?.volume ?? 1.0;

  options?.onStart?.(cleanText);

  try {
    if (engine === "cloud" || engine === "auto") {
      const ok = await speakViaCloudTts(cleanText, rate, volume);
      if (!ok && !stopRequested) {
        await speakViaBrowserTts(cleanText, rate, pitch, volume);
      }
    } else {
      await speakViaBrowserTts(cleanText, rate, pitch, volume);
    }
  } finally {
    options?.onEnd?.();
  }
}

export async function speakDonationMessage(
  donation: Pick<Donation, "donorName" | "giftName" | "quantity" | "amount" | "message">,
  settings?: Partial<CreatorSettings>,
  callbacks?: {
    onStart?: (spokenText: string) => void;
    onEnd?: () => void;
  }
): Promise<void> {
  const minAmount = settings?.ttsMinAmount ?? 0;
  if (donation.amount < minAmount) {
    return;
  }

  const speechText = formatDonationSpeechText(donation, settings);
  if (!speechText) return;

  await speakText(speechText, {
    engine: settings?.ttsEngine || "auto",
    rate: settings?.ttsRate ?? 1.05,
    pitch: settings?.ttsPitch ?? 1.0,
    volume: settings?.ttsVolume ?? 1.0,
    onStart: callbacks?.onStart,
    onEnd: callbacks?.onEnd,
  });
}
