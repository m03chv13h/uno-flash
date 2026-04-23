/* ────────────────────────────────────────────
   Game engine — pure functions for game logic.
   No side-effects, no state mutation here.
   ──────────────────────────────────────────── */

import {
  type ButtonNumber,
  type Command,
  type CommandType,
  type Difficulty,
  type Direction,
  type PlayerIndex,
  type PlayerState,
  type PlayerType,
  BUTTON_MAP,
  BUTTON_NUMBERS,
  PLAYER_INDICES,
  ROUNDS_TO_WIN,
} from '../types/game';

/* ─── Helpers ─────────────────────────────── */

export function createPlayers(
  playerCount: number,
  fillWithAI: boolean,
): PlayerState[] {
  return PLAYER_INDICES.map((i) => {
    let type: PlayerType = 'empty';
    if (i < playerCount) type = 'human';
    else if (fillWithAI) type = 'ai';

    return {
      index: i,
      type,
      litButtons: [true, true, true, true],
      wins: 0,
      label: `Player ${i + 1}`,
    };
  });
}

export function resetButtonsForRound(players: PlayerState[]): PlayerState[] {
  return players.map((p) => ({
    ...p,
    litButtons: p.type === 'empty' ? [false, false, false, false] : [true, true, true, true],
  }));
}

export function isPlayerActive(p: PlayerState): boolean {
  return p.type !== 'empty';
}

export function litCount(p: PlayerState): number {
  return p.litButtons.filter(Boolean).length;
}

export function hasWonRound(p: PlayerState): boolean {
  return isPlayerActive(p) && litCount(p) === 0;
}

export function hasWonGame(p: PlayerState): boolean {
  return p.wins >= ROUNDS_TO_WIN;
}

/* ─── Next player ─────────────────────────── */

export function getNextActivePlayer(
  current: PlayerIndex,
  direction: Direction,
  players: PlayerState[],
  skip = 0,
): PlayerIndex {
  const step = direction === 'clockwise' ? 1 : -1;
  let idx = current;
  let skips = skip + 1; // +1 because we always move at least one step
  while (skips > 0) {
    idx = (((idx + step) % 4) + 4) % 4 as PlayerIndex;
    if (isPlayerActive(players[idx])) {
      skips--;
    }
    // Safety: prevent infinite loop if no active players
    if (idx === current && skips > 0) break;
  }
  return idx as PlayerIndex;
}

export function getPassTarget(
  current: PlayerIndex,
  passDirection: 'left' | 'right',
  players: PlayerState[],
): PlayerIndex {
  // From the current player's perspective (accounting for board rotation):
  // "pass left" = clockwise, "pass right" = counterclockwise
  const dir: Direction =
    passDirection === 'left' ? 'clockwise' : 'counterclockwise';
  return getNextActivePlayer(current, dir, players);
}

/* ─── Command generation ──────────────────── */

const COLOR_COMMANDS: CommandType[] = ['color'];
const SPECIAL_COMMANDS: CommandType[] = ['skip', 'reverse', 'draw', 'wild'];

export function generateCommand(difficulty: Difficulty): Command {
  // Instant UNO only at difficulty 4
  const pool: CommandType[] = [...COLOR_COMMANDS, ...SPECIAL_COMMANDS];
  if (difficulty >= 4) pool.push('instant_uno');

  // Weight color commands more heavily (they should be ~50% of commands)
  const weighted: CommandType[] = [
    ...pool,
    'color',
    'color',
    'color',
    'color',
  ];

  const type = weighted[Math.floor(Math.random() * weighted.length)];

  switch (type) {
    case 'color': {
      // Randomly pick a color OR a number (same mapping)
      const num = BUTTON_NUMBERS[Math.floor(Math.random() * 4)];
      const color = BUTTON_MAP[num];
      const useColor = Math.random() > 0.5;
      return {
        type: 'color',
        targetButton: num,
        displayText: useColor ? `cmd_${color}` : `cmd_${num}`,
      };
    }
    case 'skip':
      return { type: 'skip', displayText: 'cmd_skip' };
    case 'reverse':
      return { type: 'reverse', displayText: 'cmd_reverse' };
    case 'draw':
      return { type: 'draw', displayText: 'cmd_draw' };
    case 'wild':
      return { type: 'wild', displayText: 'cmd_wild' };
    case 'instant_uno':
      return { type: 'instant_uno', displayText: 'cmd_instant_uno' };
    default:
      return { type: 'color', targetButton: 1, displayText: 'cmd_red' };
  }
}

/* ─── Turn timing ─────────────────────────── */

/** Base turn time in ms by difficulty */
export function getTurnTime(difficulty: Difficulty): number {
  switch (difficulty) {
    case 1:
      return 8000;
    case 2:
      return 6000;
    case 3:
      return 4000;
    case 4:
      return 3500;
  }
}

/** AI reaction delay in ms */
export function getAIDelay(difficulty: Difficulty): number {
  const base = difficulty <= 2 ? 1500 : 800;
  const variance = Math.random() * 600;
  return base + variance;
}

/* ─── Move validation ─────────────────────── */

export interface MoveResult {
  valid: boolean;
  /** Updated players array */
  players: PlayerState[];
  /** New direction (may flip on reverse) */
  direction: Direction;
  /** Player index for next turn */
  nextPlayer: PlayerIndex;
  /** Number of players to skip (0 normally, 1 for skip) */
  message?: string;
}

/**
 * Attempt to press a color button.
 * Returns updated state if valid.
 */
export function pressButton(
  buttonNum: ButtonNumber,
  currentPlayer: PlayerIndex,
  players: PlayerState[],
  command: Command,
  direction: Direction,
): MoveResult {
  const player = players[currentPlayer];
  const btnIdx = buttonNum - 1; // 0-based index into litButtons

  // Wild: player can eliminate any lit button
  if (command.type === 'wild') {
    if (player.litButtons[btnIdx]) {
      const updated = [...players];
      const pCopy = { ...player, litButtons: [...player.litButtons] };
      pCopy.litButtons[btnIdx] = false;
      updated[currentPlayer] = pCopy;
      return {
        valid: true,
        players: updated,
        direction,
        nextPlayer: getNextActivePlayer(currentPlayer, direction, updated),
      };
    }
    return { valid: false, players, direction, nextPlayer: currentPlayer };
  }

  // Color/number command: must match the target button
  if (command.type === 'color' && command.targetButton === buttonNum) {
    if (player.litButtons[btnIdx]) {
      const updated = [...players];
      const pCopy = { ...player, litButtons: [...player.litButtons] };
      pCopy.litButtons[btnIdx] = false;
      updated[currentPlayer] = pCopy;
      return {
        valid: true,
        players: updated,
        direction,
        nextPlayer: getNextActivePlayer(currentPlayer, direction, updated),
      };
    }
    // Button already off — must pass instead
    return { valid: false, players, direction, nextPlayer: currentPlayer };
  }

  // Any other command type: pressing a button is invalid
  return { valid: false, players, direction, nextPlayer: currentPlayer };
}

/**
 * Attempt to pass (left or right).
 */
export function passAction(
  passDir: 'left' | 'right',
  currentPlayer: PlayerIndex,
  players: PlayerState[],
  command: Command,
  direction: Direction,
  difficulty: Difficulty,
): MoveResult {
  const penaltiesEnabled = difficulty >= 2;

  // Determine expected direction:
  // For reverse commands, the player presses the direction they're changing TO.
  // For everything else, the player follows the current play direction.
  const expectedDir: 'left' | 'right' =
    command.type === 'reverse'
      ? (direction === 'clockwise' ? 'right' : 'left')
      : (direction === 'clockwise' ? 'left' : 'right');

  // Draw allows passing in either direction (player chooses target)
  if (command.type !== 'draw' && passDir !== expectedDir) {
    return {
      valid: false,
      players,
      direction,
      nextPlayer: currentPlayer,
      message: 'Wrong direction!',
    };
  }

  switch (command.type) {
    case 'color': {
      // Player must pass if button is not lit
      const btnIdx = (command.targetButton ?? 1) - 1;
      const player = players[currentPlayer];
      if (!player.litButtons[btnIdx]) {
        // Valid pass — must follow play direction
        return {
          valid: true,
          players,
          direction,
          nextPlayer: getNextActivePlayer(currentPlayer, direction, players),
        };
      }
      // Button IS lit — they should press it, not pass.
      // In level 1, forgiving; in level 2+, penalty if applicable.
      if (!penaltiesEnabled) {
        return {
          valid: true,
          players,
          direction,
          nextPlayer: getNextActivePlayer(currentPlayer, direction, players),
          message: 'Passed, but button was available!',
        };
      }
      // Penalty: relight a turned off button if any
      const updated = applyPenalty(players, currentPlayer);
      return {
        valid: true,
        players: updated,
        direction,
        nextPlayer: getNextActivePlayer(currentPlayer, direction, updated),
        message: 'Wrong move! Penalty!',
      };
    }

    case 'skip': {
      // Player must pass; next player after them is skipped
      return {
        valid: true,
        players,
        direction,
        nextPlayer: getNextActivePlayer(currentPlayer, direction, players, 1),
      };
    }

    case 'reverse': {
      // Direction flips
      const newDir: Direction =
        direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
      return {
        valid: true,
        players,
        direction: newDir,
        nextPlayer: getNextActivePlayer(currentPlayer, newDir, players),
      };
    }

    case 'draw': {
      // Passing gives a penalty to the targeted neighbour (1-3 buttons relit)
      const target = getPassTarget(currentPlayer, passDir, players);
      const penaltyCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const updated = applyPenalty(players, target, penaltyCount);
      return {
        valid: true,
        players: updated,
        direction,
        nextPlayer: getNextActivePlayer(currentPlayer, direction, updated),
      };
    }

    case 'wild': {
      // Wild allows pass as alternative to pressing a button
      return {
        valid: true,
        players,
        direction,
        nextPlayer: getNextActivePlayer(currentPlayer, direction, players),
      };
    }

    case 'instant_uno':
      // Pass is not valid during Instant UNO — must press the UNO button
      return { valid: false, players, direction, nextPlayer: currentPlayer };

    default:
      return { valid: false, players, direction, nextPlayer: currentPlayer };
  }
}

/**
 * Handle the UNO button press (Instant UNO).
 */
export function pressUnoButton(
  currentPlayer: PlayerIndex,
  players: PlayerState[],
  command: Command,
  direction: Direction,
): MoveResult {
  if (command.type !== 'instant_uno') {
    return { valid: false, players, direction, nextPlayer: currentPlayer };
  }

  const player = players[currentPlayer];
  if (litCount(player) <= 1) {
    // Already at 1 or 0 — no effect needed
    return {
      valid: true,
      players,
      direction,
      nextPlayer: getNextActivePlayer(currentPlayer, direction, players),
    };
  }

  // Reduce to exactly 1 lit button (keep one random lit button)
  const litIndices = player.litButtons
    .map((lit, i) => (lit ? i : -1))
    .filter((i) => i !== -1);
  const keepIdx = litIndices[Math.floor(Math.random() * litIndices.length)];
  const newButtons = [false, false, false, false];
  newButtons[keepIdx] = true;

  const updated = [...players];
  updated[currentPlayer] = { ...player, litButtons: newButtons };

  return {
    valid: true,
    players: updated,
    direction,
    nextPlayer: getNextActivePlayer(currentPlayer, direction, updated),
  };
}

/* ─── Penalty helper ──────────────────────── */

/**
 * Re-light turned-off buttons as a penalty.
 * @param count Number of buttons to re-light (default 1). Capped at available off buttons.
 */
function applyPenalty(
  players: PlayerState[],
  targetIdx: PlayerIndex,
  count = 1,
): PlayerState[] {
  const target = players[targetIdx];
  const offIndices = target.litButtons
    .map((lit, i) => (!lit ? i : -1))
    .filter((i) => i !== -1);

  if (offIndices.length === 0) return players; // all lit, nothing to do

  const toRelight = Math.min(count, offIndices.length);

  // Shuffle and pick `toRelight` indices
  const shuffled = [...offIndices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const updated = [...players];
  const pCopy = { ...target, litButtons: [...target.litButtons] };
  for (let k = 0; k < toRelight; k++) {
    pCopy.litButtons[shuffled[k]] = true;
  }
  updated[targetIdx] = pCopy;
  return updated;
}

/* ─── AI decision ─────────────────────────── */

export interface AIAction {
  type: 'button' | 'pass' | 'uno';
  buttonNum?: ButtonNumber;
  passDir?: 'left' | 'right';
}

export function decideAIAction(
  currentPlayer: PlayerIndex,
  players: PlayerState[],
  command: Command,
  direction: Direction,
): AIAction {
  const player = players[currentPlayer];

  // Instant UNO
  if (command.type === 'instant_uno') {
    // AI has a 75% chance to react correctly
    if (Math.random() < 0.75) {
      return { type: 'uno' };
    }
    // Fail to react — pass (which is invalid, but the game handles it)
    return { type: 'pass', passDir: direction === 'clockwise' ? 'left' : 'right' };
  }

  // Wild: press a lit button if available
  if (command.type === 'wild') {
    const litIdx = player.litButtons.findIndex((lit) => lit);
    if (litIdx !== -1) {
      return { type: 'button', buttonNum: (litIdx + 1) as ButtonNumber };
    }
    return { type: 'pass', passDir: direction === 'clockwise' ? 'left' : 'right' };
  }

  // Color command: press the button if lit, otherwise pass
  if (command.type === 'color' && command.targetButton) {
    const btnIdx = command.targetButton - 1;
    if (player.litButtons[btnIdx]) {
      return { type: 'button', buttonNum: command.targetButton };
    }
    return {
      type: 'pass',
      passDir: direction === 'clockwise' ? 'left' : 'right',
    };
  }

  // Skip: must pass in the current play direction
  if (command.type === 'skip') {
    return {
      type: 'pass',
      passDir: direction === 'clockwise' ? 'left' : 'right',
    };
  }

  // Draw: can pass in either direction (randomly pick a target)
  if (command.type === 'draw') {
    return {
      type: 'pass',
      passDir: Math.random() < 0.5 ? 'left' : 'right',
    };
  }

  // Reverse: must pass in the reversed direction (the direction you're changing to)
  if (command.type === 'reverse') {
    return {
      type: 'pass',
      passDir: direction === 'clockwise' ? 'right' : 'left',
    };
  }

  return { type: 'pass', passDir: direction === 'clockwise' ? 'left' : 'right' };
}
