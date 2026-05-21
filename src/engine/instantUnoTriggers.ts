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
  // 0: Demonic hiccup — dissonant tritone with sub-bass rumble
  { freqs: [66, 93, 666], duration: 2.0, type: 'sawtooth', gain: 0.14 },
  // 1: Bee trapped in a jar — tight cluster of clashing frequencies
  { freqs: [248, 251, 253, 259], duration: 2.0, type: 'square', gain: 0.1 },
  // 2: Underwater whale fax machine
  { freqs: [55, 1760, 2093], duration: 2.0, type: 'triangle', gain: 0.13 },
  // 3: Broken music box — dissonant minor 2nd cluster high up
  { freqs: [1975, 2093, 2217], duration: 2.0, type: 'sine', gain: 0.11 },
  // 4: Eldritch gong — extreme low with inharmonic overtones
  { freqs: [36, 97, 113, 271], duration: 2.0, type: 'sawtooth', gain: 0.13 },
  // 5: Glitchy kazoo seizure — wide dissonant spread
  { freqs: [147, 1480, 1511, 73], duration: 2.0, type: 'square', gain: 0.09 },
  // 6: Interdimensional doorbell — tritone stack
  { freqs: [370, 523, 740, 1046], duration: 2.0, type: 'triangle', gain: 0.12 },
  // 7: Possessed dial-up modem — harsh high cluster
  { freqs: [2637, 2794, 1397, 350], duration: 2.0, type: 'sawtooth', gain: 0.1 },
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
