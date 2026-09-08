'use client';

const SOUND_SRC = '/sounds/notify.mp3';
const DEFAULT_VOLUME = 0.4;
const MIN_INTERVAL_MS = 2000;

let audio: HTMLAudioElement | null = null;
let lastPlayAt = 0;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(SOUND_SRC);
    audio.preload = 'auto';
    audio.volume = DEFAULT_VOLUME;
  }
  return audio;
}

export function unlockAudio(): void {
  const a = getAudio();
  if (!a) return;
  a.play().then(() => {
    a.pause();
    a.currentTime = 0;
  }).catch(() => {
    // Autoplay still blocked — play() will retry on next event.
  });
}

export function playNotificationSound(volume: number = DEFAULT_VOLUME): void {
  const a = getAudio();
  if (!a) return;
  const now = Date.now();
  if (now - lastPlayAt < MIN_INTERVAL_MS) return;
  lastPlayAt = now;
  a.volume = Math.max(0, Math.min(1, volume));
  a.currentTime = 0;
  a.play().catch(() => {
    // Most likely cause: Audio not yet unlocked (autoplay policy).
  });
}
