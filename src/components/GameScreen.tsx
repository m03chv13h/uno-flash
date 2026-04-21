import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import { audioManager } from '../audio/audioManager';
import PlayerStation from './PlayerStation';
import CenterConsole from './CenterConsole';
import '../styles/GameScreen.css';

export default function GameScreen() {
  const players = useGameStore((s) => s.players);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const phase = useGameStore((s) => s.phase);
  const statusMessage = useGameStore((s) => s.statusMessage);
  const roundWinner = useGameStore((s) => s.roundWinner);
  const gameWinner = useGameStore((s) => s.gameWinner);
  const backToSetup = useGameStore((s) => s.backToSetup);
  const continueAfterRound = useGameStore((s) => s.continueAfterRound);
  const config = useGameStore((s) => s.config);
  const setConfig = useGameStore((s) => s.setConfig);
  const lang = config.language;

  return (
    <div className="game-screen">
      {/* Corner controls */}
      <div className="game-corner-tl">
        <button className="corner-btn" onClick={backToSetup}>
          ← {t('settings', lang)}
        </button>
      </div>
      <div className="game-corner-tr">
        <button
          className="corner-btn"
          onClick={() => {
            const next = !config.soundEnabled;
            setConfig({ soundEnabled: next });
            audioManager.setEnabled(next);
            if (next) {
              audioManager.resume();
              audioManager.buttonPress();
            }
          }}
        >
          🔊 {config.soundEnabled ? t('sound_on', lang) : t('sound_off', lang)}
        </button>
      </div>

      {/* Player stations in order: 0=top, 1=right, 2=bottom, 3=left */}
      {players.map((p) => (
        <PlayerStation
          key={p.index}
          player={p}
          isActive={currentPlayer === p.index && phase === 'playing'}
        />
      ))}

      {/* Center console */}
      <CenterConsole />

      {/* Status message */}
      {statusMessage && (
        <div className="game-status">{statusMessage}</div>
      )}

      {/* Round-over overlay */}
      {phase === 'round_over' && roundWinner !== null && (
        <div className="overlay">
          <div className="overlay-title">{t('round_winner', lang)}</div>
          <div className="overlay-message">
            {t('player_wins_round', lang, {
              player: players[roundWinner].label,
            })}
          </div>
          <button className="overlay-btn" onClick={continueAfterRound}>
            {t('continue_btn', lang)}
          </button>
        </div>
      )}

      {/* Game-over overlay */}
      {phase === 'game_over' && gameWinner !== null && (
        <div className="overlay">
          <div className="overlay-title">{t('game_winner', lang)}</div>
          <div className="overlay-message game-win">
            {t('player_wins_game', lang, {
              player: players[gameWinner].label,
            })}
          </div>
          <button className="overlay-btn" onClick={backToSetup}>
            {t('back_to_menu', lang)}
          </button>
          <button
            className="overlay-btn secondary"
            onClick={() => {
              backToSetup();
              setTimeout(() => useGameStore.getState().startGame(), 100);
            }}
          >
            {t('new_game', lang)}
          </button>
        </div>
      )}
    </div>
  );
}
