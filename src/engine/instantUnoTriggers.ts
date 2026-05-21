/* ────────────────────────────────────────────
   Instant UNO triggers — funny words and weird sounds
   used to replace the literal "INSTANT UNO" display.

   Each round picks one trigger. In easy mode the correct
   trigger is always shown; in hard mode a random word from
   the pool is displayed and the player must recognise if
   it matches the round's trigger.
   ──────────────────────────────────────────── */

/**
 * 8 hardcoded funny words used as instant UNO triggers in text mode.
 */
export const INSTANT_UNO_WORDS: string[] = [
  'BANANA',
  'WOMBAT',
  'NOODLE',
  'PICKLE',
  'KAZOO',
  'WOBBLE',
  'SPLONK',
  'FLUMPY',
];

/**
 * 8 distinct weird sound definitions for audio mode.
 * Each entry describes how to synthesize a unique sound.
 */
export interface SoundDef {
  /** Base frequencies for the chord/tone */
  freqs: number[];
  /** Duration in seconds */
  duration: number;
  /** Oscillator type */
  type: OscillatorType;
  /** Gain level */
  gain: number;
}

export const INSTANT_UNO_SOUNDS: SoundDef[] = [
  // 0: High chirp
  { freqs: [1200, 1500], duration: 0.2, type: 'sine', gain: 0.15 },
  // 1: Low buzz
  { freqs: [110, 138], duration: 0.4, type: 'sawtooth', gain: 0.12 },
  // 2: Alien warble
  { freqs: [600, 900, 1100], duration: 0.3, type: 'triangle', gain: 0.13 },
  // 3: Robot beep
  { freqs: [440, 880], duration: 0.15, type: 'square', gain: 0.1 },
  // 4: Foghorn
  { freqs: [85, 170], duration: 0.5, type: 'sawtooth', gain: 0.14 },
  // 5: Sparkle
  { freqs: [1047, 1319, 1568], duration: 0.25, type: 'sine', gain: 0.12 },
  // 6: Duck quack
  { freqs: [300, 350], duration: 0.12, type: 'square', gain: 0.13 },
  // 7: Space blip
  { freqs: [2000, 2400, 1600], duration: 0.18, type: 'triangle', gain: 0.11 },
];

/** Pick a random trigger index (0-7) */
export function pickTriggerIndex(): number {
  return Math.floor(Math.random() * INSTANT_UNO_WORDS.length);
}

/**
 * Pick a display index for instant UNO command.
 * - Easy (difficulty 1-2): always returns the trigger index (correct answer obvious)
 * - Hard (difficulty 3-4): returns a random index from the pool
 */
export function pickDisplayIndex(triggerIndex: number, difficulty: number): number {
  if (difficulty <= 2) {
    return triggerIndex;
  }
  // Hard mode: random from the pool (may or may not match)
  return Math.floor(Math.random() * INSTANT_UNO_WORDS.length);
}
