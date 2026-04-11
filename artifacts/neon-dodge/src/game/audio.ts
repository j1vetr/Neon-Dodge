
/* =========================================================
   AUDIO
   Synthesised sound effects using the Web Audio API.
   No external assets required.
   ========================================================= */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resume() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
}

/* Short beep */
function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gain = 0.18,
  detune = 0,
) {
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

  // Also add a descending tone
  playTone(200, 'sawtooth', 0.25, 0.3, -200);
}

/** Rising chime for milestone score */
export function playScore(multiple: number) {
  // Pitch rises every 5 seconds
  const freq = 330 + Math.min(multiple * 40, 400);
  playTone(freq, 'sine', 0.12, 0.1);
  playTone(freq * 1.5, 'triangle', 0.08, 0.08);
}

/** Laser warning buzz */
export function playLaserWarn() {
  playTone(120, 'sawtooth', 0.3, 0.08, 0);
}
