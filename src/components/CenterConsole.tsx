import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import { ROUNDS_TO_WIN } from '../types/game';

export default function CenterConsole() {
  const currentCommand = useGameStore((s) => s.currentCommand);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const direction = useGameStore((s) => s.direction);
  const handleUnoPress = useGameStore((s) => s.handleUnoPress);
  const phase = useGameStore((s) => s.phase);
  const config = useGameStore((s) => s.config);
  const lang = config.language;

  const isInstantUno = currentCommand?.type === 'instant_uno';
  const unoDisabled = phase !== 'playing' || !isInstantUno;

  const rotation = useGameStore((s) => s.consoleRotation);
  const isLandscape = currentPlayer === 1 || currentPlayer === 3;

  return (
    <div className="center-console">
      <div
        className={`center-console-inner ${isLandscape ? 'landscape' : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Command + UNO row (side-by-side in landscape) */}
        <div className="console-main">
          <div className="command-display">
            <div className="command-label">{t('command', lang)}</div>
            <div className="command-text">
              {currentCommand?.displayText ?? '—'}
            </div>
          </div>

          <div className="uno-section">
            <div className="uno-btn-wrap">
              <button
                className={`uno-btn ${unoDisabled ? 'disabled' : ''}`}
                disabled={unoDisabled}
                onClick={handleUnoPress}
              >
                UNO
              </button>
            </div>
            <div className="instant-indicator">
              <span className={`instant-dot ${isInstantUno ? 'active' : ''}`} />
              {t('instant_uno', lang)}
            </div>
          </div>
        </div>

        {/* Round & Direction */}
        <div className="info-row">
          <div className="info-item">
            <div className="info-label">{t('round', lang)}</div>
            <div className="info-value">
              {roundNumber} / {ROUNDS_TO_WIN}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t('direction', lang)}</div>
            <div className="info-value">
              {direction === 'clockwise' ? '→' : '←'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
