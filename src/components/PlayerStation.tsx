import { useGameStore } from '../store/gameStore';
import type { PlayerState, ButtonNumber } from '../types/game';
import { BUTTON_MAP, BUTTON_NUMBERS } from '../types/game';

interface Props {
  player: PlayerState;
  isActive: boolean;
}

export default function PlayerStation({ player, isActive }: Props) {
  const handleButtonPress = useGameStore((s) => s.handleButtonPress);
  const handlePass = useGameStore((s) => s.handlePass);
  const phase = useGameStore((s) => s.phase);

  const isEmpty = player.type === 'empty';
  const canAct = isActive && !isEmpty && phase === 'playing' && player.type === 'human';

  const stationClass = [
    'player-station',
    isActive ? 'active' : 'inactive',
    isEmpty ? 'empty' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={stationClass} data-position={player.index}>
      <div className="station-inner">
        {/* Header */}
        <div className="station-header">
          <span className="player-label">{player.label}</span>
          <span className="wins-badge">
            W:{player.wins}
          </span>
        </div>

        {/* Type badge */}
        <span
          className={`player-type-badge ${
            player.type === 'human' ? 'human' : player.type === 'ai' ? 'ai' : 'empty-badge'
          }`}
        >
          {player.type.toUpperCase()}
        </span>

        {/* Color buttons */}
        <div className="color-buttons">
          {BUTTON_NUMBERS.map((num: ButtonNumber) => {
            const color = BUTTON_MAP[num];
            const lit = player.litButtons[num - 1];
            return (
              <button
                key={num}
                className={`color-btn ${color} ${lit ? 'lit' : 'off'}`}
                disabled={!canAct}
                onClick={() => canAct && handleButtonPress(num)}
                aria-label={`${color} ${num}`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Pass buttons */}
        <div className="pass-buttons">
          <button
            className="pass-btn"
            disabled={!canAct}
            onClick={() => canAct && handlePass('left')}
          >
            <span className="pass-arrow">←</span> PASS
          </button>
          <button
            className="pass-btn"
            disabled={!canAct}
            onClick={() => canAct && handlePass('right')}
          >
            PASS <span className="pass-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
