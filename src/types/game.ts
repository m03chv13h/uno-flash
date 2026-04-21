/* ────────────────────────────────────────────
   Core type definitions for UNO Flash
   ──────────────────────────────────────────── */

export type ButtonColor = 'red' | 'blue' | 'green' | 'yellow';
export type ButtonNumber = 1 | 2 | 3 | 4;
export type Direction = 'clockwise' | 'counterclockwise';
export type PlayerType = 'human' | 'ai' | 'empty';
export type Difficulty = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3;

export interface PlayerState {
  index: PlayerIndex;
  type: PlayerType;
  litButtons: boolean[]; // [red, blue, green, yellow] = index 0-3
  wins: number;
  label: string;
}

export type CommandType =
  | 'color'
  | 'skip'
  | 'reverse'
  | 'draw'
  | 'wild'
  | 'instant_uno';

export interface Command {
  type: CommandType;
  /** For color commands: which button number (1-4) */
  targetButton?: ButtonNumber;
  /** Display text for the command */
  displayText: string;
}

export type GamePhase = 'setup' | 'playing' | 'round_over' | 'game_over';

export interface GameConfig {
  difficulty: Difficulty;
  language: string;
  playerCount: number;
  fillWithAI: boolean;
  soundEnabled: boolean;
}

/* Fixed button mapping */
export const BUTTON_MAP: Record<ButtonNumber, ButtonColor> = {
  1: 'red',
  2: 'blue',
  3: 'green',
  4: 'yellow',
};

export const COLOR_TO_NUMBER: Record<ButtonColor, ButtonNumber> = {
  red: 1,
  blue: 2,
  green: 3,
  yellow: 4,
};

export const BUTTON_NUMBERS: ButtonNumber[] = [1, 2, 3, 4];
export const PLAYER_INDICES: PlayerIndex[] = [0, 1, 2, 3];
export const ROUNDS_TO_WIN = 4;

/** Turn order positions around the table: top, right, bottom, left */
export const PLAYER_ROTATIONS: Record<PlayerIndex, number> = {
  0: 180,
  1: 270,
  2: 0,
  3: 90,
};
