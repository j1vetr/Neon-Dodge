
/* =========================================================
   AUDIO
   Synthesised sound effects using the Web Audio API.
   No external assets required.
   ========================================================= */

import { STORAGE_SOUND } from './constants';

let ctx: AudioContext | null = null;
let soundEnabled = true;

export function initSound() {
  soundEnabled = localStorage.getItem(STORAGE_SOUND) !== 'off';
}

export function setSoundEnabled(on: boolean) {
  soundEnabled = on;
  localStorage.setItem(STORAGE_SOUND, on ? 'on' : 'off');
  if (!on) stopAmbient();
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resume() {
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    else if (c.state === 'closed') {
      ctx = new AudioContext();
    }
  } catch { /* ignore */ }
}

/* Short beep */
function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gain = 0.18,
  detune = 0,
) {
  if (!soundEnabled) return;
  resume();
  const c = getCtx();
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime);
  osc.detune.setValueAtTime(detune, c.currentTime);
  vol.gain.setValueAtTime(gain, c.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(vol);
  vol.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

/** Soft click when tapping to change direction */
export function playTap() {
  playTone(440, 'sine', 0.08, 0.12);
  playTone(660, 'triangle', 0.05, 0.08);
}

/** Boom + noise burst on collision */
export function playHit() {
  if (!soundEnabled) return;
  resume();
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const vol = c.createGain();
  vol.gain.setValueAtTime(0.4, c.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
  source.connect(vol);
  vol.connect(c.destination);
  source.start();

  playTone(200, 'sawtooth', 0.25, 0.3, -200);
}

/** Rising chime for milestone score */
export function playScore(multiple: number) {
  const freq = 330 + Math.min(multiple * 40, 400);
  playTone(freq, 'sine', 0.12, 0.1);
  playTone(freq * 1.5, 'triangle', 0.08, 0.08);
}

/** Laser warning buzz */
export function playLaserWarn() {
  playTone(120, 'sawtooth', 0.3, 0.08, 0);
}

/** Combo sound — pitch rises with each combo tier */
export function playCombo(comboTier: number) {
  const baseFreq = 500 + comboTier * 120;
  playTone(baseFreq, 'sine', 0.1, 0.14);
  playTone(baseFreq * 1.25, 'triangle', 0.08, 0.1);
  playTone(baseFreq * 1.5, 'sine', 0.06, 0.08);
}

/** Near miss swoosh */
export function playNearMiss() {
  if (!soundEnabled) return;
  resume();
  const c = getCtx();
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.15);
  vol.gain.setValueAtTime(0.09, c.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15);
  osc.connect(vol);
  vol.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

/** Power-up collect sparkle */
export function playPowerUp(type: 'shield' | 'double') {
  const freqs: Record<string, number> = { shield: 660, double: 880 };
  const f = freqs[type] ?? 660;
  playTone(f, 'sine', 0.12, 0.15);
  playTone(f * 1.5, 'sine', 0.09, 0.1);
  playTone(f * 2, 'triangle', 0.06, 0.08);
}

/** Shield absorbs a hit */
export function playShieldHit() {
  if (!soundEnabled) return;
  playTone(300, 'square', 0.12, 0.18);
  playTone(150, 'sawtooth', 0.2, 0.2, -100);
}

/* -------------------------------------------------------
   AMBIENT BACKGROUND RHYTHM
   A subtle pulsing beat that speeds up with level.
   ------------------------------------------------------- */
let ambientHandle: ReturnType<typeof setTimeout> | null = null;
let ambientRunning = false;

function scheduleAmbientBeat(intervalMs: number) {
  if (!ambientRunning) return;
  ambientHandle = setTimeout(() => {
    if (!ambientRunning) return;
    if (soundEnabled) {
      resume();
      const c = getCtx();
      const osc = c.createOscillator();
      const vol = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.1);
      vol.gain.setValueAtTime(0.07, c.currentTime);
      vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
      osc.connect(vol);
      vol.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.18);
    }
    scheduleAmbientBeat(intervalMs);
  }, intervalMs);
}

function levelToInterval(level: number): number {
  return Math.max(380, 900 - level * 58);
}

export function startAmbient(level: number) {
  stopAmbient();
  ambientRunning = true;
  scheduleAmbientBeat(levelToInterval(level));
}

export function updateAmbientLevel(level: number) {
  if (!ambientRunning) return;
  stopAmbient();
  ambientRunning = true;
  scheduleAmbientBeat(levelToInterval(level));
}

export function stopAmbient() {
  ambientRunning = false;
  if (ambientHandle != null) {
    clearTimeout(ambientHandle);
    ambientHandle = null;
  }
}
