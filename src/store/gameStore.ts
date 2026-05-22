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
  applyPenalty,
  createPlayers,
  decideAIAction,
  generateCommand,
  getAIDelay,
  getNextActivePlayer,
  getTurnTime,
  hasWonGame,
  hasWonRound,
  passAction,
  pressButton,
  pressUnoButton,
  resetButtonsForRound,
} from '../engine/gameEngine';
import { pickTriggerIndex } from '../engine/instantUnoTriggers';
import { audioManager } from '../audio/audioManager';
import { t, type TranslationKey } from '../i18n';

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
  /** Index of the current round's instant UNO trigger word/sound (0-7) */
  instantUnoTriggerIndex: number;
  /** Whether the round-start announcement is showing */
  showingTriggerAnnouncement: boolean;

  /* ── Actions ── */
  startGame: () => void;
  handleButtonPress: (buttonNum: ButtonNumber) => void;
  handlePass: (dir: 'left' | 'right') => void;
  handleUnoPress: () => void;
  backToSetup: () => void;
  continueAfterRound: () => void;
  dismissAnnouncement: () => void;

  /* Internal timer refs */
  _aiTimer: ReturnType<typeof setTimeout> | null;
  _turnTimer: ReturnType<typeof setTimeout> | null;
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
        st.instantUnoTriggerIndex,
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

  function clearTurnTimer() {
    const { _turnTimer } = get();
    if (_turnTimer) clearTimeout(_turnTimer);
    set({ _turnTimer: null });
  }

  function scheduleTurnTimer() {
    clearTurnTimer();
    const { currentPlayer, players, config, currentCommand } = get();
    if (config.difficulty < 2) return;
    const player = players[currentPlayer];
    if (player.type !== 'human' || !currentCommand) return;

    const timeout = getTurnTime(config.difficulty);
    const timer = setTimeout(() => {
      const st = get();
      if (st.phase !== 'playing' || st.currentPlayer !== currentPlayer) return;
      if (!st.currentCommand) return;

      audioManager.timeout();
      const updated = applyPenalty(st.players, currentPlayer);
      set({ players: updated, statusMessage: t('too_slow', st.config.language) });

      const next = getNextActivePlayer(currentPlayer, st.direction, updated);
      set({ currentPlayer: next, consoleRotation: smoothRotation(next) });
      // Re-schedule AI or turn timer for the new player without generating a new command
      setTimeout(() => {
        repeatCommand();
        scheduleAI();
        scheduleTurnTimer();
      }, 400);
    }, timeout);

    set({ _turnTimer: timer });
  }

  /** Issue a new command: set state, play feedback, and speak in audio mode. */
  function issueCommand(cmd: Command) {
    const { config } = get();
    audioManager.commandFeedback();
    set({ currentCommand: cmd });
    if (config.gameMode === 'audio') {
      if (cmd.type === 'instant_uno' && cmd.instantUnoDisplayIndex !== undefined) {
        // Play the weird sound for the displayed trigger
        audioManager.playInstantUnoTrigger(cmd.instantUnoDisplayIndex);
      } else {
        const spokenText = t(cmd.displayText as TranslationKey, config.language);
        audioManager.speakCommand(spokenText, config.language);
      }
    }
  }

  function nextTurn() {
    const { config, instantUnoTriggerIndex } = get();
    setTimeout(() => {
      const cmd = generateCommand(config.difficulty, instantUnoTriggerIndex);
      issueCommand(cmd);
      scheduleAI();
      scheduleTurnTimer();
    }, 400);
  }

  /** Advance to the next player keeping the same command (used on mistakes at difficulty >= 2). */
  function advanceToNextPlayerSameCommand() {
    const { currentPlayer, players, direction } = get();
    const next = getNextActivePlayer(currentPlayer, direction, players);
    set({ currentPlayer: next, consoleRotation: smoothRotation(next) });
    // Re-schedule AI or turn timer for the new player without generating a new command
    setTimeout(() => {
      repeatCommand();
      scheduleAI();
      scheduleTurnTimer();
    }, 400);
  }

  /** Re-speak the current command so the player knows what to do after a mistake. */
  function repeatCommand() {
    const { currentCommand, config } = get();
    if (!currentCommand || config.gameMode !== 'audio') return;
    if (currentCommand.type === 'instant_uno' && currentCommand.instantUnoDisplayIndex !== undefined) {
      audioManager.playInstantUnoTrigger(currentCommand.instantUnoDisplayIndex);
    } else {
      const spokenText = t(currentCommand.displayText as TranslationKey, config.language);
      audioManager.speakCommand(spokenText, config.language);
    }
  }

  function handleRoundWin(winner: PlayerIndex) {
    const { players, _aiTimer, config } = get();
    if (_aiTimer) clearTimeout(_aiTimer);
    clearTurnTimer();

    audioManager.roundWin();

    const updated = [...players];
    updated[winner] = { ...updated[winner], wins: updated[winner].wins + 1 };

    if (hasWonGame(updated[winner], get().config.winsToWin)) {
      setTimeout(() => audioManager.gameWin(), 400);
      set({
        players: updated,
        phase: 'game_over',
        gameWinner: winner,
        roundWinner: winner,
        statusMessage: t('player_wins_game', config.language, { player: updated[winner].label }),
        currentCommand: null,
      });
      return;
    }

    set({
      players: updated,
      phase: 'round_over',
      roundWinner: winner,
      statusMessage: t('player_wins_round', config.language, { player: updated[winner].label }),
      currentCommand: null,
    });
  }

  return {
    /* ── Defaults ── */
    config: {
      difficulty: 1 as Difficulty,
      gameMode: 'audio' as const,
      language: 'de',
      playerCount: 2,
      fillWithAI: true,
      soundEnabled: true,
      winsToWin: 4,
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
    instantUnoTriggerIndex: 0,
    showingTriggerAnnouncement: false,
    _aiTimer: null,
    _turnTimer: null,

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
      const triggerIndex = pickTriggerIndex();

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
        instantUnoTriggerIndex: triggerIndex,
        showingTriggerAnnouncement: config.difficulty >= 4,
      });

      // In audio mode, play the trigger sound once during announcement
      if (config.difficulty >= 4 && config.gameMode === 'audio') {
        setTimeout(() => audioManager.playInstantUnoTrigger(triggerIndex), 300);
      }

      // If no announcement needed (difficulty < 4), start immediately
      if (config.difficulty < 4) {
        setTimeout(() => {
          const cmd = generateCommand(config.difficulty, triggerIndex);
          issueCommand(cmd);
          scheduleAI();
          scheduleTurnTimer();
        }, 500);
      }
    },

    /* ── Handle button press ── */
    handleButtonPress: (buttonNum: ButtonNumber) => {
      const { currentPlayer, players, currentCommand, direction, config, phase } =
        get();
      if (phase !== 'playing' || !currentCommand) return;
      if (players[currentPlayer].type === 'empty') return;

      clearTurnTimer();
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
        const cmdText = t(currentCommand.displayText as TranslationKey, config.language);
        if (config.difficulty >= 2) {
          const penalized = applyPenalty(players, currentPlayer);
          set({ players: penalized, statusMessage: t('invalid_move_penalty', config.language, { command: cmdText }) });
          advanceToNextPlayerSameCommand();
        } else {
          set({ statusMessage: t('invalid_move_try_again', config.language, { command: cmdText }) });
          setTimeout(() => {
            repeatCommand();
            scheduleTurnTimer();
          }, 600);
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
      const { currentPlayer, players, currentCommand, direction, config, phase, instantUnoTriggerIndex } =
        get();
      if (phase !== 'playing' || !currentCommand) return;
      if (players[currentPlayer].type === 'empty') return;

      clearTurnTimer();
      audioManager.pass();

      const result = passAction(
        dir,
        currentPlayer,
        players,
        currentCommand,
        direction,
        config.difficulty,
        instantUnoTriggerIndex,
      );

      if (!result.valid) {
        audioManager.invalidMove();
        const cmdText = t(currentCommand.displayText as TranslationKey, config.language);
        if (config.difficulty >= 2) {
          const penalized = applyPenalty(players, currentPlayer);
          set({ players: penalized, statusMessage: t('invalid_move_penalty', config.language, { command: cmdText }) });
          advanceToNextPlayerSameCommand();
        } else {
          set({ statusMessage: t('invalid_move_try_again', config.language, { command: cmdText }) });
          setTimeout(() => {
            repeatCommand();
            scheduleTurnTimer();
          }, 600);
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
      const { currentPlayer, players, currentCommand, direction, phase, instantUnoTriggerIndex, config } = get();
      if (phase !== 'playing' || !currentCommand) return;

      clearTurnTimer();
      audioManager.instantUno();

      const result = pressUnoButton(
        currentPlayer,
        players,
        currentCommand,
        direction,
        instantUnoTriggerIndex,
      );

      if (!result.valid) {
        audioManager.invalidMove();
        const cmdText = t(currentCommand.displayText as TranslationKey, config.language);
        const penalized = applyPenalty(players, currentPlayer);
        set({ players: penalized, statusMessage: t('invalid_move_penalty', config.language, { command: cmdText }) });
        advanceToNextPlayerSameCommand();
        return;
      }

      set({
        players: result.players,
        direction: result.direction,
        statusMessage: t('instant_uno', config.language),
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
      const triggerIndex = pickTriggerIndex();

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
        instantUnoTriggerIndex: triggerIndex,
        showingTriggerAnnouncement: config.difficulty >= 4,
      });

      // In audio mode, play the trigger sound once during announcement
      if (config.difficulty >= 4 && config.gameMode === 'audio') {
        setTimeout(() => audioManager.playInstantUnoTrigger(triggerIndex), 300);
      }

      // If no announcement needed, start immediately
      if (config.difficulty < 4) {
        setTimeout(() => {
          const cmd = generateCommand(config.difficulty, triggerIndex);
          issueCommand(cmd);
          scheduleAI();
          scheduleTurnTimer();
        }, 400);
      }
    },

    /* ── Back to setup ── */
    backToSetup: () => {
      const { _aiTimer } = get();
      if (_aiTimer) clearTimeout(_aiTimer);
      clearTurnTimer();
      set({
        phase: 'setup',
        currentCommand: null,
        roundWinner: null,
        gameWinner: null,
        statusMessage: '',
        roundNumber: 1,
        showingTriggerAnnouncement: false,
      });
    },

    /* ── Dismiss announcement and start play ── */
    dismissAnnouncement: () => {
      const { config, instantUnoTriggerIndex } = get();
      set({ showingTriggerAnnouncement: false });
      setTimeout(() => {
        const cmd = generateCommand(config.difficulty, instantUnoTriggerIndex);
        issueCommand(cmd);
        scheduleAI();
        scheduleTurnTimer();
      }, 300);
    },
  };
});
