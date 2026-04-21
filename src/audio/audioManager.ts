/* ────────────────────────────────────────────
   Audio manager — synthesizes placeholder sounds
   using the Web Audio API so the game works
   without any external audio files.
   
   To swap in real audio files later:
   1. Place .mp3/.wav files in public/audio/
   2. Load them with new Audio('/audio/file.mp3')
   3. Replace the play* methods below
   ──────────────────────────────────────────── */

let audioCtx: AudioContext | null = null;
let _enabled = true;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  gain = 0.15,
) {
  if (!_enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* ignore audio errors */
  }
}

function playChord(
  freqs: number[],
  duration: number,
  type: OscillatorType = 'square',
  gain = 0.1,
) {
  freqs.forEach((f) => playTone(f, duration, type, gain));
}

export const audioManager = {
  get enabled() {
    return _enabled;
  },

  setEnabled(v: boolean) {
    _enabled = v;
  },

  /** Resume AudioContext after user gesture */
  resume() {
    if (audioCtx?.state === 'suspended') audioCtx.resume();
  },

  buttonPress() {
    playTone(800, 0.08, 'square', 0.12);
  },

  validMove() {
    playTone(660, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(880, 0.1, 'sine', 0.15), 80);
  },

  invalidMove() {
    playTone(200, 0.25, 'sawtooth', 0.12);
  },

  roundWin() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) =>
      setTimeout(() => playTone(n, 0.2, 'sine', 0.18), i * 120),
    );
  },

  gameWin() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) =>
      setTimeout(() => playChord([n, n * 1.25], 0.3, 'sine', 0.12), i * 150),
    );
  },

  instantUno() {
    playChord([440, 554, 659], 0.4, 'triangle', 0.15);
  },

  commandFeedback() {
    playTone(440, 0.06, 'triangle', 0.1);
  },

  pass() {
    playTone(350, 0.12, 'sine', 0.1);
  },
};
