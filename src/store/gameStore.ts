/* ────────────────────────────────────────────
   Zustand game store — single source of truth
   ──────────────────────────────────────────── */

import { create } from 'zustand';
import {
  type ButtonNumber,
  type Command,
  type Difficulty,
  type Direction,
  type GameConfig,
  type GamePhase,
  type PlayerIndex,
  type PlayerState,
  PLAYER_INDICES,
  PLAYER_ROTATIONS,
} from '../types/game';
import {
  createPlayers,
  decideAIAction,
  generateCommand,
  getAIDelay,
  getNextActivePlayer,
  hasWonGame,
  hasWonRound,
  passAction,
  pressButton,
  pressUnoButton,
  resetButtonsForRound,
} from '../engine/gameEngine';
import { audioManager } from '../audio/audioManager';

interface GameStore {
  /* ── Configuration ── */
  config: GameConfig;
  setConfig: (cfg: Partial<GameConfig>) => void;

  /* ── Game state ── */
  phase: GamePhase;
  players: PlayerState[];
  currentPlayer: PlayerIndex;
  consoleRotation: number;
  direction: Direction;
  currentCommand: Command | null;
  roundNumber: number;
  roundWinner: PlayerIndex | null;
  gameWinner: PlayerIndex | null;
  statusMessage: string;

  /* ── Actions ── */
  startGame: () => void;
  handleButtonPress: (buttonNum: ButtonNumber) => void;
  handlePass: (dir: 'left' | 'right') => void;
  handleUnoPress: () => void;
  backToSetup: () => void;
  continueAfterRound: () => void;

  /* Internal timer refs */
  _aiTimer: ReturnType<typeof setTimeout> | null;
}

export const useGameStore = create<GameStore>((set, get) => {
  /* ── Internal helpers (not exposed on interface) ── */

  /** Compute the next cumulative rotation that reaches `player`
   *  via the shortest angular path (≤ 180°) from the current value. */
  function smoothRotation(player: PlayerIndex): number {
    const prev = get().consoleRotation;
    const target = PLAYER_ROTATIONS[player];
    const prevMod = ((prev % 360) + 360) % 360;
    let delta = target - prevMod;
    if (delta > 180) delta -= 360;
    if (delta <= -180) delta += 360;
    return prev + delta;
  }

  function scheduleAI() {
    const { currentPlayer, players, config, currentCommand } = get();
    const player = players[currentPlayer];
    if (player.type !== 'ai' || !currentCommand) return;

    const delay = getAIDelay(config.difficulty);
    const timer = setTimeout(() => {
      const st = get();
      if (st.phase !== 'playing' || st.currentPlayer !== currentPlayer) return;
      if (!st.currentCommand) return;

      const action = decideAIAction(
        currentPlayer,
        st.players,
        st.currentCommand,
        st.direction,
      );

      switch (action.type) {
        case 'button':
          if (action.buttonNum) st.handleButtonPress(action.buttonNum);
          break;
        case 'pass':
          st.handlePass(action.passDir ?? 'right');
          break;
        case 'uno':
          st.handleUnoPress();
          break;
      }
    }, delay);

    set({ _aiTimer: timer });
  }

  function nextTurn() {
    const { config } = get();
    setTimeout(() => {
      const cmd = generateCommand(config.difficulty);
      audioManager.commandFeedback();
      set({ currentCommand: cmd });
      scheduleAI();
    }, 400);
  }

  /** Advance to the next player keeping the same command (used on mistakes at difficulty >= 2). */
  function advanceToNextPlayerSameCommand() {
    const { currentPlayer, players, direction } = get();
    const next = getNextActivePlayer(currentPlayer, direction, players);
    set({ currentPlayer: next, consoleRotation: smoothRotation(next) });
    // Re-schedule AI for the new player without generating a new command
    setTimeout(() => scheduleAI(), 400);
  }

  function handleRoundWin(winner: PlayerIndex) {
    const { players, _aiTimer } = get();
    if (_aiTimer) clearTimeout(_aiTimer);

    audioManager.roundWin();

    const updated = [...players];
    updated[winner] = { ...updated[winner], wins: updated[winner].wins + 1 };

    if (hasWonGame(updated[winner])) {
      setTimeout(() => audioManager.gameWin(), 400);
      set({
        players: updated,
        phase: 'game_over',
        gameWinner: winner,
        roundWinner: winner,
        statusMessage: `${updated[winner].label} wins the game!`,
        currentCommand: null,
      });
      return;
    }

    set({
      players: updated,
      phase: 'round_over',
      roundWinner: winner,
      statusMessage: `${updated[winner].label} wins the round!`,
      currentCommand: null,
    });
  }

  return {
    /* ── Defaults ── */
    config: {
      difficulty: 1 as Difficulty,
      language: 'en',
      playerCount: 2,
      fillWithAI: true,
      soundEnabled: true,
    },

    phase: 'setup',
    players: PLAYER_INDICES.map((i) => ({
      index: i,
      type: 'empty' as const,
      litButtons: [false, false, false, false],
      wins: 0,
      label: `Player ${i + 1}`,
    })),
    currentPlayer: 0 as PlayerIndex,
    consoleRotation: PLAYER_ROTATIONS[0],
    direction: 'clockwise',
    currentCommand: null,
    roundNumber: 1,
    roundWinner: null,
    gameWinner: null,
    statusMessage: '',
    _aiTimer: null,

    /* ── Config ── */
    setConfig: (cfg) =>
      set((s) => ({ config: { ...s.config, ...cfg } })),

    /* ── Start game ── */
    startGame: () => {
      const { config } = get();
      audioManager.setEnabled(config.soundEnabled);
      audioManager.resume();

      const players = createPlayers(config.playerCount, config.fillWithAI);
      const reset = resetButtonsForRound(players);
      const firstActive = reset.findIndex((p) => p.type !== 'empty') as PlayerIndex;

      set({
        players: reset,
        phase: 'playing',
        roundNumber: 1,
        roundWinner: null,
        gameWinner: null,
        currentPlayer: firstActive,
        consoleRotation: PLAYER_ROTATIONS[firstActive],
        direction: 'clockwise',
        statusMessage: '',
        currentCommand: null,
      });

      setTimeout(() => {
        const cmd = generateCommand(config.difficulty);
        audioManager.commandFeedback();
        set({ currentCommand: cmd });
        scheduleAI();
      }, 500);
    },

    /* ── Handle button press ── */
    handleButtonPress: (buttonNum: ButtonNumber) => {
      const { currentPlayer, players, currentCommand, direction, config, phase } =
        get();
      if (phase !== 'playing' || !currentCommand) return;
      if (players[currentPlayer].type === 'empty') return;

      audioManager.buttonPress();

      const result = pressButton(
        buttonNum,
        currentPlayer,
        players,
        currentCommand,
        direction,
      );

      if (!result.valid) {
        audioManager.invalidMove();
        set({ statusMessage: 'Invalid move!' });
        if (config.difficulty >= 2) {
          advanceToNextPlayerSameCommand();
        }
        return;
      }

      audioManager.validMove();
      set({
        players: result.players,
        direction: result.direction,
        statusMessage: result.message ?? '',
      });

      if (hasWonRound(result.players[currentPlayer])) {
        handleRoundWin(currentPlayer);
        return;
      }

      set({ currentPlayer: result.nextPlayer, consoleRotation: smoothRotation(result.nextPlayer) });
      nextTurn();
    },

    /* ── Handle pass ── */
    handlePass: (dir: 'left' | 'right') => {
      const { currentPlayer, players, currentCommand, direction, config, phase } =
        get();
      if (phase !== 'playing' || !currentCommand) return;
      if (players[currentPlayer].type === 'empty') return;

      audioManager.pass();

      const result = passAction(
        dir,
        currentPlayer,
        players,
        currentCommand,
        direction,
        config.difficulty,
      );

      if (!result.valid) {
        audioManager.invalidMove();
        set({ statusMessage: result.message ?? 'Invalid move!' });
        if (config.difficulty >= 2) {
          advanceToNextPlayerSameCommand();
        }
        return;
      }

      audioManager.validMove();
      set({
        players: result.players,
        direction: result.direction,
        statusMessage: result.message ?? '',
      });

      set({ currentPlayer: result.nextPlayer, consoleRotation: smoothRotation(result.nextPlayer) });
      nextTurn();
    },

    /* ── Handle UNO press ── */
    handleUnoPress: () => {
      const { currentPlayer, players, currentCommand, direction, phase } = get();
      if (phase !== 'playing' || !currentCommand) return;

      audioManager.instantUno();

      const result = pressUnoButton(
        currentPlayer,
        players,
        currentCommand,
        direction,
      );

      if (!result.valid) {
        audioManager.invalidMove();
        set({ statusMessage: 'UNO button only for Instant UNO!' });
        if (get().config.difficulty >= 2) {
          advanceToNextPlayerSameCommand();
        }
        return;
      }

      set({
        players: result.players,
        direction: result.direction,
        statusMessage: 'INSTANT UNO!',
      });

      if (hasWonRound(result.players[currentPlayer])) {
        handleRoundWin(currentPlayer);
        return;
      }

      set({ currentPlayer: result.nextPlayer, consoleRotation: smoothRotation(result.nextPlayer) });
      nextTurn();
    },

    /* ── Continue after round ── */
    continueAfterRound: () => {
      const { roundNumber, config, players } = get();
      const nextRoundNum = roundNumber + 1;
      const reset = resetButtonsForRound(players);
      const firstActive = reset.findIndex((p) => p.type !== 'empty') as PlayerIndex;

      set({
        players: reset,
        phase: 'playing',
        roundNumber: nextRoundNum,
        roundWinner: null,
        currentPlayer: firstActive,
        consoleRotation: PLAYER_ROTATIONS[firstActive],
        direction: 'clockwise',
        statusMessage: '',
        currentCommand: null,
      });

      setTimeout(() => {
        const cmd = generateCommand(config.difficulty);
        audioManager.commandFeedback();
        set({ currentCommand: cmd });
        scheduleAI();
      }, 400);
    },

    /* ── Back to setup ── */
    backToSetup: () => {
      const { _aiTimer } = get();
      if (_aiTimer) clearTimeout(_aiTimer);
      set({
        phase: 'setup',
        currentCommand: null,
        roundWinner: null,
        gameWinner: null,
        statusMessage: '',
        roundNumber: 1,
      });
    },
  };
});
