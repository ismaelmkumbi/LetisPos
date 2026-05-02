/**
 * POS “item added” feedback sounds.
 *
 * - **Synthesized** variants use Web Audio (no files).
 * - **legacy** matches Stocky `pos_master` POS: `new Audio("/audio/Beep.wav")` (see
 *   `pos_master/resources/src/views/app/pages/pos.vue`). File is served from
 *   `main/public/audio/Beep.wav`; replace with your Laravel `public/audio/Beep.wav`
 *   for an identical clip.
 *
 * Variant is stored in `localStorage` under `smartpos.pos.beepVariant`.
 */

export type PosBeepVariantId = 'legacy' | 'classic' | 'chime' | 'click' | 'buzzer' | 'soft' | 'off';

export const POS_BEEP_VARIANTS: readonly { id: PosBeepVariantId; label: string }[] = [
  { id: 'legacy', label: 'Classic POS (Beep.wav)' },
  { id: 'classic', label: 'Classic register' },
  { id: 'chime', label: 'Triple chime' },
  { id: 'click', label: 'Sharp click' },
  { id: 'buzzer', label: 'Square buzzer' },
  { id: 'soft', label: 'Soft ping' },
  { id: 'off', label: 'Off' },
] as const;

const STORAGE_KEY = 'smartpos.pos.beepVariant';

/** Multiplier on the loaded WAV — > 1.0 makes the beep audibly stronger over noisy retail floors. */
const LEGACY_GAIN_BOOST = 1.8;

let sharedCtx: AudioContext | null = null;
let legacyAudio: HTMLAudioElement | null = null;
let legacyBuffer: AudioBuffer | null = null;
let legacyBufferLoading: Promise<AudioBuffer | null> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    try {
      sharedCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return sharedCtx;
}

/** Same URL as pos_master `pos.vue`: `sound: "/audio/Beep.wav"`. Honors Vite `BASE_URL`. */
function legacyBeepUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}audio/Beep.wav`;
}

function isVariant(s: string | null): s is PosBeepVariantId {
  return s !== null && POS_BEEP_VARIANTS.some((v) => v.id === s);
}

export function getPosBeepVariant(): PosBeepVariantId {
  if (typeof window === 'undefined') return 'legacy';
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (isVariant(s)) return s;
  } catch {
    /* ignore */
  }
  return 'legacy';
}

export function setPosBeepVariant(id: PosBeepVariantId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

function resume(ctx: AudioContext): void {
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

/**
 * Load the legacy Beep.wav once and decode it into an AudioBuffer.
 * Lets us play it polyphonically (rapid item-adds) and amplify above 1.0.
 */
function loadLegacyBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (legacyBuffer) return Promise.resolve(legacyBuffer);
  if (legacyBufferLoading) return legacyBufferLoading;
  legacyBufferLoading = (async () => {
    try {
      const res = await fetch(legacyBeepUrl());
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      legacyBuffer = buf;
      return buf;
    } catch {
      return null;
    } finally {
      legacyBufferLoading = null;
    }
  })();
  return legacyBufferLoading;
}

/**
 * HTML5 <audio> fallback. Used when Web Audio fails (autoplay blocked before
 * first interaction, or no AudioContext support).
 */
function playLegacyHtmlAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!legacyAudio) {
      legacyAudio = new Audio(legacyBeepUrl());
      legacyAudio.preload = 'auto';
      legacyAudio.volume = 1.0;
    }
    legacyAudio.currentTime = 0;
    void legacyAudio.play().catch(() => {
      playClassicInternal();
    });
  } catch {
    playClassicInternal();
  }
}

/**
 * Strong WAV beep — matches pos_master "barcode_scanning_sound" but **louder**
 * via Web Audio gain (boost above unity for noisy retail floors) and
 * polyphonic so rapid item-adds don't cut each other off.
 */
function playLegacyWav(): void {
  if (typeof window === 'undefined') return;
  const ctx = getCtx();
  if (!ctx) {
    playLegacyHtmlAudio();
    return;
  }
  resume(ctx);
  void loadLegacyBuffer(ctx).then((buf) => {
    if (!buf) {
      playLegacyHtmlAudio();
      return;
    }
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = LEGACY_GAIN_BOOST;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
    } catch {
      playLegacyHtmlAudio();
    }
  });
}

/** Double-tone register style ~120ms */
function playClassic(ctx: AudioContext, t0: number): void {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
  const playTone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + dur);
  };
  playTone(880, t0, 0.06);
  playTone(1174, t0 + 0.055, 0.07);
}

function playClassicInternal(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    resume(ctx);
    playClassic(ctx, ctx.currentTime);
  } catch {
    /* ignore */
  }
}

/** Three short ascending notes */
function playChime(ctx: AudioContext, t0: number): void {
  const freqs = [523.25, 659.25, 783.99];
  freqs.forEach((freq, i) => {
    const start = t0 + i * 0.055;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.09, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + 0.095);
  });
}

/** Short band-limited noise burst */
function playClick(ctx: AudioContext, t0: number): void {
  const dur = 0.038;
  const n = Math.ceil(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const env = Math.exp(-4 * (i / n));
    data[i] = (Math.random() * 2 - 1) * env * 0.85;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.22, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.005);
}

/** Harsh square-wave till */
function playBuzzer(ctx: AudioContext, t0: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(480, t0);
  const g = ctx.createGain();
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + 0.12);
}

/** Single long gentle sine */
function playSoft(ctx: AudioContext, t0: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, t0);
  const g = ctx.createGain();
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + 0.26);
}

/**
 * Pleasant ascending two-tone (C5 → E5) — for sale completion / payment success.
 */
export function playPosSuccessSound(): void {
  if (getPosBeepVariant() === 'off') return;
  const ctx = getCtx();
  if (!ctx) return;
  resume(ctx);
  const t0 = ctx.currentTime;
  const tone = (freq: number, start: number, dur: number, peak: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  };
  tone(523.25, t0, 0.14, 0.16);
  tone(659.25, t0 + 0.12, 0.18, 0.18);
  tone(783.99, t0 + 0.26, 0.22, 0.18);
}

/**
 * Descending square-wave buzz — for "barcode not found" or scan errors.
 */
export function playPosErrorSound(): void {
  if (getPosBeepVariant() === 'off') return;
  const ctx = getCtx();
  if (!ctx) return;
  resume(ctx);
  const t0 = ctx.currentTime;
  const tone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  };
  tone(220, t0, 0.18);
  tone(165, t0 + 0.16, 0.22);
}

/**
 * Play the “item added” beep. Uses `forcedVariant` if set, otherwise the saved preference.
 */
export function playPosAddBeep(forcedVariant?: PosBeepVariantId): void {
  const variant = forcedVariant ?? getPosBeepVariant();
  if (variant === 'off') return;
  if (variant === 'legacy') {
    playLegacyWav();
    return;
  }
  try {
    const ctx = getCtx();
    if (!ctx) return;
    resume(ctx);
    const t0 = ctx.currentTime;
    switch (variant) {
      case 'classic':
        playClassic(ctx, t0);
        break;
      case 'chime':
        playChime(ctx, t0);
        break;
      case 'click':
        playClick(ctx, t0);
        break;
      case 'buzzer':
        playBuzzer(ctx, t0);
        break;
      case 'soft':
        playSoft(ctx, t0);
        break;
      default:
        break;
    }
  } catch {
    /* ignore */
  }
}
