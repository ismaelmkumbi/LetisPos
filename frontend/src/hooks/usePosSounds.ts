/**
 * POS sound effects hook.
 *
 * Strong beep on item add (matches the legacy Vue POS terminal).
 * Web Audio API for instant playback with no lag on rapid clicks.
 * Falls back to <audio> tag if Web Audio is unavailable.
 *
 * Sound preference persists via localStorage (smartpos.posSounds).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const SOUND_PREF_KEY = 'smartpos.posSounds';
const VOLUME_KEY = 'smartpos.posSoundsVolume';
const BEEP_URL = '/audio/Beep.wav';

type SoundType = 'beep' | 'success' | 'error';

export function usePosSounds() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = localStorage.getItem(SOUND_PREF_KEY);
    return v === null ? true : v === 'true';
  });

  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.85;
    const v = localStorage.getItem(VOLUME_KEY);
    const n = v ? Number(v) : 0.85;
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.85;
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepBufferRef = useRef<AudioBuffer | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Lazy-init Web Audio context on first user interaction
  const ensureAudioContext = useCallback(async () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;

      // Preload beep buffer
      try {
        const res = await fetch(BEEP_URL);
        const arr = await res.arrayBuffer();
        beepBufferRef.current = await ctx.decodeAudioData(arr);
      } catch {
        // ignore — will fall back to <audio>
      }
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Init the fallback <audio> tag (doesn't need user gesture for preload)
  useEffect(() => {
    const a = new Audio(BEEP_URL);
    a.preload = 'auto';
    a.volume = volume;
    fallbackAudioRef.current = a;
  }, []);

  // Update fallback volume when changed
  useEffect(() => {
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.volume = volume;
    }
  }, [volume]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    localStorage.setItem(SOUND_PREF_KEY, String(v));
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    localStorage.setItem(VOLUME_KEY, String(clamped));
  }, []);

  // Play the loaded beep buffer with Web Audio (instant, polyphonic, sharp)
  const playBeepWebAudio = useCallback(async () => {
    const ctx = await ensureAudioContext();
    if (!ctx || !beepBufferRef.current) return false;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = beepBufferRef.current;

      // Gain node — boost the beep so it cuts through noisy retail floors
      const gain = ctx.createGain();
      gain.gain.value = volume * 1.6; // amplify above 1.0 for "strong" beep

      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
      return true;
    } catch {
      return false;
    }
  }, [ensureAudioContext, volume]);

  // Generate synthesized sound (success/error) with oscillator
  const playTone = useCallback(async (
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
  ) => {
    const ctx = await ensureAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume * 0.9, ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* swallow */
    }
  }, [ensureAudioContext, volume]);

  const play = useCallback(async (sound: SoundType = 'beep') => {
    if (!enabled) return;

    if (sound === 'beep') {
      // Try Web Audio first for the sharp, strong beep
      const ok = await playBeepWebAudio();
      if (!ok && fallbackAudioRef.current) {
        try {
          fallbackAudioRef.current.currentTime = 0;
          fallbackAudioRef.current.volume = volume;
          await fallbackAudioRef.current.play();
        } catch {
          /* ignore */
        }
      }
      return;
    }

    if (sound === 'success') {
      // Pleasant ascending two-tone (C5 → E5)
      await playTone(523.25, 0.12, 'sine');
      setTimeout(() => playTone(659.25, 0.18, 'sine'), 110);
      return;
    }

    if (sound === 'error') {
      // Descending error buzz (low square wave)
      await playTone(220, 0.18, 'square');
      setTimeout(() => playTone(165, 0.22, 'square'), 160);
      return;
    }
  }, [enabled, volume, playBeepWebAudio, playTone]);

  return {
    enabled,
    setEnabled,
    volume,
    setVolume,
    play,
    /** Convenience: shorthand for play('beep') */
    beep: () => play('beep'),
    /** Convenience: shorthand for play('success') */
    success: () => play('success'),
    /** Convenience: shorthand for play('error') */
    error: () => play('error'),
  };
}
